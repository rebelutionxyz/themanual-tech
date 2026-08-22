/* ASTRA LOGO MARKS — SHELL v1.5 per-astra logo slot.
 *
 * h24 = butterfly, OUTLINE, drawn in the astra color (currentColor, so the
 * caller sets color: var(--accent)). rebelution.[tld] = the fist mark: a flat
 * trace — circle / chord / triangle in BRAND red #d43333 + an ink fist.
 *
 * Both are inline SVG (no asset request, crisp at any size, theme-aware via
 * currentColor). Sized by the `size` prop; default 20 to sit in the 44px header.
 */

export interface AstraMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** h24 butterfly — outline, inherits color (astra accent) via currentColor. */
export function ButterflyMark({ size = 20, className, title = 'h24' }: AstraMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* body */}
      <path d="M12 5.5v13" />
      {/* antennae */}
      <path d="M12 5.5c-.6-1.2-1.7-2-2.7-2M12 5.5c.6-1.2 1.7-2 2.7-2" />
      {/* upper wings */}
      <path d="M12 8.5C10.3 5.9 7.4 4.6 5.2 5.2 3.2 5.8 3 8.4 4.6 10.3c1.5 1.8 4.6 2.3 7.4.9" />
      <path d="M12 8.5c1.7-2.6 4.6-3.9 6.8-3.3 2 .6 2.2 3.2.6 5.1-1.5 1.8-4.6 2.3-7.4.9" />
      {/* lower wings */}
      <path d="M12 10.4c-1.4 2.6-4 4-6 3.6-1.8-.4-2.2-2.7-.8-4.4" />
      <path d="M12 10.4c1.4 2.6 4 4 6 3.6 1.8-.4 2.2-2.7.8-4.4" />
    </svg>
  );
}

/** Rebelution fist mark — flat trace: circle + chord + triangle (BRAND red) + ink fist. */
export function FistMark({ size = 20, className, title = 'Rebelution' }: AstraMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* circle / chord / triangle — BRAND red #d43333 (rebelution mark only) */}
      <circle cx="12" cy="12" r="9.25" stroke="#d43333" strokeWidth="1.5" />
      <path d="M4.6 6.4h14.8" stroke="#d43333" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M12 3.2 19.4 6.4 12 9.6 4.6 6.4Z"
        stroke="#d43333"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* ink fist — simplified raised fist in ink (currentColor set to ink by caller) */}
      <path
        d="M9 12.4h5.2c.7 0 1.2.5 1.2 1.2v2.1c0 1.6-1.3 2.9-2.9 2.9h-1.9c-1.6 0-2.9-1.3-2.9-2.9v-2.1c0-.7.5-1.2 1.2-1.2Z"
        fill="currentColor"
      />
      <path
        d="M9.1 12.4v-1.7M11 12.4v-2.2M12.9 12.4v-2.1M14.6 12.6v-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AstraMark({ logo, ...rest }: AstraMarkProps & { logo: 'butterfly' | 'fist' }) {
  return logo === 'butterfly' ? <ButterflyMark {...rest} /> : <FistMark {...rest} />;
}
