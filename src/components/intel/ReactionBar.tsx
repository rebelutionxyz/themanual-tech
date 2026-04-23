import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  REACTION_TYPES,
  REACTION_LABELS,
  REACTION_HINTS,
  REACTION_NAMES,
  getReactions,
  toggleReaction,
  type ReactionType,
  type ReactionSummary,
} from '@/lib/reactions';
import { cn } from '@/lib/utils';

interface ReactionBarProps {
  sourceSurface: string;          // 'intel'
  sourceId: string;
  sourceKind: 'thread' | 'post';
  /** Preloaded summary — when provided, skip initial fetch. Useful in lists. */
  initialSummary?: ReactionSummary;
  /** Compact variant — smaller spacing, hide zero counts */
  compact?: boolean;
}

// Per-reaction accent colors — mirrors the semantic intent. When a Bee clicks
// a reaction, the button glows in that reaction's color, not generic honey.
const REACTION_COLORS: Record<ReactionType, string> = {
  honey: '#FAD15E',    // honey gold — appreciation
  fire: '#E88938',     // orange — hot take
  thinking: '#B8A8F0', // lavender — questioning
  warning: '#C94C4C',  // crimson — flag
  check: '#6FCF8F',    // green — verified
};

/**
 * 5-reaction bar for any source (thread or post).
 * 🍯 🔥 🤔 ⚠️ ✓
 *
 * Click toggles the Bee's reaction. Optimistic update + refetch on error.
 *
 * Compact mode (on cards): hides zero-count reactions entirely, larger emoji,
 * per-reaction color glow when the Bee has reacted.
 * Full mode (thread page): shows all 5 reactions always, bigger tap targets.
 */
export function ReactionBar({
  sourceSurface,
  sourceId,
  sourceKind,
  initialSummary,
  compact = false,
}: ReactionBarProps) {
  const { bee } = useAuth();
  const [summary, setSummary] = useState<ReactionSummary>(
    initialSummary ?? {
      counts: { honey: 0, fire: 0, thinking: 0, warning: 0, check: 0 },
      myReactions: new Set(),
    },
  );
  const [loading, setLoading] = useState(!initialSummary);
  const [pending, setPending] = useState<Set<ReactionType>>(new Set());

  // Initial load if no summary provided
  useEffect(() => {
    if (initialSummary) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await getReactions(sourceId, bee?.id ?? null);
      if (!cancelled) {
        setSummary(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, bee?.id, initialSummary]);

  async function handleToggle(reaction: ReactionType) {
    if (!bee || pending.has(reaction)) return;

    // Optimistic update
    const wasReacted = summary.myReactions.has(reaction);
    const nextCounts = { ...summary.counts };
    const nextMy = new Set(summary.myReactions);
    if (wasReacted) {
      nextCounts[reaction] = Math.max(0, nextCounts[reaction] - 1);
      nextMy.delete(reaction);
    } else {
      nextCounts[reaction] = nextCounts[reaction] + 1;
      nextMy.add(reaction);
    }
    setSummary({ counts: nextCounts, myReactions: nextMy });

    const pSet = new Set(pending);
    pSet.add(reaction);
    setPending(pSet);

    try {
      await toggleReaction(sourceSurface, sourceId, sourceKind, reaction, bee.id);
    } catch (err) {
      console.error('Reaction toggle failed:', err);
      // Rollback
      setSummary(summary);
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(reaction);
        return n;
      });
    }
  }

  const disabled = !bee || loading;

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      {REACTION_TYPES.map((r) => {
        const count = summary.counts[r];
        const reacted = summary.myReactions.has(r);
        if (compact && count === 0 && !reacted) return null;

        const isPending = pending.has(r);
        const accent = REACTION_COLORS[r];
        return (
          <button
            key={r}
            type="button"
            onClick={(e) => {
              // Stop propagation when used inside a card (compact mode) so
              // clicking doesn't open the thread.
              if (compact) {
                e.preventDefault();
                e.stopPropagation();
              }
              handleToggle(r);
            }}
            disabled={disabled}
            title={bee ? REACTION_HINTS[r] : `Sign in to react — ${REACTION_NAMES[r]}`}
            aria-label={REACTION_NAMES[r]}
            aria-pressed={reacted}
            className={cn(
              'inline-flex items-center rounded-md border transition-all',
              // Bigger tap targets: min 24px height both modes, more padding full mode
              compact
                ? 'gap-1 px-2 py-1 min-h-[26px]'
                : 'gap-1.5 px-2.5 py-1.5 min-h-[32px]',
              !reacted &&
                'border-border bg-bg-elevated text-text-silver hover:border-text-silver/40 hover:bg-bg',
              !bee && 'cursor-not-allowed opacity-50',
              isPending && 'opacity-60',
            )}
            style={
              reacted
                ? {
                    borderColor: `${accent}60`,
                    background: `${accent}18`,
                    color: accent,
                  }
                : undefined
            }
          >
            <span
              style={{ fontSize: compact ? '14px' : '16px', lineHeight: 1 }}
            >
              {REACTION_LABELS[r]}
            </span>
            {count > 0 && (
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: compact ? '11px' : '12px',
                  fontWeight: reacted ? 600 : 500,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
