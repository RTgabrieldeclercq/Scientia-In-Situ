// Links to protocol steps (13zpb, V4.68) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs stepwires
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
export default {
  by: 'Gabe',
  use: 'For tying an observation to the exact step of a protocol it came from, and moving the link to another step if you find it belonged elsewhere.',
  view: [1040, 650],
  // the test note: the protocol "Bead coating" (four steps) and the observation that came from it
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const D = KIT.note(P, 'Run 3 · 30 kPa', { themeId: T.id });
    const o = KIT.first(D); KIT.fill(o, 'Beads clumped at the rim', 'Many beads clumped at the rim of the gel, away from the cells.');
    const pr = PROTO.create(D.id, o.x, o.y);
    const words = ['Pour the gel and let it set for 30 min.', 'Wash twice with PBS.', 'Add the bead solution and spin 5 min.', 'Image the leading edge.'];
    pr.label = 'Bead coating'; pr.steps[0].text = words[0]; DB.put('blocks', pr);
    words.slice(1).forEach(t => PROTO.insertStep(M.block(pr.id), null, t));
    o.x += 540; o.y += 20; DB.put('blocks', o);
    KIT.done(); return { D: D.id, pr: pr.id, o: o.id };
  },
  before: async (R, c) => { await R.open(c.D); },
  steps: [
    ['Rest on step 3 of the protocol: a link circle of its own appears on its edge', async (R, c) => {
      await R.move({ xy: `(() => { const r = document.querySelector('.pstep:nth-child(3) .ptext').getBoundingClientRect(); return { x: r.left + 60, y: r.top + r.height / 2 }; })()` });
      await R.sleep(1600);
    }],
    ['Drag that circle to the observation: the link starts at step 3, not at the box', async (R, c) => {
      await R.move({ sel: '.pstep:nth-child(3) .stport' }, 40);   // the circle sits a few px off the row: reached in one quick move the row stays hovered
      await R.drag({ sel: '.pstep:nth-child(3) .stport' }, { sel: `.box[data-id="${c.o}"] .ed`, dx: .5, dy: .6 }, { ms: 1100 });
      await R.until(`!!document.querySelector('.pop')`, 4000);
      await R.sleep(1200);
      await R.click({ sel: '.pop *', text: 'caused' }, q);   // how the two are connected
      await R.sleep(1500);
    }],
    ['A link is not fixed: click its label, and Move it to another step: step 2, where it belonged', async (R, c) => {
      await R.click('.wl', q);
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(1200);
      await R.click({ sel: '.pop .op', text: 'Move it to another step' }, q);
      await R.until(`!!document.querySelector('.modal')`, 3000);
      await R.sleep(1200);
      await R.click({ sel: '.modal *', text: 'Wash twice with PBS' }, q);
      await R.sleep(1800);
    }],
  ],
};
