/* ==========================================================================
   13zw · Quoting from an embedded PDF or HTML page.
   Select text in a PDF widget or an HTML page widget (mouse or pen) and a
   small menu offers: Quote here · Connect to… · Make it…  Ctrl+Enter on a
   selection quotes it and asks what it is (claim, evidence, question… —
   the same keys as in a note).
   A quote is a component beside the embed, in quote style, with its source
   (file, page) — wired to the embed ("quotes"), the passage highlighted in
   the embed; clicking "from …" on the quote scrolls the embed to it.
   Connect to…: the quote is made, then click the component it belongs to
   (here or in another pane) or pick it from a list, then the relation.
   The HTML page stays sandboxed: a small script added to its copy reports
   the selection and draws the highlights; it can't reach the app's data.
   ========================================================================== */
const QUOTE = {
  REL: 'c:quotes',
  /** The highlight colour of a quote: its own, its structure's, or yellow. */
  col(q) { const it = IX.itemsOf(q.id)[0]; if (it && KIND[it.kind]) { const k = (settings().kinds || {})[it.kind]; return (k && k.color) || KIND[it.kind].color; } if (q.quote && q.quote.color && READER.COLORS[q.quote.color]) return READER.COLORS[q.quote.color]; return READER.COLORS.yellow; },
  of: srcId => DB.where('blocks', b => b.quote && b.quote.src === srcId && b.status === 'live'),
  /** sel = {src (embed block id), exact, prefix, suffix, page?, rects?}; returns the new quote block */
  make(sel, kind) {
    const src = M.block(sel.src); if (!src) return null; const d = M.doc(src.docId), n = QUOTE.of(src.id).length, rec = MEDIA.get(src.media);
    const b = M.addBlock(d.id, null, { label: 'Quote' + (sel.page ? ' · p. ' + sel.page : ''), x: Math.round(((src.x || 0) + (src.w || 616) + 56) / 14) * 14, y: Math.round(((src.y || 0) + n * 126) / 14) * 14, w: 336,
      quote: { src: src.id, kind: src.kind, page: sel.page || null, exact: sel.exact, prefix: sel.prefix || '', suffix: sel.suffix || '', rects: sel.rects || null, file: rec ? rec.name : '', color: sel.color || null } });
    const body = { text: sel.exact, marks: [] };
    if (kind) { const it = M.createItem(kind, sel.exact, Object.assign({}, b, { docId: d.id }), { sourceRef: { type: 'embed', id: src.id, page: sel.page || null, selector: { type: 'TextQuoteSelector', exact: sel.exact, prefix: sel.prefix, suffix: sel.suffix } } }); body.marks.push({ id: uid('m'), type: 'struct', from: 0, to: sel.exact.length, ref: it.id }); }
    M.saveBlockBody(b, body); M.wire(b.id, src.id, QUOTE.REL, true); IX.rebuild(); changed();
    setTimeout(() => { QUOTE.paintMarks(src.id); typeof TERMSCAN !== 'undefined' && TERMSCAN.block(M.block(b.id)) && (IX.rebuild(), changed()); }, 120);
    return b;
  },
  menu(sel, x, y) {
    QUOTE.sel = sel;
    popover(x, y, [h('h5', (sel.page ? 'p. ' + sel.page + ' · ' : '') + '“' + snippet(sel.exact, 50) + '”'),
      h('div.row', { style: { gap: '6px', padding: '0 6px 6px', flexWrap: 'wrap' } },
        h('button.btn.xs.pri', { on: { click: () => { closePop(); const b = QUOTE.make(sel); b && toast('Quoted in this note'); QUOTE.clearSel(sel); } } }, '❝ Quote here'),
        h('button.btn.xs', { on: { click: () => { closePop(); const b = QUOTE.make(sel); QUOTE.clearSel(sel); b && QUOTE.connect(b); } } }, 'Connect to…'),
        h('button.btn.xs', { on: { click: () => { closePop(); QUOTE.strip(sel, x, y); } } }, 'Make it…'))]);
  },
  /** Ctrl+Enter: what is it? */
  strip(sel, x, y) {
    QUOTE.sel = sel; let done = false;
    const choose = k => { if (done) return; done = true; closePop(); document.removeEventListener('keydown', key, true); const b = QUOTE.make(sel, k); QUOTE.clearSel(sel); b && toast((k ? KIND[k].label : 'Quote') + ' quoted in this note'); };
    const key = e => { if (!$('.pop')) return document.removeEventListener('keydown', key, true); const k = KINDS.find(z => z.key === (e.key || '').toLowerCase()); if (k && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); choose(k.id); } else if (e.key === 'Enter') { e.preventDefault(); choose(null); } else if (e.key === 'Escape') { closePop(); document.removeEventListener('keydown', key, true); } };
    popover(x, y, [h('h5', 'What is “' + snippet(sel.exact, 38) + '”?'), h('div.rd-kinds', KINDS.map(k => h('button.kpick', { style: { '--kc': `var(--k-${k.id})` }, on: { click: () => choose(k.id) } }, k.label, h('kbd', k.key)))),
      h('div.tiny.muted', { style: { margin: '6px' } }, 'A letter picks it · Enter: just quote it')]);
    setTimeout(() => document.addEventListener('keydown', key, true), 0);
  },
  /** After quoting: click the component to connect to (any pane), or pick one. */
  connect(q) {
    QUOTE.stopPick && QUOTE.stopPick();
    const bar = h('div.q-pick', h('span', 'Click the component to connect the quote to'), h('button.btn.xs', { on: { click: () => { stop(); QUOTE.list(q); } } }, 'Choose from a list…'), h('button.btn.xs.ghost', { on: { click: () => stop() } }, 'Cancel'));
    document.body.append(bar); document.body.classList.add('q-picking');
    const click = e => { const box = e.target.closest && e.target.closest('.box.cmp'); if (!box || e.target.closest('.q-pick')) return; e.preventDefault(); e.stopPropagation(); const id = box.dataset.id; if (!id || id === q.id || id[0] === '_') return; stop(); const pane = DV(box), x = e.clientX, y = e.clientY;
      const eat = ev => { ev.preventDefault(); ev.stopPropagation(); }; ['mousedown', 'mouseup', 'click', 'pointerup'].forEach(t => document.addEventListener(t, eat, { capture: true, once: true }));
      setTimeout(() => { ['mousedown', 'mouseup', 'click', 'pointerup'].forEach(t => document.removeEventListener(t, eat, true)); pane.relationPopover(q.id, id, x, y + 12); }, 120); };
    const key = e => { if (e.key === 'Escape') stop(); };
    const stop = QUOTE.stopPick = () => { bar.remove(); document.body.classList.remove('q-picking'); document.removeEventListener('pointerdown', click, true); document.removeEventListener('keydown', key, true); QUOTE.stopPick = null; };
    setTimeout(() => { document.addEventListener('pointerdown', click, true); document.addEventListener('keydown', key, true); }, 0);
  },
  list(q) {
    const m = modal({ title: 'Connect the quote to…', wide: true, actions: [{ label: 'Cancel' }], body: optionPicker({ placeholder: 'Search components in every note…',
      items: s => DB.where('blocks', b => b.id !== q.id && b.status === 'live' && (b.kind === 'component' || b.kind === 'ink' || b.kind === 'ref' || WIDGETS[b.kind]) && (!s || ((b.label || '') + ' ' + (b.body ? b.body.text : '') + ' ' + ((M.doc(b.docId) || {}).title || '')).toLowerCase().includes(s))).sort((a, b) => (a.docId === q.docId ? -1 : 1) - (b.docId === q.docId ? -1 : 1) || (b.modified || '').localeCompare(a.modified || '')).slice(0, 80),
      render: b => h('div', h('b', M.blockName(b)), ' ', h('span.serif', snippet(b.body ? b.body.text : '', 80)), h('span.s', b.docId === q.docId ? 'this note' : M.docPath(M.doc(b.docId)))),
      onPick: b => { m.close(); DocView.relationPopover(q.id, b.id, innerWidth / 2 - 150, 160); } }) });
  },
  clearSel(sel) { try { getSelection().removeAllRanges(); } catch { } const fr = sel && sel.frame; if (fr && fr.contentWindow) fr.contentWindow.postMessage({ sis: 'clear' }, '*'); },

  /* ---------- the PDF widget: a text layer to select, and the quotes highlighted ---------- */
  paintMarks(srcId) {
    const src = M.block(srcId); if (!src) return; const Q = QUOTE.of(srcId);
    if (src.kind === 'pdf') $$(`.box[data-id="${srcId}"] .q-slot, .embed-max[data-src="${srcId}"] .q-slot`).forEach(sl => { const pg = +(sl.dataset.p || (M.block(srcId).cur || 0) + 1); let mk = $(':scope > .q-marks', sl); if (!mk) return; mk.replaceChildren(...Q.filter(q => q.quote.page === pg && q.quote.rects).flatMap(q => q.quote.rects.map(r => h('div.q-hl', { 'data-q': q.id, title: snippet(q.body.text, 120), style: { '--hc': QUOTE.col(q), left: r[0] * 100 + '%', top: r[1] * 100 + '%', width: r[2] * 100 + '%', height: r[3] * 100 + '%' } })))); });
    if (src.kind === 'html') $$(`.box[data-id="${srcId}"] iframe, .embed-max iframe`).forEach(fr => { if (fr._qsrc === srcId && fr.contentWindow) fr.contentWindow.postMessage({ sis: 'mark', list: Q.map(q => ({ id: q.id, exact: q.quote.exact, prefix: q.quote.prefix, c: QUOTE.col(q) })) }, '*'); });
  },
  async textLayer(m, n, canvas, width) {
    const slot = canvas.parentNode; if (!slot || !window.pdfjsLib) return; $$(':scope > .textLayer, :scope > .q-marks', slot).forEach(x => x.remove());
    const pdf = await PDFW.load(m), pg = await pdf.getPage(n), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: width / v0.width });
    const tl = h('div.textLayer.q-tl'), mk = h('div.q-marks'); tl.style.setProperty('--scale-factor', vp.scale); tl.style.width = vp.width + 'px'; tl.style.height = vp.height + 'px'; mk.style.width = vp.width + 'px'; mk.style.height = vp.height + 'px';
    const pos = { left: canvas.offsetLeft + 'px', top: canvas.offsetTop + 'px' }; Object.assign(tl.style, pos); Object.assign(mk.style, pos);
    slot.classList.add('q-slot'); slot.dataset.p = n; slot.append(mk, tl);
    const tc = await pg.getTextContent(); slot._text = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ');
    try { await pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] }).promise; } catch { }
    const box = slot.closest('.box') || slot.closest('[data-src]'); if (box) QUOTE.paintMarks(box.dataset.id || box.dataset.src);
  },
  /** The selection inside a PDF widget's text layer → {src, page, exact, prefix, suffix, rects} */
  pdfSel() {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return null; const r = s.getRangeAt(0), n0 = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    const slot = n0 && n0.closest('.q-slot'), box = slot && slot.closest('.box'), host = slot && (box || slot.closest('[data-src]')); if (!slot || !host) return null; const exact = s.toString().replace(/\s+/g, ' ').trim(); if (exact.length < 2) return null;
    const tl = $('.textLayer', slot), pr = tl.getBoundingClientRect(), rects = [...r.getClientRects()].filter(x => x.width > 1 && x.height > 1).map(x => [(x.left - pr.left) / pr.width, (x.top - pr.top) / pr.height, x.width / pr.width, x.height / pr.height]);
    const full = slot._text || '', at = full.indexOf(exact), last = r.getBoundingClientRect();
    return { src: box ? box.dataset.id : host.dataset.src, page: +slot.dataset.p, exact, prefix: at > 0 ? full.slice(Math.max(0, at - 32), at) : '', suffix: at >= 0 ? full.slice(at + exact.length, at + exact.length + 32) : '', rects, x: last.left, y: last.bottom + 8 };
  },
  /** Scroll the embed to a quote and flash it. */
  goto(q) {
    const src = M.block(q.quote.src); if (!src) return toast('The embedded file is gone'); App.jump(src.id, null);
    // zoomed far out a PDF card shows its title (13zk): zoom in to read the passage (the jump only zooms when the card is off screen)
    if (src.kind === 'pdf' && DocView.paper && DocView.docId === src.docId && DocView.paper.view.z < PDFW.MIN_Z) { const r = DocView.rectOf(src.id); if (r) DocView.paper.centerOn(r.x + r.w / 2, r.y + Math.min(r.h, 300) / 2, .8); }
    setTimeout(() => {
      if (src.kind === 'pdf') { const box = $(`.box[data-id="${src.id}"]`); if (!box) return; if (src.view === 'page' && (src.cur || 0) + 1 !== q.quote.page) { PDFW.go(M.block(src.id), q.quote.page - 1); setTimeout(() => QUOTE.goto(q), 700); return; }
        const sl = $(`.pdf-slot[data-p="${q.quote.page}"]`, box) || $('.pdf-one', box), st = $('.pdf-stage', box); if (sl && st && src.view !== 'page') st.scrollTop = sl.offsetTop + (q.quote.rects && q.quote.rects[0] ? q.quote.rects[0][1] * sl.offsetHeight : 0) - 40;
        setTimeout(() => $$(`.q-hl[data-q="${q.id}"]`, box).forEach(x => { x.classList.add('flash'); setTimeout(() => x.classList.remove('flash'), 2000); }), 400); }
      else $$(`.box[data-id="${src.id}"] iframe`).forEach(fr => fr.contentWindow && fr.contentWindow.postMessage({ sis: 'goto', id: q.id }, '*'));
    }, 350);
  },

  /* ---------- the HTML page: its copy carries a little reporter ---------- */
  SCRIPT: `<script>(function(){var P=window.parent;function norm(){var W=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),s='',map=[],n,sp=true;while((n=W.nextNode())){var pe=n.parentNode;if(pe&&pe.closest&&pe.closest('script,style,noscript'))continue;var v=n.nodeValue;for(var i=0;i<v.length;i++){var c=v[i];if(/\\s/.test(c)){if(sp)continue;sp=true;s+=' ';map.push([n,i]);}else{sp=false;s+=c;map.push([n,i]);}}}return{s:s,map:map};}
function report(ce){var S=getSelection();var t=String(S).replace(/\\s+/g,' ').trim();if(!S.rangeCount||t.length<2){P.postMessage({sis:'sel',text:''},'*');return;}var r=S.getRangeAt(0).getBoundingClientRect();var N=norm(),i=N.s.indexOf(t);P.postMessage({sis:'sel',text:t,prefix:i>0?N.s.slice(Math.max(0,i-32),i):'',suffix:i>=0?N.s.slice(i+t.length,i+t.length+32):'',x:r.left,y:r.bottom,ce:!!ce},'*');}
document.addEventListener('mouseup',function(){setTimeout(report,10);});document.addEventListener('keyup',function(e){if(e.shiftKey)setTimeout(report,10);});
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();report(true);return;}if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key.length===1||e.key==='Escape')&&String(getSelection()).trim()){P.postMessage({sis:'key',key:e.key},'*');e.preventDefault();}},true);
function unmark(){var ms=document.querySelectorAll('mark.sis-q');for(var k=0;k<ms.length;k++){var m=ms[k],p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);p.normalize();}}
function wrap(q){var N=norm(),i=-1;if(q.prefix){var j=N.s.indexOf(q.prefix+q.exact);if(j>=0)i=j+q.prefix.length;}if(i<0)i=N.s.indexOf(q.exact);if(i<0)return;var a=N.map[i],z=N.map[i+q.exact.length-1];if(!a||!z)return;var nodes=[],W=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),n,on=false;while((n=W.nextNode())){if(n===a[0])on=true;if(on)nodes.push(n);if(n===z[0])break;}
nodes.forEach(function(t){var s0=t===a[0]?a[1]:0,e0=t===z[0]?z[1]+1:t.nodeValue.length;if(e0<=s0)return;var r=document.createRange();r.setStart(t,s0);r.setEnd(t,e0);var m=document.createElement('mark');m.className='sis-q';m.dataset.q=q.id;if(q.c){m.style.background=q.c;m.style.opacity='.85';}try{r.surroundContents(m);}catch(x){}});}
window.addEventListener('message',function(e){var d=e.data||{};if(d.sis==='mark'){unmark();(d.list||[]).forEach(wrap);}if(d.sis==='clear'){getSelection().removeAllRanges();}if(d.sis==='goto'){var m=document.querySelector('mark.sis-q[data-q="'+d.id+'"]');if(m){m.scrollIntoView({block:'center',behavior:'smooth'});var ms=document.querySelectorAll('mark.sis-q[data-q="'+d.id+'"]');for(var k=0;k<ms.length;k++){ms[k].classList.add('sis-flash');}setTimeout(function(){for(var k=0;k<ms.length;k++)ms[k].classList.remove('sis-flash');},1800);}}});
function wordAt(x,y){var r=document.caretRangeFromPoint?document.caretRangeFromPoint(x,y):null;if(!r||r.startContainer.nodeType!==3)return null;var n=r.startContainer,v=n.nodeValue,a=r.startOffset,z=a;while(a>0&&!/\\s/.test(v[a-1]))a--;while(z<v.length&&!/\\s/.test(v[z]))z++;if(a===z)return null;return{n:n,a:a,z:z};}
var pen=null;function before(p,q){if(p.n===q.n)return p.a<=q.a;return !!(p.n.compareDocumentPosition(q.n)&Node.DOCUMENT_POSITION_FOLLOWING);}
function penSel(){if(!pen||!pen.s||!pen.e)return;var s=pen.s,e=pen.e;if(!before(s,e)){var t=s;s=e;e=t;}var r=document.createRange();r.setStart(s.n,s.a);r.setEnd(e.n,e.z);var S=getSelection();S.removeAllRanges();S.addRange(r);}
document.addEventListener('pointerover',function(e){if(e.pointerType==='pen')document.documentElement.style.touchAction='none';},true);
document.addEventListener('pointerleave',function(e){if(e.pointerType==='pen')document.documentElement.style.touchAction='';},true);
document.addEventListener('pointerdown',function(e){if(e.pointerType!=='pen')return;if(e.button===5||(e.buttons&32)===32){var m=document.elementFromPoint(e.clientX,e.clientY);m=m&&m.closest&&m.closest('mark.sis-q');if(m)P.postMessage({sis:'erase',id:m.dataset.q},'*');e.preventDefault();return;}e.preventDefault();pen={id:e.pointerId,s:wordAt(e.clientX,e.clientY),e:null};pen.e=pen.s;},true);
document.addEventListener('pointermove',function(e){if(!pen||e.pointerId!==pen.id)return;e.preventDefault();var w=wordAt(e.clientX,e.clientY);if(w){if(!pen.s)pen.s=w;pen.e=w;penSel();}},true);
document.addEventListener('pointerup',function(e){if(!pen||e.pointerId!==pen.id)return;var moved=pen.s&&pen.e&&(pen.s.n!==pen.e.n||pen.s.a!==pen.e.a);pen=null;if(moved){penSel0();}},true);
function penSel0(){var S=getSelection();var t=String(S).replace(/\\s+/g,' ').trim();if(t.length<2)return;var r=S.getRangeAt(0).getBoundingClientRect();var N=norm(),i=N.s.indexOf(t);P.postMessage({sis:'sel',text:t,prefix:i>0?N.s.slice(Math.max(0,i-32),i):'',suffix:i>=0?N.s.slice(i+t.length,i+t.length+32):'',x:r.right,y:r.bottom,pen:true},'*');}
var st=document.createElement('style');st.textContent='mark.sis-q{background:rgba(246,213,92,.55);color:inherit;border-radius:2px;cursor:pointer}mark.sis-flash{outline:2px solid #e08a00;background:rgba(255,160,0,.6)}';(document.head||document.documentElement).appendChild(st);
P.postMessage({sis:'ready'},'*');})();<\/script>`,
  async fill(fr, rec, srcId) {
    fr._qsrc = srcId;
    try { const txt = await (await fetch(MEDIA.url(rec))).text(), base = `<base href="${new URL(MEDIA.url(rec), location.href).href}">`;
      const html = /<head[^>]*>/i.test(txt) ? txt.replace(/<head[^>]*>/i, m => m + base) : base + txt;
      fr.removeAttribute('src'); fr.srcdoc = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, QUOTE.SCRIPT + '</body>') : html + QUOTE.SCRIPT; }
    catch { fr.src = MEDIA.url(rec); }
  },
};

