// Lit reviews (15c, V3.889; V4.27: no tab — + Lit review in the project's Lit reviews in the Portfolio) — the demonstration on its page in Settings. Record: node scientia/demokit/record.mjs litrev
const K = (R, t, o) => R.click(t, Object.assign({ ms: 450, rest: 100, after: 220 }, o));
// where a phrase starts and ends on a paper's page in a note (its text layer), for a mouse selection
const phrase = (id, from, to) => `(() => { const sp = [...document.querySelectorAll('.box[data-id="${id}"] .pdf-slot[data-p="1"] .textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3);
  const at = (w, end) => { for (const s of sp) { const i = s.firstChild.nodeValue.indexOf(w); if (i < 0) continue; const r = document.createRange(); r.setStart(s.firstChild, end ? i + w.length - 1 : i); r.setEnd(s.firstChild, end ? i + w.length : i + 1); const q = r.getBoundingClientRect(); return { x: end ? q.right - 0.5 : q.left + 1, y: q.top + q.height / 2 }; } return null; };
  return { a: at(${JSON.stringify(from)}, false), z: at(${JSON.stringify(to)}, true) }; })()`;
export default {
  by: '',
  use: 'A canvas for one question in the literature, linked to every project it serves.',
  view: [1280, 800], dpr: 1, crf: 32, pause: 400,
  // two papers in the Library; one project
  setup: async () => {
    const P = KIT.project(), au = (f, g) => ({ family: f, given: g });
    const mk = async (title, authors, year, container, file) => { const l = LIB.add({ kind: 'paper', cslType: 'article', title, authors, year, container, doi: '', url: '', isPreprint: false }); const rec = await MEDIA.add(await KIT.asset(file)); const r = M.lib(l.id); r.pdf = rec.id; DB.put('library', r); return l.id; };
    const ok = await mk('Edge traction on compliant gels rises with fibronectin density', [au('Okafor', 'Ngozi'), au('Lindqvist', 'Elin'), au('Marchetti', 'Rosa')], 2021, 'Journal of Demonstration Mechanobiology', 'paper-okafor-2021.pdf');
    const va = await mk('Stiffness sensing at the leading edge of epithelial sheets', [au('Varga', 'Dóra'), au('Tomlin', 'Samuel')], 2017, 'Demonstration Cell Reports', 'paper-varga-2017.pdf');
    KIT.note(P, 'Fibronectin series', { daysAgo: 4 });
    _ls.set('pf:view', { sel: P.id, type: 'all' });
    KIT.done(); return { P: P.id, ok, va };
  },
  before: async R => {
    await R.go('#/portfolio'); await R.until(`!!document.querySelector('.pf-lit .pf-lit-add')`, 5000);
    await R.move([640, 420], 0);
  },
  steps: [
    ['In the Portfolio, under the project’s Lit reviews, press + Lit review, then give it its topic: it is linked to the project already', async (R, c) => {
      await K(R, { sel: '.pf-lit .pf-lit-add', text: '+ Lit review' });
      await R.until(`!!document.querySelector('.lr-topic')`, 6000);
      await R.sleep(300);
      await K(R, '.lr-topic');
      await R.type('Does the edge peak hold at low ligand?', 28);
      await R.key('Tab');
      await R.until(`!!document.querySelector('.lr-chip')`, 3000);
      await R.sleep(900);
    }],
    ['Put two papers on the canvas with Insert → PDF, and quote a sentence from each', async (R, c) => {
      // where things go, in the note's own coordinates: paper A with its quote at its right, paper B beside that (a PDF is ~600 wide, its quote ~330 further right)
      const o = await R.ev(`const b = KIT.first(M.doc(DocView.docId)); return { x: b.x + 520, y: b.y - 120 }`), A = o, B = { x: o.x + 1060, y: o.y };
      const view = (x, y, z = .8) => R.ev(`DocView.paper.centerOn(${x}, ${y}, ${z}); return 1`).then(() => R.sleep(z === .8 ? 450 : 700));
      const paper = async (at, file) => {
        await R.rclick({ xy: `(() => DocView.paper.toScreen(${at.x + 20}, ${at.y + 20}))()` });
        await R.until(`!!document.querySelector('.pop .op')`, 3000);
        await K(R, { sel: '.pop .op', text: 'Insert' });
        await R.until(`!!document.querySelector('.pop .pk-q, .pop input')`, 3000);
        await R.type('pdf', 50);
        await R.files([file], () => R.key('Enter'));
      };
      const quote = async (at, from, to) => {
        const id = await R.ev(`return DB.where('blocks', b => b.docId === DocView.docId && b.kind === 'pdf').find(b => Math.abs(b.x - ${at.x}) < 80 && Math.abs(b.y - ${at.y}) < 80).id`);
        await R.until(`document.querySelectorAll('.box[data-id="${id}"] .pdf-slot[data-p="1"] .textLayer span').length > 10`, 12000);
        const q = await R.ev(`return ${phrase('__ID__', from, to)}`.replace('__ID__', id));
        if (!q || !q.a || !q.z) throw new Error('the sentence is not on the page');
        await R.drag([q.a.x, q.a.y], [q.z.x, q.z.y], { ms: 800, hold: 150, after: 250 });
        await R.until(`!!document.querySelector('.pop')`, 3000);
        await K(R, { sel: '.pop button', text: 'Quote' });
        await R.sleep(400);
      };
      await view(A.x + 500, A.y + 300);
      await paper(A, 'assets/paper-okafor-2021.pdf');
      await quote(A, 'Edge traction rose', 'every stiffness');
      await view(B.x + 500, B.y + 300);
      await paper(B, 'assets/paper-varga-2017.pdf');
      await quote(B, 'Sheets of epithelial', 'stiffer gels');
      // slide the paper back so both papers and both quotes are in the window
      await R.move([640, 120], 500);
      await view(A.x + 1020, A.y + 300, .52);
      const n = await R.ev(`return DB.where('blocks', b => b.docId === DocView.docId && b.kind !== 'pdf' && !!b.quote).length`);
      if (n !== 2) throw new Error('expected two quotes, found ' + n);
      await R.sleep(1100);
    }],
    ['Wire the two quotes from one dot to the other and say how they relate', async (R, c) => {
      const q = await R.ev(`return DB.where('blocks', b => b.docId === DocView.docId && b.kind !== 'pdf' && !!b.quote).sort((a, b) => a.x - b.x).map(b => ({ id: b.id, x: b.x, y: b.y }))`);
      if (q.length !== 2) throw new Error('expected two quotes, found ' + q.length);
      // slide the paper so both quotes lie well inside the window, in its upper part (the list of relations opens below the drop)
      await R.ev(`DocView.paper.centerOn(${(q[0].x + q[1].x + 330) / 2}, ${(q[0].y + q[1].y) / 2 + 190}, .75); return 1`);
      await R.sleep(750);
      const ok = await R.ev(`return ${JSON.stringify(q.map(b => b.id))}.map(id => { const r = document.querySelector('.box[data-id="' + id + '"]').getBoundingClientRect(); return r.left > 90 && r.right < 1190 && r.top > 100 && r.bottom < 480; })`);
      if (!ok.every(Boolean)) throw new Error('the quotes are not well inside the window: ' + ok);
      await R.move({ sel: `.box[data-id="${q[0].id}"] .port` });
      await R.sleep(300);
      await R.drag({ sel: `.box[data-id="${q[0].id}"] .port` }, { sel: `.box[data-id="${q[1].id}"] .ed`, dx: .5, dy: .5 }, { ms: 1000 });
      if (!await R.until(`!!document.querySelector('.pop .opt')`, 3000)) throw new Error('the relation list did not open');
      await R.sleep(400);
      // the list is longer than the window: scroll it with the wheel until “related” is in view
      await R.move({ sel: '.pop .opt', dx: .5 });
      for (let k = 0; k < 4; k++) {
        const vis = await R.ev(`const e = [...document.querySelectorAll('.pop .opt')].filter(e => e.textContent.includes('related')).sort((a, b) => a.textContent.length - b.textContent.length)[0], r = e.getBoundingClientRect(), p = document.querySelector('.pop').getBoundingClientRect(); return r.bottom <= p.bottom - 4`);
        if (vis) break;
        await R.wheel(200);
      }
      await K(R, { sel: '.pop .opt', text: 'related' });
      await R.sleep(500);
      const w = await R.ev(`return DB.where('wires', w => (w.from === ${JSON.stringify(q[0].id)} && w.to === ${JSON.stringify(q[1].id)}) || (w.from === ${JSON.stringify(q[1].id)} && w.to === ${JSON.stringify(q[0].id)})).map(w => w.rel)`);
      if (!w.length) throw new Error('no wire between the two quotes');
      await R.move([640, 150], 500);
      await R.sleep(1300);
    }],
    ['In the Portfolio the project’s Lit reviews list the review, with its papers and quotes', async (R, c) => {
      await K(R, { sel: 'a, button, [role=tab], .tab', text: 'Portfolio' });
      await R.until(`!!document.querySelector('.pf-sh, .pf-sec')`, 5000);
      await R.sleep(1800);
    }],
  ],
};
