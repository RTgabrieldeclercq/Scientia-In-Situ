#!/usr/bin/env node
/* Scientia's DOI lookup (src/07-library.js `LIB`) against the test suite of the demo it was ported from
 * (Gabe's doi-lookup/test.js, which ran on a pure.js that is no longer around). The module's own source is loaded and run,
 * so the test cannot drift from what the app does. Run: node tests/doi-lookup.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(path.join(ROOT, 'src', f), 'utf8');
const hue = src('01-util.js').match(/^function hashHue\(seed\)[^\n]*$/m);
if (!hue) { console.error('hashHue is no longer one line in 01-util.js — update this test'); process.exit(1); }

const library = [], requests = [];
const ctx = vm.createContext({
  console, Date, Promise, JSON, Math, String, Array, Object, Set, Map, Error, parseInt, performance: { now: () => 0 },
  DB: { all: () => library, get: (s, id) => library.find(x => x.id === id), put: (s, r) => { const i = library.findIndex(x => x.id === r.id); if (i >= 0) library[i] = r; else library.push(r); }, beginGroup() { groups++; } },
  uid: p => p + '_' + library.length, isoLocal: () => '2026-11-05T00:00:00-07:00', changed() {}, plural: (n, a, b) => n + ' ' + (n === 1 ? a : b || a + 's'),
  h: () => ({}), isDark: () => false, M: {}, toast() {},
  // doi.org answers by content negotiation: the CSL-JSON, and (WIP doi-ris) the RIS record; `offlineRis` makes the second request fail
  fetch: async (url, opt) => { const accept = opt && opt.headers && opt.headers.Accept; requests.push({ url, accept });
    if (accept === 'application/x-research-info-systems') { if (offlineRis) throw new TypeError('Failed to fetch'); return { ok: true, status: 200, text: async () => ACS_RIS }; }
    return { ok: true, status: 200, json: async () => ACS }; },
});
let groups = 0, offlineRis = false;
vm.runInContext(hue[0] + '\n' + src('07-library.js') + '\n;globalThis.LIB = LIB; globalThis.hashHue = hashHue;', ctx);
const LIB = ctx.LIB, F = { normalizeDoi: LIB.normalizeDoi, fromCsl: LIB.fromCsl, sigilText: LIB.sigilText, apaAuthors: LIB.apaAuthors, initials: LIB.initials, apa: LIB.apa,
  sentenceCase: LIB.sentenceCase, titleCaseJournal: LIB.journal, hashHue: ctx.hashHue, parseBibtex: LIB.parseBibtex, parseRis: LIB.parseRis, parseAny: LIB.parseAny };

let pass = 0, fail = 0;
const eq = (label, got, want) => { const ok = got === want; ok ? pass++ : fail++; console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) { console.log('        got : ' + JSON.stringify(got)); console.log('        want: ' + JSON.stringify(want)); } };
const has = (label, got, frag) => { const ok = String(got).includes(frag); ok ? pass++ : fail++; console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) { console.log('        got : ' + got); console.log('        need: ' + frag); } };

// ---- real records, exactly as the four DOIs return them (the demo's) ----
const PNAS = { DOI: '10.1073/pnas.1013763107', type: 'journal-article', title: ['Kinetics of G-protein–coupled receptor endosomal trafficking pathways revealed by single quantum dots'],
  author: [{ family: 'Fichter', given: 'Katye M.' }, { family: 'Flajolet', given: 'Marc' }, { family: 'Greengard', given: 'Paul' }],
  'container-title': ['proceedings of the national academy of sciences'], issued: { 'date-parts': [[2010, 10, 12]] }, volume: '107', issue: '43', page: '18658-18663', ISSN: ['0027-8424'] };
const PLOS = { DOI: '10.1371/journal.pone.0132737', type: 'journal-article', title: ['αPIX Is a Trafficking Regulator that Balances Recycling and Degradation of the Epidermal Growth Factor Receptor'],
  author: [{ family: 'Kortüm', given: 'Fanny' }, { family: 'Harms', given: 'Frederike L.' }, { family: 'Hennighausen', given: 'Natascha' }],
  'container-title': ['plos one'], issued: { 'date-parts': [[2015, 7, 15]] }, volume: '10', issue: '7', page: 'e0132737', ISSN: ['1932-6203'] };
const ACS = { DOI: '10.1021/bi900865u', type: 'journal-article', title: ['Critical Role of ESCRT Machinery in EGFR Recycling'],
  author: [{ family: 'Baldys', given: 'Aleksander' }, { family: 'Raymond', given: 'John R.' }], 'container-title': ['biochemistry'], issued: { 'date-parts': [[2009, 9, 16]] },
  volume: '48', issue: '40', page: '9321-9323', ISSN: ['0006-2960'] };
const PREPRINT = { DOI: '10.1101/2023.06.03.543566', type: 'posted-content', title: ['Sialylation of EGFR by ST6GAL1 induces receptor activation and modulates trafficking dynamics'],
  author: [{ family: 'Ankenbauer', given: 'Katherine E.' }, { family: 'Rao', given: 'Tejeshwar C.' }, { family: 'Mattheyses', given: 'Alexa L.' }], publisher: 'openRxiv', issued: { 'date-parts': [[2023, 6, 4]] } };

console.log('\n--- DOI normalisation ---');
eq('bare DOI', F.normalizeDoi('10.1021/bi900865u'), '10.1021/bi900865u');
eq('https doi.org URL', F.normalizeDoi('https://doi.org/10.1021/bi900865u'), '10.1021/bi900865u');
eq('legacy dx.doi.org', F.normalizeDoi('http://dx.doi.org/10.1021/bi900865u'), '10.1021/bi900865u');
eq('doi: prefix', F.normalizeDoi('doi: 10.1021/bi900865u'), '10.1021/bi900865u');
eq('stray whitespace', F.normalizeDoi('  10.1021/bi900865u \n'), '10.1021/bi900865u');

console.log('\n--- sigil abbreviation (the naive-monogram trap) ---');
eq('long name -> PNAS', F.sigilText(F.fromCsl(PNAS)), 'PNAS');
eq('plos one -> PLOS', F.sigilText(F.fromCsl(PLOS)), 'PLOS');
eq('single word', F.sigilText(F.fromCsl(ACS)), 'Bchm');
eq('preprint, no journal', F.sigilText(F.fromCsl(PREPRINT)), 'bioRx');
eq('unknown multiword', F.sigilText(F.fromCsl(Object.assign({}, ACS, { 'container-title': ['journal of applied physics'] }))), 'JAP');
eq('plos computational biology -> PLOS', F.sigilText(F.fromCsl(Object.assign({}, ACS, { 'container-title': ['plos computational biology'] }))), 'PLOS');

console.log('\n--- preprint detection ---');
eq('article is not preprint', F.fromCsl(PNAS).isPreprint, false);
eq('posted-content is', F.fromCsl(PREPRINT).isPreprint, true);
eq('preprint container empty', F.fromCsl(PREPRINT).container, '');

console.log('\n--- author formatting (APA 7) ---');
eq('two authors use ampersand', F.apaAuthors(F.fromCsl(ACS).authors), 'Baldys, A., & Raymond, J. R.');
eq('diacritic preserved', F.apaAuthors(F.fromCsl(PLOS).authors).slice(0, 9), 'Kortüm, F');
eq('compound given initials', F.initials('Katye M.'), 'K. M.');
eq('hyphenated given', F.initials('Jean-Pierre'), 'J. P.');
const many = Array.from({ length: 22 }, (_, i) => ({ family: 'Fam' + (i + 1), given: 'A.' }));
has('21+ authors ellipsise', F.apaAuthors(many), '… Fam22, A.');

console.log('\n--- full APA strings ---');
const a1 = F.apa(F.fromCsl(PNAS)), a2 = F.apa(F.fromCsl(PLOS)), a4 = F.apa(F.fromCsl(PREPRINT));
has('PNAS journal title-cased', a1, 'Proceedings of the National Academy of Sciences, 107(43), 18658-18663.');
has('PNAS en-dash survives', a1, 'G-protein–coupled');
has('PLOS canonical casing', a2, 'PLOS One, 10(7), e0132737.');
has('Greek alpha NOT upcased', a2, 'αPIX Is a Trafficking');
has('preprint uses repository', a4, 'OpenRxiv.');
eq('preprint has no vol/issue', /\(\d+\)/.test(a4.replace('(2023).', '')), false);
has('doi url appended', a1, 'https://doi.org/10.1073/pnas.1013763107');

console.log('\n--- scientific-title casing (the αPIX bug) ---');
eq('Greek initial preserved', F.sentenceCase('αPIX is a regulator'), 'αPIX is a regulator');
eq('mTOR preserved', F.sentenceCase('mTOR signalling in cancer'), 'mTOR signalling in cancer');
eq('pH preserved', F.sentenceCase('pH dependence of binding'), 'pH dependence of binding');
eq('lowercase sentence cased', F.sentenceCase('quantitative analysis of flux'), 'Quantitative analysis of flux');
eq('already capital untouched', F.sentenceCase('Kinetics of receptors'), 'Kinetics of receptors');
eq('journal acronym kept', F.titleCaseJournal('plos one'), 'PLOS One');
eq('eLife lowercase kept', F.titleCaseJournal('elife'), 'eLife');
eq('stopwords lowercased', F.titleCaseJournal('journal of cell science'), 'Journal of Cell Science');
eq('embedded acronym kept', F.titleCaseJournal('ACS nano'), 'ACS Nano');
eq('The EMBO Journal', F.titleCaseJournal('the embo journal'), 'The EMBO Journal');
eq('JAMA', F.titleCaseJournal('jama'), 'JAMA');
eq('BMJ', F.titleCaseJournal('bmj'), 'BMJ');
eq('npj kept lowercase', F.titleCaseJournal('npj systems biology and applications'), 'npj Systems Biology and Applications');
eq('PLOS Computational Biology', F.titleCaseJournal('plos computational biology'), 'PLOS Computational Biology');

console.log('\n--- hue determinism ---');
eq('same ISSN same hue', F.hashHue('0027-8424'), F.hashHue('0027-8424'));
eq('different ISSN differs', F.hashHue('0027-8424') === F.hashHue('1932-6203'), false);

console.log('\n--- local BibTeX parse (the offline path) ---');
const bib = '@article{Kortum2015,\n  author  = {Kort{\\"u}m, Fanny and Harms, Frederike L. and Hennighausen, Natascha},\n  title   = {alphaPIX Is a Trafficking Regulator},\n  journal = {PLOS ONE},\n  year    = {2015},\n  volume  = {10},\n  number  = {7},\n  pages   = {e0132737},\n  doi     = {10.1371/journal.pone.0132737}\n}';
const pb = F.parseBibtex(bib);
eq('bibtex doi', pb.doi, '10.1371/journal.pone.0132737');
eq('bibtex journal', pb.container, 'PLOS ONE');
eq('bibtex year', pb.year, 2015);
eq('bibtex issue<-number', pb.issue, '7');
eq('bibtex authors', pb.authors.length, 3);
eq('bibtex family', pb.authors[1].family, 'Harms');
eq('bibtex not preprint', pb.isPreprint, false);
eq('bibtex accent decoded (the demo kept Kort\\"um)', pb.authors[0].family, 'Kortüm');
const field = s => LIB.tex(s).replace(/[{}]/g, '');   // as parseBibtex reads a field: accents first, then the braces go
eq('tex: acute, cedilla, slashed o, eszett', field("Gr\\'{e}goire Fran\\c{c}ois S{\\o}ren Stra\\ss e"), 'Grégoire François Søren Straße');
eq('tex: grave and caron, the space kept', field('\\`a \\v{s} \\"o'), 'à š ö');
eq('tex: escaped ampersand', LIB.tex('Smith \\& Jones'), 'Smith & Jones');
eq('tex: a plain title is untouched', LIB.tex('mTOR and pH in αPIX'), 'mTOR and pH in αPIX');

console.log('\n--- local RIS parse ---');
const ACS_RIS = 'TY  - JOUR\r\nAU  - Baldys, Aleksander\r\nAU  - Raymond, John R.\r\nTI  - Critical Role of ESCRT Machinery in EGFR Recycling\r\nT2  - Biochemistry\r\nPY  - 2009\r\nVL  - 48\r\nIS  - 40\r\nSP  - 9321\r\nEP  - 9323\r\nDO  - 10.1021/bi900865u\r\nER  - \r\n';
const ris = 'TY  - JOUR\nAU  - Baldys, Aleksander\nAU  - Raymond, John R.\nTI  - Critical Role of ESCRT Machinery in EGFR Recycling\nJO  - Biochemistry\nPY  - 2009\nVL  - 48\nIS  - 40\nSP  - 9321\nEP  - 9323\nDO  - 10.1021/bi900865u\n';
const pr = F.parseRis(ris);
eq('ris doi', pr.doi, '10.1021/bi900865u');
eq('ris page range', pr.page, '9321-9323');
eq('ris authors', pr.authors.length, 2);
eq('ris journal', pr.container, 'Biochemistry');

console.log('\n--- format autodetect ---');
eq('detects bibtex', F.parseAny(bib).doi, '10.1371/journal.pone.0132737');
eq('detects ris', F.parseAny(ris).doi, '10.1021/bi900865u');
eq('detects csl', F.parseAny(JSON.stringify(ACS)).doi, '10.1021/bi900865u');

console.log('\n--- the lookup itself: doi.org by content negotiation (the citation data, then the RIS record), then the library is the cache ---');
const got = await LIB.resolveDoi('https://doi.org/10.1021/bi900865u');
eq('two requests: the data and the RIS record', requests.length, 2);
eq('to doi.org', requests[0] && requests[0].url, 'https://doi.org/10.1021/bi900865u');
eq('asks for CSL-JSON first', requests[0] && requests[0].accept, 'application/vnd.citationstyles.csl+json');
eq('then for RIS', requests[1] && requests[1].accept, 'application/x-research-info-systems');
eq('the RIS request goes to doi.org too', requests[1] && requests[1].url, 'https://doi.org/10.1021/bi900865u');
eq('parsed', got.title, 'Critical Role of ESCRT Machinery in EGFR Recycling');
has('the RIS record is kept on the item', got.ris, 'TY  - JOUR');
eq('the kept record ends with ER', got.ris.split('\n').pop(), 'ER  - ');
LIB.add(got);
const again = await LIB.resolveDoi('doi:10.1021/BI900865U');
eq('second lookup is the cache', again._cache, true);
eq('no further request', requests.length, 2);
eq('the cached item carries its record', again.ris, got.ris);
let bad = ''; try { await LIB.resolveDoi('not a doi'); } catch (e) { bad = e.message; }
eq('refuses a non-DOI', bad, 'That does not look like a DOI.');

console.log('\n--- WIP doi-ris: offline, the RIS request fails and the lookup still answers ---');
offlineRis = true; requests.length = 0;
const off = await LIB.resolveDoi('10.1371/journal.pone.0132737');
eq('the paper still comes back', off.doi.length > 0, true);
eq('without a record', off.ris, undefined);
eq('both requests were tried', requests.length, 2);
offlineRis = false;
const fetchWas = ctx.fetch; ctx.fetch = async () => { throw new TypeError('Failed to fetch'); };
let neterr = ''; try { await LIB.resolveDoi('10.1371/journal.pone.0000001'); } catch (e) { neterr = e.message; }
eq('fully offline: the CSL error is the one shown', neterr, 'Failed to fetch');
eq('fetchRis alone: an empty answer, never a throw', await LIB.fetchRis('10.1/x'), '');
ctx.fetch = async (u, o) => (o.headers.Accept === 'application/x-research-info-systems' ? { ok: true, status: 200, text: async () => '<html>not a record</html>' } : { ok: true, status: 200, json: async () => ACS });
eq('an answer that is not a record is not kept', await LIB.fetchRis('10.1/x'), '');
ctx.fetch = fetchWas;
const flagOff = vm.runInContext('globalThis.FEAT = { tune: () => false }; LIB.risOn()', ctx); vm.runInContext('delete globalThis.FEAT', ctx);
eq('Features → Library → RIS records off', flagOff, false);

console.log('\n--- RIS in a file: one or many records ---');
const risFileText = ACS_RIS + '\r\n\r\nTY  - JOUR\r\nAU  - Kortüm, Fanny\r\nTI  - αPIX Is a Trafficking Regulator\r\nJO  - PLOS ONE\r\nPY  - 2015\r\nDO  - https://doi.org/10.1371/journal.pone.0132737\r\nER  - \r\n\r\nTY  - BOOK\r\nTI  - A book with no DOI\r\nAU  - Author, Ann\r\nPY  - 2001\r\nER  - ';
const recs = LIB.parseRisMany('\uFEFF' + risFileText);
eq('three records found (a BOM and CRLF are fine)', recs.length, 3);
eq('each keeps its own text', recs[1].ris.startsWith('TY  - JOUR\nAU  - Kortüm'), true);
eq('a doi.org URL in DO becomes the DOI', recs[1].doi, '10.1371/journal.pone.0132737');
eq('the last record is read too', recs[2].title, 'A book with no DOI');
eq('a file whose records have no ER splits where the next TY starts', LIB.parseRisMany('TY  - JOUR\nTI  - One\nTY  - JOUR\nTI  - Two').length, 2);
eq('RIS text is recognised', LIB.looksRis(risFileText) && !LIB.looksRis('@article{a,}'), true);
eq('nothing found in a file that is not RIS', LIB.parseRisMany('hello').length, 0);

console.log('\n--- Export .ris ---');
const mk = LIB.toRis(F.fromCsl(PNAS));
has('made from fields: a journal article', mk, 'TY  - JOUR\nAU  - Fichter, Katye M.');
has('journal as JO', mk, 'JO  - proceedings of the national academy of sciences');
has('pages split into SP and EP', mk, 'SP  - 18658\nEP  - 18663');
has('DOI and year', mk, 'DO  - 10.1073/pnas.1013763107');
eq('ends with ER', mk.split('\n').pop(), 'ER  - ');
eq('the record made is read back to the same paper', LIB.parseRis(mk).title, F.fromCsl(PNAS).title);
eq('and its pages', LIB.parseRis(mk).page, '18658-18663');
has('a preprint is UNPB', LIB.toRis(F.fromCsl(PREPRINT)), 'TY  - UNPB');
has('a link is ELEC with its URL', LIB.toRis({ kind: 'link', url: 'https://x.org/a', title: 'A page', authors: [] }), 'TY  - ELEC\nTI  - A page\nUR  - https://x.org/a');
eq('a paper with a kept record exports that record', LIB.risOf(got), got.ris);
const file = LIB.risFile([got, F.fromCsl(PNAS)], 'My Shelf: EGFR');
eq('file name from the shelf', file.name, 'my-shelf-egfr.ris');
eq('two papers', file.n, 2);
eq('CRLF lines', /\r\n/.test(file.text) && !/[^\r]\n/.test(file.text), true);
eq('a blank line between records', file.text.includes('ER  - \r\n\r\nTY  - JOUR'), true);
eq('exported text imports back as two records', LIB.parseRisMany(file.text).length, 2);

console.log('\n--- Import .ris: add, or fill in by DOI ---');
library.length = 0; groups = 0;
LIB.add(Object.assign(F.fromCsl(ACS), { title: '', volume: '' }));   // in the library, but incomplete and without a record
const r1 = LIB.importRis(risFileText);
eq('one undo step', groups, 1);
eq('the DOI match is filled in, not duplicated', library.filter(l => l.doi === '10.1021/bi900865u').length, 1);
eq('its blank title filled', library.find(l => l.doi === '10.1021/bi900865u').title, 'Critical Role of ESCRT Machinery in EGFR Recycling');
eq('its volume too', library.find(l => l.doi === '10.1021/bi900865u').volume, '48');
has('and the record kept', library.find(l => l.doi === '10.1021/bi900865u').ris, 'TY  - JOUR');
eq('two new papers added (one without a DOI)', r1.added, 2);
eq('one filled in', r1.updated, 1);
eq('three records, three items', library.length, 3);
const r2 = LIB.importRis(risFileText);
eq('the same file again changes nothing', r2.added + r2.updated, 0);
eq('every record already complete', r2.same, 3);
eq('still three items', library.length, 3);
library.find(l => l.doi === '10.1371/journal.pone.0132737').title = 'My own title';
LIB.importRis(risFileText);
eq('an existing title is not overwritten', library.find(l => l.doi === '10.1371/journal.pone.0132737').title, 'My own title');
library.push({ id: 'rmx', doi: '10.1/rm', title: 'From the lab', authors: [], rm: true });
const r3 = LIB.importRis('TY  - JOUR\nTI  - From the lab\nDO  - 10.1/rm\nPY  - 1999\nER  - ');
eq('an item of the lab’s library is left as it is', r3.kept, 1);
eq('no record written to it', library.find(l => l.id === 'rmx').ris, undefined);
eq('a file with nothing in it', LIB.risSummary(LIB.importRis('not ris'), 'x.ris'), 'x.ris: no RIS records found');
has('the summary says what happened', LIB.risSummary(r1), '2 papers added · 1 paper filled in');

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
