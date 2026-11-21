// Data, a compendium (14fc, V4.49) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs atlasdata
export default {
  by: 'Gabe',
  use: 'Every folder and file you have logged in your notes, in one master tree: arranged by project and note, or merged into one tree where the same folder logged in three notes is one folder. Search it, and go to the note a folder was logged in.',
  view: [1280, 800],
  dpr: 1,   // a wide page
  // the test notes: three experiments in two projects, each with a data tree logged on its first component (names only: nothing is copied)
  setup: async () => {
    const day = n => Date.now() - n * 864e5, MB = 1048576;
    const dir = (n, k) => ({ id: uid('e'), n, dir: 1, k });
    const file = (n, mb, ago) => ({ id: uid('e'), n, s: Math.round(mb * MB), m: day(ago) });
    const nd2 = (pre, count, mb, ago) => Array.from({ length: count }, (_, i) => file(pre + String(i + 1).padStart(3, '0') + '.nd2', mb, ago));
    const log = (b, items) => { b.dtree = { items, mig: [] }; DB.put('blocks', b); };
    const P1 = KIT.project('Traction on soft gels'), P2 = KIT.project('Cell migration');
    const T1 = KIT.theme(P1, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const R3 = KIT.note(P1, 'Run 3 · 30 kPa', { type: 'experiment', themeId: T1.id, daysAgo: 4 }), R4 = KIT.note(P1, 'Run 4 · 8 kPa', { type: 'experiment', themeId: T1.id, daysAgo: 1 });
    const W2 = KIT.note(P2, 'Wound healing, day 2', { type: 'experiment', daysAgo: 6 });
    const b3 = KIT.fill(KIT.first(R3), 'Imaging data', 'Beads and cells, 60× objective.'), b4 = KIT.fill(KIT.first(R4), 'Imaging data', 'Beads and cells, 60× objective.'), bw = KIT.fill(KIT.first(W2), 'Time-lapse', 'Scratch closure, one field every 10 min.');
    log(b3, [dir('raw', nd2('run3_beads_', 8, 310, 4)), dir('fields', nd2('field_', 3, 120, 4)), file('stage-log.txt', .01, 4)]);
    log(b4, [dir('raw', nd2('run4_beads_', 6, 280, 1)), dir('analysis', [file('traction_map.csv', 2.4, 1), file('drift.csv', .3, 1)])]);
    log(bw, [dir('raw', nd2('scratch_d2_', 10, 95, 6)), file('notes.txt', .01, 6)]);
    KIT.done(); return { R3: R3.id, R4: R4.id, W2: W2.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.until(`!!document.querySelector('#tabs .tab[data-k="compendiums"]')`, 6000); await R.until(`!document.querySelector('.toast')`, 8000); await R.move([640, 420], 0); },
  steps: [
    ['Compendiums → Data: every logged tree, by project and note — each note with its kind and Open', async (R, c) => {
      await R.click('#tabs .tab[data-k="compendiums"]', { ms: 700 });
      await R.until(`!!document.querySelector('a.cp-card[data-k="data"]')`, 6000);
      await R.sleep(700);
      await R.click('a.cp-card[data-k="data"]', { ms: 700 });
      if (!await R.until(`!!document.querySelector('.ad-tree .ad-note')`, 6000)) throw new Error('no master tree');
      await R.sleep(1800);
    }],
    ['One merged tree: the same folder logged in several notes becomes one folder, marked with the notes it is in', async (R, c) => {
      await R.click({ sel: '.ad-seg button', text: 'One merged tree' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.ad-tree .ad-src')`, 5000)) throw new Error('no merged tree');
      await R.sleep(1800);
    }],
    ['Search “raw”: only what matches stays, with the folders above it opened', async (R, c) => {
      await R.click('.ad-q', { ms: 600 });
      await R.type('raw', 120);
      await R.until(`!!document.querySelector('.ad-src.many')`, 4000);
      await R.sleep(1800);
    }],
    ['“in 3 notes” lists where the folder was logged: pick one and you are at its data in that note', async (R, c) => {
      await R.click({ sel: '.ad-src.many' }, { ms: 700 });
      if (!await R.until(`!!document.querySelector('.pop .op, .pop [role="menuitem"]')`, 3000)) throw new Error('no list of notes');
      await R.sleep(1500);
      await R.click({ sel: '.pop .op', text: 'Run 3' }, { ms: 700 });
      if (!await R.until(`typeof DocView !== 'undefined' && DocView.docId === ${JSON.stringify(c.R3)}`, 6000)) throw new Error('the note did not open');
      await R.sleep(2200);
    }],
  ],
};
