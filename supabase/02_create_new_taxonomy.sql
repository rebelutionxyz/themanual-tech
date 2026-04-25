-- =============================================================================
-- Phase 2 — Create new 14-realm taxonomy schema
-- =============================================================================
-- Creates:
--   realms              (14 rows, with palindrome display_order)
--   atoms               (4,860 rows after Phase 3 seed)
--   atom_kettle_votes   (re-created, FK to atoms.id TEXT)
--   atom_sources        (re-created, FK to atoms.id TEXT)
--   atom_comments       (re-created, FK to atoms.id TEXT)
--   entity_atom_links   (re-created, FK to atoms.id TEXT)
--   entity_category_links (re-created — kept for forward compat)
--
-- Atom IDs are string slugs (e.g. "justice-government-accountability-...").
-- Max observed length: 154 chars. We use TEXT (no fixed cap).
-- =============================================================================

BEGIN;

-- =============================================================================
-- realms
-- =============================================================================
-- Display order is the LOCKED palindrome (1↔14, 2↔13, ..., 7↔8):
--   Justice → Reference → Human activities → Self → Geography → Health → Society
--   → Math → Science → Philosophy → Tech → History → Culture → Religion
-- =============================================================================
CREATE TABLE realms (
    id              TEXT PRIMARY KEY,            -- canonical lowercase slug ("justice")
    name            TEXT NOT NULL,               -- display name ("Justice")
    display_order   INTEGER NOT NULL UNIQUE,     -- 1..14 palindrome order
    atom_count      INTEGER NOT NULL DEFAULT 0,  -- denormalized, kept fresh by trigger
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO realms (id, name, display_order) VALUES
    ('justice',          'Justice',           1),
    ('reference',        'Reference',         2),
    ('human_activities', 'Human activities',  3),
    ('self',             'Self',              4),
    ('geography',        'Geography',         5),
    ('health',           'Health',            6),
    ('society',          'Society',           7),
    ('math',             'Math',              8),
    ('science',          'Science',           9),
    ('philosophy',       'Philosophy',       10),
    ('tech',             'Tech',             11),
    ('history',          'History',          12),
    ('culture',          'Culture',          13),
    ('religion',         'Religion',         14);

-- =============================================================================
-- atoms
-- =============================================================================
CREATE TABLE atoms (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL UNIQUE,
    path_parts      TEXT[] NOT NULL,                    -- pathParts array preserved
    realm_id        TEXT NOT NULL REFERENCES realms(id) ON DELETE RESTRICT,
    realm_name      TEXT NOT NULL,                      -- "Justice", "Human activities", etc. (preserves source casing)
    depth           INTEGER NOT NULL CHECK (depth BETWEEN 1 AND 9),
    type            TEXT NOT NULL DEFAULT 'event',
    kettle          TEXT NOT NULL CHECK (kettle IN ('Accepted','Contested','Emerging','Fringe')),
    is_leaf         BOOLEAN NOT NULL,
    theme_tags      TEXT[] NOT NULL DEFAULT '{}',
    realm_tags      TEXT[] NOT NULL DEFAULT '{}',
    pillar_tags     TEXT[] NOT NULL DEFAULT '{}',
    skin_tags       TEXT[] NOT NULL DEFAULT '{}',
    geo             JSONB,                              -- nullable, holds geographic scoping
    note            TEXT,                               -- optional editorial note (305 atoms have one)
    meta            JSONB NOT NULL DEFAULT '{}'::jsonb, -- holds element / celestialBody / canonicalRealm / languageScope
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_atoms_realm        ON atoms(realm_id);
CREATE INDEX idx_atoms_kettle       ON atoms(kettle);
CREATE INDEX idx_atoms_depth        ON atoms(depth);
CREATE INDEX idx_atoms_is_leaf      ON atoms(is_leaf);
CREATE INDEX idx_atoms_path_trgm    ON atoms USING gin (path gin_trgm_ops);  -- fuzzy path search
CREATE INDEX idx_atoms_name_trgm    ON atoms USING gin (name gin_trgm_ops);  -- fuzzy name search
CREATE INDEX idx_atoms_theme_tags   ON atoms USING gin (theme_tags);
CREATE INDEX idx_atoms_pillar_tags  ON atoms USING gin (pillar_tags);
CREATE INDEX idx_atoms_skin_tags    ON atoms USING gin (skin_tags);

-- pg_trgm needed for the trigram indexes above
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- atom_kettle_votes — Bees vote a kettle state on an atom
-- =============================================================================
CREATE TABLE atom_kettle_votes (
    id          BIGSERIAL PRIMARY KEY,
    atom_id     TEXT NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
    bee_id      UUID NOT NULL REFERENCES bees(id) ON DELETE CASCADE,
    kettle      TEXT NOT NULL CHECK (kettle IN ('Accepted','Contested','Emerging','Fringe')),
    weight      NUMERIC NOT NULL DEFAULT 1.0,  -- rank-weighted via BLiNG! Rank multiplier
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (atom_id, bee_id)                   -- one vote per Bee per atom (re-castable via UPDATE)
);
CREATE INDEX idx_kettle_votes_atom ON atom_kettle_votes(atom_id);
CREATE INDEX idx_kettle_votes_bee  ON atom_kettle_votes(bee_id);

-- =============================================================================
-- atom_sources — Discovery Ladder evidence (pro/anti links per atom)
-- =============================================================================
CREATE TABLE atom_sources (
    id           BIGSERIAL PRIMARY KEY,
    atom_id      TEXT NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
    bee_id       UUID NOT NULL REFERENCES bees(id) ON DELETE SET NULL,
    url          TEXT NOT NULL,
    title        TEXT,
    stance       TEXT NOT NULL CHECK (stance IN ('pro','anti','neutral')),
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sources_atom   ON atom_sources(atom_id);
CREATE INDEX idx_sources_bee    ON atom_sources(bee_id);
CREATE INDEX idx_sources_stance ON atom_sources(stance);

-- =============================================================================
-- atom_comments — Bee discussion attached to an atom
-- =============================================================================
CREATE TABLE atom_comments (
    id           BIGSERIAL PRIMARY KEY,
    atom_id      TEXT NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
    bee_id       UUID NOT NULL REFERENCES bees(id) ON DELETE CASCADE,
    parent_id    BIGINT REFERENCES atom_comments(id) ON DELETE CASCADE,
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_atom   ON atom_comments(atom_id);
CREATE INDEX idx_comments_bee    ON atom_comments(bee_id);
CREATE INDEX idx_comments_parent ON atom_comments(parent_id);

-- =============================================================================
-- entity_atom_links — generic link between any entity (post, listing, group,
-- event, etc.) and an atom, so any surface can be tagged into the taxonomy
-- =============================================================================
CREATE TABLE entity_atom_links (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   TEXT NOT NULL,    -- 'forum_post','bazaar_listing','event','group','give_campaign', ...
    entity_id     TEXT NOT NULL,    -- TEXT to accept UUID or BIGINT serialized
    atom_id       TEXT NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id, atom_id)
);
CREATE INDEX idx_eal_entity ON entity_atom_links(entity_type, entity_id);
CREATE INDEX idx_eal_atom   ON entity_atom_links(atom_id);

-- =============================================================================
-- entity_category_links — kept for forward compat (Bazaar sub-categories,
-- Surface filters etc. that aren't atoms but still tag entities)
-- =============================================================================
CREATE TABLE entity_category_links (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    category_key  TEXT NOT NULL,    -- e.g. 'bazaar.places.bars_restaurants'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id, category_key)
);
CREATE INDEX idx_ecl_entity   ON entity_category_links(entity_type, entity_id);
CREATE INDEX idx_ecl_category ON entity_category_links(category_key);

-- =============================================================================
-- Trigger to keep realms.atom_count fresh
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_realm_atom_counts() RETURNS trigger AS $$
BEGIN
    UPDATE realms r
    SET atom_count = (SELECT count(*) FROM atoms a WHERE a.realm_id = r.id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atoms_count_refresh
AFTER INSERT OR DELETE OR UPDATE OF realm_id ON atoms
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_realm_atom_counts();

COMMIT;

-- Sanity: 14 realms inserted, palindrome order intact
SELECT display_order, id, name FROM realms ORDER BY display_order;
