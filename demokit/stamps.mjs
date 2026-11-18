// Times on components (stamps) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs stamps
// A date-and-time field takes its parts in the order of the browser's language: the keys to type a moment into one.
const dtKeys = async (R, when, { date = true, time = true } = {}) => {
  const o = await R.ev(`const f = new Intl.DateTimeFormat(navigator.language, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); return { order: f.formatToParts(new Date()).map(p => p.type).filter(t => ['year', 'month', 'day'].includes(t)), h12: !!f.resolvedOptions().hour12 }`);
  const p2 = n => String(n).padStart(2, '0');
  if (date) for (const t of o.order) {
    if (t === 'year') { await R.type(String(when.getFullYear()), 40); await R.key('ArrowRight', { after: 120 }); }   // a year does not move on by itself
    else await R.type(p2(t === 'month' ? when.getMonth() + 1 : when.getDate()), 40);
  }
  if (time) {
    const H = when.getHours();
    await R.type(p2(o.h12 ? (H % 12 || 12) : H), 60); await R.type(p2(when.getMinutes()), 60);
    if (o.h12) await R.type(H < 12 ? 'A' : 'P', 60);
  }
};
// a point on the empty paper under a component (no other component there)
const under = (id, dy) => ({ xy: `(() => { const r = document.querySelector('.box[data-id="${id}"]').getBoundingClientRect(); return { x: r.left + 60, y: r.bottom + ${dy} }; })()` });
const lastBox = `(() => { const d = M.doc(DocView.docId); const bs = d.blockIds.map(id => M.block(id)).filter(b => b && b.kind === 'component' && b.status === 'live'); return bs[bs.length - 1].id; })()`;

export default {
  by: '',
  use: 'Every component says when it happened, so a note is also a record of the day.',
  view: [1040, 650], crf: 30, pause: 500,
  // the test note: a run note with its timer running since twelve minutes
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const a = KIT.fill(KIT.first(A), 'Gels', 'Gel batch 14, 30 kPa, coated with fibronectin at 5 µg/mL.');
    const s = TCMP.start(A.id); HEAD.apply(M.session(s.id), 12 * 60 + 4);
    const t = new Date(Date.now() - 9 * 60000); a.created = a.made = a.modified = isoLocal(t); a.stamp = M.stampFor(A.id, t); DB.put('blocks', a);
    KIT.done(); return { A: A.id, a: a.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.wheel(340, [700, 300]); await R.sleep(400); },   // the paper up a little, so the new components land clear of the dock
  steps: [
    ['A run note with its timer running. Write two components: each takes its date and time, and its place in the timer', async (R, c) => {
      // each new component gets a title (its placeholder is "label"); the editing bar under the one being written is cleared before the next
      const write = async (after, title, text) => {
        await R.dblclick(after);
        await R.until(`document.activeElement && !!document.activeElement.closest('.box') && ${lastBox} === document.activeElement.closest('.box').dataset.id`, 3000);
        const id = await R.ev(`return ${lastBox}`);
        await R.dblclick(`.box[data-id="${id}"] .blab`);
        await R.until(`document.activeElement && document.activeElement.classList.contains('blab')`, 2000);
        await R.type(title, 45);
        await R.click({ sel: `.box[data-id="${id}"] .ed`, dx: .5, dy: .5 });
        await R.type(text, 18);
        await R.sleep(200);
        return id;
      };
      c.b1 = await write(under(c.a, 70), 'Seeding', 'Seeded MDCK on the gels.');
      c.b2 = await write(under(c.b1, 110), 'Beads', 'Beads drift under 0.2 µm.');   // 110: clear of the editing bar under the first
      await R.click({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.b2}"]').getBoundingClientRect(); return { x: r.right + 200, y: r.top + 20 }; })()` });   // empty paper: the bar goes
      await R.sleep(900);
    }],
    ['Double-click a stamp and move it to yesterday 16:40', async (R, c) => {
      await R.dblclick(`.box[data-id="${c.b1}"] .stampbtn`);
      await R.until(`!!document.querySelector('.pop input[type="datetime-local"]')`, 3000);
      await R.click({ sel: '.pop input[type="datetime-local"]', dx: 14, dy: .5 });
      const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(16, 40, 0, 0);
      await dtKeys(R, y);
      await R.sleep(300);
      await R.click({ sel: '.pop .btn.pri', text: 'Save' });
      await R.sleep(1000);
    }],
    ['Settings → Features → Times on components: switch it off', async (R, c) => {
      await R.click('#tabs .tab[data-k="settings"]');
      await R.until(`!!document.querySelector('.ft[data-f="stamps"]')`, 5000);
      await R.sleep(500);
      await R.go('#/settings/feature/stamps');   // its own page: the board's neighbouring tiles (Help lines…) are not what this step is about
      await R.until(`!!document.querySelector('.fp[data-f="stamps"] .fp-sw .fsw')`, 5000);
      await R.sleep(500);
      await R.click('.fp[data-f="stamps"] .fp-sw .fsw');
      await R.sleep(1200);
    }],
    ['Back in the note the times are gone, until you point at a component', async (R, c) => {
      await R.open(c.A);
      await R.move([900, 420], 0);
      await R.sleep(600);
      await R.move({ sel: `.box[data-id="${c.b1}"] .ed`, dx: .5, dy: .5 });
      await R.sleep(800);
      await R.move({ sel: `.box[data-id="${c.b2}"] .ed`, dx: .5, dy: .5 });
      await R.sleep(1100);
    }],
  ],
};
