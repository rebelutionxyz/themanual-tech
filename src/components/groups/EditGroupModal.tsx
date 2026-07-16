import { type Group, type GroupVisibility, updateGroupDetails } from '@/lib/groups';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const UNITE_COLOR = '#7C3AED';

const VISIBILITY_OPTS: { value: GroupVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can find and join' },
  { value: 'private', label: 'Private', hint: 'Hidden; entered by invite' },
  { value: 'secret', label: 'Secret', hint: 'Invisible to non-members' },
];

/**
 * Owner-only details editor (name, tagline, description, visibility).
 * Writes ride the groups_update_owner RLS policy directly. Slug is
 * immutable (it's the URL). White-shell styling, UNITE purple.
 */
export function EditGroupModal({
  group,
  onClose,
  onSaved,
}: {
  group: Group;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [tagline, setTagline] = useState(group.tagline ?? '');
  const [description, setDescription] = useState(group.description ?? '');
  const [visibility, setVisibility] = useState<GroupVisibility>(group.visibility);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 80;
  const canSubmit = nameOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateGroupDetails(group.id, {
        name: name.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        // Visibility rides the same owner policy; RLS enforces ownership.
        ...(visibility !== group.visibility ? { visibility } : {}),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; modal is dismissable via Esc and the close button */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-label="Edit group details"
        className="relative z-10 m-0 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 className="font-display tracking-wide text-zinc-900" style={{ fontSize: '17px' }}>
            Edit group details
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
          <Field label="Name" hint={`${name.trim().length}/80`}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <Field label="Tagline" hint="optional">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              placeholder="One line on what this group is for"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <Field label="Description" hint="optional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What the group does, who it's for…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
              style={{ fontSize: '14px', lineHeight: 1.5 }}
            />
          </Field>

          <Field label="Visibility">
            <div className="grid grid-cols-3 gap-1.5">
              {VISIBILITY_OPTS.map((opt) => {
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    title={opt.hint}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-center transition-colors',
                      active
                        ? 'text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
                    )}
                    style={
                      active
                        ? { background: UNITE_COLOR, borderColor: UNITE_COLOR, fontWeight: 600 }
                        : undefined
                    }
                  >
                    <span style={{ fontSize: '12px' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-zinc-500" style={{ fontSize: '11px' }}>
              {VISIBILITY_OPTS.find((o) => o.value === visibility)?.hint}
            </p>
          </Field>

          {error && (
            <p className="text-red-600" style={{ fontSize: '12px' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3">
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
            className="inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
            style={{ background: UNITE_COLOR, fontSize: '14px' }}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
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
