-- HISTORICAL/SUPERSEDED: this migration's structure was later removed by
-- 20260607015620_flatten_global_notable_into_companies.sql. File retained for ledger parity.
-- Global 2000 holding branch under Companies for the Wikidata notable-companies import.
-- Sector re-home is a later pass (Wikidata HQ data doesn't reliably determine sector).
INSERT INTO public.atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,is_leaf,kettle)
SELECT 'society-economy-and-business-companies-global-2000','Global 2000','Society / Economy and business / Companies / Global 2000',string_to_array('Society / Economy and business / Companies / Global 2000',' / '),'society','Society',array_length(string_to_array('Society / Economy and business / Companies / Global 2000',' / '),1),'event',false,'Accepted'
WHERE NOT EXISTS (SELECT 1 FROM public.atoms WHERE id='society-economy-and-business-companies-global-2000');
