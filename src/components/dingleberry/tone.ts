/* DingleBERRY — re-skinned tone tokens.
   ------------------------------------------------------------
   The artifact shipped a JUSTICE skin (navy #1B3A5B + gold #B8902F on paper).
   That skin is DROPPED. DingleBERRY rides the repo's dark Manual tokens with
   a SECURITY palette — RED / BLUE / WHITE / GREEN, zero yellow/gold:
     · identity  RED   #DC2626   (the Astra accent)
     · data      BLUE  #3B82F6   (structural — mesh, load dots, self-heal)
     · status    BLUE  #60A5FA   (watch — distinct lighter shade so a watch
                                   pill never reads as a structural element)
     · secure    GREEN #6FCF8F   (= kettle.sourced)
     · critical  RED   #DC2626
   HONEY (#FAD15E) is BLiNG!-only and MUST NEVER appear here. No amber/gold. */
import type { Tone } from '@/lib/dingleberry/contract';

/** DingleBERRY identity red — the SECURITY Astra accent. */
export const DINGLEBERRY_COLOR = '#DC2626';
/** Structural data accent (blue) — mesh icon, load dots, self-heal badge. */
export const DATA_BLUE = '#3B82F6';
/** Status / watch accent — a lighter blue, kept distinct from DATA_BLUE so a
    "watch" pill never visually collapses into the structural blue. */
export const STATUS_BLUE = '#60A5FA';

export interface ToneSkin {
  /** foreground / accent */
  c: string;
  /** translucent fill that reads on the dark canvas */
  tint: string;
  /** border at full-ish opacity */
  border: string;
  label: string;
}

export const TONE: Record<Tone, ToneSkin> = {
  secure:   { c: '#6FCF8F', tint: 'rgba(111,207,143,0.12)', border: 'rgba(111,207,143,0.38)', label: 'SECURE' },
  watch:    { c: '#60A5FA', tint: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.42)', label: 'WATCH' },
  critical: { c: '#DC2626', tint: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.45)',   label: 'CRITICAL' },
  info:     { c: '#3B82F6', tint: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.38)',  label: 'INFO' },
  idle:     { c: '#8A94A0', tint: 'rgba(138,148,160,0.10)', border: '#2A3138',                label: 'IDLE' },
};

export type Posture = 'secure' | 'degraded' | 'critical';

/** posture → the tone its header/accents render in */
export const POSTURE_TONE: Record<Posture, Tone> = {
  secure: 'secure',
  degraded: 'watch',
  critical: 'critical',
};

/** SourceVerification Discovery-Ladder status → repo kettle token (per dispatch). */
export const STATUS_KETTLE: Record<string, string> = {
  sourced: '#6FCF8F',   // kettle.sourced
  accepted: '#6B94C8',  // kettle.accepted
  emerging: '#E88938',  // kettle.emerging
  fringe: '#9B7FC8',    // kettle.fringe
  unsourced: '#C94C4C', // kettle.unsourced
};
