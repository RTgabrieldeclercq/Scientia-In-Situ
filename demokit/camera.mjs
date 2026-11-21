// Photo from the camera (14fh, V4.93) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs camera
// The camera is Chrome's fake one, playing assets/camera-plate.mjpeg (a made-up six-well plate: assets/make-camera.py).
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 250 }, o));
export default {
  by: 'Gabe',
  use: 'Snap a plate or a gel with the camera straight into the note you are writing: the picture becomes a 1×1 image panel, without leaving the page.',
  view: [1040, 650],
  chrome: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture={kit}/assets/camera-plate.mjpeg'],
  // the test note: the run's notes in the morning, before the plates are checked
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 4 · plate check');
    const [a, b] = KIT.grid(A, [
      ['Gels', 'Gel batch 15, 30 kPa, coated with fibronectin at 5 µg/mL.'],
      ['Seeding', 'MCF10A at 60 000 cells per gel; plate 4 left to settle for 4 h.'],
    ]);
    KIT.done(); return { A: A.id, a: a.id, b: b.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.wheel(120, [700, 380]); },
  steps: [
    ['In the note, open the ＋ Quick cast at the bottom and choose Photo', async (R, c) => {
      await K(R, '.lab-pill-insert .lab-pill-btn');
      if (!await R.until(`!!document.querySelector('.lab-fan-item.lab-photo, .lab-fan-item')`, 4000)) throw new Error('the Quick cast did not open');
      await R.sleep(500);
      await K(R, { js: `document.querySelector('.lab-fan-item.lab-photo') || [...document.querySelectorAll('.lab-fan-item')].find(e => /photo/i.test(e.textContent + e.title + e.getAttribute('aria-label')))` });
      if (!await R.until(`!!document.querySelector('.cam-v')`, 4000)) throw new Error('the camera did not open');
      await R.until(`(() => { const v = document.querySelector('.cam-v'); return v && v.videoWidth > 0 && !document.querySelector('.cam-take').disabled; })()`, 8000);
      await R.sleep(1500);
    }],
    ['The camera shows what it sees, live: point it at the plate and press Take', async (R, c) => {
      // at this window height the Take button sits half below the box: scroll it, as a hand would
      await R.wheel(160, [520, 300]);
      await K(R, '.cam-take');
      if (!await R.until(`!document.querySelector('.cam-shot').hidden`, 3000)) throw new Error('no photo was taken');
      await R.sleep(1500);
    }],
    ['The picture is held for a look, with Retake beside it: this one is good, so Use it — it lands in the note as a 1×1 image panel', async (R, c) => {
      await K(R, '.cam-use');
      if (!await R.until(`DB.where('blocks', b => b.docId === ${JSON.stringify(c.A)} && !!b.fig).length > 0`, 5000)) throw new Error('no image panel was made');
      await R.sleep(1800);
      await R.wheel(150, [900, 200]);   // the panel lands in the middle of the view: lift it into full sight
      await R.sleep(2200);
    }],
  ],
};
