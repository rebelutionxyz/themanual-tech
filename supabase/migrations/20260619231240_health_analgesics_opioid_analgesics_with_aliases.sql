insert into atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, status)
select
  lower(replace(replace('Health / Substances / Pharmaceutical drugs / Analgesics / '||v.sub, ' / ', '-'), ' ', '-')),
  v.name, 'Health / Substances / Pharmaceutical drugs / Analgesics / '||v.sub,
  string_to_array('Health / Substances / Pharmaceutical drugs / Analgesics / '||v.sub,' / '),
  'health','Health', cardinality(string_to_array('Health / Substances / Pharmaceutical drugs / Analgesics / '||v.sub,' / ')),
  'concept','Accepted', v.is_leaf, '{}','{Health}','{MANUAL}','{HoneyComb}','live'
from (values
  ('Opioid analgesics','Opioid analgesics', false),
  ('Codeine','Opioid analgesics / Codeine', true),
  ('Tramadol','Opioid analgesics / Tramadol', true)
) as v(name, sub, is_leaf);
insert into atom_aliases (atom_id, alias_path, alias_realm_id, alias_realm_name, note) values
 ('health-substances-recreational-drugs-opioids-morphine','Health / Substances / Pharmaceutical drugs / Analgesics / Opioid analgesics / Morphine','health','Health','Clinical opioid analgesic; canonical atom under Recreational drugs / Opioids.'),
 ('health-substances-recreational-drugs-opioids-oxycodone','Health / Substances / Pharmaceutical drugs / Analgesics / Opioid analgesics / Oxycodone','health','Health','Clinical opioid analgesic; canonical atom under Recreational drugs / Opioids.'),
 ('health-substances-recreational-drugs-opioids-fentanyl','Health / Substances / Pharmaceutical drugs / Analgesics / Opioid analgesics / Fentanyl','health','Health','Clinical opioid analgesic / anaesthetic adjunct; canonical atom under Recreational drugs / Opioids.');
