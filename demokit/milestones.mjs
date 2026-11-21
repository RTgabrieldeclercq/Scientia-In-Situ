// Milestones (15g, V4.18) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs milestones
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
const modalBtn = (R, text) => K(R, { sel: '.modal-ov button, .modal button, .ovl button', text });
export default {
  by: 'Gabe',
  use: 'Track a theme’s big aims by what is actually delivered: a milestone is as complete as its deliverables, each a Synthesis note that is written or a set of results, takeaways or verdicts that are picked.',
  view: [1280, 800], dpr: 1, crf: 32, pause: 500,
  // the test notes: a theme with a run note holding two results and a takeaway, and a Synthesis note that is written
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const run = KIT.note(P, 'Run 3 · 30 kPa', { themeId: T.id, daysAgo: 1 });
    KIT.grid(run, [
      ['Traction at 8 kPa', 'Peak edge traction 310 Pa on the 8 kPa gels.', 'result'],
      ['Traction at 30 kPa', 'Peak edge traction 520 Pa on the 30 kPa gels.', 'result'],
      ['Edge peak holds', 'On every gel the peak sits within two cell rows of the leading edge.', 'insight'],
    ]);
    const syn = M.createDoc({ type: 'reflection', projectId: P.id, themeId: T.id, title: 'Stiffness series — synthesis' }), cur = M.doc(syn.id);
    cur.synthesis = { text: 'Traction rises with stiffness, from 310 Pa at 8 kPa to 520 Pa at 30 kPa, and the edge peak holds throughout.', marks: [] }; M.touchDoc(cur); DB.put('documents', cur);
    KIT.done(); return { T: T.id };
  },
  before: async (R, c) => { await R.go('#/theme/' + c.T); await R.until(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === '+ Milestone')`, 6000); await R.move([900, 500], 0); },
  steps: [
    ['On the theme’s page, + Milestone: name the goal and what delivers it — a Synthesis note, two Results, a takeaway', async (R, c) => {
      await K(R, { sel: 'button', text: '+ Milestone' });
      if (!await R.until(`!!document.querySelector('.mi-rows')`, 4000)) throw new Error('the milestone dialog did not open');
      await R.sleep(500);
      await K(R, { js: `document.querySelector('.mi-rows').closest('div').parentElement.querySelector('label.f input')` });
      await R.type('Map traction against stiffness', 40);
      const rows = n => `document.querySelectorAll('.mi-r')[${n}]`;
      await K(R, { js: `${rows(0)}.querySelector('.mi-rl')` });
      await R.type('The stiffness series, synthesised', 40);
      await K(R, { js: `${rows(1)}.querySelector('.mi-rl')` });
      await R.type('2 Results across the stiffness range', 40);
      await K(R, { js: `${rows(1)}.querySelector('.mi-rn')` });
      await R.key('a', { ctrl: true }); await R.type('2', 40);
      await K(R, { sel: 'button', text: '+ Add a deliverable' });
      await R.sleep(300);
      await K(R, { js: `${rows(2)}.querySelector('.mi-rl')` });
      await R.type('A takeaway on the edge peak', 40);
      await K(R, { js: `[...${rows(2)}.querySelectorAll('.mi-kb')].find(b => b.textContent.trim() === 'Takeaways')` });
      await K(R, { js: `[...${rows(2)}.querySelectorAll('.mi-kb')].find(b => b.textContent.trim() === 'Results')` });
      await R.sleep(900);
      await modalBtn(R, 'Create the milestone');
      if (!await R.until(`!!document.querySelector('.mi-card')`, 4000)) throw new Error('the milestone was not made');
      await R.move([960, 600], 400);
      await R.ev(`document.querySelector('.mi-card').scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(1500);
    }],
    ['Link the Synthesis note and pick the two Results: two of its three deliverables are delivered', async (R, c) => {
      await K(R, { js: `document.querySelectorAll('.mi-row')[0].querySelector('button')` });
      if (!await R.until(`!!document.querySelector('.modal input, .ovl input')`, 4000)) throw new Error('the synthesis picker did not open');
      await R.sleep(700);
      await K(R, { sel: '.modal div, .ovl div', text: 'Stiffness series — synthesis' });
      await R.sleep(1100);
      await K(R, { js: `document.querySelectorAll('.mi-row')[1].querySelector('button')` });
      if (!await R.until(`document.querySelectorAll('.mi-cand').length >= 2`, 4000)) throw new Error('the results did not list');
      await R.sleep(700);
      await K(R, { sel: '.mi-cand', text: '310 Pa' });
      await K(R, { sel: '.mi-cand', text: '520 Pa' });
      await R.sleep(700);
      await modalBtn(R, 'Save');
      await R.until(`document.querySelectorAll('.mi-row.met').length === 2`, 3000);
      await R.move([960, 640], 400);
      await R.sleep(2200);
    }],
    ['Pick the takeaway for the third: every deliverable is delivered and the milestone is complete', async (R, c) => {
      await K(R, { js: `document.querySelectorAll('.mi-row')[2].querySelector('button')` });
      if (!await R.until(`document.querySelectorAll('.mi-cand').length >= 1`, 4000)) throw new Error('the takeaways did not list');
      await R.sleep(700);
      await K(R, { sel: '.mi-cand', text: 'the peak sits within' });
      await R.sleep(600);
      await modalBtn(R, 'Save');
      if (!await R.until(`document.querySelectorAll('.mi-row.met').length === 3`, 3000)) throw new Error('not all three delivered');
      await R.move([960, 640], 400);
      await R.sleep(2600);
    }],
  ],
};
