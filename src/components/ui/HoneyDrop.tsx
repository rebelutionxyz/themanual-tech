interface HoneyDropProps {
  size?: number;
  className?: string;
  animate?: boolean;
  /**
   * When true, applies the `animate-bling-hop` motion (hop/skip/jump signature
   * per MMF §15.1). Caller is responsible for toggling on/off — see SiteHeader's
   * use of the `bling-hop` window event.
   */
  hopping?: boolean;
}

/**
 * Custom honey drop SVG — replaces the blue water 💧 emoji everywhere.
 * Gold, luminescent. BLiNG! signature mark.
 */
export function HoneyDrop({ size = 14, className, animate = false, hopping = false }: HoneyDropProps) {
  const animClass = hopping ? 'animate-bling-hop' : animate ? 'animate-honey-drop' : '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 20"
      fill="none"
      className={`inline-block ${animClass} ${className ?? ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="honeyGrad" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#FFEDB3" />
          <stop offset="50%" stopColor="#FAD15E" />
          <stop offset="100%" stopColor="#C89A2E" />
        </radialGradient>
      </defs>
      <path
        d="M8 1 C8 1, 2 9, 2 13 A6 6 0 0 0 14 13 C14 9, 8 1, 8 1 Z"
        fill="url(#honeyGrad)"
        stroke="#A87F1E"
        strokeWidth="0.5"
      />
      <ellipse cx="5.5" cy="7" rx="1.5" ry="2.3" fill="#FFF5D1" opacity="0.55" />
    </svg>
  );
}
