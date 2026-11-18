// Spatial canvases (13m-canvas.js, a lab) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs canvas
export default {
  by: '',
  use: 'Arrange components, papers and structures freely on a board to think across notes.',
  view: [1280, 800], dpr: 1, crf: 31, pause: 500,
  // the test notebook: three notes of one project (components, a claim, a takeaway) and two papers in the Library
  setup: async () => {
    const at = (n, hm) => KIT.at(n, hm);
    const P1 = KIT.project('Traction on soft gels');
    const TH1 = KIT.theme(P1, 'Substrate and coating', 'Which gel and coating give an even sheet?'), TH2 = KIT.theme(P1, 'Traction under EGF', 'Does EGF move the force, or lower it?');
    const LIBK = {};
    [['okafor', 41, { DOI: '10.5555/jdm.2021.0104', type: 'journal-article', title: ['Edge traction on compliant gels rises with fibronectin density'], author: [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }, { family: 'Marchetti', given: 'Rosa' }], 'container-title': ['Journal of Demonstration Mechanobiology'], issued: { 'date-parts': [[2021]] }, volume: '12', page: '104-111' }],
      ['haldane', 27, { DOI: '10.5555/mdm.2019.0033', type: 'journal-article', title: ['Bead drift in long traction time-lapses and how to correct it'], author: [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 'container-title': ['Methods in Demonstration Microscopy'], issued: { 'date-parts': [[2019]] }, volume: '5', page: '33-39' }]]
      .forEach(([k, n, csl]) => { const r = Object.assign({ id: uid('l'), kind: 'paper', added: isoLocal(at(n, '18:00')) }, LIB.fromCsl(csl)); DB.put('library', r); LIBK[k] = r.id; });
    const B = {}, D = {};
    const write = (b, p, src, n, hm) => {
      const t = at(n, hm), marks = [], st = []; let text = '';
      b.created = b.made = b.modified = isoLocal(t); try { b.stamp = M.stampFor(b.docId, t); } catch (e) { }
      for (let i = 0; i < src.length;) {
        if (src.startsWith('[[', i)) { st.push({ from: text.length }); i += 2; }
        else if (src.startsWith(']]', i)) { const f = st.pop(); marks.push({ id: uid('m'), type: 'term', from: f.from, to: text.length, ref: M.findOrCreateTerm(p.id, text.slice(f.from)).id }); i += 2; }
        else if (src.startsWith('{@', i)) { const j = src.indexOf('}', i); marks.push({ id: uid('m'), type: 'cite', from: text.length, to: text.length + 1, ref: LIBK[src.slice(i + 2, j)] }); text += OBJ; i = j + 1; }
        else if (src[i] === '{') { const j = src.indexOf(':', i); st.push({ head: src.slice(i + 1, j), from: text.length }); i = j + 1; }
        else if (src[i] === '}') { const f = st.pop(), it = M.createItem(f.head, text.slice(f.from), b, { created: isoLocal(t) });
          marks.push({ id: uid('m'), type: 'struct', from: f.from, to: text.length, ref: it.id }); i++; }
        else text += src[i++];
      }
      b.body = { text, marks }; DB.put('blocks', b); return b;
    };
    const note = (key, th, type, title, n, rows) => {
      const d = KIT.note(P1, title, { type, themeId: th.id, daysAgo: n }), bs = KIT.grid(d, rows.map(r => [r[1], '']));
      rows.forEach((r, i) => { B[r[0]] = write(bs[i], P1, r[3], n, r[2]); });
      D[key] = d; return d;
    };
    note('fn', TH1, 'experiment', 'Fibronectin series', 37, [
      ['fn1', 'Plan', '09:30', 'Coat at 1, 5 and 10 µg/mL [[fibronectin]]; image the [[leading edge]] at 24 h.'],
      ['fn2', 'Outcome', '15:40', '{result:Spreading is even at 5 and 10 µg/mL [[fibronectin]], patchy at 1 µg/mL}.'],
      ['fn3', 'Reading', '16:10', '{claim:Edge traction rises with [[fibronectin]] density} {@okafor}'],
      ['fn4', 'Takeaway', '16:30', '{takeaway:Coat with [[fibronectin]] at 5 µg/mL from now on: even spreading with half the protein}.']]);
    note('r3', TH2, 'experiment', 'Run 3', 11, [
      ['r3a', 'Setup', '09:00', 'Gel batch 15, coating and seeding as before; [[EGF]] at 10 ng/mL from frame 0.'],
      ['r3b', 'Imaging', '10:40', '{observation:The edge ruffles within 5 minutes of [[EGF]]}.'],
      ['r3c', 'Result', '15:20', '{result:Mean [[leading edge]] traction 96 Pa under [[EGF]] (n = 6 fields)}.']]);
    note('a3', TH2, 'analysis', 'Analysis: Run 3', 7, [
      ['a3a', 'Maps', '10:10', 'Peak of the traction map under [[EGF]], from the Run 3 fields.'],
      ['a3c', 'Takeaway', '11:40', '{takeaway:[[EGF]] both moves and lowers the peak; the total force changes little}.']]);
    KIT.done();
    const ids = {}; Object.keys(B).forEach(k => { ids[k] = B[k].id; });
    return { B: ids, lib: LIBK };
  },
  before: async (R, c) => { await R.go('#/settings/feature/canvas'); await R.until(`!!document.querySelector('.fp-sw .fsw')`, 6000); await R.sleep(3200); },
  steps: [
    ['Settings → Features → Spatial canvases (an experiment): switch it on and a Canvas tab appears in the bar', async (R, c) => {
      await R.click('.fp-sw .fsw', { ms: 600 });
      await R.until(`!document.querySelector('#tabs .tab[data-k="canvas"]').hidden`, 4000);
      await R.sleep(900);
      await R.click('#tabs .tab[data-k="canvas"]', { ms: 600 });
      await R.until(`!!document.querySelector('.canvas-host')`, 5000);
      await R.sleep(600);
    }],
    ['A new canvas, then + Add: search two components from different notes (Run 3 and its analysis) and put them on the board', async (R, c) => {
      await R.click({ sel: 'button', text: '+ New canvas' }, { ms: 500 });
      await R.until(`!!document.querySelector('.modal input.inp')`, 4000);
      await R.key('a', { ctrl: true });
      await R.type('EGF story', 40);
      await R.key('Enter');
      await R.until(`typeof CanvasView !== 'undefined' && CanvasView.c && !!document.querySelector('.dock .dk.ins')`, 6000);
      await R.sleep(400);
      await add(R, '96 Pa', 1);   // one card, then moved aside, so that the next one has the middle of the board
      await grab(R, { sel: '.cv-node .cv-t' }, [330, 520]);
      await add(R, 'lowers', 2);
      await grab(R, { xy: onNode('lowers') }, [950, 520]);
    }],
    ['Add a claim (a structure) and a paper from the Library: cards pointing at the originals, nothing copied', async (R, c) => {
      await add(R, 'claim', 3);
      await add(R, 'compliant', 4);
      await grab(R, { xy: `(() => { const n = [...document.querySelectorAll('.cv-node')].find(e => e.querySelector('.cv-tag').textContent === 'paper'), r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .6 }; })()` }, [640, 640]);
      await R.sleep(500);
    }],
    ['Drag from the dot on one component to the other, choose how they relate: a real connection between the two notes, not only a line', async (R, c) => {
      await R.move({ js: node('96 Pa') }, 450);
      await R.sleep(250);
      await R.move({ js: `${node('96 Pa')}.querySelector('.cv-port')` }, 250);
      await R.down(); await R.sleep(120);
      await R.move({ js: node('lowers') }, 900);
      await R.sleep(150); await R.up(); await R.sleep(300);
      await R.until(`!!document.querySelector('.pop .opt')`, 3000);
      await R.sleep(700);
      await R.click({ sel: '.pop .opt', text: 'leads to' }, { ms: 450 });
      if (!await R.until(`DB.all('wires').some(w => w.rel === 'leads' && M.block(w.from) && M.block(w.to) && M.block(w.from).docId !== M.block(w.to).docId)`, 3000)) throw new Error('no wire was made');
      await R.sleep(1200);
    }],
    ['Export as JSON Canvas: the whole board as one file other canvas tools open', async (R, c) => {
      await R.click({ sel: '.dock .dk', text: 'Export JSON Canvas' }, { ms: 600 });
      await R.sleep(1300);
    }],
  ],
};
const node = w => `[...document.querySelectorAll('.cv-node')].find(e => e.textContent.includes(${JSON.stringify(w)}))`;
const onNode = w => `(() => { const n = ${node(w)}, r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .6 }; })()`;
/** + Add, search, Enter: the card lands in the middle of the board. */
async function add(R, q, n) {
  await R.click('.dock .dk.ins', { ms: 450, after: 200 });
  await R.until(`!!document.querySelector('.pop .pk-q')`, 3000);
  await R.type(q, 40);
  await R.sleep(300);
  await R.key('Enter');
  await R.until(`document.querySelectorAll('.cv-node').length === ${n}`, 3000);
  await R.sleep(350);
}
/** Pick a card up and put it down somewhere else. */
async function grab(R, from, to) {
  await R.move(from, 400); await R.sleep(120); await R.down(); await R.sleep(100);
  await R.move(to, 650); await R.sleep(100); await R.up(); await R.sleep(300);
}
