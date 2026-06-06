-- =====================================================================
-- Migration 20260605003857 — religion_text_shelf_expansion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-05 via apply_migration.
-- The Manual spine · Religion realm · additive text-shelf + ancient myths + Tengrism.
--
-- Additive + idempotent (every row guarded by WHERE NOT EXISTS on id). NO deletes,
-- NO moves. 51 atoms (Religion 362 → 413). type='event', kettle='Accepted'.
--
-- CORRECTION vs the draft (shared/canon/religion_text_shelf_expansion.sql): the draft
-- inserted only (id, name, path, type, is_leaf, kettle), but atoms has four NOT-NULL /
-- no-default columns with no derive trigger — path_parts, realm_id, realm_name, depth.
-- The draft would have failed on the first row. Those four are derived here from `path`
-- per the existing-atom convention (verified against live rows, depths 3–6):
--   path_parts = string_to_array(path, ' / ');  depth = array_length(path_parts, 1);
--   realm_id = 'religion';  realm_name = 'Religion'.
-- This file is the exact body applied to prod.
--
-- NOTE: the apply logged TWICE in supabase_migrations (versions 20260605003857 +
-- 20260605004005, ~68s apart — MCP retry). Idempotent guard meant the 2nd added 0 rows.
-- The redundant 20260605004005 ledger entry can be pruned; harmless (body re-runs to 0).
-- =====================================================================

INSERT INTO public.atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, is_leaf, kettle)
SELECT v.id, v.name, v.path,
       string_to_array(v.path, ' / '),
       'religion', 'Religion',
       array_length(string_to_array(v.path, ' / '), 1),
       'event', v.is_leaf, v.kettle
