import {
  type ChannelInput,
  type PulseChannel,
  createChannel,
  publishVod,
  scheduleBroadcast,
  updateChannel,
} from '@/lib/pulse';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PULSE_RED } from './cards';

/** Slugify → lowercase [a-z0-9-], collapsed, 2–40 (channel handles). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ───────────────────────── Shared scaffold ─────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        aria-label={title}
        className="relative z-10 m-0 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-zinc-200 border-b bg-white px-5 py-3">
          <h2 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '17px' }}>
            {title}
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
        <div className="space-y-3 px-5 py-4">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-zinc-200 border-t bg-white px-5 py-3">
          {footer}
        </div>
      </dialog>
    </div>
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

const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400';

function CancelButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="rounded-md px-3 py-2 text-zinc-500 hover:text-zinc-800"
      style={{ fontSize: '13px' }}
    >
      Cancel
    </button>
  );
}

function SubmitButton({
  onClick,
  disabled,
  children,
}: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
      style={{ background: PULSE_RED, fontSize: '14px' }}
    >
      {children}
    </button>
  );
}

// ───────────────────────── Channel create / edit ─────────────────────────

/**
 * Create or edit a PULSE channel. Pass `editing` to prefill and save via
 * pulse_channel_update (handle immutable) instead of pulse_channel_create.
 */
export function ChannelModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: PulseChannel | null;
  onClose: () => void;
  onSaved: (handle: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [handle, setHandle] = useState(editing?.handle ?? '');
  const [handleTouched, setHandleTouched] = useState(!!editing);
  const [tagline, setTagline] = useState(editing?.tagline ?? '');
  const [locationText, setLocationText] = useState(editing?.locationText ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveHandle = handleTouched ? handle : slugify(name);
  const nameOk = name.trim().length >= 2;
  const handleOk = /^[a-z0-9-]{2,40}$/.test(effectiveHandle);
  const canSubmit = nameOk && handleOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: ChannelInput = {
        name: name.trim(),
        tagline: tagline.trim() || null,
        locationText: locationText.trim() || null,
        // Keep existing imagery on edit; uploads swap it separately.
        avatarUrl: editing?.avatarUrl ?? null,
        bannerUrl: editing?.bannerUrl ?? null,
      };
      if (editing) {
        await updateChannel(input);
        onSaved(editing.handle);
      } else {
        await createChannel({ ...input, handle: effectiveHandle });
        onSaved(effectiveHandle);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save channel');
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={editing ? 'Edit channel' : 'Create your channel'}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create channel'}
          </SubmitButton>
        </>
      }
    >
      <Field label="Name" hint={`${name.trim().length}/60`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Freedom Signal"
          className={inputCls}
          style={{ fontSize: '14px' }}
        />
      </Field>

      <Field
        label="Handle"
        hint={
          editing
            ? 'handles are permanent'
            : handleOk
              ? `/pulse/c/${effectiveHandle}`
              : 'a–z, 0–9, hyphen · 2–40'
        }
      >
        <input
          value={effectiveHandle}
          disabled={!!editing}
          onChange={(e) => {
            setHandleTouched(true);
            setHandle(slugify(e.target.value));
          }}
          maxLength={40}
          placeholder="freedom-signal"
          className={cn(
            inputCls,
            'font-mono disabled:bg-zinc-50 disabled:text-zinc-400',
            effectiveHandle && !handleOk && !editing ? 'border-red-300' : '',
          )}
          style={{ fontSize: '13px' }}
        />
      </Field>

      <Field label="Tagline" hint="optional">
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={140}
          placeholder="One line on what this channel covers"
          className={inputCls}
          style={{ fontSize: '14px' }}
        />
      </Field>

      <Field label="Location" hint="optional">
        <input
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="City / area"
          className={inputCls}
          style={{ fontSize: '13px' }}
        />
      </Field>

      {error && (
        <p className="text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
    </ModalShell>
  );
}

// ───────────────────────── Schedule broadcast ─────────────────────────

export function ScheduleModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (broadcastId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [startsLocal, setStartsLocal] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startsIso = localToIso(startsLocal);
  const canSubmit = title.trim().length >= 2 && !!startsIso && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !startsIso) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await scheduleBroadcast({
        title: title.trim(),
        scheduledAt: startsIso,
        summary: summary.trim() || null,
      });
      onSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule');
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Schedule a broadcast"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Scheduling…' : 'Schedule'}
          </SubmitButton>
        </>
      }
    >
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday night signal check"
          className={inputCls}
          style={{ fontSize: '14px' }}
        />
      </Field>
      <Field label="Starts">
        <input
          type="datetime-local"
          value={startsLocal}
          onChange={(e) => setStartsLocal(e.target.value)}
          className={inputCls}
          style={{ fontSize: '13px' }}
        />
      </Field>
      <Field label="Summary" hint="optional">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="What you'll cover…"
          className={cn(inputCls, 'resize-none')}
          style={{ fontSize: '14px', lineHeight: 1.5 }}
        />
      </Field>
      <p className="font-mono text-zinc-400" style={{ fontSize: '10.5px' }} data-size="meta">
        Going live lands with the LiveKit rail — scheduled broadcasts show in Upcoming now.
      </p>
      {error && (
        <p className="text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
    </ModalShell>
  );
}

// ───────────────────────── Publish video ─────────────────────────

export function PublishVodModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (broadcastId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlOk = /^https?:\/\/.+/.test(url.trim());
  const canSubmit = title.trim().length >= 2 && urlOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await publishVod({
        title: title.trim(),
        recordingUrl: url.trim(),
        summary: summary.trim() || null,
      });
      onSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Publish a video"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Publishing…' : 'Publish'}
          </SubmitButton>
        </>
      }
    >
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What the mainstream missed this week"
          className={inputCls}
          style={{ fontSize: '14px' }}
        />
      </Field>
      <Field label="Video URL" hint="direct .mp4/.webm plays inline">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… video file URL"
          className={cn(inputCls, 'font-mono', url && !urlOk ? 'border-red-300' : '')}
          style={{ fontSize: '12.5px' }}
        />
      </Field>
      <Field label="Summary" hint="optional">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="What it covers…"
          className={cn(inputCls, 'resize-none')}
          style={{ fontSize: '14px', lineHeight: 1.5 }}
        />
      </Field>
      {error && (
        <p className="text-red-600" style={{ fontSize: '12px' }}>
          {error}
        </p>
      )}
    </ModalShell>
  );
}
