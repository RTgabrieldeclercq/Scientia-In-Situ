// Recordings (13zn, sttread.py) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs rec
// Needs the app's own server (it keeps the audio and runs Whisper): the recorder runs it on an empty temporary notebook
// folder (server: true). There is no microphone: Chrome is given a computer-spoken clip of a made-up lab meeting
// (assets/meeting.wav, 16 s) as its microphone. The demonstration itself has no sound.
export default {
  by: '',
  use: 'Record a meeting in the note and get a transcript you can play from any line.',
  view: [1100, 720], server: true,
  chrome: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture={kit}/assets/meeting.wav%noloop'],
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Lab meeting · {today}');
    const a = KIT.fill(KIT.first(A), 'Agenda', 'Run 3 results; bead drift; gels for run 4.');
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); },
  steps: [
    ['Right-click the paper → Insert → Recording: the microphone starts, and a red pill in the header keeps the time', async (R, c) => {
      const at = await R.ev(`const r = document.querySelector('.box[data-id="${c.a}"]').getBoundingClientRect(); return { x: r.left + 20, y: r.bottom + 50 }`);
      await R.rclick([at.x, at.y]);
      await R.click({ sel: '.pop .op', text: 'Insert' });
      await R.sleep(500);
      await R.type('recording');
      await R.sleep(500);
      await R.key('Enter');
      await R.until(`!!document.querySelector('#recpill')`, 8000);
      // slide the paper so the recording is in view (looking, not doing)
      await R.ev(`const P = App.panes()[0].paper, el = [...document.querySelectorAll('.box')].find(b => /recording/i.test(b.textContent) && b.querySelector('button')), r = el.getBoundingClientRect(), dx = 120 - r.left, dy = 170 - r.top; for (let i = 1; i <= 18; i++) { P.view.x += dx / 18; P.view.y += dy / 18; P.apply(); await new Promise(q => setTimeout(q, 28)); } return 1`);
      await R.sleep(3500);
    }],
    ['Drop a bookmark at a decision (the diamond, or Alt+M from anywhere)', async (R, c) => {
      await R.sleep(3500);
      await R.key('m', { alt: true });
      await R.sleep(3500);
    }],
    ['Stop: the audio is saved in the notebook folder, and the computer starts reading it', async (R, c) => {
      await R.sleep(2500);
      await R.click({ text: 'Stop', sel: 'button' });
      await R.sleep(3500);
    }],
    ['The transcript arrives, a sentence a line (the wait is cut here). Click a time to play from there', async (R, c) => {
      await R.cut(async () => { await R.until(`!!document.querySelector('.rc-lt')`, 300000); });
      await R.sleep(2200);
      await R.click({ js: `document.querySelectorAll('.rc-lt')[2] || document.querySelector('.rc-lt')` });
      await R.sleep(4000);
    }],
  ],
};
