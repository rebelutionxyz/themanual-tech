-- APPLIED to prod 2026-06-16 via MCP. PARITY file.
-- (1) History war/historical-event leaves are genuine events (reaffirm + timestamp).
UPDATE atoms SET type='event', updated_at=now()
WHERE realm_id='history' AND is_leaf
  AND (path LIKE 'History / Wars / %' OR path LIKE 'History / Historical events / %');

-- (2) All other knowledge-realm leaves default to concept.
UPDATE atoms SET type='concept', updated_at=now()
WHERE realm_id<>'geography' AND is_leaf AND type='event'
  AND NOT (realm_id='history'
           AND (path LIKE 'History / Wars / %' OR path LIKE 'History / Historical events / %'));
