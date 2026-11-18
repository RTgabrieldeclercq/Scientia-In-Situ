// Library (07, 17, 17b; citations V4.6) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs library
// Also exports seedLibrary: the made-up library of twelve papers that libsearch, libmap, libsmart and libread start from.

/** Runs IN THE PAGE (it is passed as text): a made-up library — twelve papers on three shelves, three of them with the PDFs of
    demokit/assets, some highlighted, some read — made with the app's own functions (LIB.add, MEDIA.add, LGROUP.save, LIBSTATE.set,
    M.addBlock as the reader's highlight does). Nothing here is a real article or a real person.
    o.states: 'mixed' (default) | 'new' (nothing opened but two, for Reading state) · o.highlights: false leaves them out. */
export const seedLibrary = async (o = {}) => {
  const P = M.createProject('Traction on soft gels'), now = () => isoLocal(new Date());
  const J = { jdm: 'Journal of Demonstration Mechanobiology', mdm: 'Methods in Demonstration Microscopy', dcr: 'Demonstration Cell Reports', dbl: 'Demonstration Biomaterials Letters' };
  const au = s => s.split('; ').map(x => { const [family, given] = x.split(', '); return { family, given }; });
  // key, year, authors, title, journal, volume, pages, state
  const ROWS = [
    ['ok21', 2021, 'Okafor, Ngozi; Lindqvist, Elin; Marchetti, Rosa', 'Edge traction on compliant gels rises with fibronectin density', 'jdm', '12', '104-111', 'read'],
    ['ha19', 2019, 'Haldane, Priya; Osei, Kwame', 'Bead drift in long traction time-lapses and how to correct it', 'mdm', '5', '33-39', 'reading'],
    ['va17', 2017, 'Varga, Dóra; Tomlin, Samuel', 'Stiffness sensing at the leading edge of epithelial sheets', 'dcr', '3', '201-208', ''],
    ['li15', 2015, 'Lindqvist, Elin; Osei, Kwame', 'A reference bead layer for drift-free traction maps', 'mdm', '1', '12-19', 'read'],
    ['ma18', 2018, 'Marchetti, Rosa; Tomlin, Samuel; Varga, Dóra', 'Regularization choices in Fourier traction reconstruction on a soft matrix', 'jdm', '9', '55-63', ''],
    ['os12', 2012, 'Osei, Kwame', 'Matrix stiffness and the spreading of epithelial sheets', 'jdm', '3', '140-149', 'read'],
    ['to23', 2023, 'Tomlin, Samuel; Okafor, Ngozi', 'Leader cells read matrix stiffness through their adhesions', 'dcr', '9', '77-86', ''],
    ['br20', 2020, 'Brandt, Ilse; Haldane, Priya', 'Fibronectin coating density on polyacrylamide: a calibration', 'dbl', '15', '9-15', 'reading'],
    ['ac09', 2009, 'Achterberg, Joris; Lindqvist, Elin', 'Casting polyacrylamide gels of known shear modulus', 'dbl', '4', '201-207', 'read'],
    ['so14', 2014, 'Sorensen, Mette; Varga, Dóra', 'Traction at the free edge of a migrating sheet', 'jdm', '5', '88-97', 'reading'],
    ['fe22', 2022, 'Ferreira, Luis; Okafor, Ngozi; Brandt, Ilse', 'EGF lowers edge traction without slowing the sheet', 'jdm', '13', '31-40', ''],
    ['na16', 2016, 'Nakagawa, Hana; Marchetti, Rosa', 'Matrix ligand density sets adhesion size on soft gels', 'dcr', '2', '15-23', ''],
  ];
  const L = {};
  for (const [k, year, a, title, j, volume, page] of ROWS) L[k] = LIB.add({ kind: 'paper', cslType: 'article', title, authors: au(a), container: J[j], year, volume, page, doi: '', url: '', isPreprint: false }).id;
  // the three with a PDF (what + PDF does once the file is picked)
  for (const [k, f] of [['ok21', 'paper-okafor-2021.pdf'], ['ha19', 'paper-haldane-2019.pdf'], ['va17', 'paper-varga-2017.pdf']]) { const rec = await MEDIA.add(await KIT.asset(f)), r = M.lib(L[k]); r.pdf = rec.id; DB.put('library', r); }
  // shelves and their foci
  const shelf = (name, hue, i) => LGROUP.save({ id: uid('lt'), kind: 'theme', name, hue, order: i, created: now() });
  const focus = (t, name, keys, i) => LGROUP.save({ id: uid('lg'), kind: 'group', name, themeId: t.id, paperIds: keys.map(k => L[k]), order: i, created: now() });
  const S1 = shelf('Traction methods', 205, 0), S2 = shelf('Mechanobiology', 300, 1), S3 = shelf('Gel preparation', 45, 2);
  const F = { drift: focus(S1, 'Bead tracking & drift', ['ha19', 'li15'], 0).id, recon: focus(S1, 'Reconstruction', ['ma18'], 1).id,
    stiff: focus(S2, 'Stiffness sensing', ['va17', 'os12', 'to23'], 0).id, lig: focus(S2, 'Ligand density', ['ok21', 'na16', 'br20'], 1).id, edge: focus(S2, 'Edge traction', ['so14', 'fe22', 'ok21'], 2).id,
    recipes: focus(S3, 'Polyacrylamide recipes', ['ac09', 'br20'], 0).id };
  LGROUP.open = new Set([S1.id, S2.id, S3.id]);   // the tree unfolded (kept on this device, as a click on ▸ does)
  // highlights, as the reader saves them: a component on the paper's Reading note, anchored by its words and page
  const hl = async (k, exact, color) => {
    const lib = M.lib(L[k]); let page = 1;
    try { READER.init(); const pdf = await pdfjsLib.getDocument({ url: MEDIA.url(MEDIA.get(lib.pdf)), isEvalSupported: false }).promise;
      for (let n = 1; n <= pdf.numPages; n++) { const tc = await (await pdf.getPage(n)).getTextContent(); if (tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').includes(exact)) { page = n; break; } } } catch (e) { }
    const d = READER.litDoc(lib), n = READER.annotations(lib.id).length;
    const b = M.addBlock(d.id, null, { label: 'p. ' + page, x: 0, y: 220 + n * 150, anchor: { type: 'TextQuoteSelector', source: lib.id, page, exact, prefix: '', suffix: '', rects: null, color: color || 'yellow' } });
    M.saveBlockBody(b, { text: exact, marks: [] });
  };
  if (o.highlights !== false) {
    await hl('ok21', 'Edge traction rose with fibronectin density on every stiffness'); await hl('ok21', 'Below that, the sheet behaves as if it had no edge.', 'green');
    await hl('ha19', 'A reference layer costs one extra coating step', 'blue');
  }
  // notes that cite some of them (/cite leaves this mark)
  const cite = (title, label, parts) => { const d = KIT.note(P, title), marks = []; let text = '';
    parts.forEach(x => { if (L[x]) { marks.push({ id: uid('m'), type: 'cite', from: text.length, to: text.length + 1, ref: L[x] }); text += OBJ; } else text += x; });
    const b = KIT.first(d); b.label = label; DB.put('blocks', b); M.saveBlockBody(b, { text, marks }); return d; };
  const N1 = cite('Fibronectin series', 'Background', ['Edge traction rises with fibronectin density ', 'ok21', '; the coating was calibrated as in ', 'br20', '.']);
  const N2 = cite('Run 3', 'Drift', ['Bead drift corrected with a reference layer ', 'ha19', ', poured as in ', 'li15', '.']);
  const N3 = cite('Gel batch 14', 'Recipe', ['30 kPa gels cast after ', 'ac09', '.']);
  // what has been read
  const states = o.states === 'new' ? { ok21: 'read', li15: 'read', ac09: 'reading' } : Object.fromEntries(ROWS.filter(r => r[7]).map(r => [r[0], r[7]]));
  for (const k in states) LIBSTATE.set(M.lib(L[k]), states[k]);
  KIT.done();
  return { P: P.id, L, F, S: { methods: S1.id, mech: S2.id, gels: S3.id }, N: { fn: N1.id, run3: N2.id, gel: N3.id } };
};

const BIB = `@article{okafor2021edge,
  author  = {Okafor, Ngozi and Lindqvist, Elin and Marchetti, Rosa},
  title   = {Edge traction on compliant gels rises with fibronectin density},
  journal = {Journal of Demonstration Mechanobiology},
  year    = {2021},
  volume  = {12},
  pages   = {104--111}
}`;
// put text on the clipboard, as copying it somewhere else would have (the recorder's page is not focused before its first click, so not navigator.clipboard)
const copy = text => `const t = document.createElement('textarea'); t.value = ${JSON.stringify(text)}; t.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.append(t); t.select(); const ok = document.execCommand('copy'); t.remove(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return ok`;
// where a phrase starts and ends on the reader's page (its text layer), for a mouse selection
const phrase = (from, to) => `(() => { const sp = [...document.querySelectorAll('.rd-page .textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3);
  const at = (w, end) => { for (const s of sp) { const i = s.firstChild.nodeValue.indexOf(w); if (i < 0) continue; const r = document.createRange(); r.setStart(s.firstChild, end ? i + w.length - 1 : i); r.setEnd(s.firstChild, end ? i + w.length : i + 1); const q = r.getBoundingClientRect(); return { x: end ? q.right - 1 : q.left + 1, y: q.top + q.height / 2 }; } return null; };
  return { a: at(${JSON.stringify(from)}, false), z: at(${JSON.stringify(to)}, true) }; })()`;
// the end of a component's text (a click there puts the caret after its last letter)
const textEnd = id => `(() => { const el = document.querySelector('.box[data-id="${id}"] .ed'), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, last = null; while ((n = w.nextNode())) if (n.nodeValue.trim()) last = n;
  if (!last) { const r = el.getBoundingClientRect(); return { x: r.left + 12, y: r.top + r.height / 2 }; } const r = document.createRange(); r.setStart(last, Math.max(0, last.nodeValue.length - 1)); r.setEnd(last, last.nodeValue.length); const q = [...r.getClientRects()].pop() || r.getBoundingClientRect(); return { x: q.right - 1, y: q.top + q.height / 2 }; })()`;

export default {
  by: '',
  use: 'Keep your papers with their PDFs and cite them in your notes.',
  view: [1280, 800], dpr: 1,
  pause: 450,
  // an empty Library, and a note with a background paragraph
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Fibronectin series');
    const b = KIT.fill(KIT.first(A), 'Background', 'Epithelial sheets pull hardest at their leading edge, and how hard depends on the ligand under them');
    b.x += 430; DB.put('blocks', b);   // beside the note's head, so that the editing bar over it is not over the head's reference list
    KIT.done(); return { A: A.id, b: b.id };
  },
  before: async R => { await R.go('#/library'); await R.click('.lib-page textarea.inp'); await R.ev(copy(BIB)); await R.move([640, 300], 0); },   // the citation, copied from where it was found
  steps: [
    ['Add a paper by pasting its citation (BibTeX), then attach its PDF', async R => {
      await R.click('.lib-page textarea.inp');
      await R.key('v', { ctrl: true });
      await R.sleep(600);
      await R.click({ sel: '.lib-page .btn', text: 'Parse & add' });
      await R.until(`DB.all('library').length === 1`, 3000);
      await R.sleep(400);
      // close the adding panel: the page is drawn again, and the count in its header (still 0 entries, until then) reads what the shelf holds
      await R.click({ sel: '.lib-top .btn', text: '− Add' });
      await R.until(`/1 entry/.test(document.querySelector('.lib-top .tiny.mono').textContent)`, 3000);
      await R.sleep(300);
      await R.click({ sel: '.lib-vseg button', text: 'List' });
      await R.sleep(300);
      await R.files(['assets/paper-okafor-2021.pdf'], () => R.click({ sel: '.libcard .btn', text: '+ PDF' }));
      await R.until(`!!document.querySelector('.libcard a.btn.pri')`, 5000);
      await R.sleep(500);
      // the header counts are made when the page is drawn: the panel opened and closed again draws it, and it reads 1 entry · 1 with PDFs
      await R.click({ sel: '.lib-top .btn', text: '+ Add' });
      await R.until(`/1 with PDF/.test(document.querySelector('.lib-top .tiny.mono').textContent)`, 3000);
      await R.sleep(400);
      await R.click({ sel: '.lib-top .btn', text: '− Add' });
      await R.sleep(900);
    }],
    ['Read it: select a sentence in the reader and pick a colour to highlight it', async R => {
      await R.click('.libcard a.btn.pri');
      await R.until(`document.querySelectorAll('.rd-page .textLayer span').length > 10`, 12000);
      await R.sleep(600);
      const p = await R.ev(`return ${phrase('Edge traction rose', 'every stiffness')}`);
      if (!p || !p.a || !p.z) throw new Error('the sentence is not on the page');
      await R.drag([p.a.x, p.a.y], [p.z.x, p.z.y], { ms: 900, hold: 150, after: 250 });
      await R.until(`!!document.querySelector('.pop .swatch')`, 3000);
      await R.sleep(400);
      await R.click('.pop .swatch[title="Highlight yellow"]');
      await R.until(`!!document.querySelector('.rd-hl')`, 3000);
      await R.sleep(1000);
    }],
    ['In a note, type /cite and pick the paper: a superscript [1], its reference listed in the note’s References', async (R, c) => {
      await R.open(c.A);
      // the head of the note and the component side by side, in the middle of the window
      await R.ev(`const b = M.block(${JSON.stringify(c.b)}); DocView.paper.centerOn(b.x - 19, b.y + 50, .85); return 1`);
      await R.sleep(650);
      await R.click({ xy: textEnd(c.b) });
      await R.type(' /cite', 55);
      await R.until(`!!document.querySelector('.pop .pk-q')`, 3000);
      await R.type('okafor', 55);
      await R.sleep(450);
      await R.key('Enter');
      await R.sleep(1100);
    }],
    ['/author-cite names the first author instead, for that one citation', async (R, c) => {
      await R.type('. It peaks at 5 µg/mL, as /author-cite', 40);
      await R.until(`!!document.querySelector('.pop .pk-q')`, 3000);
      await R.sleep(500);
      await R.key('Enter');
      await R.sleep(400);
      await R.type(' found.');
      await R.move([960, 300]);
      await R.sleep(1400);
    }],
  ],
};
