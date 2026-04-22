import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createThread } from '@/lib/intel';
import { AtomPicker } from '@/components/intel/AtomPicker';
import { cn } from '@/lib/utils';

/**
 * Thread composer — /intel/new
 */
export function NewThreadPage() {
  const { bee, configured } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [atomIds, setAtomIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 2 && body.trim().length >= 1 && !submitting && !!bee;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !bee) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await createThread(
        { title: title.trim(), body: body, atomIds },
        bee.id,
      );
      navigate(`/intel/t/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
      setSubmitting(false);
    }
  }

  // Not logged in? Prompt to sign in.
  if (!bee) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center gap-3">
          <Link
            to="/intel"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-silver hover:bg-bg-elevated"
            aria-label="Back to INTEL"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-text-silver-bright">
            Sign in to start a thread
          </h1>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-bg-elevated/40 p-6">
          <p className="text-text-silver" style={{ fontSize: '14px' }}>
            Anyone can read INTEL. To start a thread, you need to be a Bee.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-md border border-text-silver/30 bg-bg-elevated px-4 py-2 text-text-silver-bright hover:border-text-silver/60"
            style={{ fontSize: '13px' }}
          >
            Sign in or sign up →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-12">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/intel"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border text-text-silver hover:bg-bg-elevated"
          aria-label="Back to INTEL"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            INTEL · new thread
          </div>
          <h1 className="font-display text-2xl font-semibold text-text-silver-bright">
            Start a discussion
          </h1>
        </div>
        <MessagesSquare size={20} style={{ color: '#6B94C8' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block">
            <span
              className="mb-1.5 block font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              placeholder="What's this thread about?"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
              style={{ fontSize: '15px' }}
              required
            />
          </label>
          <div
            className="mt-1 text-right font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {title.length}/300
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block">
            <span
              className="mb-1.5 block font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Body
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Make your case. Cite sources if you have them. Link atoms below."
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
              style={{ fontSize: '14px', lineHeight: '1.6' }}
              required
            />
          </label>
        </div>

        {/* Atom picker */}
        <AtomPicker
          value={atomIds}
          onChange={setAtomIds}
          label="Linked atoms"
          placeholder="Link this thread to Manual atoms (optional but encouraged)"
          max={10}
        />

        {/* Error */}
        {error && (
          <div className="rounded-md border border-kettle-unsourced/30 bg-kettle-unsourced/10 p-3">
            <p className="text-kettle-unsourced" style={{ fontSize: '12px' }}>
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Link
            to="/intel"
            className="rounded-md px-4 py-2 text-text-silver hover:bg-bg-elevated"
            style={{ fontSize: '13px' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-4 py-2 transition-all',
              canSubmit
                ? 'border-text-silver/40 bg-bg-elevated text-text-silver-bright hover:border-text-silver/70 hover:bg-panel-2'
                : 'cursor-not-allowed border-border bg-bg-elevated text-text-dim opacity-60',
            )}
            style={{ fontSize: '13px' }}
          >
            <Send size={14} />
            {submitting ? 'Posting...' : 'Post thread'}
          </button>
        </div>

        {!configured && (
          <div className="rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
            <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
              Supabase not configured. Posting disabled.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
