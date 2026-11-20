// Regions (13v, 13vb; V3.996) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs regions
// the region named Gels, and a part of it
const RG = sel => `[...document.querySelectorAll('.region')].find(e => e.querySelector('.rg-name') && e.querySelector('.rg-name').textContent === 'Gels').querySelector('${sel}')`;
export default {
  by: '',
  use: 'Group components in a named frame that folds away and moves as one.',
  view: [1040, 650],
  pause: 500,
  // the test note: six components in two clusters, side by side; the right-hand cluster is already a region ("Imaging")
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Analysis: Run 3');
    const a0 = KIT.first(A); a0.w = 238;
    const gels = [['Gel batch 14', '30 kPa, fibronectin 5 µg/mL.'], ['Gel batch 15', '12 kPa, fibronectin 5 µg/mL.'], ['Gel batch 16', '3 kPa, fibronectin 5 µg/mL.']];
    const g = gels.map(([l, t], i) => i === 0 ? KIT.fill(a0, l, t) : KIT.box(A, l, t, { x: a0.x, y: a0.y + i * 104, w: 238 }));
    const img = [['Bead field 1', 'Beads at 20x, every 2 min.'], ['Bead field 2', 'Second field, same gel.'], ['Drift check', 'Bead drift under 0.2 µm.']].map(([l, t], i) => KIT.box(A, l, t, { x: a0.x + 360, y: a0.y + i * 104, w: 238 }));
    const d = M.doc(A.id); d.layout = Object.assign({ head: { x: 0, y: 0 } }, d.layout, { synth: { x: a0.x + 1700, y: a0.y }, head: { x: a0.x + 1700, y: a0.y + 400 } }); DB.put('documents', d);   // the note's own boxes out of the way
    const rg = REGION.create(M.doc(A.id), img.map(b => b.id)); rg.name = 'Imaging'; rg.color = REGION.COLORS[2]; REGION.save(M.doc(A.id));
    KIT.done(); return { A: A.id, g: g.map(b => b.id), img: img.map(b => b.id), rg: rg.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.sleep(600);
    await R.ev(`const P = DocView.paper, r = DocView.rectOf(${JSON.stringify(c.g[0])}); Object.assign(P.view, { z: 1, x: 70 - r.x, y: 170 - r.y }); P.apply(); return 1`);
    await R.sleep(700);
  },
  steps: [
    ['Right-drag a loop round three components and choose Make a region: it snaps round them. Name it “Gels”', async (R, c) => {
      // the loop: the four corners round the three components
      const U = `(() => { const rs = ${JSON.stringify(c.g)}.map(id => document.querySelector('.box[data-id="' + id + '"]').getBoundingClientRect()); return { l: Math.min(...rs.map(r => r.left)), t: Math.min(...rs.map(r => r.top)), r: Math.max(...rs.map(r => r.right)), b: Math.max(...rs.map(r => r.bottom)) }; })()`;
      const at = (fx, fy) => ({ xy: `(() => { const u = ${U}; return { x: ${fx}, y: ${fy} }; })()` });
      await R.drag(at('u.l - 14', 'u.t - 16'), at('u.l - 14', 'u.t - 16'), { button: 'right', via: [at('u.r + 14', 'u.t - 16'), at('u.r + 14', 'u.b + 14'), at('u.l - 14', 'u.b + 14')], viaMs: 450, ms: 450, hold: 500 });
      await R.until(`document.querySelector('.pop')`, 3000);
      await R.sleep(500);
      await R.click({ sel: '.pop button', text: 'Make a region' });
      await R.sleep(900);
      await R.dblclick({ js: `[...document.querySelectorAll('.region .rg-name')].find(e => /^Region/.test(e.textContent))` });
      await R.until(`document.querySelector('.rg-in')`, 3000);
      await R.sleep(300);
      await R.type('Gels', 110);
      await R.key('Enter');
      await R.sleep(1100);
    }],
    ['Give it a colour from its ⋯ menu, then drag it by its title: everything in it moves together', async (R, c) => {
      await R.click({ js: RG('.rg-more') });
      const col = () => R.ev(`return [...document.querySelectorAll('.region')].find(e => e.querySelector('.rg-name') && e.querySelector('.rg-name').textContent === 'Gels').style.getPropertyValue('--rg')`), was = await col();
      await R.click({ sel: '.pop .rg-sw button:nth-child(4)' });
      await R.sleep(300);
      if (await col() === was) throw new Error('the colour did not change');
      await R.sleep(900);
      await R.drag({ js: RG('.rg-name') }, { xy: `(() => { const r = ${RG('.rg-name')}.getBoundingClientRect(); return { x: r.left + 40, y: r.top + 70 }; })()` }, { ms: 900 });
      await R.sleep(1200);
    }],
    ['Fold it into its title with the arrow: the components go, and what lay beside it closes in', async R => {
      await R.click({ js: RG('.rg-fold') });
      await R.sleep(1800);
    }],
    ['Unfold it: the region beside it moves aside, whole, to make room', async R => {
      await R.click({ js: RG('.rg-fold') });
      await R.sleep(1800);
    }],
    ['Hold Alt and drag one component out of the region: it leaves the frame', async (R, c) => {
      await R.hold('Alt');
      await R.drag({ sel: `.box[data-id="${c.g[2]}"] .bh .num` }, { xy: `(() => { const r = document.querySelector('.box[data-id="${c.g[2]}"]').getBoundingClientRect(); return { x: 800, y: r.top - 20 }; })()` }, { ms: 1000 });
      await R.release('Alt');
      await R.sleep(1500);
    }],
  ],
};
