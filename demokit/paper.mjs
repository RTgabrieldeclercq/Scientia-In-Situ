// Moving around the paper (10-paper.js PTUNE) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs paper
const seg = (label, text) => ({ sel: `.st-seg[aria-label="${label}"] button`, text });
const pv = (fx, fy) => ({ xy: `(() => { const r = document.querySelector('.pv-paper').getBoundingClientRect(); return { x: r.left + r.width * ${fx}, y: r.top + r.height * ${fy} }; })()` });
// the preview paper just under the navigation, its settings below it
const show = async R => { await R.ev(`const p = document.querySelector('.pv-paper'); p.scrollIntoView({ block: 'start' }); let e = p.parentElement; while (e && e.scrollHeight <= e.clientHeight + 2) e = e.parentElement; if (e) e.scrollTop -= 16; return 1`); await R.sleep(600); };
export default {
  by: 'Gabe',
  use: 'Set how the canvas feels under your hand: how fast Ctrl+wheel zooms, the grid cell a component settles to, and whether a flick of the paper keeps gliding. The paper on the page is a real one, so each setting can be tried at once.',
  view: [1040, 650],
  setup: async () => { KIT.project(); KIT.done(); return {}; },
  before: async (R, c) => { await R.go('#/settings/feature/paper'); await R.sleep(600); },
  steps: [
    ['Set Ctrl+wheel zooming to Quickly, then Ctrl+wheel over the preview paper: in, and back out', async (R, c) => {
      await show(R);
      await R.click(seg('Ctrl+wheel zooms', 'Quickly'));
      await R.hold('Control');
      for (let i = 0; i < 2; i++) await R.wheel(-70, pv(.12, .3));
      await R.sleep(600);
      for (let i = 0; i < 2; i++) await R.wheel(70, pv(.12, .3));
      await R.release('Control');
      await R.sleep(800);
    }],
    ['Set a component to settle to Two cells, then drag the box: it lets go where you did, and snaps to the grid', async (R, c) => {
      await R.click(seg('A component settles to', 'Two cells'));
      const box = { sel: '.pv-paper-b' };
      const p = await R.point(box);
      await R.drag([p.x - 20, p.y], [p.x + 163, p.y + 41], { ms: 1100, hold: 700 });
      await R.sleep(1400);
    }],
    ['Flick the paper with gliding on: it carries on until it slows. Switch gliding off and flick again: it stops at once', async (R, c) => {
      // a flick: the hand moves at speed right up to the moment it lets go (the recorder's own moves ease to a stop, which is not a flick)
      const flick = async dir => {
        const p = await R.point(pv(dir < 0 ? .9 : .3, .8));
        await R.move([p.x, p.y], 400); await R.sleep(200); await R.down(); await R.sleep(150);
        for (let i = 1; i <= 6; i++) await R.move([p.x + dir * 26 * i, p.y], 30);
        await R.up(); await R.sleep(2000);
      };
      await flick(-1);
      await R.click('button.fsw[aria-label="A flick keeps gliding"]');
      await R.sleep(500);
      await flick(1);
    }],
  ],
};
