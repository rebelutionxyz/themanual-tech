import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { BeeProfileLocation } from '@/lib/geo/types';

// Local form type: every field is a string (empty when unset). The DB sees
// nullable text columns; we coerce '' ↔ null at the persistence boundary.
type FormState = {
  location_country: string;
  location_region: string;
  location_city: string;
  location_neighborhood: string;
};

type FieldKey = keyof FormState;

interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
  hint?: string;
}

// Free-form text fields v1 per MMF §19.7 C-4. Selector validation lives on
// the bottom-bar, intentionally NOT here — Bees may have a profile location
// that's nuanced (e.g. "Travis County" not a state) and the v1 directive is
// to accept what they type.
const FIELDS: readonly FieldDef[] = [
  { key: 'location_country', label: 'Country', placeholder: 'United States' },
  { key: 'location_region', label: 'State / Region', placeholder: 'Texas' },
  { key: 'location_city', label: 'City', placeholder: 'Austin' },
  {
    key: 'location_neighborhood',
    label: 'Neighborhood',
    placeholder: 'East Austin',
    hint: 'Optional — used by the geo lens once city + neighborhood ship in v2.',
  },
];

const EMPTY_FORM: FormState = {
  location_country: '',
  location_region: '',
  location_city: '',
  location_neighborhood: '',
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Editor for the Bee's profile location — Phase C Component C-4.
 * Reads + writes public.bee_profiles via supabase-js. The auto-create trigger
 * on bees INSERT guarantees a profile row already exists, so this component
 * only ever SELECTs and UPDATEs (never INSERTs).
 */
export function ProfileLocationEditor() {
  const { bee, configured } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!bee || !supabase) {
      setLoading(false);
      return;
    }

    void (async () => {
      const { data, error } = await supabase!
        .from('bee_profiles')
        .select('location_country, location_region, location_city, location_neighborhood')
        .eq('bee_id', bee.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[geo] failed to load bee_profiles', error);
        setErrorMsg('Could not load your saved location.');
        setLoading(false);
        return;
      }

      if (data) {
        setForm({
          location_country: data.location_country ?? '',
          location_region: data.location_region ?? '',
          location_city: data.location_city ?? '',
          location_neighborhood: data.location_neighborhood ?? '',
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [bee?.id, bee]);

  const updateField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status === 'saved') setStatus('idle');
  };

  const onSave = async () => {
    if (!bee || !supabase) {
      setErrorMsg('Sign-in required to save.');
      return;
    }
    setStatus('saving');
    setErrorMsg(null);

    // Persist empty strings as NULL so the cascade hook treats them as
    // "unset" rather than literal "" matches in geo filters down the line.
    const payload: BeeProfileLocation = {
      location_country: form.location_country.trim() || null,
      location_region: form.location_region.trim() || null,
      location_city: form.location_city.trim() || null,
      location_neighborhood: form.location_neighborhood.trim() || null,
    };

    const { error } = await supabase
      .from('bee_profiles')
      .update(payload)
      .eq('bee_id', bee.id);

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[geo] profile location save failed', error);
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }

    setStatus('saved');
    // Echo trimmed values back into the form so whitespace trimming is visible.
    setForm({
      location_country: payload.location_country ?? '',
      location_region: payload.location_region ?? '',
      location_city: payload.location_city ?? '',
      location_neighborhood: payload.location_neighborhood ?? '',
    });
  };

  if (!bee) return null;

  return (
    <section
      className="mt-10 rounded-lg border border-border bg-bg-elevated/40 p-6"
      aria-labelledby="profile-location-heading"
    >
      <h2
        id="profile-location-heading"
        className="font-display text-xl font-semibold text-text-silver-bright"
      >
        Your location
      </h2>
      <p
        className="mt-2 font-mono text-text-muted"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        Used by the geo lens at the bottom of the screen. Public on your profile.
      </p>

      {!configured && (
        <p
          className="mt-3 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 px-3 py-2 text-kettle-contested"
          style={{ fontSize: '12px' }}
        >
          Read-only mode: Supabase not configured.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span
              className="block font-mono text-text-dim"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {f.label}
            </span>
            <input
              type="text"
              value={form[f.key] ?? ''}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              disabled={loading || !configured}
              className={cn(
                'mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5',
                'font-mono text-text-silver placeholder:text-text-muted',
                'hover:border-border-bright focus:border-border-bright focus:outline-none',
                'disabled:opacity-50',
              )}
              style={{ fontSize: '13px' }}
            />
            {f.hint && (
              <span
                className="mt-1 block font-mono text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {f.hint}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={loading || status === 'saving' || !configured}
          className={cn(
            'rounded-md border border-border px-4 py-1.5',
            'font-mono text-text-silver hover:border-border-bright hover:bg-bg-elevated',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          style={{ fontSize: '12px' }}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>

        {status === 'saved' && (
          <output
            aria-live="polite"
            className="font-mono text-honey"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Saved.
          </output>
        )}
        {status === 'error' && errorMsg && (
          <span
            role="alert"
            className="font-mono text-kettle-contested"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {errorMsg}
          </span>
        )}
        {status === 'idle' && errorMsg && (
          <span
            role="alert"
            className="font-mono text-kettle-contested"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {errorMsg}
          </span>
        )}
      </div>
    </section>
  );
}
