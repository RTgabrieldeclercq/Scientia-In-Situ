// Look and motion (20d / 36-look, V4.42–V4.44) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs look
// The proposal Gabe approved (19 Nov 2026): open the PDF beside the note (the capsule: yellow 2, blue 1, pink 1) · click yellow (the panel
// glides open at it; › folds it) · full screen, the left capsule (the mini library, spines) · List, then Spines · a menu, a dialog, a toast (the note's ⋯ has no Flag: Save structure as template… shows the three).
export default {
  by: '',
  use: 'The notebook in the edge-rail look: panels glide, folded panels become small capsules, and papers sit on a shelf.',
  view: [1280, 800], dpr: 1,
  pause: 700,
  // the test note: "Traction readings" in "Cell mechanics" with a paper (four highlights in three colours, made in `before`), and a shelf
  // "Traction methods" of four papers, assigned to the project
  setup: async () => {
    const P = KIT.project('Cell mechanics'), A = KIT.note(P, 'Traction readings');
    const a0 = KIT.fill(KIT.first(A), 'Question', 'Does the edge peak in traction hold when the ligand is sparse?', 'question');
    const ok = await MEDIA.add(await KIT.asset('paper-okafor-2021.pdf')), hd = await MEDIA.add(await KIT.asset('paper-haldane-2019.pdf')), vg = await MEDIA.add(await KIT.asset('paper-varga-2017.pdf'));
    const paper = (title, authors, year, pdf) => { const l = LIB.add({ title, authors, year, container: 'Journal of Demonstration Mechanobiology' }); l.pdf = pdf; DB.put('library', l); return l; };
    const lib = paper('Edge traction on compliant gels rises with fibronectin density', [{ family: 'Okafor', given: 'Ngozi' }, { family: 'Lindqvist', given: 'Elin' }], 2021, ok.id);
    const L2 = paper('Bead drift in long traction time-lapses and how to correct it', [{ family: 'Haldane', given: 'Priya' }, { family: 'Osei', given: 'Kwame' }], 2019, hd.id);
    const L3 = paper('Monolayer tension across stiffness gradients', [{ family: 'Varga', given: 'Lena' }], 2017, vg.id);
    const L4 = paper('Regularised traction recovery for sparse beads', [{ family: 'Moreau', given: 'Anaïs' }, { family: 'Chen', given: 'Wei' }], 2020, hd.id);
    const now = isoLocal(new Date()), sh = { id: uid('ls'), kind: 'theme', name: 'Traction methods', projectIds: [P.id], order: 0, created: now, modified: now }; DB.put('libsets', sh);
    DB.put('libsets', { id: uid('ls'), kind: 'group', name: 'Measuring traction', themeId: sh.id, paperIds: [lib.id, L2.id, L3.id, L4.id], order: 0, created: now, modified: now });
    const pdf = M.addBlock(A.id, null, { kind: 'pdf', label: lib.title, media: ok.id, libId: lib.id, x: a0.x, y: a0.y + 140, w: 616, h: 448, view: 'scroll', cur: 0 });
    pdf.body = { text: pdf.label, marks: [] }; DB.put('blocks', pdf);
    try { FEAT.set('look', true); FEAT.setTune('look', 'motion', 'full'); _ls.set('lookLib', 'book'); _ls.set('sideFoldB', true); } catch (e) { }
    KIT.done();
    return { A: A.id, a0: a0.id, pdf: pdf.id, lib: lib.id };
  },
  before: async (R, c) => {
    await R.open(c.A);
    await R.ev(`const b = M.block(${JSON.stringify(c.pdf)}); DocView.paper.centerOn(b.x + 308, b.y + 200, .9); return 1`);
    await R.until(`(() => { const cv = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot canvas'); return cv && cv.width > 0 && !!document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot[data-p="1"] .textLayer span'); })()`, 15000);
    await R.sleep(800);
    // four highlights in three colours, made as a selection would (the app's own selection → quote)
    await R.ev(`
      const slot = document.querySelector('.box[data-id="${c.pdf}"] .pdf-slot[data-p="1"]');
      for (const [phrase, color] of [['Cells pull hardest at the leading edge, where adhesions mature.', 'yellow'], ['Earlier work varied stiffness alone.', 'yellow'], ['Gels were cast from acrylamide and bis-acrylamide', 'blue'], ['How much they pull depends on what they hold on to', 'pink']]) {
        const head = phrase.slice(0, 18), sp = [...slot.querySelectorAll('.textLayer span')].find(s => s.textContent.includes(phrase)) || [...slot.querySelectorAll('.textLayer span')].find(s => s.textContent.includes(head)); if (!sp) throw new Error('no line: ' + phrase);
        const n = sp.firstChild, t = n.textContent, a = t.includes(phrase) ? t.indexOf(phrase) : t.indexOf(head), r = document.createRange(); r.setStart(n, a); r.setEnd(n, Math.min(t.length, a + phrase.length));   // a phrase that wraps: to the end of its line
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); const sel = QUOTE.pdfSel(); if (!sel) throw new Error('no selection'); QUOTE.make(Object.assign({}, sel, { color })); s.removeAllRanges(); }
      IX.rebuild(); changed(); QUOTE.paintMarks(${JSON.stringify(c.pdf)}); return 1`);
    await R.until(`!!document.querySelector('.toast')`, 3000); await R.until(`!document.querySelector('.toast')`, 8000);
    await R.sleep(600);
  },
  steps: [
    ['Read the paper beside the note: its highlights fold into a capsule of their colours — yellow 2, blue 1, pink 1', async (R, c) => {
      await R.click({ js: `document.querySelector('.box[data-id="${c.pdf}"] .rd-open')` });
      await R.until(`!!document.querySelector('.rd-wrap .lk-rail .lk-dot') && document.querySelectorAll('.rd-wrap .lk-rail .lk-dot').length === 3`, 15000);
      await R.move('.rd-wrap .lk-rail'); await R.sleep(2200);
    }],
    ['Click yellow: the panel glides open at the first yellow highlight; › folds it again', async (R, c) => {
      await R.click({ js: `[...document.querySelectorAll('.rd-wrap .lk-rail .lk-rb')].find(b => /Yellow/.test(b.getAttribute('aria-label') || ''))` });
      await R.until(`!document.querySelector('.rd-wrap .sf-host.lk-fold')`, 4000);
      await R.sleep(2000);
      await R.click('.rd-wrap .sf-top .sf-b');
      await R.until(`!!document.querySelector('.rd-wrap .sf-host.lk-fold')`, 4000);
      await R.sleep(1500);
    }],
    ['Full screen, then the capsule at the left: the mini library slides in, its papers as spines on the project’s shelf', async (R, c) => {
      await R.click('.rd-wrap .rd-bar button[title^="Full screen"]');
      await R.until(`!!document.querySelector('.embed-max.rd-dock:not(.rd-docked) .rs-grip.lk-grip')`, 6000);
      await R.sleep(1200);
      await R.click('.embed-max .rs-grip.lk-grip');
      await R.until(`!!document.querySelector('.rs-lib.open.lk-book .rs-paper')`, 6000);
      await R.sleep(2200);
    }],
    ['List, then back to spines — the mini library remembers which on this computer', async (R, c) => {
      await R.click('.rs-lib.open .lk-tog button[data-v="list"]');
      await R.until(`!!document.querySelector('.rs-lib.open.lk-list')`, 3000);
      await R.sleep(1500);
      await R.click('.rs-lib.open .lk-tog button[data-v="book"]');
      await R.until(`!!document.querySelector('.rs-lib.open.lk-book')`, 3000);
      await R.sleep(1400);
      await R.key('Escape'); await R.sleep(500); await R.key('Escape'); await R.sleep(900);
    }],
    ['Save the note’s structure as a template from its ⋯ menu: the menu pops from where you click, the dialog rises, and a toast springs up', async (R, c) => {
      await R.click('#ttlmore');
      await R.until(`!!document.querySelector('.pop.menu')`, 3000); await R.sleep(900);
      await R.ev(`const o = [...document.querySelectorAll('.pop.menu .op')].find(x => /Save structure as template/.test(x.textContent)); o.scrollIntoView({ block: 'nearest' }); return 1`); await R.sleep(400);
      await R.click({ js: `[...document.querySelectorAll('.pop.menu .op')].find(x => /Save structure as template/.test(x.textContent))` });
      await R.until(`!!document.querySelector('.modal input')`, 4000); await R.sleep(900);
      await R.key('Enter');
      await R.until(`!!document.querySelector('.toast')`, 4000);
      await R.sleep(1200);
    }],
  ],
};
