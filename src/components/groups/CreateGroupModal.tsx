import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createGroup, type GroupVisibility } from '@/lib/groups';
import { cn } from '@/lib/utils';

const UNITE_COLOR = '#6FCF8F';

const VISIBILITY_OPTS: { value: GroupVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can find and join' },
  { value: 'private', label: 'Private', hint: 'Hidden; entered by invite' },
  { value: 'secret', label: 'Secret', hint: 'Invisible to non-members' },
];

/** Slugify a name → lowercase [a-z0-9-], collapsed, 2–60. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [visibility, setVisibility] = useState<GroupVisibility>('public');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from name until the Bee edits the slug directly.
  const effectiveSlug = slugTouched ? slug : slugify(name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 80;
  const slugOk = /^[a-z0-9-]{2,60}$/.test(effectiveSlug);
  const canSubmit = nameOk && slugOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroup({
        name: name.trim(),
        slug: effectiveSlug,
        visibility,
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
      });
      onCreated(result.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; modal is dismissable via Esc and the close button */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <dialog
        open
        aria-label="Create a group"
        className="relative z-10 m-0 w-full max-w-md overflow-hidden rounded-xl border border-border bg-bg-elevated p-0 text-text shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-display tracking-wide text-text-silver-bright" style={{ fontSize: '17px' }}>
            Create a group
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-bg hover:text-text-silver"
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
              placeholder="Sovereign Beekeepers"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <Field label="URL slug" hint={slugOk ? `/unite/${effectiveSlug}` : 'a–z, 0–9, hyphen · 2–60'}>
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              maxLength={60}
              placeholder="sovereign-beekeepers"
              className={cn(
                'w-full rounded-md border bg-bg px-3 py-2 font-mono text-text outline-none focus:border-border-bright',
                effectiveSlug && !slugOk ? 'border-kettle-unsourced/50' : 'border-border',
              )}
              style={{ fontSize: '13px' }}
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
                        ? 'text-bg'
                        : 'border-border bg-bg text-text-silver hover:border-border-bright',
                    )}
                    style={active ? { background: UNITE_COLOR, borderColor: UNITE_COLOR, fontWeight: 600 } : undefined}
                  >
                    <span style={{ fontSize: '12px' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }}>
              {VISIBILITY_OPTS.find((o) => o.value === visibility)?.hint}
            </p>
          </Field>

          <Field label="Tagline" hint="optional">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              placeholder="One line on what this group is for"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-border-bright"
              style={{ fontSize: '14px' }}
            />
          </Field>

          <Field label="Description" hint="optional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What the group does, who it's for…"
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

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 font-medium text-bg transition-colors disabled:pointer-events-none disabled:opacity-50"
            style={{ background: UNITE_COLOR, fontSize: '14px' }}
          >
            {submitting ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </dialog>
    </div>
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
