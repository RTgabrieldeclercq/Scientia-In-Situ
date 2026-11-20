// Bridge bar (13zzv, V3.990) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs bridgeBar
export default {
  by: '',
  use: 'Walk back and forth along the bridges you just crossed, and jump to the pairs of notes you cross most.',
  view: [1040, 650],
  // the test notes: four notes bridged in a chain — seeding → run → analysis → next series — and some earlier crossings (none to the note it starts in)
  setup: async () => {
    const P = KIT.project('Traction on soft gels');
    const A = KIT.note(P, 'Seeding density notes'), B = KIT.note(P, 'Run 3'), C = KIT.note(P, 'Analysis: Run 3'), D = KIT.note(P, 'Fibronectin series');
    const rec = KIT.fill(KIT.first(A), 'Recipe', 'Seed at 40k/cm² on the 30 kPa gels; wait 4 h before imaging.', 'method');
    const plan = KIT.fill(KIT.first(B), 'Plan', 'Image the leading edge every 10 min for 6 h.');
    const drift = KIT.box(B, 'Bead drift', 'Drift stayed under 0.4 µm over the 6 h run.', { x: plan.x, y: plan.y + 190, ck: 'result' });
    const q = KIT.fill(KIT.first(C), 'Question', 'Does the traction peak at the edge hold on 30 kPa?');
    const peak = KIT.box(C, 'Edge peak', 'Peak traction sits in the outer 20 µm, 31 % above the interior.', { x: q.x, y: q.y + 190, ck: 'result' });
    KIT.fill(KIT.first(D), 'Plan', 'Coat at 1, 5 and 10 µg/mL; image the leading edge.');
    const at = n => ({ x: KIT.first(n).x + 460, y: KIT.first(n).y });
    BRIDGE.make(rec, B, { why: 'The seeding this run followed', at: at(B) });
    BRIDGE.make(drift, C, { why: 'The drift to correct for', at: at(C) });
    BRIDGE.make(peak, D, { why: 'What the next series tests', at: at(D) });
    for (let i = 0; i < 4; i++) BWAY.count(A.id, B.id);   // earlier crossings: what the bar counts
    for (let i = 0; i < 2; i++) BWAY.count(B.id, C.id);
    KIT.done(); return { A: A.id, B: B.id, C: C.id, D: D.id };
  },
  before: async (R, c) => { await R.open(c.D); },
  steps: [
    ['Cross a bridge from a circle at the note’s edge: the bar opens under the tabs, with the trail', async (R, c) => {
      await R.until(`document.querySelectorAll('.bw-mk').length >= 1`, 5000);
      await R.click({ sel: `.bw-mk[data-doc="${c.C}"]` });
      await R.until(`DocView.docId === ${JSON.stringify(c.C)} && !!document.querySelector('#bwbar.on .bw-st')`, 6000);
      await R.sleep(1800);
    }],
    ['Cross again: the trail grows, and the arrows walk back and forth along it', async (R, c) => {
      await R.until(`!!document.querySelector('.bw-mk[data-doc="${c.B}"]')`, 4000);
      await R.click({ sel: `.bw-mk[data-doc="${c.B}"]` });
      await R.until(`DocView.docId === ${JSON.stringify(c.B)} && document.querySelectorAll('#bwbar .bw-st').length >= 3`, 6000);
      await R.sleep(1500);
      await R.click({ sel: '#bwbar .bw-nav button[title^="Back"]' });
      await R.until(`DocView.docId === ${JSON.stringify(c.C)}`, 5000);
      await R.sleep(1100);
      await R.click({ sel: '#bwbar .bw-nav button[title^="Forward"]' });
      await R.until(`DocView.docId === ${JSON.stringify(c.B)}`, 5000);
      await R.sleep(1200);
    }],
    ['Most used: the pairs of notes you cross most. Click one to go there', async (R, c) => {
      await R.move({ sel: '#bwbar .bw-top' }, 900);
      await R.sleep(1700);
      await R.click({ sel: '#bwbar .bw-p button', text: 'Seeding density notes' });
      await R.until(`DocView.docId === ${JSON.stringify(c.A)}`, 5000);
      await R.sleep(1500);
    }],
    ['× closes the bar: it stays closed until tomorrow', async (R, c) => {
      await R.click('#bwbar .bw-close');
      await R.until(`!document.querySelector('#bwbar.on')`, 3000);
      await R.sleep(2600);
    }],
  ],
};