FROM (VALUES

  -- ================= JUDAISM =================
  ('religion-major-religions-abrahamic-religions-judaism-gemara','Gemara','Religion / Major religions / Abrahamic religions / Judaism / Gemara',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-tosefta','Tosefta','Religion / Major religions / Abrahamic religions / Judaism / Tosefta',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-midrash','Midrash','Religion / Major religions / Abrahamic religions / Judaism / Midrash',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-zohar','Zohar','Religion / Major religions / Abrahamic religions / Judaism / Zohar',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-kabbalah','Kabbalah','Religion / Major religions / Abrahamic religions / Judaism / Kabbalah',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-shulchan-aruch','Shulchan Aruch','Religion / Major religions / Abrahamic religions / Judaism / Shulchan Aruch',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-judaism-siddur','Siddur','Religion / Major religions / Abrahamic religions / Judaism / Siddur',true,'Accepted'),

  -- ================= CHRISTIANITY =================
  ('religion-major-religions-abrahamic-religions-christianity-septuagint','Septuagint','Religion / Major religions / Abrahamic religions / Christianity / Septuagint',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-vulgate','Vulgate','Religion / Major religions / Abrahamic religions / Christianity / Vulgate',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-bible-deuterocanonical-books','Deuterocanonical books','Religion / Major religions / Abrahamic religions / Christianity / Bible / Deuterocanonical books',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-bible-pseudepigrapha','Pseudepigrapha','Religion / Major religions / Abrahamic religions / Christianity / Bible / Pseudepigrapha',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-bible-dead-sea-scrolls','Dead Sea Scrolls','Religion / Major religions / Abrahamic religions / Christianity / Bible / Dead Sea Scrolls',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-bible-nag-hammadi-library','Nag Hammadi library','Religion / Major religions / Abrahamic religions / Christianity / Bible / Nag Hammadi library',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-christianity-gnostic-gospels','Gnostic gospels','Religion / Major religions / Abrahamic religions / Christianity / Gnostic gospels',true,'Accepted'),

  -- ================= ISLAM =================
  ('religion-major-religions-abrahamic-religions-islam-tafsir','Tafsir','Religion / Major religions / Abrahamic religions / Islam / Tafsir',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-islam-sahih-al-bukhari','Sahih al-Bukhari','Religion / Major religions / Abrahamic religions / Islam / Sahih al-Bukhari',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-islam-sahih-muslim','Sahih Muslim','Religion / Major religions / Abrahamic religions / Islam / Sahih Muslim',true,'Accepted'),

  -- ================= BAHA'I =================
  ('religion-major-religions-abrahamic-religions-bah-faith-kitab-i-aqdas','Kitáb-i-Aqdas','Religion / Major religions / Abrahamic religions / Baháʼí Faith / Kitáb-i-Aqdas',true,'Accepted'),
  ('religion-major-religions-abrahamic-religions-bah-faith-kitab-i-iqan','Kitáb-i-Íqán','Religion / Major religions / Abrahamic religions / Baháʼí Faith / Kitáb-i-Íqán',true,'Accepted'),

  -- ================= MANDAEISM (parent flip in footer) =================
  ('religion-major-religions-abrahamic-religions-mandaeism-ginza-rabba','Ginza Rabba','Religion / Major religions / Abrahamic religions / Mandaeism / Ginza Rabba',true,'Accepted'),

  -- ================= BUDDHISM =================
  ('religion-major-religions-indian-religions-buddhism-lotus-sutra','Lotus Sutra','Religion / Major religions / Indian religions / Buddhism / Lotus Sutra',true,'Accepted'),
  ('religion-major-religions-indian-religions-buddhism-heart-sutra','Heart Sutra','Religion / Major religions / Indian religions / Buddhism / Heart Sutra',true,'Accepted'),
  ('religion-major-religions-indian-religions-buddhism-diamond-sutra','Diamond Sutra','Religion / Major religions / Indian religions / Buddhism / Diamond Sutra',true,'Accepted'),
  ('religion-major-religions-indian-religions-buddhism-tibetan-book-of-the-dead','Tibetan Book of the Dead','Religion / Major religions / Indian religions / Buddhism / Tibetan Book of the Dead',true,'Accepted'),
  ('religion-major-religions-indian-religions-buddhism-abhidharma','Abhidharma','Religion / Major religions / Indian religions / Buddhism / Abhidharma',true,'Accepted'),

  -- ================= HINDUISM =================
  ('religion-major-religions-indian-religions-hinduism-rigveda','Rigveda','Religion / Major religions / Indian religions / Hinduism / Rigveda',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-samaveda','Samaveda','Religion / Major religions / Indian religions / Hinduism / Samaveda',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-yajurveda','Yajurveda','Religion / Major religions / Indian religions / Hinduism / Yajurveda',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-atharvaveda','Atharvaveda','Religion / Major religions / Indian religions / Hinduism / Atharvaveda',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-bhagavata-purana','Bhagavata Purana','Religion / Major religions / Indian religions / Hinduism / Bhagavata Purana',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-manusmriti','Manusmriti','Religion / Major religions / Indian religions / Hinduism / Manusmriti',true,'Accepted'),
  ('religion-major-religions-indian-religions-hinduism-yoga-sutras-of-patanjali','Yoga Sutras of Patanjali','Religion / Major religions / Indian religions / Hinduism / Yoga Sutras of Patanjali',true,'Accepted'),

  -- ================= SIKHISM =================
  ('religion-major-religions-indian-religions-sikhism-janamsakhis','Janamsakhis','Religion / Major religions / Indian religions / Sikhism / Janamsakhis',true,'Accepted'),

  -- ================= CONFUCIANISM (parent flip in footer) =================
  ('religion-major-religions-east-asian-religions-confucianism-religion-analects','Analects','Religion / Major religions / East Asian religions / Confucianism (religion) / Analects',true,'Accepted'),
  ('religion-major-religions-east-asian-religions-confucianism-religion-five-classics','Five Classics','Religion / Major religions / East Asian religions / Confucianism (religion) / Five Classics',true,'Accepted'),
  ('religion-major-religions-east-asian-religions-confucianism-religion-four-books','Four Books','Religion / Major religions / East Asian religions / Confucianism (religion) / Four Books',true,'Accepted'),
  ('religion-major-religions-east-asian-religions-confucianism-religion-mencius','Mencius (text)','Religion / Major religions / East Asian religions / Confucianism (religion) / Mencius (text)',true,'Accepted'),

  -- ================= TAOISM =================
  ('religion-major-religions-east-asian-religions-taoism-religion-daozang','Daozang (Taoist canon)','Religion / Major religions / East Asian religions / Taoism (religion) / Daozang (Taoist canon)',true,'Accepted'),

  -- ================= TENGRISM (NEW tradition node — parent, is_leaf=false — + its core text) ==========
  ('religion-major-religions-east-asian-religions-tengrism','Tengrism','Religion / Major religions / East Asian religions / Tengrism',false,'Accepted'),
  ('religion-major-religions-east-asian-religions-tengrism-irk-bitig','Irk Bitig','Religion / Major religions / East Asian religions / Tengrism / Irk Bitig',true,'Accepted'),

  -- ================= ZOROASTRIANISM =================
  ('religion-major-religions-iranian-religions-zoroastrianism-gathas','Gathas','Religion / Major religions / Iranian religions / Zoroastrianism / Gathas',true,'Accepted'),
  ('religion-major-religions-iranian-religions-zoroastrianism-vendidad','Vendidad','Religion / Major religions / Iranian religions / Zoroastrianism / Vendidad',true,'Accepted'),
  ('religion-major-religions-iranian-religions-zoroastrianism-denkard','Denkard','Religion / Major religions / Iranian religions / Zoroastrianism / Denkard',true,'Accepted'),

  -- ================= ANCIENT / DEAD-RELIGION TEXTS — homed under Mythologies =================
  ('religion-mythologies-mesopotamian-mythology-epic-of-gilgamesh','Epic of Gilgamesh','Religion / Mythologies / Mesopotamian mythology / Epic of Gilgamesh',true,'Accepted'),
  ('religion-mythologies-mesopotamian-mythology-enuma-elis','Enûma Eliš','Religion / Mythologies / Mesopotamian mythology / Enûma Eliš',true,'Accepted'),
  ('religion-mythologies-egyptian-mythology-book-of-the-dead','Book of the Dead (Egyptian)','Religion / Mythologies / Egyptian mythology / Book of the Dead (Egyptian)',true,'Accepted'),
  ('religion-mythologies-egyptian-mythology-pyramid-texts','Pyramid Texts','Religion / Mythologies / Egyptian mythology / Pyramid Texts',true,'Accepted'),
  ('religion-mythologies-greek-mythology-theogony','Theogony (Hesiod)','Religion / Mythologies / Greek mythology / Theogony (Hesiod)',true,'Accepted'),
  ('religion-mythologies-norse-mythology-poetic-edda','Poetic Edda','Religion / Mythologies / Norse mythology / Poetic Edda',true,'Accepted'),
  ('religion-mythologies-norse-mythology-prose-edda','Prose Edda','Religion / Mythologies / Norse mythology / Prose Edda',true,'Accepted'),
  ('religion-mythologies-mesoamerican-mythology-mayan-mythology-popol-vuh','Popol Vuh','Religion / Mythologies / Mesoamerican mythology / Mayan mythology / Popol Vuh',true,'Accepted')

) AS v(id, name, path, is_leaf, kettle)
WHERE NOT EXISTS (SELECT 1 FROM public.atoms a WHERE a.id = v.id);

-- ---- parent flips: nodes that were leaves but now have children ----
UPDATE public.atoms SET is_leaf = false
WHERE id IN (
  'religion-major-religions-abrahamic-religions-mandaeism',
  'religion-major-religions-east-asian-religions-confucianism-religion'
)
AND EXISTS (SELECT 1 FROM public.atoms c WHERE c.path LIKE public.atoms.path || ' / %');

-- =====================================================================
-- OUT OF SCOPE (separate consolidation migration, flagged not done here):
--   • Duplicate 'Religion / Sacred texts' branch → becomes pointer-index.
--   • 'Religion / Major religions / Christianity' stub (dupe of the Abrahamic build).
-- =====================================================================
