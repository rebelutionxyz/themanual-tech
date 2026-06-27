import { TrendingAtoms } from '@/components/manual/TrendingAtoms';
import { DiscoveryTierChip } from '@/components/ui/DiscoveryTierChip';
import { TagChip } from '@/components/ui/TagChip';
import { getPathSegments } from '@/lib/tree';
import { getAliasesForAtom, getAtomById, getRelatedAtoms } from '@/lib/useManualData';
import { cn } from '@/lib/utils';
import { useManualStore } from '@/stores/useManualStore';
import type { Atom, AtomAlias } from '@/types/manual';
import { Link2, MapPin, Network, Tag, Waypoints, X } from 'lucide-react';

export function AtomDetailPanel() {
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const selectAtom = useManualStore((s) => s.selectAtom);
  const selectedTags = useManualStore((s) => s.selectedTags);
  const toggleTag = useManualStore((s) => s.toggleTag);
  const setView = useManualStore((s) => s.setView);
  const setGraphCenter = useManualStore((s) => s.setGraphCenter);

  if (!selectedAtomId) {
    return (
      <div className="h-full overflow-y-auto px-5 py-4">
        <TrendingAtoms />
        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-text-dim" style={{ fontSize: '13px' }}>
            Select an atom from the Manual to view its details
          </p>
          <p className="mt-2 font-mono text-text-muted" data-size="meta">
            14 realms · graph model
          </p>
        </div>
      </div>
    );
  }

  const atom = getAtomById(selectedAtomId);
  if (!atom) {
    return (
      <div className="p-6">
        <p className="text-text-dim">Atom not found.</p>
      </div>
    );
  }

  const related = getRelatedAtoms(selectedAtomId, 20);
  const aliases = getAliasesForAtom(selectedAtomId);
  const segments = getPathSegments(atom.path);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DetailHeader atom={atom} onClose={() => selectAtom(null)} />

      <div className="border-b border-border px-5 py-2">
        <button
          type="button"
          onClick={() => {
            setGraphCenter({ atomId: atom.id });
            setView('graph');
          }}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 py-1 text-text-silver transition-colors hover:border-border-bright hover:text-text"
        >
          <Network size={14} /> View in graph
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 path-mono">
          {segments.map((seg, i) => (
            <span key={seg.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-muted">/</span>}
              <span
                className={cn(
                  i === segments.length - 1 ? 'text-text-silver-bright' : 'text-text-muted',
                )}
              >
                {seg.name}
              </span>
            </span>
          ))}
        </nav>

        {/* Name + kettle */}
        <div className="mb-5 border-b border-border pb-5">
          <h1 className="font-display text-3xl font-semibold tracking-wide text-text">
            {atom.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DiscoveryTierChip tier={atom.kettle} />
            <span
              className="font-mono uppercase text-text-muted"
              style={{ fontSize: '11px', letterSpacing: '0.08em' }}
              data-size="meta"
            >
              {atom.type}
            </span>
          </div>
        </div>

        {/* Also appears under — cross-realm placements (atom_aliases) */}
        {aliases.length > 0 && (
          <Section icon={<Waypoints size={12} />} title="Also appears under">
            <div className="space-y-1.5">
              {aliases.map((al) => (
                <AliasBreadcrumb key={al.id} alias={al} canonicalId={atom.id} />
              ))}
            </div>
            <p className="mt-2 text-text-muted" style={{ fontSize: '12px' }}>
              The same atom, surfaced in other realms. One canonical home; these are cross-links to
              where it also lives.
            </p>
          </Section>
        )}

        {/* Theme tags */}
        {atom.themeTags.length > 0 && (
          <Section icon={<Tag size={12} />} title="Theme tags">
            <div className="flex flex-wrap gap-1.5">
              {atom.themeTags.map((t) => (
                <TagChip
                  key={t}
                  tag={t}
                  active={selectedTags.includes(t)}
                  onClick={() => toggleTag(t)}
                />
              ))}
            </div>
            <p className="mt-2 text-text-muted" style={{ fontSize: '12px' }}>
              Click a tag to filter the Manual to everything sharing it.
            </p>
          </Section>
        )}

        {/* Realm/Astra/Skin tags */}
        {(atom.realmTags.length > 0 || atom.astraTags.length > 0) && (
          <Section icon={<MapPin size={12} />} title="Categorization">
            <div className="space-y-1.5">
              {atom.realmTags.length > 0 && <TagRow label="Realm" tags={atom.realmTags} />}
              {atom.astraTags.length > 0 && <TagRow label="Astra" tags={atom.astraTags} />}
              {atom.skinTags.length > 0 && <TagRow label="Skin" tags={atom.skinTags} />}
            </div>
          </Section>
        )}

        {/* Related atoms */}
        {related.length > 0 && (
          <Section icon={<Link2 size={12} />} title={`Connected atoms (${related.length})`}>
            <div className="space-y-1">
              {related.map((a) => (
                <RelatedAtomRow key={a.id} atom={a} />
              ))}
            </div>
          </Section>
        )}

        {/* Sources placeholder — Supabase-backed when auth wired */}
        <Section icon={<Link2 size={12} />} title="Sources">
          <div className="rounded border border-dashed border-border p-4 text-center">
            <p className="text-text-dim" style={{ fontSize: '13px' }}>
              No sources yet
            </p>
            <p className="mt-1 text-text-muted" style={{ fontSize: '12px' }}>
              Bees can add sources. Sign in to contribute.
            </p>
          </div>
        </Section>

        <p
          className="mt-8 text-center font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          id · {atom.id}
        </p>
      </div>
    </div>
  );
}

function DetailHeader({ atom, onClose }: { atom: Atom; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <span
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: '11px', letterSpacing: '0.1em' }}
        data-size="meta"
      >
        {atom.realmName}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3
        className="mb-2 flex items-center gap-1.5 font-mono uppercase text-text-silver-bright"
        style={{ fontSize: '11px', letterSpacing: '0.1em' }}
        data-size="meta"
      >
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="flex items-baseline gap-2 font-mono" style={{ fontSize: '12px' }}>
      <span className="w-14 flex-shrink-0 text-text-muted">{label}</span>
      <span className="text-text-silver">{tags.join(' · ')}</span>
    </div>
  );
}

