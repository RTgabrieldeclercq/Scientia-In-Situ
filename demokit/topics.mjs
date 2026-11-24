// Topic syntheses (14fe, V4.86) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs topics
const RG = sel => `[...document.querySelectorAll('.region')].find(e => e.querySelector('.rg-name') && e.querySelector('.rg-name').textContent === 'Traction at the rim').querySelector('${sel}')`;
export default {
  by: 'Gabe',
  use: 'Mark a cluster of components as a topic synthesis, and find every topic you have marked in one gallery, each with a small map of how it is laid out.',
  view: [1040, 650],
  pause: 700,
  // the test note: three components that belong together, already framed in a region, and one that does not
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Rim traction');
    const a0 = KIT.first(A), w = 300;
    KIT.fill(a0, 'Edge peak', 'Traction peaks at 8 kPa in the outer two cell rows.', 'result'); a0.w = w; DB.put('blocks', a0);
    const b = KIT.box(A, 'Centre', 'The centre of the colony stays below 2 kPa.', { x: a0.x, y: a0.y + 112, w });
    const c = KIT.box(A, 'Stiffness', 'The rim peak rises with gel stiffness: 3, 12 and 30 kPa.', { x: a0.x + 340, y: a0.y + 56, w });
    const loose = KIT.box(A, 'Next', 'Repeat on gel 3 with EGF added.', { x: a0.x + 700, y: a0.y + 112, w: 260, ck: 'hypothesis' });
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y }, head: { x: a0.x + 1700, y: a0.y + 400 } }); DB.put('documents', d);
    const rg = REGION.create(M.doc(A.id), [a0.id, b.id, c.id]); rg.name = 'Traction at the rim'; rg.color = REGION.COLORS[2]; REGION.save(M.doc(A.id));
    KIT.done(); return { A: A.id, rg: rg.id };
  },
  before: async (R, c) => {
    await R.open(c.A); await R.sleep(600);
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.rg)}) || DocView.rectOf(KIT.first(M.doc(${JSON.stringify(c.A)})).id); Object.assign(P.view, { z: 1, x: 120 - r.x, y: 190 - r.y }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Open the ⋯ of a region that holds one topic and choose Mark as a topic synthesis: its tab says so', async (R, c) => {
      await R.click({ js: RG('.rg-more') });
      await R.until(`document.querySelector('.pop')`, 3000);
      await R.sleep(600);
      await R.click({ js: `[...document.querySelectorAll('.pop .op, .pop button')].find(o => o.textContent.includes('Mark as a topic synthesis'))` });
      await R.sleep(1800);
    }],
    ['Compendiums → Topic syntheses: the topic is a card, with a small map of its components', async (R, c) => {
      await R.move([760, 500], 300); await R.sleep(2200);   // the message goes
      await R.click({ sel: 'nav a, .tabs a, a, button', text: 'Compendiums' });
      await R.sleep(1200);
      await R.click({ sel: '.cp-card, .cp-tile, a, button, div', text: 'Topic syntheses' });
      await R.until(`!!document.querySelector('.tp-card')`, 4000);
      await R.sleep(1800);
    }],
    ['Open lands on the region in its note, centred', async (R, c) => {
      await R.click({ sel: '.tp-card button', text: 'Open' });
      await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${JSON.stringify(c.A)} && !!document.querySelector('.region')`, 6000);
      await R.sleep(2200);
    }],
  ],
};
