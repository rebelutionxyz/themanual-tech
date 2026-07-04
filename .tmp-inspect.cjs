const fs = require('fs');
const src = String.raw`C:\Users\Butch\.claude\projects\C--Users-Butch-Documents-HONEYCOMB-TheMANUAL-tech\85380cb0-df28-4c52-ab80-e6d02083ffe5\tool-results\mcp-claude_ai_Supabase-execute_sql-1779194788451.txt`;
const s = fs.readFileSync(src, 'utf8');
console.log('len', s.length);
console.log('--- head 400 ---');
console.log(s.slice(0, 400));
console.log('--- tail 200 ---');
console.log(s.slice(-200));
