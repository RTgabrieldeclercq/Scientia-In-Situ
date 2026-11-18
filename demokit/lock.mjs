// Lock the wording after the day (13p EDIT.locks, 09-editor lockedPrompt) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs lock
export default {
  by: '',
  use: 'Once the day has turned, what you recorded stays on record; a change becomes a correction beside it.',
  view: [1280, 800],
  dpr: 1,
  // the test note: a run written yesterday, with one recorded result in it
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3', { daysAgo: 1 });
    const text = 'Gels at 30 kPa, fibronectin at 5 µg/mL. EGF at 10 ng/mL raised the edge peak within 40 min, as in run 2.';
    const phrase = 'EGF at 10 ng/mL raised the edge peak', b = KIT.fill(KIT.first(A), 'Run 3', text);
    KIT.ago(b, 1, '16:40');
    const it = M.createItem('claim', phrase, b, { created: isoLocal(KIT.at(1, '16:40')) }), i0 = text.indexOf(phrase);
    b.body = { text, marks: [{ id: uid('m'), type: 'struct', from: i0, to: i0 + phrase.length, ref: it.id }] }; DB.put('blocks', b);
    KIT.done(); return { A: A.id, b: b.id, it: it.id };
  },
  before: async (R, c) => { await R.go('#/settings/feature/lock'); await R.until(`!!document.querySelector('.fp .fsw')`, 8000); await R.move([640, 420], 0); },
  steps: [
    ['Settings → Features → Lock the wording after the day: switch it on', async (R, c) => {
      await R.sleep(1000);
      await R.click('.fp .fsw');
      await R.until(`document.querySelector('.fp .fsw').getAttribute('aria-checked') === 'true'`, 3000);
      await R.sleep(1800);
    }],
    ['In a run written yesterday, click its wording: it asks to revise, or to add a correction', async (R, c) => {
      await R.open(c.A);
      await R.click({ sel: `.box[data-id="${c.b}"] .ed`, dx: .9, dy: .8 });
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(2200);
    }],
    ['Add a correction, “it was 12 ng/mL, not 10”: the wording stays recorded, and the structure’s card carries it', async (R, c) => {
      await R.click({ sel: '.pop .op', text: 'Add a correction' });
      await R.until(`!!document.querySelector('.modal textarea, .modal input')`, 3000);
      await R.sleep(700);
      await R.key('a', { ctrl: true });
      await R.type('it was 12 ng/mL, not 10', 60);
      await R.sleep(500);
      await R.click({ sel: '.modal button, .modal .btn', text: 'OK' });
      await R.sleep(900);
      const on = k => ({ xy: `(() => { const r = document.querySelector('.box[data-id="${c.b}"] .ed .st').getClientRects()[0]; return { x: r.left + r.width * ${k}, y: r.top + r.height / 2 }; })()` });
      await R.move(on(.3)); await R.move(on(.6), 300);
      if (!await R.until(`(() => { const h = document.querySelector('.hovercard'); return h && /it was 12 ng.mL, not 10/.test(h.textContent); })()`, 3000)) throw new Error('the card does not carry the correction');
      await R.sleep(2800);
    }],
  ],
};