{
  // HTML pages: a copy with the reporter, and its box id
  const fr0 = EMBED.frame; EMBED.frame = function (rec, cls) { const fr = fr0.call(EMBED, rec, cls); fr.removeAttribute('src'); setTimeout(() => { const box = fr.closest('.box'); QUOTE.fill(fr, rec, box ? box.dataset.id : (EMBED._maxId || null)); }, 0); return fr; };
  const mx = EMBED.max; EMBED.max = function (b) { EMBED._maxId = b.id; return mx.call(EMBED, b); };
  window.addEventListener('message', e => { const d = e.data; if (!d || !d.sis) return;
    const fr = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source); if (!fr || !fr._qsrc) return; const src = fr._qsrc;
    if (d.sis === 'ready') return QUOTE.paintMarks(src);
    if (d.sis === 'sel') { if (!d.text) return; const r = fr.getBoundingClientRect(), k = r.width / (fr.clientWidth || r.width || 1); const sel = { src, exact: d.text, prefix: d.prefix, suffix: d.suffix, frame: fr }; const x = r.left + d.x * k, y = r.top + d.y * k + 8;
      if (d.ce) QUOTE.strip(sel, x, y); else if (d.pen) QUOTE.penSave(sel, x, y); else QUOTE.menu(sel, x, y); }
    if (d.sis === 'erase' && d.id) QUOTE.erase([d.id]);
    if (d.sis === 'key' && $('.pop')) document.dispatchEvent(new KeyboardEvent('keydown', { key: d.key, bubbles: true, cancelable: true })); });
  // PDF widgets: a text layer on every drawn page
  const pg = PDFW.page; PDFW.page = async function (m, n, canvas, width, res) { const r = await pg.call(PDFW, m, n, canvas, width, res); QUOTE.textLayer(m, n, canvas, width).catch(() => { }); return r; };
  document.addEventListener('mouseup', e => { if (!e.target.closest || !e.target.closest('.q-slot')) return; setTimeout(() => { const s = QUOTE.pdfSel(); if (s) QUOTE.menu(s, s.x, s.y); }, 10); });
  document.addEventListener('keydown', e => { if (!((e.ctrlKey || e.metaKey) && e.key === 'Enter')) return; const s = QUOTE.pdfSel(); if (!s) return; e.preventDefault(); e.stopPropagation(); closePop(); QUOTE.strip(s, s.x, s.y); }, true);
  // selecting text in a PDF widget doesn't drag the box
  const ptr = DocView.pointer; DocView.pointer = function (e) { if (e.target.closest && e.target.closest('.q-slot .textLayer')) { const box = e.target.closest('.box'); if (box && box.dataset.id) this.select(box.dataset.id, true); return; } return ptr.call(this, e); };
  // the quote component: quote style + where it is from
  const bx = DocView.box; DocView.box = function (b, d, p) { const el = bx.apply(this, arguments); if (el && b && b.quote) { el.classList.add('q-box'); const q = b.quote, src = M.block(q.src);
      el.append(h('button.q-from.nopan', { title: 'Show it in the embedded file', on: { click: ev => { ev.stopPropagation(); QUOTE.goto(M.block(b.id)); } } }, '❝ from ', h('b', q.file || (src && src.label) || 'the embed'), q.page ? ', p. ' + q.page : '', src ? '' : ' (gone)')); }
    return el; };
  // a removed quote takes its highlight with it
  { const ch = changed; let t = null; changed = function (...a) { const r = ch.apply(this, a); clearTimeout(t); t = setTimeout(() => { $$('.box.w-pdf, .box.w-html').forEach(x => QUOTE.paintMarks(x.dataset.id)); }, 300); return r; }; }
}
