import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SURFACE_BY_SLUG, SURFACES } from '@/lib/surfaces';
import { cn } from '@/lib/utils';

/**
 * Default rendering for any surface that hasn't been built out yet.
 * Uses the surface's metadata to render a real landing page with empty state.
 * No "coming soon" — the surface is live, just doesn't have content yet.
 */
export function SurfacePage() {
  const { slug } = useParams<{ slug: string }>();
  const surface = slug ? SURFACE_BY_SLUG.get(slug) : undefined;

  if (!surface) return <Navigate to="/s/manual" replace />;

  const Icon = surface.icon;
  const isBling = surface.special === 'bling';

  // Suggest a few adjacent surfaces
  const siblings = SURFACES.filter(
    (s) => s.group === surface.group && s.slug !== surface.slug,
  ).slice(0, 3);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-16">
        {/* Surface header */}
        <div className="mb-10 flex items-start gap-5">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2"
            style={{
              borderColor: `${surface.color}40`,
              background: `${surface.color}0D`,
            }}
          >
            <Icon size={32} style={{ color: surface.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {surface.group} · Surface
            </div>
            <h1
              className={cn(
                'mt-1 font-display text-4xl font-semibold tracking-wide md:text-5xl',
                isBling && 'bling',
              )}
              style={!isBling ? { color: surface.color } : undefined}
            >
              {surface.name}
            </h1>
            <p
              className="mt-1 font-mono text-text-silver"
              style={{ fontSize: '13px' }}
            >
              {surface.function}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-6">
          <p className="text-lg leading-relaxed text-text-silver-bright">
            {surface.description}
          </p>
          <p className="mt-3 text-text-dim" style={{ fontSize: '14px' }}>
            {surface.purpose}
          </p>
        </div>

        {/* Empty state for Tier 2 surfaces */}
        {surface.tier === 2 && <EmptyState surface={surface} />}

        {/* Tier 1 surfaces that aren't MANUAL also get empty state (will be built out in next sessions) */}
        {surface.tier === 1 && surface.special !== 'manual' && (
          <EmptyState surface={surface} />
        )}

        {/* Sibling surfaces for discovery */}
        {siblings.length > 0 && (
          <div className="mt-12">
            <div
              className="mb-3 font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Also in {surface.group}
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {siblings.map((s) => {
                const SIcon = s.icon;
                return (
                  <Link
                    key={s.slug}
                    to={`/s/${s.slug}`}
                    className="group flex items-center gap-3 rounded-md border border-border bg-bg-elevated/40 p-3 transition-colors hover:border-border-bright hover:bg-bg-elevated"
                  >
                    <SIcon
                      size={16}
                      style={{ color: s.color }}
                      className="flex-shrink-0 opacity-70 group-hover:opacity-100"
                    />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'font-medium text-text-silver group-hover:text-text',
                          s.special === 'bling' && 'bling',
                        )}
                        style={{ fontSize: '13px' }}
                      >
                        {s.name}
                      </div>
                      <div
                        className="font-mono text-text-muted"
                        style={{ fontSize: '11px' }}
                        data-size="meta"
                      >
                        {s.function}
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="ml-auto text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  surface,
}: {
  surface: { name: string; function: string; color: string };
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
      <div
        className="mx-auto mb-3 h-1.5 w-12 rounded-full"
        style={{ background: surface.color, opacity: 0.4 }}
      />
      <p className="text-text-silver" style={{ fontSize: '14px' }}>
        No {surface.function.toLowerCase()} yet
      </p>
      <p
        className="mt-2 font-mono text-text-muted"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        The first Bees to contribute here will shape it.
      </p>
    </div>
  );
}
