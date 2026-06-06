-- =====================================================================
-- Migration 20260606171948 — atom_canonical_link_proof_set_religion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via MCP (Claude-chat).
-- Backfill (outcome-faithful): the ORIGINAL 11-text proof set, seeded from memory.
-- NOTE: these are the as-originally-applied URLs — three were later found broken
-- and corrected by 20260606190751_canonical_text_links_bulk_pass_1 (Analects 404,
-- Nag Hammadi expired-cert -> nulled, Vedas re-pointed). Kept verbatim here so the
-- ledger replays faithfully (seed -> correct), not retro-edited.
-- =====================================================================

UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Analects_of_Confucius'
  WHERE id='religion-major-religions-east-asian-religions-confucianism-religion-analects';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Bhagavad_Gita'
  WHERE id='religion-major-religions-indian-religions-hinduism-bhagavad-gita';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Bible'
  WHERE id='religion-major-religions-abrahamic-religions-christianity-bible';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Dhammapada'
  WHERE id='religion-major-religions-indian-religions-buddhism-dhammapada';
UPDATE public.atoms SET canonical_source='Gnostic Society Library', canonical_url='https://www.gnosis.org/naghamm/nhl.html'
  WHERE id='religion-major-religions-abrahamic-religions-christianity-bible-nag-hammadi-library';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Koran'
  WHERE id='religion-major-religions-abrahamic-religions-islam-quran';
UPDATE public.atoms SET canonical_source='Sefaria', canonical_url='https://www.sefaria.org/texts/Talmud'
  WHERE id='religion-major-religions-abrahamic-religions-judaism-talmud';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/Tao_Te_Ching'
  WHERE id='religion-major-religions-east-asian-religions-taoism-religion-tao-te-ching';
UPDATE public.atoms SET canonical_source='Sefaria', canonical_url='https://www.sefaria.org/texts/Tanakh/Torah'
  WHERE id='religion-major-religions-abrahamic-religions-judaism-torah';
UPDATE public.atoms SET canonical_source='Wikisource', canonical_url='https://en.wikisource.org/wiki/The_Vedas'
  WHERE id='religion-major-religions-indian-religions-hinduism-vedas';
UPDATE public.atoms SET canonical_source='Sefaria', canonical_url='https://www.sefaria.org/Zohar'
  WHERE id='religion-major-religions-abrahamic-religions-judaism-zohar';