function AliasBreadcrumb({
  alias,
  canonicalId,
}: {
  alias: AtomAlias;
  canonicalId: string;
}) {
  const setView = useManualStore((s) => s.setView);
  const setSelectedRealmId = useManualStore((s) => s.setSelectedRealmId);
  const expandPath = useManualStore((s) => s.expandPath);
  const selectAtom = useManualStore((s) => s.selectAtom);
  const segments = getPathSegments(alias.aliasPath);

  return (
    <nav className="flex flex-wrap items-center gap-1 path-mono">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={seg.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-text-muted">/</span>}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  // Leaf resolves to the canonical atom (same atom, here).
                  selectAtom(canonicalId);
                } else {
                  // Jump browse to this location in its realm.
                  setSelectedRealmId(alias.aliasRealmId);
                  expandPath(seg.path);
                  setView('outlook');
                }
              }}
              className={cn(
                'rounded px-0.5 hover:text-text-silver-bright hover:underline',
                isLast ? 'text-text-silver-bright' : 'text-text-muted',
              )}
            >
              {seg.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function RelatedAtomRow({ atom }: { atom: Atom }) {
  const selectAtom = useManualStore((s) => s.selectAtom);
  const subPath = atom.pathParts[1];
  return (
    <button
      type="button"
      onClick={() => selectAtom(atom.id)}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-bg-elevated"
    >
      <span className="text-text-silver">
        <span className="text-sm">{atom.name}</span>
      </span>
      <span
        className="ml-auto truncate font-mono text-text-muted"
        style={{ fontSize: '11px', maxWidth: '200px' }}
        data-size="meta"
      >
        {atom.realmName}
        {subPath && ` · ${subPath}`}
      </span>
    </button>
  );
}
