#!/usr/bin/env node
/* V3.958 — Scientia's DOI lookup (scientia/src/07-library.js `LIB`) against the test suite of the demo it was ported from
 * (Gabe's doi-lookup/test.js, which ran on a pure.js that is no longer around). The module's own source is loaded and run,
 * so the test cannot drift from what the app does. Run: node scripts/tests/scientia-doi-lookup.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = f => readFileSync(path.join(ROOT, 'scientia', 'src', f), 'utf8');
const hue = src('01-util.js').match(/^function hashHue\(seed\)[^\n]*$/m);
if (!hue) { console.error('hashHue is no longer one line in 01-util.js — update this test'); process.exit(1); }

const library = [], requests = [];
const ctx = vm.createContext({
  console, Date, Promise, JSON, Math, String, Array, Object, Set, Map, Error, parseInt, performance: { now: () => 0 },
  DB: { all: () => library, put: (s, r) => library.push(r) }, uid: p => p + '_' + library.length, isoLocal: () => '2026-11-05T00:00:00-07:00', changed() {},
  h: () => ({}), isDark: () => false, M: {}, toast() {},
  fetch: async (url, opt) => { requests.push({ url, accept: opt && opt.headers && opt.headers.Accept }); return { ok: true, status: 200, json: async () => ACS }; },
});
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

console.log('\n--- the lookup itself: one request to doi.org by content negotiation, then the library is the cache ---');
const got = await LIB.resolveDoi('https://doi.org/10.1021/bi900865u');
eq('one request', requests.length, 1);
eq('to doi.org', requests[0] && requests[0].url, 'https://doi.org/10.1021/bi900865u');
eq('asks for CSL-JSON', requests[0] && requests[0].accept, 'application/vnd.citationstyles.csl+json');
eq('parsed', got.title, 'Critical Role of ESCRT Machinery in EGFR Recycling');
LIB.add(got);
const again = await LIB.resolveDoi('doi:10.1021/BI900865U');
eq('second lookup is the cache', again._cache, true);
eq('no second request', requests.length, 1);
let bad = ''; try { await LIB.resolveDoi('not a doi'); } catch (e) { bad = e.message; }
eq('refuses a non-DOI', bad, 'That does not look like a DOI.');

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
