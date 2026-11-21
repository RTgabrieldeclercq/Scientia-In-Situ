// Tidy layout (12d, V3.948 / V4.69) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs tidy
const q = { rest: 60, after: 120, ms: 420 };   // a quicker hand, for the small clicks
// a point of the paper that nothing covers, away from the middle of the screen
const FREE = `(() => { for (const [fx, fy] of [[.92, .5], [.5, .93], [.08, .92], [.92, .92], [.5, .08], [.08, .5], [.3, .5], [.7, .5]]) { const x = innerWidth * fx, y = innerHeight * fy, e = document.elementFromPoint(x, y);
  if (e && !e.closest('.box, .wl, svg, button, nav, header, #tabs, .lab-pill, .pop, .toast, .ink-selbar')) return { x, y }; } return null; })()`;
export default {
  by: 'Gabe',
  use: 'For tidying a messy note in the shape that reads best — information flowing down the page or across it — and for getting your own layout back whenever you want it.',
  view: [1040, 650],
  // the test note: one day's imaging, nine components thrown anywhere, joined by links
  setup: async () => {
    const P = KIT.project('Traction on soft gels'), T = KIT.theme(P, 'Edge traction', 'Where does the force peak?');
    const D = KIT.note(P, 'Imaging day 3', { themeId: T.id });
    const a = KIT.first(D), at = (dx, dy) => ({ x: a.x + dx, y: a.y + dy });
    const spots = [[640, 330], [20, 40], [980, 20], [380, 560], [260, 250], [40, 520], [820, 560], [620, 20], [1000, 330]];
    const items = [['Insight', 'The edge peak holds with EGF.', 'insight'], ['Question', 'Does EGF change the force at the edge?', 'question'], ['Hypothesis', 'EGF raises the edge traction.', 'hypothesis'],
      ['Setup', '30 kPa gels, EGF at 10 ng/mL.'], ['Observe', 'Beads move inward at the leading edge.'], ['Barrier', 'Bead drift after trypsin.', 'barrier'], ['Control', 'A gel with no EGF.'], ['Result', 'Peak 3.2 kPa, 20 µm in from the edge.', 'result'], ['Next', 'Repeat at 5 µg/mL fibronectin.']];
    const B = items.map(([l, t, ck], i) => i === 0 ? KIT.fill(a, l, t, ck) : KIT.box(D, l, t, Object.assign({ ck }, at(spots[i][0], spots[i][1]))));
    Object.assign(a, at(spots[0][0], spots[0][1])); DB.put('blocks', a);
    const W = [[1, 2, 'leads'], [2, 3, 'leads'], [3, 4, 'produces'], [4, 7, 'leads'], [5, 4, 'causes'], [6, 7, 'supports']];
    W.forEach(([x, y, rel]) => M.wire(B[x].id, B[y].id, rel, true));
    KIT.done(); return { D: D.id };
  },
  before: async (R, c) => { await R.open(c.D); await R.key('0', { ctrl: true }); await R.sleep(900); },
  steps: [
    ['A messy note: components thrown anywhere. Right-click the paper → Tidy layout, and choose Top down', async (R, c) => {
      await R.rclick({ xy: FREE }, q);
      await R.click({ sel: '.pop .op', text: 'Tidy layout' }, q);
      await R.sleep(900);
      await R.click({ sel: '.pop .op', text: 'Top down' }, q);
      await R.sleep(2600);
    }],
    ['Another style, Left to right: the links now run across', async (R, c) => {
      await R.rclick({ xy: FREE }, q);
      await R.click({ sel: '.pop .op', text: 'Tidy layout' }, q);
      await R.sleep(700);
      await R.click({ sel: '.pop .op', text: 'Left to right' }, q);
      await R.sleep(2600);
    }],
    ['Undo tidy · back to your layout: every component returns to where you had put it', async (R, c) => {
      await R.rclick({ xy: FREE }, q);
      await R.click({ sel: '.pop .op', text: 'Undo tidy' }, q);
      await R.sleep(2600);
    }],
  ],
};
