// Classification script for the 606 Lists atoms.
// Output: lists-disposition-table.csv + lists-disposition-summary.md
// Read-only: produces artifacts under shared/canon/taxonomy/ — no DB mutations.

const fs = require('fs');
const path = require('path');

const all = JSON.parse(fs.readFileSync(path.join(__dirname, '_all.json'), 'utf8'));
console.log('loaded', all.length, 'atoms');

// ----- BUCKETS -----
// DISSOLVE              — delete (member content lives elsewhere / outline page / dup)
// DISSOLVE_CONTAINER    — `Lists` container node, delete once drained (special)
// CROSS_REALM           — repath to a different realm (members' domain wins)
// INTRA_REALM           — repath within the same realm to a real branch
// IMPORT_REALIZE        — becomes (or routes to) a container; members imported later from external source
// LENS                  — slicing axis (by-year, by-region, etc.) — becomes a facet, branch dissolves
// ADJUDICATE            — Code can't bucket confidently — surfaces in §10 queue

// ----- EXPLICIT PER-ATOM CLASSIFICATIONS -----
// One entry per atom that isn't covered by a pattern rule below.
// Fields: bucket, target_path, target_realm, proposed_new_type, import_source, notes
const R = {}; // id -> disposition

// ===== JUSTICE (7) — all flat depth-3 leaves under Justice / Lists =====
R['justice-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Container — delete after drain' };
R['justice-lists-government-oversight-bodies'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Patterns / Institutional capture / Government oversight bodies', proposed_new_type: 'entity_list', notes: 'Belongs with institutional-capture patterns or as its own L3 under Patterns' };
R['justice-lists-investigative-journalism-outlets'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Evidence / Investigative journalism outlets', proposed_new_type: 'entity_list', notes: 'Investigative journalism produces evidence — Evidence L2 is the natural home' };
R['justice-lists-notable-accountability-cases-reference'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Prosecutions / Notable accountability cases', proposed_new_type: 'reference', notes: 'Cases live under Prosecutions; drop "(reference)" suffix' };
R['justice-lists-notable-whistleblowers-reference'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Evidence / Notable whistleblowers', proposed_new_type: 'reference', notes: 'Whistleblowers as evidence-source role; drop "(reference)" suffix' };
R['justice-lists-truth-commissions-historical'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Progress / Truth commissions', proposed_new_type: 'institution_list', notes: 'Progress L2 is the existing home for restorative justice mechanisms; drop "(historical)" suffix — current commissions also belong here' };
R['justice-lists-whistleblower-support-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Justice / Evidence / Whistleblower support organizations', proposed_new_type: 'organization_list', notes: 'Pairs with notable-whistleblowers above' };

// ===== REFERENCE (1) — single Lists/Lists meta dup =====
R['reference-general-reference-lists-lists'] = { bucket: 'DISSOLVE', notes: 'Lists-of-lists meta page; pure navigation. §13 dissolves the General-reference-lists L2 entirely anyway.' };

// ===== HEALTH (10) =====
R['health-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['health-lists-acronyms-in-healthcare'] = { bucket: 'INTRA_REALM', target_path: 'Health / Medicine / Acronyms in healthcare', proposed_new_type: 'reference', notes: 'Medical-vocabulary reference; could also live under a future "Health / Reference" L2' };
R['health-lists-alternative-medicine-modalities'] = { bucket: 'INTRA_REALM', target_path: 'Health / Medicine / Alternative medicine modalities', proposed_new_type: 'modality_list', notes: 'No existing Alternative-medicine branch; sits under Medicine' };
R['health-lists-dsm-iv-codes'] = { bucket: 'ADJUDICATE', notes: '§10: DSM-IV superseded by DSM-5. Rename to DSM-5 codes + refresh, or keep as historical reference?' };
R['health-lists-medical-abbreviations'] = { bucket: 'INTRA_REALM', target_path: 'Health / Medicine / Medical abbreviations', proposed_new_type: 'reference', notes: 'Pairs with acronyms-in-healthcare; consider merging or keeping as sibling' };
R['health-lists-pharmaceutical-drugs-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Health / Substances / Pharmaceutical drugs already exists in production (verified collision check). Drop the Lists copy; the existing atom is the IMPORT_REALIZE target — flag for the import pass.' };
R['health-lists-psychiatric-drugs-by-condition'] = { bucket: 'IMPORT_REALIZE', target_path: 'Health / Substances / Psychiatric drugs / By condition', proposed_new_type: 'entity_container', import_source: 'drug reference DB', notes: 'Sub-container of pharmaceutical drugs; "by condition" is a tag/lens within' };
R['health-lists-psychotherapies'] = { bucket: 'INTRA_REALM', target_path: 'Health / Mental health / Psychotherapies', proposed_new_type: 'modality_list', notes: 'Mental health L2 is the natural home' };
R['health-lists-reference-ranges-for-common-blood-tests'] = { bucket: 'INTRA_REALM', target_path: 'Health / Health sciences / Reference ranges for common blood tests', proposed_new_type: 'reference', notes: 'Diagnostic reference; Health sciences L2 holds laboratory reference data' };
R['health-lists-surgical-procedures'] = { bucket: 'INTRA_REALM', target_path: 'Health / Medicine / Surgical procedures', proposed_new_type: 'procedure_list', notes: 'Could become IMPORT_REALIZE from ICD-10-PCS if you want a full surgical catalog' };

// ===== MATH (11) =====
R['math-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['math-lists-basic-mathematics'] = { bucket: 'ADJUDICATE', notes: '§10: outline-page borderline — dissolve as navigation, or rehome as thin intro branch under Math/Concepts?' };
R['math-lists-games-mathematical'] = { bucket: 'INTRA_REALM', target_path: 'Math / Concepts / Mathematical games', proposed_new_type: 'concept_list', notes: 'Recreational mathematics; rename "Games (mathematical)" → "Mathematical games"' };
R['math-lists-integrals'] = { bucket: 'INTRA_REALM', target_path: 'Math / Mathematical objects / Integrals', proposed_new_type: 'object_list', notes: 'Tables of integrals are mathematical objects' };
R['math-lists-mathematical-series'] = { bucket: 'INTRA_REALM', target_path: 'Math / Mathematical objects / Mathematical series', proposed_new_type: 'object_list', notes: 'Series as mathematical objects' };
R['math-lists-mathematics-lists-meta'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — literally a list-of-math-lists. Pure navigation.' };
R['math-lists-prime-numbers-list'] = { bucket: 'INTRA_REALM', target_path: 'Math / Mathematical objects / Prime numbers', proposed_new_type: 'object_list', notes: 'Drop " list" suffix on rehome' };
R['math-lists-principia-mathematica-glossary-items'] = { bucket: 'INTRA_REALM', target_path: 'Math / Foundations and meta-mathematics / Principia Mathematica glossary', proposed_new_type: 'reference', notes: 'Russell/Whitehead-specific historical reference' };
R['math-lists-shapes-with-metaphorical-names'] = { bucket: 'INTRA_REALM', target_path: 'Math / Mathematical objects / Shapes with metaphorical names', proposed_new_type: 'curiosity_list', notes: 'Trivia-class but mathematically grounded; keep' };
R['math-lists-systems-theory'] = { bucket: 'DISSOLVE', notes: 'Cross-realm dup: Society / Social sciences / Systems theory exists in production (verified collision check). Drop Math/Lists copy; cross-link via realm_tags.' };
R['math-lists-tensor-theory'] = { bucket: 'INTRA_REALM', target_path: 'Math / Branches of mathematics / Pure mathematics / Tensor theory', proposed_new_type: 'branch', notes: 'Branches L2 holds tensor theory; verify exact L3 path on apply' };

// ===== PHILOSOPHY (13) — §6 §10 §11 §12 heavy overlap =====
R['philosophy-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['philosophy-lists-aesthetics-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — outline of Philosophy / Branches / Aesthetics' };
R['philosophy-lists-epistemology-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — outline of Philosophy / Branches / Epistemology' };
R['philosophy-lists-ethics-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — outline of Philosophy / Branches / Ethics' };
R['philosophy-lists-logic-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — outline of Philosophy / Branches / Logic' };
R['philosophy-lists-metaphysics-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — outline of Philosophy / Branches / Metaphysics' };
R['philosophy-lists-philosophy-topics-list'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — meta-outline of all philosophy' };
R['philosophy-lists-history-of-western-philosophy-list'] = { bucket: 'ADJUDICATE', notes: '§10: borderline outline — dissolve as nav, or rehome under History/History-of-philosophy as thin reference?' };
R['philosophy-lists-eastern-philosophers-timeline'] = { bucket: 'LENS', target_path: 'lens: temporal-axis applied to Philosophy / By region / Eastern philosophy + History / History of fields / History of philosophy', notes: '§12 lens conversion; gated on lens mechanism' };
R['philosophy-lists-western-philosophers-timeline'] = { bucket: 'LENS', target_path: 'lens: temporal-axis applied to Philosophy / By region / Western philosophy + History / History of fields / History of philosophy', notes: '§12 lens conversion; gated on lens mechanism' };
R['philosophy-lists-philosophical-timelines'] = { bucket: 'LENS', target_path: 'lens: temporal-axis (parent of Eastern + Western timelines)', notes: '§12; consolidate with the two timeline children above' };
R['philosophy-lists-philosophers-role-category'] = { bucket: 'IMPORT_REALIZE', target_path: 'Philosophy / Philosophers', proposed_new_type: 'role_container', import_source: 'philosophical-reference DB (SEP/IEP biographical index)', notes: 'New L2 "Philosophers" needed (or rehome under Philosophy/Schools as members); ambiguous, surface in summary' };
R['philosophy-lists-philosophies-list'] = { bucket: 'DISSOLVE', notes: 'List-of-philosophies meta. Real homes are Philosophy/Schools + Philosophy/Branches.' };

// ===== SELF (16) — mostly trivia-class lists; spec §10 assumes keep+rehome =====
R['self-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['self-lists-association-footballer-playing-deaths'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Sports / Ball games / Association football / Notable deaths', proposed_new_type: 'curiosity_list', notes: 'Football-domain trivia → Culture/Sports' };
R['self-lists-bow-tie-wearers'] = { bucket: 'ADJUDICATE', notes: '§10 trivia-class confirm-or-cut; spec assumes keep → Self / Personality / Sartorial markers or similar' };
R['self-lists-cyclist-race-deaths'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Sports / Cycling / Notable deaths', proposed_new_type: 'curiosity_list', notes: 'No Culture/Sports/Cycling branch yet — would need creating' };
R['self-lists-disappeared-mysteriously'] = { bucket: 'INTRA_REALM', target_path: 'Self / Person / Disappeared mysteriously', proposed_new_type: 'curiosity_list', notes: 'Person-fate trivia; sits under Self/Person' };
R['self-lists-entertainer-deaths-while-performing'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Performing arts / Notable on-stage deaths', proposed_new_type: 'curiosity_list', notes: 'Performing-arts domain' };
R['self-lists-eponymous-laws'] = { bucket: 'INTRA_REALM', target_path: 'Self / Person / Eponymous laws', proposed_new_type: 'curiosity_list', notes: 'Person-named laws/rules' };
R['self-lists-eponyms'] = { bucket: 'INTRA_REALM', target_path: 'Self / Person / Eponyms', proposed_new_type: 'curiosity_list', notes: 'Person-named things — sibling of eponymous-laws' };
R['self-lists-families-by-tree'] = { bucket: 'INTRA_REALM', target_path: 'Self / Relationships / Family / Family trees', proposed_new_type: 'reference', notes: 'Genealogy reference; pairs with existing Self/Relationships/Family' };
R['self-lists-inventors-killed-by-their-own-inventions'] = { bucket: 'DISSOLVE', notes: '§5 cross-drawer dup: kept in History/Lists; this Self copy deletes. Per spec §5 explicit call-out.' };
R['self-lists-personal-timelines'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Self / Person', notes: '§12 lens conversion; gated on mechanism' };
R['self-lists-political-self-immolations'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Historical events / Political self-immolations', proposed_new_type: 'event_list', notes: 'Historical-event class; History is the better home' };
R['self-lists-selfie-related-injuries-and-deaths'] = { bucket: 'ADJUDICATE', notes: '§10 trivia-class; spec assumes keep — proposed home Self / Person / Modern-era curiosities' };
R['self-lists-terms-for-men'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Linguistics / Terms for men', proposed_new_type: 'vocabulary_list', notes: 'Sociolinguistic vocabulary; Society/Linguistics is real home' };
R['self-lists-unusual-deaths'] = { bucket: 'ADJUDICATE', notes: '§10 trivia-class; spec assumes keep — proposed home Self / Person / Unusual deaths' };
R['self-lists-wartime-cross-dressers'] = { bucket: 'INTRA_REALM', target_path: 'Self / Identity dimensions / Gender / Wartime cross-dressers', proposed_new_type: 'curiosity_list', notes: 'Gender-identity curiosity; verify Identity-dimensions sub-structure exists' };

// ===== HUMAN ACTIVITIES (19) — mostly cross-realm or dup =====
R['human-activities-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['human-activities-lists-battles-by-casualties'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Military history / Battles by casualties', proposed_new_type: 'event_list', notes: 'Military history domain' };
R['human-activities-lists-carbon-dioxide-emissions-by-country'] = { bucket: 'LENS', target_path: 'lens: by-country on Human activities / Environmental impact / Climate change OR Science / Earth science / Climate science', notes: '§12 lens — country axis on emissions atom' };
R['human-activities-lists-environmental-disasters-list'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Historical events / Environmental disasters', proposed_new_type: 'event_list', notes: 'Historical events of environmental harm' };
R['human-activities-lists-environmental-issues'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup with Society / Lists / Environmental issues. Real home: Human activities / Environmental impact (L2 exists). Both Lists copies dissolve; canonical atom is the L2 itself.' };
R['human-activities-lists-games'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Games (which IS the real L2). Cross-link via realm_tags if needed.' };
R['human-activities-lists-greenhouse-gas-emissions-top-contributors'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Earth science / Climate science / Greenhouse gas emissions, top contributors', proposed_new_type: 'reference', notes: 'Climate-science data table' };
R['human-activities-lists-greenhouse-gases-ipcc-list'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Earth science / Climate science / Greenhouse gases (IPCC list)', proposed_new_type: 'reference', notes: 'IPCC scientific reference' };
R['human-activities-lists-languages'] = { bucket: 'DISSOLVE', notes: 'Dup of Society / Linguistics / Languages (existing real branch). Society version becomes IMPORT_REALIZE (ISO 639). Cross-link via realm_tags if needed.' };
R['human-activities-lists-martial-arts'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Sports / Combat sports / Martial arts (existing real branch). Cross-link via realm_tags.' };
R['human-activities-lists-methods-of-capital-punishment'] = { bucket: 'CROSS_REALM', target_realm: 'Justice', target_path: 'Justice / Prosecutions / Methods of capital punishment', proposed_new_type: 'reference', notes: 'Punishment methods — Justice/Prosecutions L2 is real home' };
R['human-activities-lists-mudras'] = { bucket: 'CROSS_REALM', target_realm: 'Religion', target_path: 'Religion / Concepts / Mudras', proposed_new_type: 'concept_list', notes: 'Hindu/Buddhist ritual hand-gestures; Religion is the domain. Could also be Culture/Performing arts.' };
R['human-activities-lists-musical-instruments'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Performing arts / Music / Musical instruments (existing real branch). Cross-link via realm_tags.' };
R['human-activities-lists-newspapers'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Mass media / Print media / Newspapers (existing real branch). Reference duplicate also dissolves per §13.' };
R['human-activities-lists-schools'] = { bucket: 'INTRA_REALM', target_path: 'Human activities / Views / Education (practice) / Schools', proposed_new_type: 'institution_list', notes: 'Educational schools (NOT Philosophy/Schools — that\'s schools-of-thought). Distinct concept from Philosophy/Schools per query confirmation.' };
R['human-activities-lists-songs'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Performing arts / Music / Lists / Songs and compositions (which itself dissolves into Culture/Performing arts/Music)' };
R['human-activities-lists-spin-offs'] = { bucket: 'ADJUDICATE', notes: 'Near-dup with Culture / TV / Lists / Television programs / Spin-off shows. Conceptually broader (corporate spinoffs, fictional spinoffs). Surface to determine home.' };
R['human-activities-lists-wars-by-death-toll'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Wars / By death toll', proposed_new_type: 'reference', notes: 'War-history reference; History/Wars L2 exists' };
R['human-activities-lists-weight-training-exercises'] = { bucket: 'DISSOLVE', notes: 'Dup of Health / Physical exercise / Weight training exercises (existing real branch). Cross-link via realm_tags.' };

// ===== RELIGION (24) =====
R['religion-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['religion-lists-angels-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Beings / Angels', proposed_new_type: 'entity_list', notes: 'Beings L2 is canonical home; drop " list" suffix' };
R['religion-lists-bible-stories'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Sacred texts / Bible / Stories', proposed_new_type: 'narrative_list', notes: 'Bible-specific narrative reference' };
R['religion-lists-biblical-nameless'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Sacred texts / Bible / Unnamed figures', proposed_new_type: 'curiosity_list', notes: 'Bible-specific curiosity; rename "Biblical nameless" → "Unnamed figures"' };
R['religion-lists-biblical-names'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Sacred texts / Bible / Names', proposed_new_type: 'reference', notes: 'Onomastic reference' };
R['religion-lists-cathedrals'] = { bucket: 'IMPORT_REALIZE', target_path: 'Religion / Concepts / Sacred architecture / Cathedrals', proposed_new_type: 'entity_list', import_source: 'religious-architecture registry (Catholic dioceses + UNESCO)', notes: 'Open-ended entity set' };
R['religion-lists-christian-denominations-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Major religions / Christianity / Denominations', proposed_new_type: 'denomination_list', notes: 'Drop " list" suffix' };
R['religion-lists-deities-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Beings / Deities', proposed_new_type: 'entity_list', notes: 'Beings L2; merges naturally with mythology' };
R['religion-lists-demons-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Beings / Demons', proposed_new_type: 'entity_list', notes: 'Beings L2 sibling of angels/deities' };
R['religion-lists-dramatic-portrayals-of-jesus-christ'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Mass media / Film and cinema / Religious portrayals / Jesus Christ', proposed_new_type: 'curiosity_list', notes: 'Film/media-domain content' };
R['religion-lists-founders-religious-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Religious roles / Founders', proposed_new_type: 'role_list', notes: 'Religious roles L2 exists' };
R['religion-lists-hinduism-lists'] = { bucket: 'DISSOLVE', notes: 'Meta navigation page. Hinduism content lives under Religion / Major religions / Hinduism.' };
R['religion-lists-indigetes-roman-gods-and-goddesses-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Mythologies / Roman mythology / Indigetes', proposed_new_type: 'entity_list', notes: 'Mythologies L2; subset of Roman pantheon' };
R['religion-lists-languages-by-year-of-first-bible-translation'] = { bucket: 'LENS', target_path: 'lens: temporal+language axis on Religion / Sacred texts / Bible / Translations', notes: '§12 lens; specific to Bible-translation atom' };
R['religion-lists-major-religious-groups'] = { bucket: 'DISSOLVE', notes: 'Dup of Religion / Major religions L2 itself. Pure navigation.' };
R['religion-lists-monasteries-dissolved-by-henry-viii'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Historical events / English Reformation / Monasteries dissolved by Henry VIII', proposed_new_type: 'reference', notes: 'Historical-event reference; could also live under Religion if you prefer' };
R['religion-lists-mormonism-list'] = { bucket: 'DISSOLVE', notes: 'Meta navigation page. Mormonism content lives under Religion / Major religions / Christianity / Mormonism.' };
R['religion-lists-patriarchs-of-antioch'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Religious roles / Patriarchs / Antioch', proposed_new_type: 'role_list', notes: 'Eastern-Christian historical office list' };
R['religion-lists-patriarchs-of-constantinople'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Religious roles / Patriarchs / Constantinople', proposed_new_type: 'role_list', notes: 'Sibling of Antioch above' };
R['religion-lists-people-claimed-to-be-jesus'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Issues and debates / Messianic claimants', proposed_new_type: 'curiosity_list', notes: 'Theological-controversy class' };
R['religion-lists-popes-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Religious roles / Popes', proposed_new_type: 'role_list', notes: 'Drop " list" suffix' };
R['religion-lists-religions-and-spiritual-traditions'] = { bucket: 'DISSOLVE', notes: 'Dup of Religion / Major religions + Religion / Belief systems (both L2s exist). Pure navigation.' };
R['religion-lists-saints-list'] = { bucket: 'INTRA_REALM', target_path: 'Religion / Religious roles / Saints', proposed_new_type: 'role_list', notes: 'Drop " list" suffix' };
R['religion-lists-sexually-active-popes'] = { bucket: 'ADJUDICATE', notes: '§10 trivia-class; spec assumes keep — would route to Religion / Religious roles / Popes / Curiosities. Confirm.' };

// ===== TECH (50) =====
R['tech-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['tech-lists-aircraft-manufacturers'] = { bucket: 'IMPORT_REALIZE', target_path: 'Tech / Transport technology / Aircraft / Manufacturers', proposed_new_type: 'company_list', import_source: 'aviation industry registry', notes: 'Open-ended company set' };
R['tech-lists-amd-microprocessors'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Hardware / Microprocessors / AMD', proposed_new_type: 'product_list', notes: 'Vendor-specific catalog; sibling Intel below' };
R['tech-lists-ascii'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Character encoding / ASCII', proposed_new_type: 'reference', notes: 'Character-encoding reference; pairs with Unicode + UTF-8 below' };
R['tech-lists-automobile-manufacturers'] = { bucket: 'IMPORT_REALIZE', target_path: 'Tech / Transport technology / Land transport / Road transport / Automobile manufacturers', proposed_new_type: 'company_list', import_source: 'automotive industry registry', notes: 'Open-ended' };
R['tech-lists-aviation-accidents-by-year'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Tech / Transport technology / Aircraft / Aviation accidents', notes: '§12 lens; needs Aviation-accidents atom to exist first' };
R['tech-lists-busiest-airports'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Transport technology / Aircraft / Airports / Busiest airports', proposed_new_type: 'ranked_list', notes: 'Top-N reference' };
R['tech-lists-canals-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Civil engineering / Canals', proposed_new_type: 'infrastructure_list', notes: 'Drop " list" suffix' };
R['tech-lists-character-sets-and-encodings'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Character encoding', proposed_new_type: 'reference', notes: 'Parent for ASCII/Unicode/UTF-8/XML+HTML below' };
R['tech-lists-civil-engineering-landmarks'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Civil engineering / Landmarks', proposed_new_type: 'reference', notes: 'ASCE Historic Civil Engineering Landmarks designation' };
R['tech-lists-demolished-landmarks'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Demolished landmarks', proposed_new_type: 'reference', notes: 'Historical-buildings catalog' };
R['tech-lists-digital-library-projects'] = { bucket: 'DISSOLVE', notes: 'Dup of Reference / Reference of organizations / Libraries / Digital library projects (which itself moves per §13 to Society / Social institutions). Cross-link via realm_tags.' };
R['tech-lists-emerging-technology-list'] = { bucket: 'DISSOLVE', notes: 'Dup of Tech / Emerging technologies L2 itself. Pure navigation.' };
R['tech-lists-famous-trains'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Transport technology / Rail transport / Famous trains', proposed_new_type: 'reference', notes: 'Trains as cultural-historical reference' };
R['tech-lists-graphics-file-formats'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / File formats / Graphics', proposed_new_type: 'format_list', notes: 'File-format reference; could become parent of multiple format categories' };
R['tech-lists-heritage-registers'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Heritage registers', proposed_new_type: 'reference', notes: 'Preservation-registry reference' };
R['tech-lists-html-editors'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Software / Web development / HTML editors', proposed_new_type: 'product_list', notes: 'Software-product list' };
R['tech-lists-http-status-codes'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Internet and Web / Protocols / HTTP / Status codes', proposed_new_type: 'reference', notes: 'Protocol reference' };
R['tech-lists-intel-microprocessors'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Hardware / Microprocessors / Intel', proposed_new_type: 'product_list', notes: 'Sibling of AMD above' };
R['tech-lists-landings-on-extraterrestrial-bodies'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Astronomy and space science / Space exploration / Landings on extraterrestrial bodies', proposed_new_type: 'event_list', notes: 'Space-science domain' };
R['tech-lists-largest-bridges'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Civil engineering / Bridges / Largest', proposed_new_type: 'ranked_list', notes: 'Top-N reference' };
R['tech-lists-largest-energy-infrastructure'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Energy technology / Largest energy infrastructure', proposed_new_type: 'ranked_list', notes: 'Top-N reference' };
R['tech-lists-lighthouses'] = { bucket: 'IMPORT_REALIZE', target_path: 'Tech / Transport technology / Maritime / Lighthouses', proposed_new_type: 'entity_list', import_source: 'maritime-infrastructure registry', notes: 'Open-ended global catalog' };
R['tech-lists-list-of-years-in-science'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Science (cross-realm lens)', notes: '§12 lens; Tech home is wrong, Science is the domain' };
R['tech-lists-longest-tunnels'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Civil engineering / Tunnels / Longest', proposed_new_type: 'ranked_list', notes: 'Top-N reference' };
R['tech-lists-military-weapons-list'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Military and security / Weapons', proposed_new_type: 'entity_list', notes: 'Military-domain (could also stay under Tech/Military technology — domain overlap)' };
R['tech-lists-missile-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Military technology / Missiles', proposed_new_type: 'entity_list', notes: 'Tech/Military technology L2 is real home; drop " list" suffix' };
R['tech-lists-nato-reporting-names'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Military technology / NATO reporting names', proposed_new_type: 'reference', notes: 'Military-equipment naming convention reference' };
R['tech-lists-open-source-software-packages'] = { bucket: 'IMPORT_REALIZE', target_path: 'Tech / Computing / Software / Open source', proposed_new_type: 'product_container', import_source: 'package-manager registries (npm/PyPI/etc.)', notes: 'Open-ended; massive scale' };
R['tech-lists-operating-systems-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Software / Operating systems', proposed_new_type: 'product_list', notes: 'Drop " list" suffix' };
R['tech-lists-programming-languages-list-alphabetical'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — sort-page' };
R['tech-lists-programming-languages-list-categorical'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — sort-page' };
R['tech-lists-programming-languages-list-chronological'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — sort-page' };
R['tech-lists-programming-languages-list-generational'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — sort-page' };
R['tech-lists-reservoirs-and-dams-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Civil engineering / Reservoirs and dams', proposed_new_type: 'infrastructure_list', notes: 'Drop " list" suffix' };
R['tech-lists-screen-readers'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Software / Accessibility / Screen readers', proposed_new_type: 'product_list', notes: 'Accessibility software' };
R['tech-lists-software-bugs-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Software / Notable software bugs', proposed_new_type: 'curiosity_list', notes: 'Historical-bugs reference' };
R['tech-lists-solar-system-probes'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Astronomy and space science / Space exploration / Solar System probes', proposed_new_type: 'mission_list', notes: 'Space-science domain' };
R['tech-lists-tallest-buildings'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Construction and built environment / Tallest buildings', proposed_new_type: 'ranked_list', notes: 'Top-N reference' };
R['tech-lists-tcp-and-udp-port-numbers'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Internet and Web / Protocols / TCP and UDP port numbers', proposed_new_type: 'reference', notes: 'Network-protocol reference' };
R['tech-lists-terrorist-groups'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Military and security / Terrorist groups', proposed_new_type: 'organization_list', notes: 'Society/Military and security domain' };
R['tech-lists-terrorist-incidents'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Historical events / Terrorist incidents', proposed_new_type: 'event_list', notes: 'Historical-events domain' };
R['tech-lists-test-automation'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Software / Software engineering / Test automation', proposed_new_type: 'concept_list', notes: 'Software-engineering practice' };
R['tech-lists-timeline-of-historic-inventions'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Tech (or History / History of fields / History of technology)', notes: '§12 lens; cross-realm-friendly' };
R['tech-lists-unicode'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Character encoding / Unicode', proposed_new_type: 'reference', notes: 'Sibling of ASCII/UTF-8' };
R['tech-lists-utf-8'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Character encoding / UTF-8', proposed_new_type: 'reference', notes: 'Unicode encoding form' };
R['tech-lists-wikis-list'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Internet and Web / Wikis', proposed_new_type: 'product_list', notes: 'Wiki-platform catalog' };
R['tech-lists-world-heritage-sites'] = { bucket: 'IMPORT_REALIZE', target_path: 'Tech / Construction and built environment / Heritage registers / UNESCO World Heritage Sites', proposed_new_type: 'entity_list', import_source: 'UNESCO WHC list', notes: 'External canonical source; sub-container of Heritage registers' };
R['tech-lists-wwii-weapons'] = { bucket: 'CROSS_REALM', target_realm: 'History', target_path: 'History / Wars / World War II / Weapons', proposed_new_type: 'entity_list', notes: 'War-history-specific weapons' };
R['tech-lists-xml-and-html-characters'] = { bucket: 'INTRA_REALM', target_path: 'Tech / Computing / Character encoding / XML and HTML character entities', proposed_new_type: 'reference', notes: 'Markup-character reference' };

// ===== HISTORY (51) — mostly INTRA_REALM under existing L2s =====
R['history-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['history-lists-archaeological-sites'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical sciences / Archaeology / Archaeological sites', proposed_new_type: 'site_list', notes: 'Historical-sciences L2 holds archaeology' };
R['history-lists-battles'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Battles', proposed_new_type: 'event_list', notes: 'Military-history L2' };
R['history-lists-by-decade-century-or-millennium'] = { bucket: 'LENS', target_path: 'lens: temporal-axis (coarser-grained than By-year)', notes: '§12 — pairs with By-year as multi-scale temporal lens' };
R['history-lists-by-year'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on History', notes: '§12 — precedent already set per spec §3 (history/by-region, geography/groupings)' };
R['history-lists-civil-wars-list'] = { bucket: 'INTRA_REALM', target_path: 'History / Wars / Civil wars', proposed_new_type: 'event_list', notes: 'History/Wars L2; drop " list" suffix' };
R['history-lists-coups-and-coup-attempts'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Coups and coup attempts', proposed_new_type: 'event_list', notes: 'Historical-events L2' };
R['history-lists-cyclones-list'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Natural disasters / Cyclones', proposed_new_type: 'event_list', notes: 'Historical cyclones (distinct from Science / Earth science / Meteorology cyclone-physics)' };
R['history-lists-disasters'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters', proposed_new_type: 'event_container', notes: 'Parent for natural-disasters, industrial-disasters, nuclear-accidents below' };
R['history-lists-earthquakes'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Natural disasters / Earthquakes', proposed_new_type: 'event_list', notes: 'Historical earthquakes; distinct from Science / Earth science / Geology / Earthquakes (geophysics) — cross-link via realm_tags' };
R['history-lists-epidemics'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Epidemics', proposed_new_type: 'event_list', notes: 'Historical-events; cross-link to Health/Public health' };
R['history-lists-famous-deaths-by-cause'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Famous deaths by cause', proposed_new_type: 'event_list', notes: 'Historical-figures reference' };
R['history-lists-famous-speeches'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Famous speeches', proposed_new_type: 'event_list', notes: 'Rhetorical-history reference' };
R['history-lists-fires'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters / Fires', proposed_new_type: 'event_list', notes: 'Sub-disaster category' };
R['history-lists-foreign-policy-doctrines'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Government / Foreign policy / Doctrines', proposed_new_type: 'concept_list', notes: 'Governance-concept; Society/Government L2' };
R['history-lists-former-sovereign-states'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical states / Former sovereign states', proposed_new_type: 'entity_list', notes: 'Historical-states L2 is canonical home' };
R['history-lists-guerrilla-movements'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Guerrilla movements', proposed_new_type: 'organization_list', notes: 'Could also live under Society / Social movements' };
R['history-lists-helicopter-prison-escapes'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Helicopter prison escapes', proposed_new_type: 'curiosity_list', notes: 'Trivia-class historical event' };
R['history-lists-historians-by-subfield'] = { bucket: 'INTRA_REALM', target_path: 'History / Historians / By subfield', proposed_new_type: 'role_list', notes: 'New L2 "Historians" needed, or rehome under History of fields' };
R['history-lists-historical-anniversaries'] = { bucket: 'LENS', target_path: 'lens: anniversary axis on History', notes: '§12 lens; pairs with By-year/On-this-day' };
R['history-lists-historical-sites'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical sites', proposed_new_type: 'site_container', notes: 'New L2 candidate; could live under Historical sciences' };
R['history-lists-industrial-disasters'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters / Industrial', proposed_new_type: 'event_list', notes: 'Sub-disaster category' };
R['history-lists-invasions'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Invasions', proposed_new_type: 'event_list', notes: 'Military-history L2' };
R['history-lists-inventions'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Inventions', proposed_new_type: 'event_list', notes: 'Could pair with Tech / Lists / Timeline of historic inventions (LENS) — Inventions as the canonical atom set, timeline as the lens' };
R['history-lists-inventors-killed-by-their-own-inventions'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Inventors killed by their own inventions', proposed_new_type: 'curiosity_list', notes: '§5 keeps THIS copy (Self/Lists dup deletes)' };
R['history-lists-kidnappings'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Kidnappings', proposed_new_type: 'event_list', notes: 'Historical-events L2' };
R['history-lists-military-disasters'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Disasters', proposed_new_type: 'event_list', notes: 'Military-history L2' };
R['history-lists-military-operations'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Operations', proposed_new_type: 'event_list', notes: 'Military-history L2' };
R['history-lists-missing-treasure'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Missing treasure', proposed_new_type: 'curiosity_list', notes: 'Trivia-class' };
R['history-lists-musical-events-historical'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Performing arts / Music / Historical musical events', proposed_new_type: 'event_list', notes: 'Music-domain history' };
R['history-lists-natural-disasters'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters / Natural', proposed_new_type: 'event_container', notes: 'Parent for earthquakes/cyclones/fires above' };
R['history-lists-nobel-prizes'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Nobel Prizes', proposed_new_type: 'award_list', notes: 'Historical-awards reference' };
R['history-lists-nuclear-accidents'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters / Nuclear accidents', proposed_new_type: 'event_list', notes: 'Sub-disaster category' };
R['history-lists-on-this-day'] = { bucket: 'LENS', target_path: 'lens: calendar-day axis on History', notes: '§12 lens — calendar-day perspective on historical events' };
R['history-lists-power-outages'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Disasters / Power outages', proposed_new_type: 'event_list', notes: 'Sub-disaster category' };
R['history-lists-recessions'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Recessions', proposed_new_type: 'event_list', notes: 'Economic-history events' };
R['history-lists-revolutions-and-rebellions'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Revolutions and rebellions', proposed_new_type: 'event_list', notes: 'Historical-events L2' };
R['history-lists-riots'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Riots', proposed_new_type: 'event_list', notes: 'Historical-events L2' };
R['history-lists-roman-governorships-of-britain'] = { bucket: 'INTRA_REALM', target_path: 'History / Ancient civilizations / Roman / Britain / Governorships', proposed_new_type: 'role_list', notes: 'Ancient-civilizations L2; very specific historical office' };
R['history-lists-roman-sites'] = { bucket: 'INTRA_REALM', target_path: 'History / Ancient civilizations / Roman / Sites', proposed_new_type: 'site_list', notes: 'Roman archaeological sites' };
R['history-lists-scientific-discoveries'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Scientific method and meta-science / History of science / Scientific discoveries', proposed_new_type: 'event_list', notes: 'Could also stay under History — domain overlap; History of science L2 is canonical' };
R['history-lists-sieges'] = { bucket: 'INTRA_REALM', target_path: 'History / Military history / Sieges', proposed_new_type: 'event_list', notes: 'Military-history L2' };
R['history-lists-space-shuttle-missions'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Astronomy and space science / Space exploration / Space Shuttle missions', proposed_new_type: 'mission_list', notes: 'Space-history; could live under either realm' };
R['history-lists-strikes'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Social movements / Strikes', proposed_new_type: 'event_list', notes: 'Labor-history → Society / Social movements (cross-drawer dup with Society / Lists / Strikes list — that copy also moves here)' };
R['history-lists-tariffs'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Economy and business / Tariffs', proposed_new_type: 'policy_list', notes: 'Economic-policy' };
R['history-lists-ticker-tape-parades-in-new-york-city'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Ticker-tape parades in New York City', proposed_new_type: 'event_list', notes: 'NYC-specific historical-ceremonies' };
R['history-lists-treaties'] = { bucket: 'INTRA_REALM', target_path: 'History / Historical events / Treaties', proposed_new_type: 'document_list', notes: 'Diplomatic history; could also live under Society / Government / Foreign policy' };
R['history-lists-un-peacekeeping-missions'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Government / International organizations (categories) / UN / Peacekeeping missions', proposed_new_type: 'mission_list', notes: 'Existing UN-related branch in Society' };
R['history-lists-united-states-supreme-court-cases'] = { bucket: 'CROSS_REALM', target_realm: 'Society', target_path: 'Society / Law / United States Supreme Court cases', proposed_new_type: 'case_list', notes: 'Legal history → Society / Law' };
R['history-lists-wobbly-lingo'] = { bucket: 'ADJUDICATE', notes: '§10: IWW glossary. Niche labor-history vocab. Society/Linguistics, Society/Social movements/Labor, or dissolve?' };
R['history-lists-world-records-in-chess-historical'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: culture-games-board-games-chess-lists-chess-world-records moves to Culture / Games / Board games / Chess / World records and subsumes both current+historical records. Cross-link via realm_tags.' };

// ===== SOCIETY (87) — flat drawer with heavy IMPORT_REALIZE =====
R['society-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['society-lists-academic-fields'] = { bucket: 'INTRA_REALM', target_path: 'Society / Education (system) / Academic fields', proposed_new_type: 'field_list', notes: 'Drop " list" suffix' };
R['society-lists-acronyms'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Acronyms', proposed_new_type: 'reference', notes: 'General-acronyms reference' };
R['society-lists-admissions-tests'] = { bucket: 'INTRA_REALM', target_path: 'Society / Education (system) / Admissions tests', proposed_new_type: 'reference', notes: 'Education-domain' };
R['society-lists-banks-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Economy and business / Banks', proposed_new_type: 'organization_container', import_source: 'banking regulator registries', notes: 'Open-ended; drop " list" suffix' };
R['society-lists-british-professional-bodies'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Professional bodies / British', proposed_new_type: 'organization_list', notes: 'UK-specific; sibling of broader professional-bodies catalog' };
R['society-lists-business-theorists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Business administration / Business theorists', proposed_new_type: 'role_list', notes: 'Academic-figure list' };
R['society-lists-california-suffragists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social movements / Suffragists / California', proposed_new_type: 'role_list', notes: 'Geographic-subset of suffrage movement' };
R['society-lists-case-law-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Law / Case law', proposed_new_type: 'case_list', notes: 'Society/Law L2; drop " (list)" suffix' };
R['society-lists-civic-fraternal-service-professional-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Civic, fraternal, service, professional organizations', proposed_new_type: 'organization_list', notes: 'Social-institutions L2' };
R['society-lists-civics-topics'] = { bucket: 'ADJUDICATE', notes: '§10 borderline outline — dissolve as nav, or rehome as thin Society / Government / Civics branch?' };
R['society-lists-clinical-psychologists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Clinical psychologists', proposed_new_type: 'role_list', notes: 'Psychology-discipline role list' };
R['society-lists-companies-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Economy and business / Companies', proposed_new_type: 'organization_container', import_source: 'corporate registry', notes: 'Open-ended global catalog; drop " (list)" suffix' };
R['society-lists-consonants'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Phonetics / Consonants', proposed_new_type: 'reference', notes: 'Phonetics reference' };
R['society-lists-cooperatives-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Cooperatives', proposed_new_type: 'organization_list', notes: 'Drop " list" suffix' };
R['society-lists-corporate-assets'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Corporate assets', proposed_new_type: 'reference', notes: 'Corporate-finance concept' };
R['society-lists-countries-by-nominal-gdp'] = { bucket: 'LENS', target_path: 'lens: by-country ranked by nominal-GDP on Geography / Countries', notes: '§12 lens — GDP ranking is a country axis, not its own atom' };
R['society-lists-countries-by-nominal-gdp-per-capita'] = { bucket: 'LENS', target_path: 'lens: by-country ranked by nominal-GDP-per-capita on Geography / Countries', notes: '§12 lens' };
R['society-lists-countries-by-ppp-gdp'] = { bucket: 'LENS', target_path: 'lens: by-country ranked by PPP-GDP on Geography / Countries', notes: '§12 lens' };
R['society-lists-countries-by-ppp-gdp-per-capita'] = { bucket: 'LENS', target_path: 'lens: by-country ranked by PPP-GDP-per-capita on Geography / Countries', notes: '§12 lens' };
R['society-lists-credentials-in-psychology'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Credentials', proposed_new_type: 'reference', notes: 'Psychology-professional reference' };
R['society-lists-current-members-of-the-united-states-congress'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / United States / Congress / Current members', proposed_new_type: 'role_list', notes: 'Time-varying — needs upkeep policy' };
R['society-lists-department-stores'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Economy and business / Retail / Department stores', proposed_new_type: 'organization_list', import_source: 'corporate registry', notes: 'Retail-sector subset' };
R['society-lists-diagnostic-classification-and-rating-scales'] = { bucket: 'CROSS_REALM', target_realm: 'Health', target_path: 'Health / Mental health / Diagnostic classification and rating scales', proposed_new_type: 'reference', notes: 'Mental-health diagnostic tools' };
R['society-lists-economists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Economists', proposed_new_type: 'role_list', notes: 'Discipline-figure list' };
R['society-lists-emoticons'] = { bucket: 'CROSS_REALM', target_realm: 'Tech', target_path: 'Tech / Internet and Web / Emoticons', proposed_new_type: 'reference', notes: 'Internet-vocabulary' };
R['society-lists-emotions-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Emotions', proposed_new_type: 'concept_list', notes: 'Drop " list" suffix' };
R['society-lists-employee-owned-companies'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Companies / Employee-owned', proposed_new_type: 'organization_list', notes: 'Sub-category of Companies IMPORT_REALIZE above' };
R['society-lists-employer-associations-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Employer associations', proposed_new_type: 'organization_list', notes: 'Drop " list" suffix' };
R['society-lists-english-words-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Languages / English / Words', proposed_new_type: 'reference', notes: 'English-specific vocabulary reference' };
R['society-lists-environmental-issues'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup with Human activities / Lists / Environmental issues. Real home is Human activities / Environmental impact L2 itself.' };
R['society-lists-environmental-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Environmental organizations', proposed_new_type: 'organization_list', notes: 'Could also be Society/Social movements' };
R['society-lists-european-sovereign-debt-crisis-acronyms'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Finance / European sovereign-debt crisis / Acronyms', proposed_new_type: 'reference', notes: 'Very niche; consider folding into a broader event atom' };
R['society-lists-feminism-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social movements / Feminism', proposed_new_type: 'movement_list', notes: 'Drop " list" suffix; Social-movements L2 is canonical home' };
R['society-lists-feminist-economists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Economists / Feminist economists', proposed_new_type: 'role_list', notes: 'Sub-category of Economists' };
R['society-lists-fictional-psychiatrists'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Literature / Fictional characters / Fictional psychiatrists', proposed_new_type: 'curiosity_list', notes: 'Fictional-characters domain → Culture/Literature' };
R['society-lists-fields-of-doctoral-studies'] = { bucket: 'INTRA_REALM', target_path: 'Society / Education (system) / Fields of doctoral studies', proposed_new_type: 'field_list', notes: 'Education-domain' };
R['society-lists-generic-names-of-political-parties'] = { bucket: 'INTRA_REALM', target_path: 'Society / Politics / Political parties / Generic names', proposed_new_type: 'reference', notes: 'Political-vocabulary' };
R['society-lists-green-topics'] = { bucket: 'ADJUDICATE', notes: '§10 borderline outline — dissolve, or rehome under Human activities / Environmental impact?' };
R['society-lists-guide-dog-schools'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Guide dog schools', proposed_new_type: 'organization_list', notes: 'Disability-services institutions' };
R['society-lists-hieroglyphs-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Society / Linguistics / Writing systems / Hieroglyphs already exists in production (verified collision check). Drop the Lists copy.' };
R['society-lists-honorary-societies'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Honorary societies', proposed_new_type: 'organization_list', notes: 'Social-institutions L2' };
R['society-lists-intelligence-agencies-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Military and security / Intelligence agencies', proposed_new_type: 'organization_list', notes: 'Drop " list" suffix' };
R['society-lists-languages-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Society / Linguistics / Languages already exists in production (verified collision check). The existing atom is the IMPORT_REALIZE target — flag for the ISO 639 import pass.' };
R['society-lists-lgbt-related-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social movements / LGBT / Organizations', proposed_new_type: 'organization_list', notes: 'Social-movements L2' };
R['society-lists-lifestyles'] = { bucket: 'INTRA_REALM', target_path: 'Society / Society concepts / Lifestyles', proposed_new_type: 'concept_list', notes: 'Could also live under Self/Life domains — surface in summary' };
R['society-lists-memory-biases-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Memory biases', proposed_new_type: 'concept_list', notes: 'Cognitive-psychology concepts' };
R['society-lists-micronations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / Micronations', proposed_new_type: 'entity_list', notes: 'Unrecognized polities curiosity' };
R['society-lists-national-anthems'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / National symbols / Anthems', proposed_new_type: 'reference', notes: 'National-symbols subset' };
R['society-lists-national-legislatures'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / National legislatures', proposed_new_type: 'institution_list', notes: 'Government-L2 institutions' };
R['society-lists-nlp-related-articles'] = { bucket: 'DISSOLVE', notes: '§6 hard dissolve — Wikipedia article-index for NLP. NLP concepts live under Tech / Artificial intelligence / Natural language processing.' };
R['society-lists-phonetics-topics'] = { bucket: 'ADJUDICATE', notes: '§10 borderline outline — dissolve as nav, or rehome as thin Society / Linguistics / Phonetics branch?' };
R['society-lists-political-parties'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Politics / Political parties', proposed_new_type: 'organization_container', import_source: 'electoral-data registries (per country)', notes: 'Open-ended; canonical at Society/Politics/Political parties' };
R['society-lists-prizes-medals-and-awards'] = { bucket: 'INTRA_REALM', target_path: 'Society / Society concepts / Prizes, medals, and awards', proposed_new_type: 'reference', notes: 'Could be subdivided by domain later' };
R['society-lists-psychological-schools'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Schools of thought', proposed_new_type: 'school_list', notes: 'Psychology theoretical-schools' };
R['society-lists-psychologists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Psychologists', proposed_new_type: 'role_list', notes: 'Discipline-figure list' };
R['society-lists-psychology-disciplines'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Disciplines', proposed_new_type: 'field_list', notes: 'Psychology sub-disciplines' };
R['society-lists-public-utilities-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Society / Infrastructure (pointer) / Public utilities already exists in production (verified collision check). Drop the Lists copy.' };
R['society-lists-scandals-with-gate-suffix'] = { bucket: 'INTRA_REALM', target_path: 'Society / Society concepts / Scandals with "-gate" suffix', proposed_new_type: 'curiosity_list', notes: 'Cultural-linguistic curiosity' };
R['society-lists-schools-by-country'] = { bucket: 'LENS', target_path: 'lens: by-country on Human activities / Views / Education (practice) / Schools', notes: '§12 lens applied to the Schools INTRA_REALM target above' };
R['society-lists-scientific-journals-in-psychology'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Scientific journals', proposed_new_type: 'publication_list', notes: 'Discipline-specific publications' };
R['society-lists-secret-police-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Military and security / Secret police organizations', proposed_new_type: 'organization_list', notes: 'Could also live under Justice/Patterns/Institutional-capture' };
R['society-lists-shibboleths'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Shibboleths', proposed_new_type: 'curiosity_list', notes: 'Sociolinguistic markers' };
R['society-lists-social-psychologists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Psychology / Social psychologists', proposed_new_type: 'role_list', notes: 'Sub-discipline of psychologists' };
R['society-lists-social-science-journals'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Journals', proposed_new_type: 'publication_list', notes: 'Social-sciences L2' };
R['society-lists-sociologists'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Sociology / Sociologists', proposed_new_type: 'role_list', notes: 'Discipline-figure list' };
R['society-lists-stock-exchanges'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Economy and business / Finance / Stock exchanges', proposed_new_type: 'organization_list', import_source: 'WFE registry', notes: 'Finite, externally-curated set' };
R['society-lists-stock-market-indices'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Finance / Stock market indices', proposed_new_type: 'reference', notes: 'Finance-domain reference' };
R['society-lists-store-brands'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Retail / Store brands', proposed_new_type: 'brand_list', notes: 'Private-label brands reference' };
R['society-lists-strikes-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup with History / Lists / Strikes. Both move to Society / Social movements / Strikes (per History row); cross-link via realm_tags.' };
R['society-lists-subfields-of-sociology-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social sciences / Sociology / Subfields', proposed_new_type: 'field_list', notes: 'Drop " list" suffix' };
R['society-lists-supermarkets'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Economy and business / Retail / Supermarkets', proposed_new_type: 'organization_list', import_source: 'retail-industry registry', notes: 'Retail sub-category' };
R['society-lists-symbols-list'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Symbols', proposed_new_type: 'reference', notes: 'Drop " list" suffix' };
R['society-lists-think-tanks'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social institutions / Think tanks', proposed_new_type: 'organization_list', notes: 'Policy-influence institutions; also relevant to Justice/Patterns' };
R['society-lists-timeline-of-sociology'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Society / Social sciences / Sociology', notes: '§12 lens' };
R['society-lists-trade-unions-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Social movements / Labor / Trade unions', proposed_new_type: 'organization_list', import_source: 'labor-org registry (ITUC/etc.)', notes: 'Drop " list" suffix' };
R['society-lists-traded-commodities'] = { bucket: 'INTRA_REALM', target_path: 'Society / Economy and business / Finance / Traded commodities', proposed_new_type: 'reference', notes: 'Commodities-market reference' };
R['society-lists-united-nations-member-states'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Government / International organizations / UN / Member states', proposed_new_type: 'entity_list', import_source: 'ISO 3166 + UN list', notes: 'Pairs with Geography/Countries gazetteer' };
R['society-lists-united-states-federal-agencies'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / United States / Federal agencies', proposed_new_type: 'organization_list', notes: 'US-specific government inventory' };
R['society-lists-united-states-mints'] = { bucket: 'INTRA_REALM', target_path: 'Society / Government / United States / Mints', proposed_new_type: 'institution_list', notes: 'US Treasury-related; note " Mints" is the proper-noun institution name, NOT the banned currency-verb' };
R['society-lists-universities-and-colleges-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Society / Education (system) / Universities and colleges', proposed_new_type: 'institution_container', import_source: 'education-ministry registries (per country)', notes: 'Open-ended global catalog; drop " (list)" suffix' };
R['society-lists-us-presidents-with-facial-hair'] = { bucket: 'ADJUDICATE', notes: '§10 trivia-class; spec assumes keep — would route to Society / Government / United States / Presidents / Curiosities. Confirm.' };
R['society-lists-us-states-by-unemployment-rate'] = { bucket: 'LENS', target_path: 'lens: by-state ranked by unemployment-rate on Society / Government / United States / States', notes: '§12 lens on US states' };
R['society-lists-vowels-table'] = { bucket: 'INTRA_REALM', target_path: 'Society / Linguistics / Phonetics / Vowels', proposed_new_type: 'reference', notes: 'Sibling of consonants above' };
R['society-lists-women-s-organizations'] = { bucket: 'INTRA_REALM', target_path: 'Society / Social movements / Women / Organizations', proposed_new_type: 'organization_list', notes: 'Pairs with feminism above' };
R['society-lists-writing-systems-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Society / Linguistics / Writing systems already exists in production (verified collision check). Drop the Lists copy.' };
R['society-lists-youth-rights-list'] = { bucket: 'CROSS_REALM', target_realm: 'Justice', target_path: 'Justice / Legal Frameworks / Civil liberties / Youth rights', proposed_new_type: 'movement_list', notes: 'Civil-liberties domain; drop " list" suffix' };

// ===== SCIENCE (89) — Lists L2 + structured sub-lists =====
R['science-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
// Astronomy sub-list (14)
R['science-lists-astronomy-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Astronomy sub-Lists container' };
R['science-lists-astronomy-lists-asteroid-groups'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Astronomy and space science / Solar System / Asteroid groups', proposed_new_type: 'entity_list', import_source: 'IAU Minor Planet Center', notes: '' };
R['science-lists-astronomy-lists-astronomical-catalogues'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Astronomical catalogues', proposed_new_type: 'reference', notes: 'Reference of catalogues (Messier, NGC, etc.)' };
R['science-lists-astronomy-lists-astronomical-objects-named-after-people'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Astronomical objects named after people', proposed_new_type: 'curiosity_list', notes: 'Onomastic curiosity' };
R['science-lists-astronomy-lists-astronomical-societies'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Astronomical societies', proposed_new_type: 'organization_list', notes: '' };
R['science-lists-astronomy-lists-astronomical-symbols'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Astronomical symbols', proposed_new_type: 'reference', notes: '' };
R['science-lists-astronomy-lists-comets-by-type'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Astronomy and space science / Solar System / Comets / By type', proposed_new_type: 'entity_list', import_source: 'IAU Minor Planet Center', notes: 'By-type structure preserved (could also be LENS on comets atom)' };
R['science-lists-astronomy-lists-future-astronomical-events'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Future astronomical events', proposed_new_type: 'event_list', notes: 'Predictive ephemeris reference' };
R['science-lists-astronomy-lists-meteor-showers-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Solar System / Meteor showers', proposed_new_type: 'event_list', notes: 'Drop " list" suffix' };
R['science-lists-astronomy-lists-minor-planets-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Astronomy and space science / Solar System / Minor planets', proposed_new_type: 'entity_container', import_source: 'IAU MPC', notes: 'Massive open-ended catalog; drop " list" suffix' };
R['science-lists-astronomy-lists-most-distant-astronomical-objects'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Most distant astronomical objects', proposed_new_type: 'ranked_list', notes: 'Top-N reference; time-varying' };
R['science-lists-astronomy-lists-possible-dwarf-planets-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Solar System / Possible dwarf planets', proposed_new_type: 'entity_list', notes: 'Drop " list" suffix' };
R['science-lists-astronomy-lists-space-telescopes'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Space telescopes', proposed_new_type: 'instrument_list', notes: '' };
R['science-lists-astronomy-lists-telescopes'] = { bucket: 'INTRA_REALM', target_path: 'Science / Astronomy and space science / Telescopes', proposed_new_type: 'instrument_list', notes: 'Ground-based; sibling of space-telescopes' };
R['science-lists-astronomy-lists-trans-neptunian-objects'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Astronomy and space science / Solar System / Trans-Neptunian objects', proposed_new_type: 'entity_list', import_source: 'IAU MPC', notes: '' };
// Biological journals + causes of death
R['science-lists-biological-journals'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Biological journals', proposed_new_type: 'publication_list', notes: 'Discipline-publications' };
R['science-lists-causes-of-death'] = { bucket: 'CROSS_REALM', target_realm: 'Health', target_path: 'Health / Public health / Causes of death', proposed_new_type: 'reference', notes: 'Public-health epidemiology reference' };
// Chemistry sub-list (9)
R['science-lists-chemistry-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Chemistry sub-Lists container' };
R['science-lists-chemistry-lists-biomolecules'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Biochemistry / Biomolecules', proposed_new_type: 'entity_list', notes: 'Biochemistry crossover Science/Biology' };
R['science-lists-chemistry-lists-compounds-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Chemistry / Compounds', proposed_new_type: 'entity_container', import_source: 'standard chemistry reference (PubChem)', notes: 'Open-ended; drop " list"' };
R['science-lists-chemistry-lists-elements-by-number'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Chemistry / Elements / By atomic number', proposed_new_type: 'entity_list', import_source: 'IUPAC periodic table', notes: 'Could collapse with By-symbol as the same atom-set with two lenses' };
R['science-lists-chemistry-lists-elements-by-symbol'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Chemistry / Elements / By symbol', proposed_new_type: 'entity_list', import_source: 'IUPAC periodic table', notes: 'See By-number above; consider LENS instead' };
R['science-lists-chemistry-lists-enthalpy-change-of-formation'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Thermodynamics / Enthalpy change of formation', proposed_new_type: 'reference', notes: 'Thermodynamic data table' };
R['science-lists-chemistry-lists-functional-groups'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Organic chemistry / Functional groups', proposed_new_type: 'concept_list', notes: 'Organic-chem reference' };
R['science-lists-chemistry-lists-isotope-table'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Elements / Isotopes', proposed_new_type: 'reference', notes: 'Nuclear-chem reference' };
R['science-lists-chemistry-lists-stable-isotopes'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Elements / Isotopes / Stable', proposed_new_type: 'reference', notes: 'Sub-category of isotopes' };
R['science-lists-chemistry-lists-standard-electrode-potentials'] = { bucket: 'INTRA_REALM', target_path: 'Science / Chemistry / Electrochemistry / Standard electrode potentials', proposed_new_type: 'reference', notes: 'Electrochem reference table' };
// Diseases lists (botanical) (2)
R['science-lists-diseases-lists-botanical'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Botanical-diseases sub-container' };
R['science-lists-diseases-lists-botanical-banana-and-plantain-diseases'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Plant pathology / Banana and plantain diseases', proposed_new_type: 'entity_list', import_source: 'plant-pathology reference', notes: 'Crop-specific pathology' };
R['science-lists-diseases-lists-botanical-sweet-potato-diseases'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Plant pathology / Sweet potato diseases', proposed_new_type: 'entity_list', import_source: 'plant-pathology reference', notes: 'Sibling of banana above' };
// Earth sciences sub-list (10)
R['science-lists-earth-sciences-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Earth-sciences sub-Lists container' };
R['science-lists-earth-sciences-lists-birthstones'] = { bucket: 'CROSS_REALM', target_realm: 'Culture', target_path: 'Culture / Gastronomy / Materials / Birthstones', proposed_new_type: 'cultural_list', notes: 'Cultural-symbolic class (not geological) — could also stay under Science/Earth science/Geology/Minerals as a sub-grouping' };
R['science-lists-earth-sciences-lists-earthquakes-list'] = { bucket: 'DISSOLVE', notes: 'Dup of Science / Earth science / Geology / Earthquakes (already exists) AND History / Lists / Earthquakes (historical lens). The geophysics atom is canonical; cross-link via realm_tags.' };
R['science-lists-earth-sciences-lists-landforms-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Earth science / Geology / Landforms', proposed_new_type: 'entity_list', notes: 'Cross-links to Geography/Place types/Natural features; drop " list"' };
R['science-lists-earth-sciences-lists-minerals-list'] = { bucket: 'DISSOLVE', notes: 'Dup of Science / Earth science / Geology / Minerals (already exists). Cross-link via realm_tags to Health/Nutrition/Dietary supplements/Minerals.' };
R['science-lists-earth-sciences-lists-oil-fields'] = { bucket: 'INTRA_REALM', target_path: 'Science / Earth science / Geology / Oil fields', proposed_new_type: 'entity_list', notes: 'Could also live under Tech/Energy technology' };
R['science-lists-earth-sciences-lists-rocks-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Science / Earth science / Geology / Rocks already exists in production (verified collision check). Drop the Lists copy.' };
R['science-lists-earth-sciences-lists-tectonic-plates-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Earth science / Geology / Tectonic plates', proposed_new_type: 'entity_list', notes: 'Drop " list"' };
R['science-lists-earth-sciences-lists-tropical-cyclone-names'] = { bucket: 'INTRA_REALM', target_path: 'Science / Earth science / Meteorology / Tropical cyclone names', proposed_new_type: 'reference', notes: 'WMO naming conventions reference' };
R['science-lists-earth-sciences-lists-uranium-mines'] = { bucket: 'INTRA_REALM', target_path: 'Science / Earth science / Geology / Uranium mines', proposed_new_type: 'site_list', notes: 'Could also live under Tech/Industrial' };
R['science-lists-earth-sciences-lists-volcanoes-list'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Science / Earth science / Geology / Volcanoes already exists in production (verified collision check). Drop the Lists copy.' };
// Other Science Lists leaves
R['science-lists-feeding-behaviours'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Ethology / Feeding behaviours', proposed_new_type: 'concept_list', notes: 'Animal-behavior reference' };
// Fish sub-list (6)
R['science-lists-fish-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Fish sub-Lists; all members → IMPORT_REALIZE per Catalog of Life' };
R['science-lists-fish-lists-fish-in-sweden'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / Sweden', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-fish-lists-fish-of-ireland'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / Ireland', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-fish-lists-fish-of-montana'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / Montana', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-fish-lists-fishes-of-great-britain'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / Great Britain', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-fish-lists-fishes-of-the-coral-sea'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / Coral Sea', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-fish-lists-fishes-of-west-virginia'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Fish / By region / West Virginia', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-gene-families'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Genetics / Gene families', proposed_new_type: 'entity_container', import_source: 'gene-ontology/HGNC', notes: 'Open-ended genomics reference' };
R['science-lists-human-anatomy'] = { bucket: 'DISSOLVE', notes: 'Dup of Health / Health sciences / Anatomy (and Science / Biology / Branches of biology / Anatomy). The Science version is the canonical anatomy atom; cross-link via realm_tags.' };
// Insects sub-list (1)
R['science-lists-insects-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Insects sub-Lists; member IMPORT_REALIZEs per Catalog of Life' };
R['science-lists-insects-lists-insects-of-britain'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Insects / By region / Britain', proposed_new_type: 'entity_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-latin-and-greek-systematic-names'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Taxonomy / Latin and Greek systematic names', proposed_new_type: 'reference', notes: 'Taxonomy-nomenclature reference' };
R['science-lists-list-of-sciences'] = { bucket: 'ADJUDICATE', notes: '§10 borderline outline — dissolve as Wikipedia outline, or rehome as thin Science / Branches index?' };
R['science-lists-muscles'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Branches of biology / Anatomy / Muscles', proposed_new_type: 'entity_list', notes: 'Anatomical-systems reference' };
// Physics sub-list (11)
R['science-lists-physics-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Physics sub-Lists container' };
R['science-lists-physics-lists-artificial-radiation-belts'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Nuclear physics / Artificial radiation belts', proposed_new_type: 'event_list', notes: 'Nuclear-test artifacts reference' };
R['science-lists-physics-lists-colors-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Physics concepts / Colors', proposed_new_type: 'reference', notes: 'Optical/perceptual color reference; drop " list"' };
R['science-lists-physics-lists-cycles-physics'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Physics concepts / Cycles', proposed_new_type: 'concept_list', notes: 'Drop " (physics)" — already in Science/Physics' };
R['science-lists-physics-lists-equations-in-classical-mechanics'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Branches of physics / Classical mechanics / Equations', proposed_new_type: 'reference', notes: '' };
R['science-lists-physics-lists-laws-in-science'] = { bucket: 'INTRA_REALM', target_path: 'Science / Scientific method and meta-science / Laws in science', proposed_new_type: 'reference', notes: 'Cross-discipline; meta-science L2' };
R['science-lists-physics-lists-letters-used-in-mathematics-and-science'] = { bucket: 'INTRA_REALM', target_path: 'Science / Scientific method and meta-science / Letters used in mathematics and science', proposed_new_type: 'reference', notes: 'Symbol-convention reference' };
R['science-lists-physics-lists-noise-types'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Physics concepts / Noise types', proposed_new_type: 'concept_list', notes: '' };
R['science-lists-physics-lists-particles-list'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Particle physics / Particles', proposed_new_type: 'entity_list', notes: 'Drop " list"' };
R['science-lists-physics-lists-quantum-field-theories'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Quantum field theory / Theories', proposed_new_type: 'theory_list', notes: '' };
R['science-lists-physics-lists-relativistic-equations'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Relativity / Equations', proposed_new_type: 'reference', notes: '' };
R['science-lists-physics-lists-resistivities'] = { bucket: 'INTRA_REALM', target_path: 'Science / Physics / Electromagnetism / Resistivities', proposed_new_type: 'reference', notes: 'Materials-data reference' };
// Plants sub-list (10)
R['science-lists-plants-lists'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Plants sub-Lists container' };
R['science-lists-plants-lists-acer-species-maples'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Species / Acer (maples)', proposed_new_type: 'species_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-plants-lists-domesticated-plants'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Domesticated plants', proposed_new_type: 'species_list', import_source: 'Catalog of Life + agronomy reference', notes: '' };
R['science-lists-plants-lists-edible-seeds'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Edible seeds', proposed_new_type: 'species_list', import_source: 'Catalog of Life + agronomy reference', notes: '' };
R['science-lists-plants-lists-famous-trees'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Botany / Famous trees', proposed_new_type: 'curiosity_list', notes: 'Named-individual trees curiosity' };
R['science-lists-plants-lists-fruits-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Fruits', proposed_new_type: 'species_list', import_source: 'Catalog of Life', notes: 'Drop " list"' };
R['science-lists-plants-lists-garden-plants'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Garden plants', proposed_new_type: 'species_list', import_source: 'Catalog of Life + horticultural reference', notes: '' };
R['science-lists-plants-lists-herbs-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Herbs', proposed_new_type: 'species_list', import_source: 'Catalog of Life', notes: 'Drop " list"' };
R['science-lists-plants-lists-palm-tree-genera'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Species / Palm tree genera', proposed_new_type: 'species_list', import_source: 'Catalog of Life', notes: '' };
R['science-lists-plants-lists-sequoia-groves'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Botany / Sequoia groves', proposed_new_type: 'site_list', notes: 'Named-grove reference' };
R['science-lists-plants-lists-vegetables-list'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Botany / Vegetables', proposed_new_type: 'species_list', import_source: 'Catalog of Life', notes: 'Drop " list"' };
// Species and specimens sub-list (8)
R['science-lists-species-and-specimens'] = { bucket: 'DISSOLVE_CONTAINER', notes: 'Species sub-Lists container' };
R['science-lists-species-and-specimens-birds-by-region'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Birds / By region', proposed_new_type: 'species_container', import_source: 'Catalog of Life', notes: 'By-region structure preserved (or LENS later)' };
R['science-lists-species-and-specimens-dinosaur-species'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Paleontology / Dinosaur species', proposed_new_type: 'species_list', import_source: 'paleontology reference', notes: '' };
R['science-lists-species-and-specimens-domesticated-animals'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Domesticated animals', proposed_new_type: 'species_list', import_source: 'Catalog of Life + agronomy reference', notes: '' };
R['science-lists-species-and-specimens-mammals-by-region'] = { bucket: 'IMPORT_REALIZE', target_path: 'Science / Biology / Zoology / Mammals / By region', proposed_new_type: 'species_container', import_source: 'Catalog of Life', notes: '' };
R['science-lists-species-and-specimens-organisms-by-population'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Ecology / Organisms by population', proposed_new_type: 'reference', notes: 'Ecology-data reference' };
R['science-lists-species-and-specimens-organisms-named-after-famous-people'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Taxonomy / Organisms named after famous people', proposed_new_type: 'curiosity_list', notes: 'Onomastic curiosity' };
R['science-lists-species-and-specimens-organisms-named-after-works-of-fiction'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Taxonomy / Organisms named after works of fiction', proposed_new_type: 'curiosity_list', notes: 'Sibling of above' };
R['science-lists-species-and-specimens-world-s-25-most-endangered-primates'] = { bucket: 'INTRA_REALM', target_path: 'Science / Biology / Conservation / World\'s 25 Most Endangered Primates', proposed_new_type: 'reference', notes: 'Conservation-priority reference' };

// ===== CULTURE (228) — Each Lists drawer rehomes up into its parent content branch =====
// All `Lists` containers dissolve after drain. Member atoms route to the parent content branch.

// --- Culture / Games (5 + Chess + Video games) ---
R['culture-games-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-games-lists-board-game-publishers'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Games / Board games / Publishers', proposed_new_type: 'company_list', import_source: 'games-industry reference', notes: '' };
R['culture-games-lists-games-by-year-non-video'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Culture / Games / Board games', notes: '§12' };
R['culture-games-lists-japanese-board-games'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Japanese board games', proposed_new_type: 'entity_list', notes: 'Cultural-regional category' };
R['culture-games-lists-mancala-variants'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Mancala variants', proposed_new_type: 'entity_list', notes: '' };
R['culture-games-lists-miniature-wargames'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Tabletop games / Miniature wargames', proposed_new_type: 'entity_list', notes: '' };
// Chess sub-Lists (9)
R['culture-games-board-games-chess-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-games-board-games-chess-lists-chess-books'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Books', proposed_new_type: 'publication_list', notes: '' };
R['culture-games-board-games-chess-lists-chess-games'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Notable games', proposed_new_type: 'event_list', notes: 'Individual famous games' };
R['culture-games-board-games-chess-lists-chess-openings'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Openings', proposed_new_type: 'concept_list', notes: '' };
R['culture-games-board-games-chess-lists-chess-players'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Players', proposed_new_type: 'role_list', notes: '' };
R['culture-games-board-games-chess-lists-chess-terms'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Terms', proposed_new_type: 'reference', notes: 'Chess-vocabulary reference' };
R['culture-games-board-games-chess-lists-chess-tournaments'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Tournaments', proposed_new_type: 'event_list', notes: '' };
R['culture-games-board-games-chess-lists-chess-world-records'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / World records', proposed_new_type: 'record_list', notes: 'Pairs with History / Lists / World records in chess (historical) — that copy also moves here' };
R['culture-games-board-games-chess-lists-fairy-pieces'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / Fairy pieces', proposed_new_type: 'concept_list', notes: 'Chess-variants' };
R['culture-games-board-games-chess-lists-world-championship-matches'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Board games / Chess / World Championship matches', proposed_new_type: 'event_list', notes: '' };
// Video games sub-Lists (2)
R['culture-games-video-games-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-games-video-games-lists-arcade-games'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Video games / Arcade games', proposed_new_type: 'entity_list', notes: '' };
R['culture-games-video-games-lists-console-palettes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Games / Video games / Console palettes', proposed_new_type: 'reference', notes: 'Hardware-trivia reference' };

// --- Culture / Literature (large nested) ---
R['culture-literature-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-literature-lists-books'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Literature / Books', proposed_new_type: 'entity_container', import_source: 'media reference (OpenLibrary/ISBN)', notes: 'Open-ended; container for sub-categories below' };
R['culture-literature-lists-books-banned-books'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Books / Banned books', proposed_new_type: 'entity_list', notes: 'Censorship reference; cross-links to Justice' };
R['culture-literature-lists-books-best-selling-books'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Books / Best-selling', proposed_new_type: 'ranked_list', notes: 'Sales reference' };
R['culture-literature-lists-books-by-genre'] = { bucket: 'LENS', target_path: 'lens: by-genre on Culture / Literature / Books', notes: '§12 lens' };
R['culture-literature-lists-books-literary-awards'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Books / Literary awards', proposed_new_type: 'award_list', notes: '' };
R['culture-literature-lists-books-writers'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Literature / Writers', proposed_new_type: 'role_container', import_source: 'media reference', notes: 'Open-ended; writers home is top-level Literature, not under Books' };
R['culture-literature-lists-by-year'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Culture / Literature', notes: '§12' };
R['culture-literature-lists-electronic-literature'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Electronic literature', proposed_new_type: 'concept_list', notes: 'Sub-genre / form' };
R['culture-literature-lists-electronic-literature-electronic-literature-authors-critics-and-works'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Electronic literature / Authors, critics, and works', proposed_new_type: 'role_list', notes: 'Sub-list under electronic-literature' };
R['culture-literature-lists-fiction'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Culture / Literature / Fiction already exists in production (verified collision check). Drop the Lists copy; descendants reparent to the real Fiction L3.' };
R['culture-literature-lists-fiction-comics'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics', proposed_new_type: 'concept_container', notes: '' };
R['culture-literature-lists-fiction-comics-best-selling-manga'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Manga / Best-selling', proposed_new_type: 'ranked_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books', proposed_new_type: 'concept_container', notes: 'Parent of DC/Marvel below' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics', proposed_new_type: 'publisher_container', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-dc-characters'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Characters', proposed_new_type: 'entity_list', import_source: 'media reference (Wikidata)', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-dc-universe-locations'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Universe locations', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-elseworlds'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Elseworlds', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-justice-league-members'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Justice League / Members', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-legion-of-super-heroes-members'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Legion of Super-Heroes / Members', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-dc-comics-superman-enemies'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / DC Comics / Superman / Enemies', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-marvel-comics'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / Marvel Comics', proposed_new_type: 'publisher_container', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-marvel-comics-avengers'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / Marvel Comics / Avengers', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-marvel-comics-marvel-characters'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Literature / Fiction / Comics / Comic books / Marvel Comics / Characters', proposed_new_type: 'entity_list', import_source: 'media reference (Wikidata)', notes: '' };
R['culture-literature-lists-fiction-comics-comic-books-marvel-comics-x-men'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic books / Marvel Comics / X-Men', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-comic-strips'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Comic strips', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-comics-manga'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Comics / Manga', proposed_new_type: 'concept_container', notes: 'Parent of best-selling-manga above' };
R['culture-literature-lists-fiction-fairy-tales'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fairy tales', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-fictional-characters'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional characters', proposed_new_type: 'entity_container', notes: 'General-fiction characters parent' };
R['culture-literature-lists-fiction-fictional-computers'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional computers', proposed_new_type: 'entity_list', notes: 'Sci-fi-trope reference' };
R['culture-literature-lists-fiction-fictional-places'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional places', proposed_new_type: 'entity_container', notes: 'Parent of countries/planets/universes below' };
R['culture-literature-lists-fiction-fictional-places-fictional-countries'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional places / Countries', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-fictional-places-fictional-planets'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional places / Planets', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-fictional-places-imaginary-universes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional places / Imaginary universes', proposed_new_type: 'entity_list', notes: '' };
R['culture-literature-lists-fiction-fictional-robots-and-androids'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Fictional robots and androids', proposed_new_type: 'entity_list', notes: 'Sci-fi-trope reference' };
R['culture-literature-lists-fiction-major-themes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Major themes', proposed_new_type: 'theme_container', notes: 'Parent of adultery/family/etc. theme atoms' };
R['culture-literature-lists-fiction-major-themes-adultery'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Major themes / Adultery', proposed_new_type: 'theme_list', notes: '' };
R['culture-literature-lists-fiction-major-themes-family'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Major themes / Family', proposed_new_type: 'theme_list', notes: 'Cross-link to Self/Relationships/Family + Society/Social institutions/Family' };
R['culture-literature-lists-fiction-major-themes-sadomasochism'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Major themes / Sadomasochism', proposed_new_type: 'theme_list', notes: '' };
R['culture-literature-lists-fiction-major-themes-science-fiction'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Genres / Science fiction', proposed_new_type: 'genre_list', notes: 'Sci-fi as genre not "theme" — moves up a level' };
R['culture-literature-lists-fiction-major-themes-travel'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Fiction / Major themes / Travel', proposed_new_type: 'theme_list', notes: '' };
R['culture-literature-lists-magazines'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Print media / Magazines', proposed_new_type: 'publication_container', import_source: 'media reference', notes: 'Surprising fit: magazines belong under Mass media, not Literature (which is books). Surface in summary.' };
R['culture-literature-lists-magazines-anomalous-phenomena-magazines'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Print media / Magazines / Anomalous phenomena', proposed_new_type: 'publication_list', notes: '' };
R['culture-literature-lists-magazines-magazines-by-circulation'] = { bucket: 'LENS', target_path: 'lens: circulation-rank on Culture / Mass media / Print media / Magazines', notes: '§12 lens' };
R['culture-literature-lists-magazines-men-s-magazines'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Print media / Magazines / Men\'s magazines', proposed_new_type: 'publication_list', notes: '' };
R['culture-literature-lists-magazines-teen-magazines'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Print media / Magazines / Teen magazines', proposed_new_type: 'publication_list', notes: '' };
R['culture-literature-lists-magazines-women-s-magazines'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Print media / Magazines / Women\'s magazines', proposed_new_type: 'publication_list', notes: '' };
R['culture-literature-lists-publishers'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Literature / Publishers', proposed_new_type: 'company_list', notes: '' };
R['culture-literature-lists-scientific-journals'] = { bucket: 'CROSS_REALM', target_realm: 'Science', target_path: 'Science / Scientific method and meta-science / Scientific journals', proposed_new_type: 'publication_list', notes: 'Scientific journals home in Science, not Literature; pairs with Science / Lists / Biological journals + Society / Lists / Social science journals' };

// --- Culture / Mass media / Broadcast media / Television (large nested) ---
R['culture-mass-media-broadcast-media-television-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-mass-media-broadcast-media-television-lists-by-year'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Culture / Mass media / Broadcast media / Television', notes: '§12' };
R['culture-mass-media-broadcast-media-television-lists-television-channels'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Broadcast media / Television / Channels', proposed_new_type: 'organization_container', import_source: 'broadcast registries', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-channels-by-country'] = { bucket: 'LENS', target_path: 'lens: by-country on Culture / Mass media / Broadcast media / Television / Channels', notes: '§12 — drops all the per-country leaves below' };
// The 6 per-country TV-channel leaves are CROSS_REALM dups of existing Geography/Countries — they dissolve as the lens captures the relationship
const tvByCountry = [
  ['australia','Australia'], ['canada','Canada'], ['denmark','Denmark'],
  ['ireland','Ireland'], ['united-kingdom','United Kingdom'], ['united-states','United States']
];
for (const [slug,] of tvByCountry) {
  R[`culture-mass-media-broadcast-media-television-lists-television-channels-by-country-${slug}`] = { bucket: 'DISSOLVE', notes: 'Per-country bucket dissolved by the LENS conversion of the by-country parent. Cross-realm dup with Geography / Countries — cross-link via realm_tags.' };
}
R['culture-mass-media-broadcast-media-television-lists-television-channels-by-language'] = { bucket: 'LENS', target_path: 'lens: by-language on Culture / Mass media / Broadcast media / Television / Channels', notes: '§12' };
const tvByLanguage = ['french','german','greek','italian','spanish','tamil'];
for (const slug of tvByLanguage) {
  R[`culture-mass-media-broadcast-media-television-lists-television-channels-by-language-${slug}`] = { bucket: 'DISSOLVE', notes: 'Per-language bucket dissolved by the LENS conversion of the by-language parent. Cross-realm dup with Society / Linguistics / Languages — cross-link via realm_tags.' };
}
R['culture-mass-media-broadcast-media-television-lists-television-networks'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Broadcast media / Television / Networks', proposed_new_type: 'organization_list', import_source: 'broadcast registries', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Broadcast media / Television / Programs', proposed_new_type: 'entity_container', import_source: 'media reference (TMDB/Wikidata)', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-animated-series'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Animated series', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-anime-lists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Anime', proposed_new_type: 'genre_list', notes: 'Drop " lists" suffix' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-bl-dramas'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / BL dramas', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-british-tv-shows-remade-for-the-american-market'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / British shows remade for American market', proposed_new_type: 'curiosity_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-by-broadcaster'] = { bucket: 'LENS', target_path: 'lens: by-broadcaster on Culture / Mass media / Broadcast media / Television / Programs', notes: '§12 — dissolves the 11 per-broadcaster leaves below' };
const tvBroadcasters = ['abc','ant1','bbc','cartoon-network','cbs','ert','fox','mega-channel','mtv','nbc','upn'];
for (const slug of tvBroadcasters) {
  R[`culture-mass-media-broadcast-media-television-lists-television-programs-by-broadcaster-${slug}`] = { bucket: 'DISSOLVE', notes: 'Per-broadcaster bucket dissolved by the LENS conversion of the by-broadcaster parent.' };
}
R['culture-mass-media-broadcast-media-television-lists-television-programs-by-characters'] = { bucket: 'LENS', target_path: 'lens: by-characters on Culture / Mass media / Broadcast media / Television / Programs', notes: '§12' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-by-characters-muppets'] = { bucket: 'DISSOLVE', notes: 'Per-characters bucket dissolved by LENS conversion of parent.' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-by-program'] = { bucket: 'LENS', target_path: 'lens: by-program on Culture / Mass media / Broadcast media / Television / Programs', notes: '§12 — odd self-referential lens; consider dropping if redundant' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-by-program-invader-zim'] = { bucket: 'DISSOLVE', notes: 'Per-program bucket dissolved by LENS conversion of parent.' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-children-s-television-series'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Children\'s series', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-comedies'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Comedies', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-cult-television-shows'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Cult shows', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-dramedies'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Dramedies', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-most-watched-television-episodes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Most-watched episodes', proposed_new_type: 'ranked_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-sci-fi-tv-programs'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Sci-fi', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-soap-operas'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Soap operas', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-spin-off-shows'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / Spin-off shows', proposed_new_type: 'curiosity_list', notes: 'Pairs with Human activities / Lists / Spin-offs (adjudicated)' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-tv-shows-by-city-setting'] = { bucket: 'LENS', target_path: 'lens: by-city-setting on Culture / Mass media / Broadcast media / Television / Programs', notes: '§12' };
R['culture-mass-media-broadcast-media-television-lists-television-programs-uk-television-series'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Programs / UK series', proposed_new_type: 'regional_list', notes: 'UK-regional' };
R['culture-mass-media-broadcast-media-television-lists-tv-stations-in-north-america'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Broadcast media / Television / Stations / North America', proposed_new_type: 'organization_list', notes: 'Regional broadcast' };

// --- Culture / Mass media / Film and cinema ---
R['culture-mass-media-film-and-cinema-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-mass-media-film-and-cinema-lists-actors'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Film and cinema / Actors', proposed_new_type: 'role_container', import_source: 'media reference (TMDB)', notes: '' };
R['culture-mass-media-film-and-cinema-lists-directors'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Film and cinema / Directors', proposed_new_type: 'role_container', import_source: 'media reference (TMDB)', notes: '' };
R['culture-mass-media-film-and-cinema-lists-film-awards'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Awards', proposed_new_type: 'award_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-film-festivals'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Festivals', proposed_new_type: 'event_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-film-institutes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Institutes', proposed_new_type: 'organization_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Mass media / Film and cinema / Films', proposed_new_type: 'entity_container', import_source: 'media reference (TMDB)', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films-by-genre'] = { bucket: 'LENS', target_path: 'lens: by-genre on Culture / Mass media / Film and cinema / Films', notes: '§12 — dissolves the 8 per-genre leaves below' };
const filmGenres = ['cult','fantasy','horror','musicals','noir','science-fiction','war','westerns'];
for (const slug of filmGenres) {
  R[`culture-mass-media-film-and-cinema-lists-films-by-genre-${slug}`] = { bucket: 'DISSOLVE', notes: 'Per-genre bucket dissolved by LENS conversion of by-genre parent.' };
}
R['culture-mass-media-film-and-cinema-lists-films-by-title'] = { bucket: 'LENS', target_path: 'lens: by-title (alphabetical) on Culture / Mass media / Film and cinema / Films', notes: '§12 — alphabetical sort lens' };
R['culture-mass-media-film-and-cinema-lists-films-by-year'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on Culture / Mass media / Film and cinema / Films', notes: '§12 — dissolves the 10 per-decade leaves below' };
const filmDecades = ['1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s'];
for (const slug of filmDecades) {
  R[`culture-mass-media-film-and-cinema-lists-films-by-year-${slug}`] = { bucket: 'DISSOLVE', notes: 'Per-decade bucket dissolved by LENS conversion of by-year parent.' };
}
R['culture-mass-media-film-and-cinema-lists-films-computer-animated-films'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Computer-animated', proposed_new_type: 'genre_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films-film-series'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Film series', proposed_new_type: 'entity_list', notes: 'Franchise sequel-chains' };
R['culture-mass-media-film-and-cinema-lists-films-greatest'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Greatest', proposed_new_type: 'ranked_list', notes: 'Critic-poll rankings' };
R['culture-mass-media-film-and-cinema-lists-films-highest-grossing'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Highest-grossing', proposed_new_type: 'ranked_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films-most-expensive'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Most expensive', proposed_new_type: 'ranked_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films-preserved-films'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Preserved films', proposed_new_type: 'entity_list', notes: 'NFR preservation' };
R['culture-mass-media-film-and-cinema-lists-films-rated-nc-17'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Rated NC-17', proposed_new_type: 'reference', notes: 'Rating-specific reference' };
R['culture-mass-media-film-and-cinema-lists-films-trilogies'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Trilogies', proposed_new_type: 'entity_list', notes: '' };
R['culture-mass-media-film-and-cinema-lists-films-worst'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Mass media / Film and cinema / Films / Worst', proposed_new_type: 'ranked_list', notes: '' };

// --- Culture / Performing arts / Music ---
R['culture-performing-arts-music-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-performing-arts-music-lists-concert-tours'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Concert tours', proposed_new_type: 'event_list', notes: '' };
R['culture-performing-arts-music-lists-electronic-music-lists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Electronic music', proposed_new_type: 'genre_container', notes: 'Electronic music as a genre branch' };
R['culture-performing-arts-music-lists-electronic-music-lists-music-genres'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Electronic music / Sub-genres', proposed_new_type: 'genre_list', notes: 'Within-electronic-music breakdown; distinct from the broader Music genres atom' };
R['culture-performing-arts-music-lists-electronic-music-lists-record-labels'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Electronic music / Record labels', proposed_new_type: 'organization_list', notes: 'Electronic-music-specific labels (vs. the broader Record labels atom)' };
R['culture-performing-arts-music-lists-music-genres'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Genres', proposed_new_type: 'genre_container', notes: 'Top-level music-genre reference' };
R['culture-performing-arts-music-lists-musical-events'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musical events', proposed_new_type: 'event_list', notes: 'Cross-link to History/Lists/Musical events (historical) — which moves here' };
R['culture-performing-arts-music-lists-musical-instruments'] = { bucket: 'DISSOLVE', notes: 'Dup of Culture / Performing arts / Music / Musical instruments (existing real branch). Cross-link via realm_tags.' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Musicians and groups', proposed_new_type: 'entity_container', import_source: 'media reference (MusicBrainz)', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-bands'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Musicians and groups / Bands', proposed_new_type: 'entity_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-bands-hardcore-punk-bands'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Bands / Hardcore punk', proposed_new_type: 'entity_list', notes: 'Genre-specific sub-list' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-composers'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Musicians and groups / Composers', proposed_new_type: 'role_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-composers-classical-music-composers'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Composers / Classical', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-composers-songwriters-hall-of-fame'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Composers / Songwriters Hall of Fame', proposed_new_type: 'award_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians', proposed_new_type: 'role_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-alternative-music-artists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Alternative', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-ambient-artists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Ambient', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-best-selling-music-artists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Best-selling', proposed_new_type: 'ranked_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-disco-artists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Disco', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-grammy-hall-of-fame-award-recipients'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Grammy Hall of Fame recipients', proposed_new_type: 'award_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-hip-hop-artists'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Hip hop', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-r-b-musicians'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / R&B', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-musicians-and-musical-groups-musicians-soul-musicians'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Musicians and groups / Musicians / Soul', proposed_new_type: 'role_list', notes: '' };
R['culture-performing-arts-music-lists-opera-houses'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Opera houses', proposed_new_type: 'institution_list', notes: '' };
R['culture-performing-arts-music-lists-record-labels'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Record labels', proposed_new_type: 'organization_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-schools-of-music'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Schools of music', proposed_new_type: 'institution_list', notes: 'Music conservatories — distinct from Philosophy/Schools and Education/Schools' };
R['culture-performing-arts-music-lists-songs-and-compositions'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Songs and compositions', proposed_new_type: 'entity_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-songs-and-compositions-albums'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Performing arts / Music / Songs and compositions / Albums', proposed_new_type: 'entity_container', import_source: 'MusicBrainz', notes: '' };
R['culture-performing-arts-music-lists-songs-and-compositions-best-selling-singles-by-year-uk'] = { bucket: 'LENS', target_path: 'lens: temporal-axis on UK singles chart', notes: '§12 — UK-specific chart history' };
R['culture-performing-arts-music-lists-songs-and-compositions-christmas-carols'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Songs and compositions / Christmas carols', proposed_new_type: 'entity_list', notes: '' };
R['culture-performing-arts-music-lists-songs-and-compositions-christmas-number-one-singles-uk'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Songs and compositions / Christmas number-one singles (UK)', proposed_new_type: 'entity_list', notes: 'UK-specific' };
R['culture-performing-arts-music-lists-songs-and-compositions-compositions-of-johann-sebastian-bach'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Songs and compositions / By composer / J.S. Bach', proposed_new_type: 'entity_list', notes: 'Per-composer catalog' };
R['culture-performing-arts-music-lists-songs-and-compositions-famous-operas'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Songs and compositions / Famous operas', proposed_new_type: 'entity_list', notes: '' };
R['culture-performing-arts-music-lists-songs-and-compositions-operettas'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Songs and compositions / Operettas', proposed_new_type: 'entity_list', notes: '' };
R['culture-performing-arts-music-lists-video-game-music'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Video game music', proposed_new_type: 'genre_container', notes: '' };
R['culture-performing-arts-music-lists-video-game-music-video-game-musicians'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Performing arts / Music / Video game music / Composers', proposed_new_type: 'role_list', notes: '' };

// --- Culture / Sports ---
R['culture-sports-ball-games-association-football-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-sports-ball-games-association-football-lists-100-greatest-living-football-players'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Association football / 100 Greatest Living Football Players', proposed_new_type: 'ranked_list', notes: '' };
R['culture-sports-ball-games-association-football-lists-football-clubs-in-france'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Association football / Clubs / France', proposed_new_type: 'organization_list', notes: 'Per-country clubs sub-list' };
R['culture-sports-ball-games-association-football-lists-football-teams'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Sports / Ball games / Association football / Teams', proposed_new_type: 'organization_container', import_source: 'FIFA/UEFA reference', notes: '' };
R['culture-sports-ball-games-association-football-lists-national-association-football-teams-by-nickname'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Association football / National teams / By nickname', proposed_new_type: 'reference', notes: 'Onomastic curiosity' };
R['culture-sports-ball-games-association-football-lists-women-s-association-football-clubs'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Association football / Clubs / Women\'s', proposed_new_type: 'organization_list', notes: '' };
R['culture-sports-ball-games-baseball-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners', proposed_new_type: 'award_container', notes: 'Parent of position-specific sub-lists' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-1st-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / 1st Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-2nd-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / 2nd Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-3rd-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / 3rd Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-catcher'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / Catcher', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-outfield'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / Outfield', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-pitcher'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / Pitcher', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-al-gold-glove-winners-shortstop'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / AL Gold Glove Winners / Shortstop', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-highest-paid-baseball-players'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Highest-paid players', proposed_new_type: 'ranked_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-lifetime-home-run-leaders'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Lifetime home run leaders', proposed_new_type: 'ranked_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-major-league-baseball-players'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Sports / Ball games / Baseball / Major League players', proposed_new_type: 'role_container', import_source: 'MLB reference', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners', proposed_new_type: 'award_container', notes: 'Sibling of AL Gold Glove Winners' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-1st-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / 1st Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-2nd-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / 2nd Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-3rd-base'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / 3rd Base', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-catcher'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / Catcher', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-outfield'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / Outfield', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-pitcher'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / Pitcher', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-nl-gold-glove-winners-shortstop'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Awards / NL Gold Glove Winners / Shortstop', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-ball-games-baseball-lists-triple-crown'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Ball games / Baseball / Triple Crown', proposed_new_type: 'award_list', notes: '' };
R['culture-sports-combat-sports-martial-arts-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-sports-combat-sports-martial-arts-lists-martial-arts-weapons'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Combat sports / Martial arts / Weapons', proposed_new_type: 'entity_list', notes: '' };
R['culture-sports-lists'] = { bucket: 'DISSOLVE_CONTAINER' };
R['culture-sports-lists-climbing'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Climbing', proposed_new_type: 'sport_container', notes: 'Promote to its own Sports sub-branch' };
R['culture-sports-lists-gay-athletes'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Notable athletes / Gay athletes', proposed_new_type: 'curiosity_list', notes: '' };
R['culture-sports-lists-judo-techniques'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Combat sports / Martial arts / Judo / Techniques', proposed_new_type: 'concept_list', notes: '' };
R['culture-sports-lists-ski-areas'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Winter sports / Skiing / Ski areas', proposed_new_type: 'site_list', notes: '' };
R['culture-sports-lists-sports-leagues'] = { bucket: 'IMPORT_REALIZE', target_path: 'Culture / Sports / Sports leagues', proposed_new_type: 'organization_container', import_source: 'sports-organizations registry', notes: '' };
R['culture-sports-lists-sports-leagues-defunct-sports-leagues'] = { bucket: 'INTRA_REALM', target_path: 'Culture / Sports / Sports leagues / Defunct', proposed_new_type: 'organization_list', notes: '' };
R['culture-sports-lists-surfing'] = { bucket: 'DISSOLVE', notes: 'Cross-drawer dup: Culture / Sports / Water sports / Surfing already exists in production (verified collision check). Drop the Lists copy.' };

// ----- CLASSIFY + EMIT -----
function classify(atom) {
  const rule = R[atom.id];
  if (rule) return rule;
  // Anything not in R is a bug — surface it
  return { bucket: 'UNCLASSIFIED', notes: 'BUG: no rule found for this atom' };
}

const counts = {};
const rows = [];
const csvHeader = ['id','realm','depth','current_type','is_leaf','current_path','bucket','target_path','target_realm','proposed_new_type','import_source','notes'];
rows.push(csvHeader);

const unclassified = [];
for (const atom of all) {
  const d = classify(atom);
  counts[d.bucket] = (counts[d.bucket] || 0) + 1;
  if (d.bucket === 'UNCLASSIFIED') unclassified.push(atom.id);
  rows.push([
    atom.id,
    atom.realm_name,
    atom.depth,
    atom.type,
    atom.is_leaf ? 'true' : 'false',
    atom.path_str,
    d.bucket,
    d.target_path || '',
    d.target_realm || '',
    d.proposed_new_type || '',
    d.import_source || '',
    d.notes || '',
  ]);
}

console.log('\nbucket counts:');
for (const [k,v] of Object.entries(counts).sort((a,b) => b[1] - a[1])) {
  console.log(' ', k.padEnd(22), v);
}
console.log('total:', Object.values(counts).reduce((a,b) => a+b, 0), '/ 606');
if (unclassified.length) {
  console.log('\nUNCLASSIFIED:', unclassified.length);
  for (const id of unclassified.slice(0, 50)) console.log(' ', id);
}

// Write CSV (RFC 4180-ish quoting)
function csvCell(s) {
  s = String(s);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
const outdir = path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy');
fs.mkdirSync(outdir, { recursive: true });
const csvPath = path.join(outdir, 'lists-disposition-table.csv');
fs.writeFileSync(csvPath, csv, 'utf8');
console.log('\nwrote', csvPath, fs.statSync(csvPath).size, 'bytes');

// Save counts for summary writer
fs.writeFileSync(path.join(__dirname, '_counts.json'), JSON.stringify({counts, unclassified, total: all.length}, null, 2));
console.log('saved _counts.json');
