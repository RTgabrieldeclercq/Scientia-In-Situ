// Resurfaced claims (13l RESURF, 14-home) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs resurface
// today's day note, as Recent notes names it (the take is recorded on whatever day it is)
const DAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export default {
  by: '',
  use: 'An old claim comes back so you can say whether it still holds.',
  view: [1280, 800],
  dpr: 1,
  // the test notes: two claims written weeks ago in quiet notes (nothing newer touches them); the first is the one that comes back today
  setup: async () => {
    const P = KIT.project(), T = KIT.theme(P, 'Traction against stiffness', 'How does traction scale with the gel’s stiffness?');
    const mk = (title, days, label, text, phrase) => {
      const d = KIT.note(P, title, { themeId: T.id, daysAgo: days }), b = KIT.fill(KIT.first(d), label, text); KIT.ago(b, days, '15:20');
      const i0 = text.indexOf(phrase), it = M.createItem('claim', phrase, b, { created: isoLocal(KIT.at(days, '15:20')) });
      b.body = { text, marks: [{ id: uid('m'), type: 'struct', from: i0, to: i0 + phrase.length, ref: it.id }] }; DB.put('blocks', b); return it;
    };
    const c1 = mk('Stiffness series', 21, 'Result', 'Across the 8, 15 and 30 kPa gels, traction scales with stiffness in every run so far.', 'traction scales with stiffness');
    mk('Fibronectin series', 30, 'Claim', 'At 1, 5 and 10 µg/mL the edge peak holds, so the coating does not move the force.', 'the edge peak holds');
    saveSettings({ resurface: { date: localDate(new Date()), id: c1.id }, resurfaced: { [c1.id]: localDate(new Date()) } });
    KIT.done(); return { c1: c1.id };
  },
  before: async (R, c) => { await R.go('#/home'); await R.until(`!!document.querySelector('.resurf')`, 8000); await R.move([380, 420], 0); },
  steps: [
    ['Today brings an old claim back, from a note not touched for three weeks', async (R, c) => {
      await R.ev(`const e = document.querySelector('.resurf'); e.scrollIntoView({ block: 'start' }); let p = e.parentElement; while (p && p.scrollHeight <= p.clientHeight + 2) p = p.parentElement; (p || document.scrollingElement).scrollTop -= 190; return 1`);
      await R.sleep(1800);
      await R.move({ sel: '.resurf .serif' });
      await R.sleep(1200);
    }],
    ['Choose Still holds: it is noted, and another old claim comes up', async (R, c) => {
      await R.click({ sel: '.resurf .btn', text: 'Still holds' });
      await R.until(`/edge peak/.test((document.querySelector('.resurf .serif') || {}).textContent || '')`, 3000);
      await R.sleep(2200);
    }],
    ['Choose Contest, then click the claim: its note opens at it, and its card says contested', async (R, c) => {
      await R.click({ sel: '.resurf .btn', text: 'Contest' });
      await R.sleep(900);
      await R.click({ sel: '.resurf .serif' });
      await R.until(`!!document.querySelector('.box .st')`, 6000);
      await R.sleep(900);
      await R.click({ sel: '.box .st' });
      if (!await R.until(`/contested/.test(((document.querySelector('.pop, .hovercard') || {}).textContent) || '')`, 3000)) throw new Error('the card does not say contested');
      await R.sleep(2200);
    }],
    ['Back on Today, the day note carries the day’s card too: open it from Recent notes', async (R, c) => {
      await R.key('Escape');
      await R.click({ sel: '.tabs a, nav a, .tab, a, button', text: 'Today' });
      await R.until(`!!document.querySelector('.resurf')`, 6000);
      await R.ev(`const r = [...document.querySelectorAll('.row, li, a, div')].filter(e => e.getClientRects().length && e.textContent.includes(${JSON.stringify(DAY)})).sort((a, b) => a.textContent.length - b.textContent.length)[0]; if (r) r.scrollIntoView({ block: 'center' }); return 1`);
      await R.sleep(600);
      await R.click({ sel: '.row, li, a, div', text: DAY });
      await R.until(`!!document.querySelector('.resurf')`, 6000);
      await R.move({ sel: '.resurf .serif' });
      await R.sleep(2000);
    }],
  ],
};
