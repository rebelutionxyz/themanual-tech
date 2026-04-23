import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isSaved, toggleSave } from '@/lib/reactions';
import { cn } from '@/lib/utils';

interface SaveButtonProps {
  sourceSurface: string;
  sourceId: string;
  /** Preloaded saved state — skip initial fetch when provided */
  initialSaved?: boolean;
  compact?: boolean;
  onChange?: (saved: boolean) => void;
}

export function SaveButton({
  sourceSurface,
  sourceId,
  initialSaved,
  compact = false,
  onChange,
}: SaveButtonProps) {
  const { bee } = useAuth();
  const [saved, setSaved] = useState<boolean>(initialSaved ?? false);
  const [loading, setLoading] = useState(initialSaved === undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (initialSaved !== undefined) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await isSaved(sourceId, bee?.id ?? null);
      if (!cancelled) {
        setSaved(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, bee?.id, initialSaved]);

  async function handleToggle() {
    if (!bee || pending || loading) return;
    const next = !saved;
    setSaved(next); // optimistic
    setPending(true);
    try {
      await toggleSave(sourceSurface, sourceId, bee.id);
      if (onChange) onChange(next);
    } catch (err) {
      console.error('Save toggle failed:', err);
      setSaved(!next); // rollback
    } finally {
      setPending(false);
    }
  }

  const label = saved ? 'Saved' : 'Save';
  const title = !bee
    ? 'Sign in to save'
    : saved
      ? 'Remove from Saved'
      : 'Save to read later';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!bee || loading}
      title={title}
      aria-label={label}
      aria-pressed={saved}
      className={cn(
        'flex items-center gap-1 rounded-md border transition-all',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        saved
          ? 'border-honey/40 bg-honey/10 text-honey'
          : 'border-border bg-bg-elevated text-text-silver hover:border-text-silver/40 hover:bg-bg',
        !bee && 'cursor-not-allowed opacity-50',
        pending && 'opacity-60',
      )}
      style={{ fontSize: compact ? '11px' : '12px' }}
    >
      <Bookmark
        size={compact ? 11 : 13}
        fill={saved ? 'currentColor' : 'none'}
      />
      {!compact && <span>{label}</span>}
    </button>
  );
}
