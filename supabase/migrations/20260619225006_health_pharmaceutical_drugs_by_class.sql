-- Pharmaceutical drugs, canonical taxonomy = by drug class (therapeutic/pharmacological, ATC-aligned),
-- mirroring the existing by-class structure of Recreational drugs. Condition- and use-context views
-- (e.g. "Diabetes treatments", "Psychiatric medications", "recreational vs medical") are delivered as
-- collections via the connector, NOT as folders -- a drug has one class home; views gather across classes.
-- Removes the leftover empty "By condition" folder stub and the now-redundant "Psychiatric drugs"
-- grouping (its classes -- Antidepressants/Antipsychotics/Mood stabilizers -- go flat; the psychiatric
-- grouping returns as a collection).
DELETE FROM atoms WHERE realm_id='health' AND path IN (
  'Health / Substances / Pharmaceutical drugs / Psychiatric drugs / By condition',
  'Health / Substances / Pharmaceutical drugs / Psychiatric drugs'
);
insert into atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, status)
select
  lower(replace(replace('Health / Substances / Pharmaceutical drugs / '||v.sub, ' / ', '-'), ' ', '-')),
  v.name, 'Health / Substances / Pharmaceutical drugs / '||v.sub,
  string_to_array('Health / Substances / Pharmaceutical drugs / '||v.sub,' / '),
  'health','Health', cardinality(string_to_array('Health / Substances / Pharmaceutical drugs / '||v.sub,' / ')),
  'concept','Accepted', v.is_leaf, '{}','{Health}','{MANUAL}','{HoneyComb}','live'
from (values
  ('Analgesics','Analgesics', false),('NSAIDs','Analgesics / NSAIDs', false),('Ibuprofen','Analgesics / NSAIDs / Ibuprofen', true),('Aspirin','Analgesics / NSAIDs / Aspirin', true),('Paracetamol','Analgesics / Paracetamol', true),
  ('Anaesthetics','Anaesthetics', false),('Lidocaine','Anaesthetics / Lidocaine', true),('Propofol','Anaesthetics / Propofol', true),
  ('Antibiotics','Antibiotics', false),('Penicillins','Antibiotics / Penicillins', false),('Amoxicillin','Antibiotics / Penicillins / Amoxicillin', true),('Macrolides','Antibiotics / Macrolides', false),('Azithromycin','Antibiotics / Macrolides / Azithromycin', true),('Fluoroquinolones','Antibiotics / Fluoroquinolones', false),('Ciprofloxacin','Antibiotics / Fluoroquinolones / Ciprofloxacin', true),
  ('Antivirals','Antivirals', false),('Acyclovir','Antivirals / Acyclovir', true),('Oseltamivir','Antivirals / Oseltamivir', true),
  ('Antifungals','Antifungals', false),('Fluconazole','Antifungals / Fluconazole', true),
  ('Antiparasitics','Antiparasitics', false),('Metronidazole','Antiparasitics / Metronidazole', true),('Ivermectin','Antiparasitics / Ivermectin', true),
  ('Antidepressants','Antidepressants', false),('SSRIs','Antidepressants / SSRIs', false),('Fluoxetine','Antidepressants / SSRIs / Fluoxetine', true),('Sertraline','Antidepressants / SSRIs / Sertraline', true),('SNRIs','Antidepressants / SNRIs', false),('Venlafaxine','Antidepressants / SNRIs / Venlafaxine', true),('Tricyclic antidepressants','Antidepressants / Tricyclic antidepressants', false),('Amitriptyline','Antidepressants / Tricyclic antidepressants / Amitriptyline', true),
  ('Antipsychotics','Antipsychotics', false),('Haloperidol','Antipsychotics / Haloperidol', true),('Risperidone','Antipsychotics / Risperidone', true),('Olanzapine','Antipsychotics / Olanzapine', true),
  ('Mood stabilizers','Mood stabilizers', false),('Lithium','Mood stabilizers / Lithium', true),('Valproate','Mood stabilizers / Valproate', true),
  ('Antiepileptics','Antiepileptics', false),('Carbamazepine','Antiepileptics / Carbamazepine', true),('Lamotrigine','Antiepileptics / Lamotrigine', true),('Levetiracetam','Antiepileptics / Levetiracetam', true),
  ('Antihypertensives','Antihypertensives', false),('ACE inhibitors','Antihypertensives / ACE inhibitors', false),('Lisinopril','Antihypertensives / ACE inhibitors / Lisinopril', true),('Angiotensin receptor blockers','Antihypertensives / Angiotensin receptor blockers', false),('Losartan','Antihypertensives / Angiotensin receptor blockers / Losartan', true),('Beta blockers','Antihypertensives / Beta blockers', false),('Metoprolol','Antihypertensives / Beta blockers / Metoprolol', true),('Calcium channel blockers','Antihypertensives / Calcium channel blockers', false),('Amlodipine','Antihypertensives / Calcium channel blockers / Amlodipine', true),
  ('Diuretics','Diuretics', false),('Furosemide','Diuretics / Furosemide', true),('Hydrochlorothiazide','Diuretics / Hydrochlorothiazide', true),
  ('Statins','Statins', false),('Atorvastatin','Statins / Atorvastatin', true),('Simvastatin','Statins / Simvastatin', true),
  ('Anticoagulants and antiplatelets','Anticoagulants and antiplatelets', false),('Warfarin','Anticoagulants and antiplatelets / Warfarin', true),('Heparin','Anticoagulants and antiplatelets / Heparin', true),('Clopidogrel','Anticoagulants and antiplatelets / Clopidogrel', true),
  ('Antidiabetics','Antidiabetics', false),('Insulin','Antidiabetics / Insulin', true),('Metformin','Antidiabetics / Metformin', true),('Semaglutide','Antidiabetics / Semaglutide', true),
  ('Antihistamines','Antihistamines', false),('Cetirizine','Antihistamines / Cetirizine', true),('Loratadine','Antihistamines / Loratadine', true),('Diphenhydramine','Antihistamines / Diphenhydramine', true),
  ('Bronchodilators','Bronchodilators', false),('Salbutamol','Bronchodilators / Salbutamol', true),('Ipratropium','Bronchodilators / Ipratropium', true),
  ('Corticosteroids','Corticosteroids', false),('Prednisone','Corticosteroids / Prednisone', true),('Dexamethasone','Corticosteroids / Dexamethasone', true),
  ('Gastrointestinal drugs','Gastrointestinal drugs', false),('Proton-pump inhibitors','Gastrointestinal drugs / Proton-pump inhibitors', false),('Omeprazole','Gastrointestinal drugs / Proton-pump inhibitors / Omeprazole', true),('Antiemetics','Gastrointestinal drugs / Antiemetics', false),('Ondansetron','Gastrointestinal drugs / Antiemetics / Ondansetron', true),
  ('Thyroid and hormone drugs','Thyroid and hormone drugs', false),('Levothyroxine','Thyroid and hormone drugs / Levothyroxine', true),('Hormonal contraceptives','Thyroid and hormone drugs / Hormonal contraceptives', true)
) as v(name, sub, is_leaf);
UPDATE atoms SET is_leaf=false WHERE realm_id='health' AND path='Health / Substances / Pharmaceutical drugs';
UPDATE atoms SET path_parts=string_to_array(path,' / '), depth=cardinality(string_to_array(path,' / ')) WHERE realm_id='health' AND path LIKE 'Health / Substances%';
