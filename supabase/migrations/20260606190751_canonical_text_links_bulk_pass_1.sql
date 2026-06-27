-- =====================================================================
-- Migration 20260606190751 — canonical_text_links_bulk_pass_1
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Link-only phase: sets atoms.canonical_source + atoms.canonical_url for
-- religion text-atoms. Idempotent UPDATEs by id.
--
-- Every URL was verified to resolve (HTTP 200, correct work — text/TOC or the
-- work's translations-portal) via WebFetch on 2026-06-06. Flaky sources
-- (404 / expired cert / 403) were skipped or nulled rather than linked.
-- Philosophy/history/culture primary works are NOT linked this pass — those
-- works do not yet exist as atoms (taxonomy has people/events, not the texts).
-- =====================================================================

-- ===== New verified links =====
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Heart_Sutra'
  WHERE id='religion-major-religions-indian-religions-buddhism-heart-sutra';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Diamond_Sutra'
  WHERE id='religion-major-religions-indian-religions-buddhism-diamond-sutra';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Epic_of_Gilgamesh'
  WHERE id='religion-mythologies-mesopotamian-mythology-epic-of-gilgamesh';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Laws_of_Manu'
  WHERE id='religion-major-religions-indian-religions-hinduism-manusmriti';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Yoga_Sutras_of_Patanjali'
  WHERE id='religion-major-religions-indian-religions-hinduism-yoga-sutras-of-patanjali';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Avesta'
  WHERE id='religion-major-religions-iranian-religions-zoroastrianism-avesta';
UPDATE public.atoms SET canonical_source='Sefaria', canonical_url='https://www.sefaria.org/texts/Mishnah'
  WHERE id='religion-major-religions-abrahamic-religions-judaism-mishnah';
UPDATE public.atoms SET canonical_source='Sefaria', canonical_url='https://www.sefaria.org/texts/Tosefta'
  WHERE id='religion-major-religions-abrahamic-religions-judaism-tosefta';

-- ===== Proof-set corrections (original 11 had errors) =====
-- Analects: was https://en.wikisource.org/wiki/The_Analects_of_Confucius (404) -> correct-work portal
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Analects'
  WHERE id='religion-major-religions-east-asian-religions-confucianism-religion-analects';
-- Vedas: was https://en.wikisource.org/wiki/The_Vedas -> clean canonical index
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Veda'
  WHERE id='religion-major-religions-indian-religions-hinduism-vedas';
-- Nag Hammadi: gnosis.org cert expired + sacred-texts.com 403 -> null (no stable source verified)
UPDATE public.atoms SET canonical_source=NULL, canonical_url=NULL
  WHERE id='religion-major-religions-abrahamic-religions-christianity-bible-nag-hammadi-library';

-- =====================================================================
-- VERIFICATION (post-apply):
--   total_linked = 18 (Wikisource 13 + Sefaria 5)
--   nag_hammadi canonical_url = NULL
-- Unverified candidates (Septuagint, Vulgate, the other Vedas, Zoroastrian
-- Gathas/Vendidad/Denkard, hadith, etc.) left NULL — a later pass with
-- per-text verification can link them. Nulls are fine.
-- =====================================================================
