/**
 * Time-lens presets — a single window selector that drives the feed RPCs'
 * `p_after` (cutoff). `p_before` stays null (no upper bound). Convert to the ISO
 * cutoff at FETCH time (not render time — `timeAfterISO` calls Date.now(), so it
 * must not be a render-stable value / effect dep; depend on the preset KEY).
 */
export interface TimePreset {
  key: string;
  label: string;
  /** Lookback window in ms; null = no filter ('All time'). */
  windowMs: number | null;
}

const HOUR = 3_600_000;
const DAY = 86_400_000;
const YEAR = 365 * DAY;

export const TIME_PRESETS: TimePreset[] = [
  { key: '1h', label: 'Past hour', windowMs: HOUR },
  { key: '4h', label: 'Past 4 hours', windowMs: 4 * HOUR },
  { key: '8h', label: 'Past 8 hours', windowMs: 8 * HOUR },
  { key: '12h', label: 'Past 12 hours', windowMs: 12 * HOUR },
  { key: '24h', label: 'Past 24 hours', windowMs: 24 * HOUR },
  { key: '72h', label: 'Past 72 hours', windowMs: 72 * HOUR },
  { key: '7d', label: 'Past week', windowMs: 7 * DAY },
  { key: '14d', label: 'Past 2 weeks', windowMs: 14 * DAY },
  { key: '30d', label: 'Past month', windowMs: 30 * DAY },
  { key: '180d', label: 'Past 6 months', windowMs: 180 * DAY },
  { key: '365d', label: 'Past year', windowMs: YEAR },
  { key: '5y', label: 'Past 5 years', windowMs: 5 * YEAR },
  { key: '10y', label: 'Past 10 years', windowMs: 10 * YEAR },
  { key: 'all', label: 'All time', windowMs: null },
];

const BY_KEY = new Map(TIME_PRESETS.map((p) => [p.key, p]));

/** Preset key → ISO cutoff for `p_after`. null / 'all' / unknown = no filter. */
export function timeAfterISO(key: string | null): string | null {
  if (!key) return null;
  const preset = BY_KEY.get(key);
  if (!preset || preset.windowMs == null) return null;
  return new Date(Date.now() - preset.windowMs).toISOString();
}

/** Preset key → its label (for the inline lens-row display). null when unset. */
export function timePresetLabel(key: string | null): string | null {
  return key ? (BY_KEY.get(key)?.label ?? null) : null;
}
