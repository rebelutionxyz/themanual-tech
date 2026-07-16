import { type EventItem, createEvent, updateEvent } from '@/lib/events';
import { cn } from '@/lib/utils';
import { MapPin, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// RULE orange — canonical accent (matches EventsPage + CommunityLayout).
const RULE_COLOR = '#F97316';

/** datetime-local string → ISO (treats input as local time). */
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → datetime-local string in the Bee's local time (for edit prefill). */
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Create OR edit an event. Pass `editing` to prefill and save via the
 * host-only event_update RPC instead of event_create.
 */
export function CreateEventModal({
  parentId,
  editing,
  onClose,
  onCreated,
}: {
  parentId?: string | null;
  editing?: EventItem | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [startsLocal, setStartsLocal] = useState(isoToLocal(editing?.startsAt ?? null));
  const [endsLocal, setEndsLocal] = useState(isoToLocal(editing?.endsAt ?? null));
  const [isVirtual, setIsVirtual] = useState(editing?.isVirtual ?? false);
  const [virtualLink, setVirtualLink] = useState(editing?.virtualLink ?? '');
  const [locationText, setLocationText] = useState(editing?.locationText ?? '');
  const [lat, setLat] = useState(editing?.lat != null ? String(editing.lat) : '');
  const [lng, setLng] = useState(editing?.lng != null ? String(editing.lng) : '');
  const [description, setDescription] = useState(editing?.description ?? '');
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
      const input = {
        title: title.trim(),
        startsAt: startsIso,
        endsAt: localToIso(endsLocal),
        description: description.trim() || undefined,
        isVirtual,
        virtualLink: isVirtual ? virtualLink.trim() || null : null,
        locationText: !isVirtual ? locationText.trim() || null : null,
        lat: !isVirtual && lat.trim() ? Number(lat) : null,
        lng: !isVirtual && lng.trim() ? Number(lng) : null,
      };
      if (editing) {
        await updateEvent(editing.id, input);
        onCreated(editing.id);
      } else {
        const id = await createEvent({ ...input, parentId: parentId ?? null });
        onCreated(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save event');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; modal dismissable via Esc + close button */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-label={editing ? 'Edit event' : 'Create an event'}
        className="relative z-10 m-0 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-zinc-200 border-b bg-white px-5 py-3">
          <h2 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '17px' }}>
            {editing ? 'Edit event' : 'Create an event'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Founders' livestream watch"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Starts">
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                style={{ fontSize: '13px' }}
              />
            </Field>
            <Field label="Ends" hint="optional">
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                style={{ fontSize: '13px' }}
              />
            </Field>
          </div>

          <Field label="Where">
            <div className="mb-2 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
              <ModeButton
                active={!isVirtual}
                onClick={() => setIsVirtual(false)}
                icon={<MapPin size={12} />}
                label="In person"
              />
              <ModeButton
                active={isVirtual}
                onClick={() => setIsVirtual(true)}
                icon={<Video size={12} />}
                label="Virtual"
              />
            </div>
            {isVirtual ? (
              <input
                value={virtualLink}
                onChange={(e) => setVirtualLink(e.target.value)}
                placeholder="https://… stream or call link"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                style={{ fontSize: '13px' }}
              />
            ) : (
              <div className="space-y-2">
                <input
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="Venue / address"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
                  style={{ fontSize: '13px' }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    inputMode="decimal"
                    placeholder="lat (optional)"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-400"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    inputMode="decimal"
                    placeholder="lng (optional)"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-400"
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
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px', lineHeight: 1.5 }}
            />
          </Field>

          {error && (
            <p className="text-red-600" style={{ fontSize: '12px' }}>
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-zinc-200 border-t bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-zinc-500 hover:text-zinc-800"
            style={{ fontSize: '13px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
            style={{ background: RULE_COLOR, fontSize: '14px' }}
          >
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono transition-all',
        !active && 'text-zinc-500 hover:text-zinc-800',
      )}
      style={{
        fontSize: '12px',
        ...(active ? { color: RULE_COLOR, background: `${RULE_COLOR}18`, fontWeight: 600 } : {}),
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="font-mono uppercase tracking-wider text-zinc-500"
          style={{ fontSize: '10px' }}
          data-size="meta"
        >
          {label}
        </span>
        {hint && (
          <span className="font-mono text-zinc-400" style={{ fontSize: '10px' }} data-size="meta">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
