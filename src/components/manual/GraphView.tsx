import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import type { Atom } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { useManualData, getAtomById } from '@/lib/useManualData';
import { ATOM_TYPE_COLORS, KETTLE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface GraphNode {
  id: string;
  atom: Atom;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

/**
 * Graph view centers on selected atom and radiates 2-hop neighborhood.
 * Uses simple force-directed layout (spring links + Coulomb repulsion).
 */
export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { atoms, themeIndex } = useManualData();
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const selectAtom = useManualStore((s) => s.selectAtom);

  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Compute the subgraph centered on selected atom
  const { nodes, links } = useMemo(() => {
    if (!selectedAtomId || atoms.length === 0) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
    }

    const center = atoms.find((a) => a.id === selectedAtomId);
    if (!center) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    // Collect 1-hop neighbors (share any theme tag)
    const neighborIds = new Map<string, number>(); // id → sharedTagCount
    for (const tag of center.themeTags) {
      const ids = themeIndex[tag] ?? [];
      for (const id of ids) {
        if (id === center.id) continue;
        neighborIds.set(id, (neighborIds.get(id) ?? 0) + 1);
      }
    }

    // Take top 25 neighbors by shared tag count
    const topNeighbors = Array.from(neighborIds.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([id]) => id);

    const includeIds = new Set<string>([center.id, ...topNeighbors]);

    // Build nodes with initial random positions on a circle
    const nodeList: GraphNode[] = [];
    const n = includeIds.size;
    let i = 0;
    for (const id of includeIds) {
      const atom = atoms.find((a) => a.id === id);
      if (!atom) continue;
      const isCenter = id === center.id;
      const angle = (i / n) * Math.PI * 2;
      const r = isCenter ? 0 : 180 + Math.random() * 60;
      nodeList.push({
        id,
        atom,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      });
      i++;
    }

    // Build links — center to each neighbor, plus neighbors to each other if they share tags
    const linkList: GraphLink[] = [];
    const idPairsAdded = new Set<string>();

    for (const a of nodeList) {
      for (const b of nodeList) {
        if (a.id >= b.id) continue;
        const key = `${a.id}:${b.id}`;
        if (idPairsAdded.has(key)) continue;
        const shared = a.atom.themeTags.filter((t) => b.atom.themeTags.includes(t));
        if (shared.length > 0) {
          linkList.push({ source: a.id, target: b.id, strength: shared.length });
          idPairsAdded.add(key);
        }
      }
    }

    // Run physics iterations
    runPhysics(nodeList, linkList, 250);

    return { nodes: nodeList, links: linkList };
  }, [selectedAtomId, atoms, themeIndex]);

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

  if (!selectedAtomId || nodes.length === 0) {
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

  const centerId = selectedAtomId;

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
            const involvesCenter = s.id === centerId || t.id === centerId;
            return (
              <line
                key={`link-${link.source}-${link.target}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={involvesCenter ? '#C8D1DA' : '#2A3138'}
                strokeOpacity={involvesCenter ? 0.5 + link.strength * 0.1 : 0.2}
                strokeWidth={involvesCenter ? 1 + link.strength * 0.3 : 0.8}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => {
            const isCenter = n.id === centerId;
            const typeColor = ATOM_TYPE_COLORS[n.atom.type] ?? '#8A94A0';
            const radius = isCenter ? 10 : 6;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: SVG graph nodes are visual; per-node tabIndex would create unusable tab-order; keyboard navigation handled by separate atom list UI
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="graph-node cursor-pointer"
                onClick={() => selectAtom(n.id)}
              >
                <circle
                  r={radius}
                  fill={typeColor}
                  stroke={isCenter ? '#F8F9FA' : '#14171C'}
                  strokeWidth={isCenter ? 2 : 1.5}
                />
                <circle
                  r={radius + 2}
                  fill="transparent"
                  stroke={KETTLE_COLORS[n.atom.kettle]}
                  strokeWidth={1}
                  strokeOpacity={0.6}
                />
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
