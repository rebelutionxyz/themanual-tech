import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'silver';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-silver/50',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' && 'px-2.5 py-1 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' &&
          'bg-text text-bg hover:bg-text-silver-bright active:bg-text-silver',
        variant === 'secondary' &&
          'bg-bg-elevated border border-border text-text hover:border-border-bright',
        variant === 'silver' &&
          'bg-text-silver/10 border border-text-silver/30 text-text-silver-bright hover:bg-text-silver/20',
        variant === 'ghost' && 'text-text-dim hover:text-text hover:bg-bg-elevated',
        className,
      )}
    >
      {children}
    </button>
  );
}
