import { cn } from '@/lib/utils';

interface TagChipProps {
  tag: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

export function TagChip({ tag, active, onClick, count, className }: TagChipProps) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono transition-colors',
        'border',
        active
          ? 'bg-text-silver/20 border-text-silver/60 text-text'
          : 'bg-bg-elevated border-border text-text-dim hover:border-border-bright hover:text-text-silver',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{ fontSize: '11px', lineHeight: '14px' }}
      data-size="meta"
    >
      {tag}
      {typeof count === 'number' && (
        <span className="text-text-muted">({count})</span>
      )}
    </Tag>
  );
}
