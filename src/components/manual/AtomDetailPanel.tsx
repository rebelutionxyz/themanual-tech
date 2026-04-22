import { X, Tag, Link2, MapPin } from 'lucide-react';
import type { Atom } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { getAtomById, getRelatedAtoms } from '@/lib/useManualData';
import { getPathSegments } from '@/lib/tree';
import { KettlePill } from '@/components/ui/KettlePill';
import { TagChip } from '@/components/ui/TagChip';
import { cn, isFront } from '@/lib/utils';
import { FRONT_CLASS } from '@/lib/constants';

export function AtomDetailPanel() {
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const selectAtom = useManualStore((s) => s.selectAtom);
  const selectedTags = useManualStore((s) => s.selectedTags);
  const toggleTag = useManualStore((s) => s.toggleTag);

  if (!selectedAtomId) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <p className="text-text-dim" style={{ fontSize: '13px' }}>
            Select an atom from the Manual to view its details
          </p>
          <p className="mt-2 font-mono text-text-muted" data-size="meta">
            5,997 atoms · 13 realms · graph model
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
  const segments = getPathSegments(atom.path);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DetailHeader atom={atom} onClose={() => selectAtom(null)} />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 path-mono">
          {segments.map((seg, i) => (
            <span key={seg.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-muted">/</span>}
              <span
                className={cn(
                  i === segments.length - 1
                    ? 'text-text-silver-bright'
                    : 'text-text-muted',
                )}
              >
                {seg.name}
              </span>
            </span>
          ))}
        </nav>

        {/* Name + kettle */}
        <div className="mb-5 border-b border-border pb-5">
          <h1
            className={cn(
              'font-display text-3xl font-semibold tracking-wide text-text',
              atom.front && FRONT_CLASS[atom.front],
            )}
          >
            {atom.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KettlePill state={atom.kettle} expanded />
            <span
              className="font-mono uppercase text-text-muted"
              style={{ fontSize: '11px', letterSpacing: '0.08em' }}
              data-size="meta"
            >
              {atom.type}
            </span>
          </div>
        </div>

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

        {/* Realm/Pillar/Skin tags */}
        {(atom.realmTags.length > 0 || atom.pillarTags.length > 0) && (
          <Section icon={<MapPin size={12} />} title="Categorization">
            <div className="space-y-1.5">
              {atom.realmTags.length > 0 && (
                <TagRow label="Realm" tags={atom.realmTags} />
              )}
              {atom.pillarTags.length > 0 && (
                <TagRow label="Pillar" tags={atom.pillarTags} />
              )}
              {atom.skinTags.length > 0 && (
                <TagRow label="Skin" tags={atom.skinTags} />
              )}
            </div>
          </Section>
        )}

        {/* Related atoms */}
        {related.length > 0 && (
          <Section
            icon={<Link2 size={12} />}
            title={`Connected atoms (${related.length})`}
          >
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
        {atom.realm}
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
    <div
      className="flex items-baseline gap-2 font-mono"
      style={{ fontSize: '12px' }}
    >
      <span className="w-14 flex-shrink-0 text-text-muted">{label}</span>
      <span className="text-text-silver">{tags.join(' · ')}</span>
    </div>
  );
}

function RelatedAtomRow({ atom }: { atom: Atom }) {
  const selectAtom = useManualStore((s) => s.selectAtom);
  return (
    <button
      type="button"
      onClick={() => selectAtom(atom.id)}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-bg-elevated"
    >
      <span
        className={cn(atom.front ? FRONT_CLASS[atom.front] : 'text-text-silver')}
      >
        <span className="text-sm">{atom.name}</span>
      </span>
      <span
        className="ml-auto truncate font-mono text-text-muted"
        style={{ fontSize: '11px', maxWidth: '200px' }}
        data-size="meta"
      >
        {atom.realm}
        {atom.L2 && ` · ${atom.L2}`}
      </span>
      {isFront(atom.name) || null}
    </button>
  );
}
