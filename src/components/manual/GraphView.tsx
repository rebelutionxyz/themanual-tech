import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import type { Atom } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { useManualData, getAtomById } from '@/lib/useManualData';
import { getNeighbors, type EdgeType } from '@/lib/graph-neighbors';
import { ATOM_TYPE_COLORS, KETTLE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface GraphNode {
  id: string;
  atom: Atom;
  x: number;
  y: number;
  vx: number;
  vy: number;
  synthetic?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  type?: EdgeType;
}

/**
 * Graph view centers on selected atom and radiates 2-hop neighborhood.
 * Uses simple force-directed layout (spring links + Coulomb repulsion).
 */
export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { atoms, themeIndex, pathIndexes } = useManualData();
  const gcAtomId = useManualStore((s) => s.graphCenter?.atomId);
  const gcPath = useManualStore((s) => s.graphCenter?.path);
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const selectAtom = useManualStore((s) => s.selectAtom);
  const setGraphCenter = useManualStore((s) => s.setGraphCenter);

  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Compute the bounded neighborhood centered on the graph center (atom or category/realm path).
  // `center` is built INSIDE the memo from primitive deps so physics only re-simulates on real change.
  const { nodes, links, centerId } = useMemo(() => {
    const center = gcAtomId
      ? { atomId: gcAtomId }
      : gcPath
        ? { path: gcPath }
        : selectedAtomId
          ? { atomId: selectedAtomId }
          : null;
    if (!center || atoms.length === 0) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[], centerId: null as string | null };
    }
    const { centerKey, centerLabel, neighborIds, edges } = getNeighbors(center, pathIndexes, themeIndex, {
      hops: 2,
      cap: 28,
    });
    if (!centerKey) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[], centerId: null as string | null };
    }

    const nodeKeys = [centerKey, ...neighborIds];
    const n = nodeKeys.length;
    const nodeList: GraphNode[] = [];
    nodeKeys.forEach((key, i) => {
      const real = pathIndexes.byId.get(key);
      const isCenter = key === centerKey;
      // synthetic center is used only for non-atom realm/category roots
      const atom = real ?? ({ id: centerKey, name: centerLabel } as Atom);
      const angle = (i / n) * Math.PI * 2;
      const r = isCenter ? 0 : 180 + Math.random() * 60;
      nodeList.push({
        id: key,
        atom,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        synthetic: !real,
      });
    });

    const present = new Set(nodeList.map((nd) => nd.id));
    const linkList: GraphLink[] = edges
      .filter((e) => present.has(e.source) && present.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, strength: e.strength, type: e.type }));

    runPhysics(nodeList, linkList, 250);
    return { nodes: nodeList, links: linkList, centerId: centerKey };
  }, [gcAtomId, gcPath, selectedAtomId, atoms, themeIndex, pathIndexes]);

  // Resize observer
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const viewW = dims.w / scale;
  const viewH = dims.h / scale;
  const viewBox = `${-viewW / 2 + tx} ${-viewH / 2 + ty} ${viewW} ${viewH}`;

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.111;
    setScale((s) => Math.max(0.3, Math.min(3, s * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('.graph-node')) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !dragStart) return;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    setTx((x) => x - dx);
    setTy((y) => y - dy);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  if (!centerId || nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <Network size={48} className="mx-auto mb-4 text-text-muted" />
          <p className="font-display text-xl text-text-silver">Graph View</p>
          <p className="mt-2 text-text-dim" style={{ fontSize: '13px' }}>
            Select any atom to see its theme-tag neighborhood
          </p>
          <p
            className="mt-1 font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            shared tags connect atoms across realms
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <title>Graph view centered on selected atom</title>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#2A3138" />
          </marker>
        </defs>

        {/* Links */}
        <g>
          {links.map((link) => {
            const s = nodes.find((n) => n.id === link.source);
            const t = nodes.find((n) => n.id === link.target);
            if (!s || !t) return null;
            const structural = link.type !== 'tag';
            const involvesCenter = s.id === centerId || t.id === centerId;
            return (
              <line
                key={`link-${link.source}-${link.target}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={link.type === 'tag' ? '#3A4048' : involvesCenter ? '#C8D1DA' : '#5A6B7A'}
                strokeOpacity={structural ? 0.45 + link.strength * 0.12 : 0.22}
                strokeWidth={structural ? 1 + link.strength * 0.4 : 0.7}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => {
            const isCenter = n.id === centerId;
            const typeColor = n.synthetic ? '#C8D1DA' : (ATOM_TYPE_COLORS[n.atom.type] ?? '#8A94A0');
            const radius = isCenter ? 10 : 6;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: SVG graph nodes are visual; per-node tabIndex would create unusable tab-order; keyboard navigation handled by separate atom list UI
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="graph-node cursor-pointer"
                onClick={() => {
                  if (n.synthetic) {
                    // realm/category root → drill its path in place
                    setGraphCenter({ path: n.id });
                  } else {
                    // atom → re-center the graph and update the detail panel
                    setGraphCenter({ atomId: n.id });
                    selectAtom(n.id);
                  }
                }}
              >
                <circle
                  r={radius}
                  fill={typeColor}
                  stroke={isCenter ? '#F8F9FA' : '#14171C'}
                  strokeWidth={isCenter ? 2 : 1.5}
                />
                {!n.synthetic && (
                  <circle
                    r={radius + 2}
                    fill="transparent"
                    stroke={KETTLE_COLORS[n.atom.kettle] ?? '#3A4048'}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                  />
                )}
                <text
                  x={radius + 4}
                  y={3}
                  fill={isCenter ? '#F8F9FA' : '#C8D1DA'}
                  style={{
                    fontSize: isCenter ? '13px' : '11px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: isCenter ? 600 : 400,
                    pointerEvents: 'none',
                  }}
                >
                  {truncate(n.atom.name, 28)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <ZoomBtn onClick={() => setScale((s) => Math.min(3, s * 1.2))}>+</ZoomBtn>
        <ZoomBtn onClick={() => setScale((s) => Math.max(0.3, s * 0.8))}>−</ZoomBtn>
        <ZoomBtn
          onClick={() => {
            setScale(1);
            setTx(0);
            setTy(0);
          }}
          className="text-xs"
        >
          ⌂
        </ZoomBtn>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 rounded border border-border bg-bg-elevated/90 p-2 backdrop-blur"
        style={{ fontSize: '11px' }}
      >
        <p
          className="mb-1.5 font-mono uppercase text-text-muted"
          style={{ fontSize: '10px', letterSpacing: '0.1em' }}
        >
          Types
        </p>
        {Object.entries(ATOM_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 py-0.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-text-silver" style={{ fontSize: '11px' }}>
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoomBtn({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded border border-border bg-bg-elevated text-text-silver',
        'hover:border-border-bright hover:text-text',
        className,
      )}
    >
      {children}
    </button>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/**
 * Simple force-directed layout: spring links + Coulomb repulsion + center pull.
 * Mutates node positions in place.
 */
function runPhysics(nodes: GraphNode[], links: GraphLink[], iterations: number) {
  const L = 120; // desired link length
  const K_LINK = 0.04;
  const K_REP = 3500;
  const DAMP = 0.82;
  const CENTER_PULL = 0.002;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (let step = 0; step < iterations; step++) {
    // Reset velocities
    for (const n of nodes) {
      n.vx = 0;
      n.vy = 0;
    }

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy + 1;
        const d = Math.sqrt(d2);
        const f = K_REP / d2;
        a.vx += (f * dx) / d;
        a.vy += (f * dy) / d;
        b.vx -= (f * dx) / d;
        b.vy -= (f * dy) / d;
      }
    }

    // Spring forces on links
    for (const link of links) {
      const a = byId.get(link.source);
      const b = byId.get(link.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = K_LINK * (d - L) * Math.min(link.strength, 3);
      a.vx += (f * dx) / d;
      a.vy += (f * dy) / d;
      b.vx -= (f * dx) / d;
      b.vy -= (f * dy) / d;
    }

    // Center pull + integration
    for (const n of nodes) {
      n.vx += -n.x * CENTER_PULL;
      n.vy += -n.y * CENTER_PULL;
      n.x += n.vx * DAMP;
      n.y += n.vy * DAMP;
    }
  }
}

// silence unused warning
void getAtomById;
