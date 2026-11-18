// Split panes (split) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs split
// the Split button of the first pane, then a row of its menu
const F = { rest: 90, after: 200 };
const split = async (R, row) => {
  // ✦ tools (top right of the first pane) opens a wheel; its Split item opens the menu
  const pane = '.lab-pills .lab-pill-tools';
  await R.click({ js: `(document.querySelector('.split > .pane.p0 .lab-pill-tools .lab-pill-btn') || document.querySelector('.lab-pill-tools .lab-pill-btn'))` });
  await R.until(`!!document.querySelector('.lab-pill-tools .lab-fan-item[aria-label^="Split"]')`, 3000);
  await R.sleep(300);
  await R.click({ sel: '.lab-pill-tools .lab-fan-item[aria-label^="Split"]' }, F);
  await R.until(`[...document.querySelectorAll('.pop .op')].some(o => o.textContent.includes(${JSON.stringify(row)}))`, 3000);
  await R.sleep(350);
  await R.click({ sel: '.pop .op', text: row }, F);
};
export default {
  by: '',
  use: 'Work in two to four notes at once: plan beside run, run beside analysis.',
  view: [1280, 800], dpr: 1,
  // the test notes: the plan and the run of one experiment, its analysis, and two more notes; the plan links to the analysis
  setup: async () => {
    const P = KIT.project(), plan = KIT.note(P, 'Plan: fibronectin series'), run = KIT.note(P, 'Run 3'), an = KIT.note(P, 'Analysis: traction maps'), seed = KIT.note(P, 'Seeding density notes'), gel = KIT.note(P, 'Gel batch 14');
    const p1 = KIT.grid(plan, [['Coating', 'Coat gels at 1, 5 and 10 µg/mL fibronectin, overnight at 4 °C.'], ['Imaging', 'Image the leading edge every 5 min; beads before and after trypsin.'], ['Analysis', 'Analysis note: traction maps — the maps follow this plan.']], { cols: 1, dy: 150 });
    const t = p1[2].body.text, at = t.indexOf('Analysis note: traction maps');
    p1[2].body = { text: t, marks: [{ id: uid('m'), type: 'link', from: at, to: at + 'Analysis note: traction maps'.length, ref: an.id, title: an.title }] }; DB.put('blocks', p1[2]);
    KIT.grid(run, [['Gels', 'Gel batch 14, 30 kPa, coated at 5 µg/mL.'], ['Seeding', 'MDCK seeded at 40k/cm² on the gels, 4 h before imaging.'], ['Imaging', 'Beads drift under 0.2 µm over the 40 min run.']], { cols: 1, dy: 150 });
    KIT.grid(an, [['Traction map', 'Peak traction sits in the outer two rows of the sheet.'], ['Drift', 'Bead drift corrected frame by frame.']], { cols: 1, dy: 150 });
    KIT.grid(seed, [['Densities', '20k, 40k and 80k/cm²; 40k gives a sheet by the next morning.']], { cols: 1 });
    KIT.grid(gel, [['Gel batch 14', 'Polyacrylamide, 30 kPa, poured Monday.']], { cols: 1 });
    KIT.done(); return { plan: plan.id, run: run.id, an: an.id, seed: seed.id, last: p1[2].id };
  },
  before: async (R, c) => { await R.open(c.plan); await R.move([640, 460], 0); },
  steps: [
    ['Split → Side by side, and pick the run note to put beside the plan', async (R, c) => {
      await split(R, 'Side by side');
      await R.until(`!!document.querySelector('.sp-list label')`, 3000);
      await R.click({ sel: '.sp-list label', text: 'Run 3' });
      await R.until(`!!document.querySelector('.split.n2')`, 4000);
      await R.sleep(1100);
    }],
    ['Drag the line between them to give one note more room', async (R, c) => {
      await R.drag('.split-sep.v', { xy: `(() => { const r = document.querySelector('.split').getBoundingClientRect(); return { x: r.left + r.width * .62, y: r.top + r.height * .5 }; })()` }, { ms: 1200 });
      await R.sleep(1200);
    }],
    ['Alt+click a link to a note that is not open: it opens beside, as a third pane', async (R, c) => {
      const link = { xy: `(() => { const r = document.querySelector('.split > .pane.p0 .ln').getClientRects()[0]; return { x: r.left + Math.min(60, r.width / 2), y: r.top + r.height / 2 }; })()` };
      await R.move(link);
      await R.hold('Alt');
      await R.click(link);
      await R.release('Alt');
      if (!await R.until(`!!document.querySelector('.split.n3')`, 4000)) throw new Error('no third pane');
      await R.sleep(1300);
    }],
    ['Split → Quadrant (2×2): pick one more note, and the four sit in a grid', async (R, c) => {
      await split(R, 'Quadrant');
      await R.until(`!!document.querySelector('.sp-list label')`, 3000);
      await R.click({ sel: '.sp-list label', text: 'Seeding density notes' });
      await R.sleep(300);
      await R.click({ sel: '.modal .btn.pri', text: 'Open' });
      await R.until(`!!document.querySelector('.split.n4')`, 4000);
      await R.sleep(1400);
    }],
    ['Split → Back to one pane: only this note is left', async (R, c) => {
      await split(R, 'Back to one pane');
      await R.until(`!document.querySelector('.split')`, 4000);
      await R.sleep(1300);
    }],
  ],
};
