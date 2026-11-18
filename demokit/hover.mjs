// Hover cards (hover) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs hover
// the middle of the first line of a marked phrase (a phrase that wraps has a wider box than the words)
const on = (id, cls) => ({ xy: `(() => { const r = document.querySelector('.box[data-id="${id}"] .ed ${cls}').getClientRects()[0]; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()` });
// Leave a card the way a hand does: out to the right of the note along the line you were on, then wait. A card's farewell (120 ms after the
// pointer leaves its word) also cancels a card that was still due, so the next word is approached along its own line from the right, never across another marked word.
const away = async (R, c, cls) => { const y = (await R.point(on(c.a, cls))).y; await R.move([820, y], 500); await R.sleep(700); return y; };
export default {
  by: '',
  use: 'Point at a marked phrase, a term or a link to see what it is and where it was recorded, without opening anything.',
  view: [1040, 650],
  // the test note: an analysis note whose result sentence holds a claim (recorded yesterday in the run note), a term and a bridged phrase
  setup: async () => {
    const P = KIT.project(), run = KIT.note(P, 'Run 3'), gel = KIT.note(P, 'Gel batch 14'), seed = KIT.note(P, 'Seeding density notes'), A = KIT.note(P, 'Analysis: Run 3');
    KIT.fill(KIT.first(gel), 'Gel batch 14', 'Polyacrylamide, 30 kPa, fibronectin 5 µg/mL; poured Monday, used Tuesday.');
    const claimText = 'The edge peak held at 5 µg/mL fibronectin', termText = 'Traction forces', linkText = 'gel batch 14';
    // the claim is first written in the run note, yesterday 16:40
    const r0 = KIT.fill(KIT.first(run), 'Result', claimText + '; traction forces were highest in the outer two cell rows.'); KIT.ago(r0, 1, '16:40');
    const it = M.createItem('claim', claimText, r0, { created: isoLocal(KIT.at(1, '16:40')) });
    const term = M.findOrCreateTerm(P.id, 'traction forces');
    r0.body = { text: r0.body.text, marks: [{ id: uid('m'), type: 'struct', from: 0, to: claimText.length, ref: it.id }, { id: uid('m'), type: 'term', from: r0.body.text.indexOf('traction forces'), to: r0.body.text.indexOf('traction forces') + 15, ref: term.id }] }; DB.put('blocks', r0);
    const s0 = KIT.fill(KIT.first(seed), 'Density', 'Traction forces scale with how densely the sheet was seeded.');
    s0.body = { text: s0.body.text, marks: [{ id: uid('m'), type: 'term', from: 0, to: 15, ref: term.id }] }; DB.put('blocks', s0);
    // the analysis: the same claim mentioned, the term, and a phrase bridged to the gel batch note
    const text = claimText + '. ' + termText + ' rose with gel stiffness, as measured on ' + linkText + '.';
    const a0 = KIT.fill(KIT.first(A), 'Result', text);
    const at = text.indexOf(termText), al = text.indexOf(linkText);
    a0.body = { text, marks: [{ id: uid('m'), type: 'struct', from: 0, to: claimText.length, ref: it.id }, { id: uid('m'), type: 'term', from: at, to: at + termText.length, ref: term.id }, { id: uid('m'), type: 'link', from: al, to: al + linkText.length, ref: gel.id, title: gel.title }] }; DB.put('blocks', a0);
    KIT.done(); return { A: A.id, a: a0.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.ev(`const P = DocView.paper; P.view.y -= 110; P.apply(); return 1`); await R.sleep(500); await R.move([860, 400], 0); },
  steps: [
    ['Rest the pointer on the claim: its kind, its status, where and when it was recorded', async (R, c) => {
      await R.move(on(c.a, '.st'));
      await R.until(`!!document.querySelector('.hovercard')`, 4000);
      await R.sleep(2600);
    }],
    ['Rest on the term: how many notes use it', async (R, c) => {
      await away(R, c, '.st');
      await R.move([820, (await R.point(on(c.a, '.tm'))).y], 300);   // down to the term's own line, still out in the margin
      await R.move(on(c.a, '.tm'), 900);
      await R.until(`(() => { const h = document.querySelector('.hovercard'); return h && /Term/.test(h.textContent); })()`, 4000);
      await R.sleep(2600);
    }],
    ['Rest on the bridged words: the note they go to', async (R, c) => {
      await away(R, c, '.tm');
      await R.move([820, (await R.point(on(c.a, '.ln'))).y], 300);
      await R.move(on(c.a, '.ln'), 1000);
      await R.until(`(() => { const h = document.querySelector('.hovercard'); return h && /Gel batch 14/.test(h.textContent); })()`, 4000);
      await R.sleep(2600);
    }],
    ['Alt+click the claim: its actions', async (R, c) => {
      await away(R, c, '.ln');
      await R.move([820, (await R.point(on(c.a, '.st'))).y], 300);
      await R.move(on(c.a, '.st'), 900);
      await R.sleep(500);
      await R.hold('Alt');
      await R.click(null);
      await R.release('Alt');
      await R.until(`!!document.querySelector('.pop .op')`, 3000);
      await R.sleep(2200);
    }],
  ],
};
