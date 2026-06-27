import { useEffect, useState } from 'react';
import { X, Video, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createEvent } from '@/lib/events';
import { cn } from '@/lib/utils';

const RULE_COLOR = '#E88938';

/** datetime-local string → ISO (treats input as local time). */
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function CreateEventModal({
  parentId,
  onClose,
  onCreated,
}: {
  parentId?: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleOk = title.trim().length >= 2;
  const startsIso = localToIso(startsLocal);
  const canSubmit = titleOk && !!startsIso && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !startsIso) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await createEvent({
        title: title.trim(),
        startsAt: startsIso,
        endsAt: localToIso(endsLocal),
        description: description.trim() || undefined,
        isVirtual,
        virtualLink: isVirtual ? virtualLink.trim() || null : null,
        locationText: !isVirtual ? locationText.trim() || null : null,
        lat: !isVirtual && lat.trim() ? Number(lat) : null,
        lng: !isVirtual && lng.trim() ? Number(lng) : null,
        parentId: parentId ?? null,
      });
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; modal dismissable via Esc + close button */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog
        open
        aria-label="Create an event"
        className="relative z-10 m-0 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-bg-elevated p-0 text-text shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-elevated px-5 py-3">
          <h2 className="font-display tracking-wide text-text-silver-bright" style={{ fontSize: '17px' }}>
            Create an event
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-bg hover:text-text-silver" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Founders' livestream watch"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Starts">
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-2 text-text outline-none focus:border-border-bright"
                style={{ fontSize: '13px' }}
              />
            </Field>
            <Field label="Ends" hint="optional">
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-2 text-text outline-none focus:border-border-bright"
                style={{ fontSize: '13px' }}
              />
            </Field>
          </div>

          <Field label="Where">
            <div className="mb-2 inline-flex rounded-md border border-border bg-bg p-0.5">
              <ModeButton active={!isVirtual} onClick={() => setIsVirtual(false)} icon={<MapPin size={12} />} label="In person" />
              <ModeButton active={isVirtual} onClick={() => setIsVirtual(true)} icon={<Video size={12} />} label="Virtual" />
            </div>
            {isVirtual ? (
              <input
                value={virtualLink}
                onChange={(e) => setVirtualLink(e.target.value)}
                placeholder="https://… stream or call link"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
                style={{ fontSize: '13px' }}
              />
            ) : (
              <div className="space-y-2">
                <input
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="Venue / address"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
                  style={{ fontSize: '13px' }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    inputMode="decimal"
                    placeholder="lat (optional)"
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-text outline-none focus:border-border-bright"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    inputMode="decimal"
                    placeholder="lng (optional)"
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-text outline-none focus:border-border-bright"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            )}
          </Field>

          <Field label="Description" hint="optional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's happening, what to bring…"
              className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
              style={{ fontSize: '14px', lineHeight: 1.5 }}
            />
          </Field>

          {error && (
            <p className="text-kettle-unsourced" style={{ fontSize: '12px' }}>
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-bg-elevated px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-bg transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
            style={{ background: RULE_COLOR, fontSize: '14px' }}
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono transition-all', !active && 'text-text-dim hover:text-text-silver')}
      style={{ fontSize: '12px', ...(active ? { color: RULE_COLOR, background: `${RULE_COLOR}18`, fontWeight: 600 } : {}) }}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }} data-size="meta">
          {label}
        </span>
        {hint && (
          <span className="font-mono text-text-muted" style={{ fontSize: '10px' }} data-size="meta">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
