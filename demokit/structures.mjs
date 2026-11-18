// Structures (09-editor: the Ctrl+Enter strip; 13zzi-kinds: the kinds of component) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs structures
const J = JSON.stringify;
/** Where a phrase of a component's text starts / ends on the screen (from its characters' own boxes), for a drag that selects exactly it. */
const at = (id, phrase, edge) => ({ xy: `(() => { const ed = document.querySelector('.box[data-id="${id}"] .ed'); const tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let acc = '', nodes = [];
  for (let n; (n = tw.nextNode());) { nodes.push([n, acc.length]); acc += n.textContent; }
  const i = acc.indexOf(${J(phrase)}); if (i < 0) return null; const k = ${J(edge)} === 'end' ? i + ${phrase.length} - 1 : i;
  const [n, o] = nodes.filter(x => x[1] <= k).pop(); const r = document.createRange(); r.setStart(n, k - o); r.setEnd(n, k - o + 1); const q = r.getBoundingClientRect();
  return { x: ${J(edge)} === 'end' ? q.right - 1 : q.left + 1, y: q.top + q.height / 2 }; })()` });
/** Select a phrase with the pointer, open the strip with Ctrl+Enter, press the kind's letter. */
const mark = async (R, id, phrase, letter, away, look) => {
  if (away) await R.click([1100, 250], { ms: 350, after: 200 });   // out of the last component first: its editing bar and hover card are not over this one
  const p0 = await R.point(at(id, phrase, 'start')), p1 = await R.point(at(id, phrase, 'end'));
  await R.drag(at(id, phrase, 'start'), at(id, phrase, 'end'), { ms: 600, via: [], hold: 80, after: 300 });
  await R.sleep(300);
  const got = await R.ev(`return getSelection().toString()`); if (got !== phrase) console.log('   sel', await R.ev(`const s = getSelection(); const d = n => n ? (n.nodeType === 3 ? '#text' : n.tagName + '.' + n.className) : '-'; return d(s.anchorNode) + ':' + s.anchorOffset + ' -> ' + d(s.focusNode) + ':' + s.focusOffset + ' active=' + d(document.activeElement)`));
  if (got !== phrase) throw new Error('selected “' + got + '”, not “' + phrase + '”');
  await R.key('Enter', { ctrl: true });
  await R.until(`!!document.querySelector('.strip')`, 3000);
  await R.sleep(look || 800);
  await R.key(letter);
};
export default {
  by: '',
  pause: 600,
  use: 'Give selected words a meaning (claim, evidence, barrier, question…) so the notebook can find, count and follow them.',
  view: [1280, 800],
  dpr: 1,
  // the test note: a run with three components of plain text
  setup: async () => {
    const P = KIT.project(), A = KIT.note(P, 'Run 3');
    const [a, b, c] = KIT.grid(A, [
      ['Run 3', 'The sheets on the 30 kPa gels collapsed at 10 ng/mL of EGF within 40 min, and held at 1 ng/mL.'],
      ['Fields', 'The fibronectin coat held in 3 of 3 fields imaged on the 15 kPa gel.'],
      ['Gel notes', 'Soft gels give cleaner traction maps, but gels tear above 40 kPa when the beads are imaged again. A thicker backing layer stopped the tearing.']], { cols: 1, dy: 150 });
    KIT.done(); return { A: A.id, a: a.id, b: b.id, c: c.id };
  },
  before: async (R, c) => { await R.open(c.A); await R.ev(`const b = document.querySelector('.box[data-id="${c.a}"]'); b.scrollIntoView({ block: 'center', inline: 'center' }); return 1`); await R.move([980, 300], 0); },
  steps: [
    ['Select “collapsed at 10 ng/mL”, press Ctrl+Enter, then C: it is a claim, in the claim’s colour', async (R, c) => {
      await mark(R, c.a, 'collapsed at 10 ng/mL', 'c', false, 1800);
      await R.sleep(1200);
    }],
    ['Mark “3 of 3 fields” as evidence (E): it asks what the evidence comes from', async (R, c) => {
      await mark(R, c.b, '3 of 3 fields', 'e', true);
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(1500);
      await R.click({ sel: '.pop button', text: 'This note' });
      await R.sleep(1000);
    }],
    ['“gels tear above 40 kPa” is a barrier (B); later “a thicker backing layer” is its resolution (R)', async (R, c) => {
      await mark(R, c.c, 'gels tear above 40 kPa', 'b', true);
      await R.sleep(1000);
      await mark(R, c.c, 'A thicker backing layer', 'r');
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(700);
      await R.click({ sel: '.pop .op, .pop .opt, .pop li, .pop div', text: 'gels tear above 40 kPa' });
      await R.sleep(1500);
    }],
    ['Double-click a component’s “Block” label: its kind, as a Hypothesis (Problem and the others are here too)', async (R, c) => {
      await R.dblclick({ sel: `.box[data-id="${c.a}"] .bh .num` });
      await R.until(`!!document.querySelector('.pop')`, 3000);
      await R.sleep(1200);
      await R.wheel(500, { sel: '.pop' });   // the rest of the list: Result … Problem
      await R.sleep(1600);
      await R.wheel(-500);
      await R.sleep(300);
      await R.click({ sel: '.pop .op', text: 'Hypothesis' });
      await R.sleep(1500);
    }],
  ],
};
