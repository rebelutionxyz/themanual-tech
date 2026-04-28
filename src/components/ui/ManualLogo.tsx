import { cn } from '@/lib/utils';

interface ManualLogoProps {
  size?: number;
  className?: string;
}

/**
 * 13-hex flower — The Manual's signature mark.
 * 1 center + 6 ring-1 + 6 partial ring-2 (first 6 only for the 13-count).
 * Silver, subtle glow on hover.
 */
export function ManualLogo({ size = 32, className }: ManualLogoProps) {
  // Pointy-top hex geometry. r = circumradius; hex width = r*sqrt(3), height = 2*r.
  const r = 10; // base radius for one hex
  const w = r * Math.sqrt(3); // horizontal step
  const h = 1.5 * r; // vertical step between rows

  // Hex point generator (pointy-top)
  const hexPoints = (cx: number, cy: number, radius: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`);
    }
    return pts.join(' ');
  };

  // Ring 1: 6 hexes at 60deg intervals around center
  const ring1: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    ring1.push([Math.cos(a) * w, Math.sin(a) * w * 0.866 * 2]);
  }

  // Using axial hex layout for cleanness
  const axialToXY = (q: number, ring1Row: number) => {
    const x = w * (q + ring1Row / 2);
    const y = h * ring1Row;
    return [x, y];
  };

  // Proper axial: center (0,0), 6 neighbors, then select 6 of the 12 ring2
  const positions: Array<[number, number]> = [[0, 0]];
  // Ring 1 offsets
  const ring1Offsets: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  for (const [q, row] of ring1Offsets) {
    positions.push(axialToXY(q, row) as [number, number]);
  }

  // Ring 2 (12 total, pick 6 alternating for visual balance)
  const ring2Offsets: Array<[number, number]> = [
    [2, 0],
    [1, 1],
    [-1, 2],
    [-2, 1],
    [-1, -1],
    [1, -2],
  ];
  for (const [q, row] of ring2Offsets) {
    positions.push(axialToXY(q, row) as [number, number]);
  }

  const viewSize = 84;
  const cx = viewSize / 2;
  const cy = viewSize / 2;

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      width={size}
      height={size}
      className={cn('no-drag', className)}
      aria-label="The Manual logo"
    >
      <title>The Manual</title>
      <defs>
        <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0E6EC" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#8A94A0" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <g>
        {positions.map(([dx, dy], i) => (
          <polygon
            key={`hex-${dx}-${dy}`}
            points={hexPoints(cx + dx, cy + dy, r - 1.2)}
            fill={i === 0 ? 'url(#silverGrad)' : 'transparent'}
            stroke="#C8D1DA"
            strokeWidth={i === 0 ? 0.8 : 1.1}
            strokeOpacity={i === 0 ? 1 : 0.75}
          />
        ))}
      </g>
    </svg>
  );
}
