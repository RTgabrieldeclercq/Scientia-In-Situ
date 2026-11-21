// The Today page (14-home TODAY, V4.5x) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs today
export default {
  by: 'Gabe',
  use: 'Set how much of the lists on Today is shown. Today lists your recent notes and a heatmap of the days you recorded time; in Settings you choose how many recent notes it lists and how many weeks the heatmap covers, and the page changes to match.',
  view: [1040, 650],
  // the test notebook: three months of notes with timer sessions, so the heatmap has something to show
  setup: async () => {
    const P = KIT.project(), Q = KIT.project('Collective migration');
    const titles = ['Gel casting', 'Bead coating', 'Imaging day', 'Traction run', 'Analysis', 'Bench log', 'Journal club', 'Seeding density', 'Fibronectin test', 'Lab meeting notes'];
    const at = (n, h, m) => KIT.at(n, (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m);
    let k = 0;
    for (let n = 0; n <= 83; n++) {
      const wd = KIT.at(n, '12:00').getDay(); if (wd === 0 || wd === 6 && n % 3) continue;   // weekdays, a few Saturdays
      if ((n * 7 + 3) % 5 === 0) continue;          // and some gaps
      const runs = (n * 3) % 4 === 0 ? 2 : 1;
      for (let r = 0; r < runs; r++) {
        const title = titles[(k++) % titles.length] + ' · day ' + (84 - n), d = KIT.note(k % 3 ? P : Q, title, { daysAgo: n || undefined });
        KIT.ago(KIT.fill(KIT.first(d), 'Notes', 'Worked through the day’s steps; see the components below.'), n, '10:00');
        const s = at(n, 9 + r * 4, (n * 11) % 50), mins = 25 + ((n * 37 + r * 53) % 200), e = new Date(+s + mins * 6e4);
        DB.put('sessions', { id: uid('s'), docId: d.id, themeId: d.themeId, projectId: d.projectId, entry: 'timer', source: 'timer', state: 'complete', segments: [{ s: isoLocal(s), e: isoLocal(e) }], steps: [], created: isoLocal(s), seconds: Math.round((e - s) / 1000) });
      }
    }
    KIT.done(); return {};
  },
  before: async (R, c) => {
    await R.go('#/home');
    await R.until(`!!document.querySelector('.hm')`, 8000);
    await R.sleep(600);
  },
  steps: [
    ['Today lists your recent notes and, under “Last 5 weeks”, a heatmap of the days you recorded time', async (R, c) => {
      await R.wheel(520, [760, 420]);
      await R.sleep(500);
      await R.ev(`const m = [...document.querySelectorAll('.sec-h h2')].find(x => /^Last .* weeks$/.test(x.textContent)); m.style.scrollMarginTop = '125px'; m.scrollIntoView({ block: 'start', behavior: 'smooth' }); return 1`);
      await R.sleep(2800);
    }],
    ['In Settings, on the Today page’s own page, set the heatmap to cover 12 weeks: the preview grows at once', async (R, c) => {
      await R.go('#/settings/feature/today');
      await R.until(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '12 weeks')`, 8000);
      await R.ev(`const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '12 weeks'); b.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(900);
      await R.click({ sel: 'button', text: '12 weeks' });
      await R.sleep(1200);
      await R.ev(`const m = document.querySelector('.hmwrap'); if (m) m.scrollIntoView({ block: 'center', behavior: 'smooth' }); return 1`);
      await R.sleep(2600);
    }],
    ['Back on Today, the heatmap now covers the last twelve weeks', async (R, c) => {
      await R.click({ sel: '#tabs a, #tabs button', text: 'Today' });
      await R.until(`!!document.querySelector('.hm')`, 8000);
      await R.sleep(500);
      await R.wheel(520, [760, 420]);
      await R.sleep(300);
      await R.ev(`const m = [...document.querySelectorAll('.sec-h h2')].find(x => /^Last .* weeks$/.test(x.textContent)); m.style.scrollMarginTop = '125px'; m.scrollIntoView({ block: 'start', behavior: 'smooth' }); return 1`);
      await R.sleep(3000);
    }],
  ],
};
