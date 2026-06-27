-- APPLIED to prod 2026-06-13 via MCP. PARITY file.
-- Realm Order v2 (locked Jun 13 2026) — replaces palindrome order.
-- Two-step to dodge the unique(display_order) constraint during permutation.
-- Step 1: park all rows in an empty range.
update realms set display_order = display_order + 100;
-- Step 2: assign final locked order.
update realms set display_order = case id
  when 'justice'          then 1
  when 'self'             then 2
  when 'health'           then 3
  when 'society'          then 4
  when 'culture'          then 5
  when 'human_activities' then 6
  when 'geography'        then 7
  when 'history'          then 8
  when 'math'             then 9
  when 'science'          then 10
  when 'tech'             then 11
  when 'philosophy'       then 12
  when 'religion'         then 13
  when 'reference'        then 14
end;
