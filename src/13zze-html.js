/* ==========================================================================
   13zze · HTML pages keep their state and take notes.
   • The page as you left it: a slider moved, a box ticked, a value typed, a
     choice picked, a section opened — kept with the component
     (block.htmlState = {media, v}) and put back every time the page is shown
     again (the note redrawn or reopened, the page maximised, the app
     started again). The card and its maximised view move together.
     ⋯ → "Back to how the page starts" forgets it.
   • Notes in the page (maximised): ✎ Note, then click where it goes — or
     select text and pick ✎ Note. The note is pinned in the page (in the card
     too) and is also a component beside it on the paper, like a quote
     (quote.note), connected to the page ("comments"). Click the pin to edit
     or remove it; edit it on the paper as any component.
   Controls a page draws itself (a plot's own zoom, sliders made of shapes
   rather than form fields) are not kept. The page stays sandboxed: a small
   script added to its copy reports and restores; it can't reach the app.
   • V3.943 — ink in the page: in pen mode (any hand but pan) the pen writes
     on the page itself — on the card and maximised alike; the eraser (or the
     pen's back) takes strokes away. Each stroke is pinned to what it was
     written on (like a note), so it stays put however wide the page is
     shown, and is kept with the component (block.htmlInk, one undo step a
     stroke). Strokes written close together are one ink label.
     ⋯ → Export ink labels (or the maximised page's bar): for each label the
     page around it is drawn into a picture (html2canvas, vendor/workers,
     run inside the page), you crop it, and out come an image panel of that
     crop with the ink on it (glued, 13zzc), connected to the page
     ("cropped from") — the label leaves the page (Ctrl+Z puts it back).
   ========================================================================== */
const HTMLX = {
  notes: srcId => QUOTE.of(srcId).filter(q => q.quote.note),
  frames: srcId => $$('iframe').filter(fr => fr._qsrc === srcId && fr.contentWindow),
  post(srcId, msg, not) { HTMLX.frames(srcId).forEach(fr => { if (fr !== not) fr.contentWindow.postMessage(msg, '*'); }); },
  state(b) { const s = b && b.htmlState; return s && s.media === b.media ? s.v || {} : {}; },
  /** Added to the page's copy after the quote reporter (13zw QUOTE.fill): the state it was left at, and the script. */
  more(srcId) { const st = JSON.stringify(HTMLX.state(srcId && M.block(srcId))).replace(/</g, '\\u003c'); return '<script>window.__sisState=' + st + ';<\/script>' + HTMLX.SCRIPT + HTMLX.INKSCRIPT; },
  paint(srcId) { HTMLX.post(srcId, { sis: 'notes', list: HTMLX.notes(srcId).map(q => ({ id: q.id, text: q.body.text, at: q.quote.at || null, exact: q.quote.exact || null })) }); },
  /** A note at a spot of the page (or on a passage): a component beside the page, connected to it, pinned in it. */
  make(srcId, where, text) {
    const src = M.block(srcId); text = (text || '').trim(); if (!src || !text) return null;
    const rec = MEDIA.get(src.media), n = QUOTE.of(src.id).length;
    const b = M.addBlock(src.docId, null, { label: 'Note', x: Math.round(((src.x || 0) + (src.w || 616) + 56) / 14) * 14, y: Math.round(((src.y || 0) + n * 126) / 14) * 14, w: 300,
      quote: { src: src.id, kind: 'html', note: true, at: where.at || null, exact: where.exact || null, prefix: where.prefix || '', suffix: where.suffix || '', file: rec ? rec.name : '', color: null } });
    M.saveBlockBody(b, { text, marks: [] }); M.wire(b.id, src.id, 'comments', true); IX.rebuild(); changed();
    setTimeout(() => QUOTE.paintMarks(src.id), 120); return b;
  },
  /** Write (or edit) a note in a small box at the spot. */
  write(srcId, where, x, y, note) {
    const ta = h('textarea.inp', { rows: 3, placeholder: 'A note at this spot of the page…' }); if (note) ta.value = note.body.text;
    const go = () => { const v = ta.value.trim(); closePop();
      if (note) { const cur = M.block(note.id); if (!cur) return; if (!v) return QUOTE.erase([cur.id]); if (v !== cur.body.text) { M.saveBlockBody(cur, { text: v, marks: [] }); changed(); } return; }
      if (v && HTMLX.make(srcId, where, v)) toast('Note added — in the page, and beside it on the paper'); };
    ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } if (e.key === 'Escape') closePop(); });
    popover(x, y, [h('h5', note ? 'Note in the page' : 'New note in the page'), ta,
      h('div.row', { style: { gap: '6px', marginTop: '6px', alignItems: 'center' } }, h('span.tiny.muted', { style: { marginRight: 'auto' } }, 'Enter keeps it · Shift+Enter: new line'),
        note ? h('button.btn.xs', { on: { click: e => { closePop(); const ov = $('.embed-max.mx-hl'); ov && MXHL.close(ov); App.jump(note.id, e); } } }, 'On the paper ↗') : null,
        note ? h('button.btn.xs.danger', { on: { click: () => { closePop(); QUOTE.erase([note.id]); } } }, 'Remove') : null,
        h('button.btn.xs.pri', { on: { click: go } }, note ? 'Save' : 'Add'))]);
    setTimeout(() => ta.focus(), 20);
  },
  /** ✎ Note in a maximised page: the next click in it says where. */
  pick(ov, srcId) {
    const fr = $('iframe', ov); if (!fr || !fr.contentWindow) return; HTMLX._pick && HTMLX._pick.off();
    fr.contentWindow.postMessage({ sis: 'notemode', on: true }, '*'); ov.classList.add('mx-picking');
    const hint = h('div.mx-hint', 'Click where the note goes in the page · Esc cancels'); const bar = $(':scope > .em-bar', ov); bar ? bar.after(hint) : ov.prepend(hint);
    HTMLX._pick = { ov, srcId, off: () => { try { fr.contentWindow && fr.contentWindow.postMessage({ sis: 'notemode', on: false }, '*'); } catch { } ov.classList.remove('mx-picking'); hint.remove(); HTMLX._pick = null; } };
  },
  /** States are saved quietly (sliding isn't an undo step) a moment after the last move. */
  pend: new Set(),
  flush: debounce(() => { DB.quiet = true; try { HTMLX.pend.forEach(id => { const b = M.block(id); b && DB.put('blocks', b); }); } finally { DB.quiet = false; } HTMLX.pend.clear(); }, 400),

  SCRIPT: `<script>(function(){var P=window.parent,S=window.__sisState||{},cur={},busy=false,t=null,NOTES=[],pick=false,eat=false;
function ctl(){return [].slice.call(document.querySelectorAll('input,select,textarea'));}
function skip(el){var y=(el.type||'').toLowerCase();return /^(file|password|hidden|submit|button|reset|image)$/.test(y);}
function kOf(el,L){return el.id?'#'+el.id:'@'+L.indexOf(el);}
function rd(el){var y=(el.type||'').toLowerCase();if(y==='checkbox'||y==='radio')return el.checked;if(el.multiple)return [].map.call(el.selectedOptions,function(o){return o.value;});return el.value;}
function wr(el,v){var y=(el.type||'').toLowerCase();if(y==='checkbox'||y==='radio'){if(el.checked===!!v)return false;el.checked=!!v;return true;}if(el.multiple&&v&&v.map){var ch=false;[].forEach.call(el.options,function(o){var s=v.indexOf(o.value)>=0;if(o.selected!==s){o.selected=s;ch=true;}});return ch;}if(el.value===String(v))return false;el.value=v;return true;}
function dets(){return [].slice.call(document.querySelectorAll('details'));}
function apply(st){busy=true;var L=ctl(),D=dets(),left=0;try{Object.keys(st).forEach(function(k){if(k.indexOf('^d')===0){var d=D[+k.slice(2)];if(d&&d.open!==!!st[k])d.open=!!st[k];return;}var el=k.charAt(0)==='#'?document.getElementById(k.slice(1)):L[+k.slice(1)];if(!el||skip(el)){left++;return;}if(wr(el,st[k])){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}});}catch(x){}busy=false;return left;}
function send(){clearTimeout(t);t=setTimeout(function(){P.postMessage({sis:'state',state:cur},'*');},150);}
function snap(el){var L=ctl();if(L.indexOf(el)<0||skip(el))return;var y=(el.type||'').toLowerCase();if(y==='radio'&&el.name){L.forEach(function(x){if((x.type||'').toLowerCase()==='radio'&&x.name===el.name&&x.form===el.form)cur[kOf(x,L)]=x.checked;});}else cur[kOf(el,L)]=rd(el);send();}
document.addEventListener('input',function(e){if(!busy&&e.isTrusted)snap(e.target);},true);
document.addEventListener('change',function(e){if(!busy&&e.isTrusted)snap(e.target);},true);
document.addEventListener('toggle',function(e){var d=e.target;if(busy||!e.isTrusted||!d||d.tagName!=='DETAILS')return;cur['^d'+dets().indexOf(d)]=d.open;send();},true);
function kids(p){return [].filter.call(p.children,function(c){return !(c.tagName==='MARK'&&c.classList.contains('sis-q'));});}
function pathOf(el){var a=[];while(el&&el.parentElement&&el!==document.body){a.unshift(kids(el.parentElement).indexOf(el));el=el.parentElement;}return a.join('/');}
function byPath(s){var el=document.body;if(!s)return el;var a=String(s).split('/');for(var i=0;i<a.length&&el;i++)el=kids(el)[+a[i]];return el||null;}
function spot(x,y){var el=document.elementFromPoint(x,y)||document.body;if(el===document.documentElement)el=document.body;var r=el.getBoundingClientRect();return {path:pathOf(el),fx:r.width?+((x-r.left)/r.width).toFixed(4):0,fy:r.height?+((y-r.top)/r.height).toFixed(4):0,px:Math.round(x+scrollX),py:Math.round(y+scrollY)};}
function where(n){if(n.exact){var m=document.querySelector('mark.sis-q[data-q="'+n.id+'"]');if(m){var q=m.getBoundingClientRect();return {x:q.right+scrollX+4,y:q.top+scrollY+q.height/2};}}var a=n.at;if(!a)return null;var el=byPath(a.path);if(el&&el!==document.body){var R=el.getBoundingClientRect();if(R.width||R.height)return {x:R.left+scrollX+R.width*a.fx,y:R.top+scrollY+R.height*a.fy};}return {x:a.px,y:a.py};}
function draw(){[].forEach.call(document.querySelectorAll('.sis-note'),function(x){x.remove();});NOTES.forEach(function(n){var p=where(n);if(!p)return;var el=document.createElement('div');el.className='sis-note';el.setAttribute('data-q',n.id);el.style.left=Math.round(p.x)+'px';el.style.top=Math.round(p.y)+'px';var b=document.createElement('b');b.textContent='\\u270E';var s=document.createElement('span');s.textContent=n.text||'';el.appendChild(b);el.appendChild(s);
el.addEventListener('pointerdown',function(e){e.stopPropagation();},true);el.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var r=el.getBoundingClientRect();P.postMessage({sis:'note',id:n.id,x:r.left,y:r.bottom},'*');});document.documentElement.appendChild(el);});}
document.addEventListener('pointerdown',function(e){if(!pick||(e.target.closest&&e.target.closest('.sis-note')))return;e.preventDefault();e.stopPropagation();pick=false;eat=true;document.documentElement.classList.remove('sis-picking');P.postMessage({sis:'spot',at:spot(e.clientX,e.clientY),x:e.clientX,y:e.clientY},'*');},true);
document.addEventListener('click',function(e){if(eat){eat=false;e.preventDefault();e.stopPropagation();}},true);
document.addEventListener('keydown',function(e){if(pick&&e.key==='Escape'){pick=false;document.documentElement.classList.remove('sis-picking');P.postMessage({sis:'pickoff'},'*');}},true);
window.addEventListener('message',function(e){var d=e.data||{};if(d.sis==='restore'){cur=d.state||{};apply(cur);}else if(d.sis==='notes'){NOTES=d.list||[];draw();}else if(d.sis==='notemode'){pick=!!d.on;document.documentElement.classList.toggle('sis-picking',pick);}else if(d.sis==='goto'){var n=document.querySelector('.sis-note[data-q="'+d.id+'"]');if(n&&!document.querySelector('mark.sis-q[data-q="'+d.id+'"]')){n.scrollIntoView({block:'center',behavior:'smooth'});n.classList.add('sis-flash');setTimeout(function(){n.classList.remove('sis-flash');},1800);}}});
window.addEventListener('resize',function(){if(NOTES.length)draw();});
var st=document.createElement('style');st.textContent='.sis-note{position:absolute;z-index:2147483000;transform:translate(-3px,-50%);display:flex;align-items:flex-start;gap:5px;max-width:240px;padding:4px 8px 4px 6px;background:#fff8c5;color:#3a3200;border:1px solid #e3cf5a;border-left:3px solid #e0b400;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.18);font:12.5px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:pre-wrap;word-break:break-word;text-align:left}.sis-note b{opacity:.7;flex:none}.sis-note span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.sis-note:hover{z-index:2147483001}.sis-note:hover span{display:block}.sis-note.sis-flash{outline:2px solid #e08a00}html.sis-picking,html.sis-picking *{cursor:crosshair!important}';(document.head||document.documentElement).appendChild(st);
function start(){cur=JSON.parse(JSON.stringify(S));if(Object.keys(cur).length&&apply(cur))setTimeout(function(){apply(cur);},800);P.postMessage({sis:'hello'},'*');if(window.ResizeObserver&&document.body)new ResizeObserver(function(){if(NOTES.length)draw();}).observe(document.body);}
if(document.readyState==='complete')setTimeout(start,0);else window.addEventListener('load',function(){setTimeout(start,0);});})();<\/script>`,

  /* ---------- V3.943 · ink in the page ---------- */
  /** The page's side: in ink mode the pen (and the mouse, when it draws) writes here, before the quote script's pen; each
      stroke is pinned to the element it starts on (path + fraction, as the notes are) and drawn over the page in one SVG
      layer. Asked, it sends a frozen copy of itself (its HTML as it is now: canvases as pictures, the values typed, no
      scripts, no ink) for the app to draw — a sandboxed page cannot draw itself (html2canvas needs a frame it can reach). */
  INKSCRIPT: `<script>(function(){var P=window.parent,NS='http://www.w3.org/2000/svg',ON=false,M={},INKS=[],cur=null,svg=null,live=null,gone={},eat=false,TS=null,penAt=0;
function kids(p){return [].filter.call(p.children,function(c){return !(c.tagName==='MARK'&&c.classList.contains('sis-q'));});}
function pathOf(el){var a=[];while(el&&el.parentElement&&el!==document.body){a.unshift(kids(el.parentElement).indexOf(el));el=el.parentElement;}return a.join('/');}
function byPath(s){var el=document.body;if(!s)return el;var a=String(s).split('/');for(var i=0;i<a.length&&el;i++)el=kids(el)[+a[i]];return el||null;}
function spot(x,y){var el=document.elementFromPoint(x,y)||document.body;if(el===document.documentElement||(el.closest&&el.closest('.sis-ink,.sis-note')))el=document.body;var r=el.getBoundingClientRect();return {path:pathOf(el),fx:r.width?+((x-r.left)/r.width).toFixed(5):0,fy:r.height?+((y-r.top)/r.height).toFixed(5):0,px:Math.round(x+scrollX),py:Math.round(y+scrollY)};}
function anchor(a){var el=byPath(a.path);if(el&&el!==document.body){var R=el.getBoundingClientRect();if(R.width||R.height)return [R.left+scrollX+R.width*a.fx,R.top+scrollY+R.height*a.fy];}return [a.px,a.py];}
function layer(){if(!svg||!svg.isConnected){svg=document.createElementNS(NS,'svg');svg.setAttribute('class','sis-ink');svg.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:2147482990';document.documentElement.appendChild(svg);}return svg;}
function paint(){var g=layer();[].slice.call(g.querySelectorAll('path[data-id]')).forEach(function(x){x.remove();});INKS.forEach(function(s){var a=anchor(s.at),p=document.createElementNS(NS,'path');p.setAttribute('d',s.d);p.setAttribute('transform','translate('+a[0]+','+a[1]+')');p.setAttribute('data-id',s.id);p.setAttribute('data-l',s.label);
if(s.line){p.setAttribute('fill','none');p.setAttribute('stroke',s.c);p.setAttribute('stroke-width',s.w);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');}else p.setAttribute('fill',s.c);if(s.o)p.setAttribute('opacity',s.o);if(s.hl){p.setAttribute('opacity','.35');p.style.mixBlendMode='multiply';}g.insertBefore(p,live&&live.parentNode===g?live:null);});}
function hit(x,y){var out=[];[].forEach.call(layer().querySelectorAll('path[data-id]'),function(p){var m=p.transform.baseVal.consolidate(),tx=m?m.matrix.e:0,ty=m?m.matrix.f:0;for(var k=0;k<5;k++){var o=[[0,0],[5,0],[-5,0],[0,5],[0,-5]][k],pt=new DOMPoint(x-tx+o[0],y-ty+o[1]);try{if(p.isPointInFill(pt)||(p.getAttribute('fill')==='none'&&p.isPointInStroke(pt))){out.push(p.getAttribute('data-id'));break;}}catch(e){}}});return out;}
function samples(e){var L=e.getCoalescedEvents?e.getCoalescedEvents():null;return L&&L.length?L:[e];}
function move(e){samples(e).forEach(function(q){var x=q.clientX+scrollX,y=q.clientY+scrollY;if(cur.er){var ids=hit(x,y).filter(function(i){return !gone[i];});if(ids.length){ids.forEach(function(i){gone[i]=1;var el=layer().querySelector('path[data-id="'+i+'"]');if(el)el.remove();});P.postMessage({sis:'inkerase',ids:ids},'*');}return;}
var l=cur.p[cur.p.length-1],dx=x-cur.x0,dy=y-cur.y0;if(l&&Math.hypot(dx-l[0],dy-l[1])<.6)return;cur.p.push([Math.round(dx*10)/10,Math.round(dy*10)/10,q.pointerType==='pen'&&q.pressure>0?Math.round(q.pressure*100)/100:.5]);cur.b=[Math.min(cur.b[0],x),Math.min(cur.b[1],y),Math.max(cur.b[2],x),Math.max(cur.b[3],y)];});
if(live)live.setAttribute('d','M'+cur.p.map(function(p){return p[0]+','+p[1];}).join('L'));}
window.addEventListener('pointerdown',function(e){if(e.pointerType==='pen')penAt=Date.now();if(!ON)return;var pen=e.pointerType==='pen',ms=e.pointerType==='mouse'&&M.mouse&&e.button===0;if(!pen&&!ms)return;if(e.target.closest&&e.target.closest('.sis-note'))return;e.preventDefault();e.stopImmediatePropagation();
var x=e.clientX+scrollX,y=e.clientY+scrollY;cur={id:e.pointerId,er:!!M.erase||(pen&&(e.button===5||(e.buttons&32)===32)),at:spot(e.clientX,e.clientY),x0:x,y0:y,p:[],b:[x,y,x,y]};
if(!cur.er){live=document.createElementNS(NS,'path');live.setAttribute('class','live');live.setAttribute('fill','none');live.setAttribute('stroke',M.c||'#1d1d1b');live.setAttribute('stroke-width',M.hl?14:(M.w||2.4));live.setAttribute('stroke-linecap','round');live.setAttribute('stroke-linejoin','round');if(M.hl)live.setAttribute('opacity','.35');live.setAttribute('transform','translate('+x+','+y+')');layer().appendChild(live);}
move(e);},true);
window.addEventListener('pointermove',function(e){if(!cur||e.pointerId!==cur.id)return;e.preventDefault();e.stopImmediatePropagation();move(e);},true);
window.addEventListener('pointerup',function(e){if(!cur||e.pointerId!==cur.id)return;e.preventDefault();e.stopImmediatePropagation();var c=cur;cur=null;eat=true;setTimeout(function(){eat=false;},400);if(c.er||!c.p.length){if(live){live.remove();live=null;}return;}
P.postMessage({sis:'inkstroke',s:{at:c.at,p:c.p,c:M.c||'#1d1d1b',w:M.hl?14:(M.w||2.4),hl:!!M.hl},abs:c.b},'*');},true);
window.addEventListener('pointercancel',function(e){if(cur&&e.pointerId===cur.id){cur=null;if(live){live.remove();live=null;}}},true);
window.addEventListener('click',function(e){if(eat){e.preventDefault();e.stopImmediatePropagation();}},true);
function scroller(n){for(;n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){var cs=getComputedStyle(n);if(/(auto|scroll|overlay)/.test(cs.overflowY+' '+cs.overflowX)&&(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1))return n;}return document.scrollingElement||document.documentElement;}
window.addEventListener('pointerdown',function(e){if(!ON||e.pointerType!=='touch')return;var pl=M.palm||[90,600],sz=Math.max(e.width||0,e.height||0);if(TS||cur||Date.now()-penAt<pl[1]||sz>pl[0])return;TS={id:e.pointerId,x:e.clientX,y:e.clientY,el:scroller(e.target)};},true);
window.addEventListener('pointermove',function(e){if(e.pointerType==='pen'){penAt=Date.now();TS=null;return;}if(!TS||e.pointerId!==TS.id)return;e.preventDefault();TS.el.scrollBy(TS.x-e.clientX,TS.y-e.clientY);TS.x=e.clientX;TS.y=e.clientY;},true);
window.addEventListener('pointerup',function(e){if(TS&&e.pointerId===TS.id)TS=null;},true);window.addEventListener('pointercancel',function(e){if(TS&&e.pointerId===TS.id)TS=null;},true);
window.addEventListener('message',function(e){var d=e.data||{};
if(d.sis==='ink'){ON=!!d.on;M=d;document.documentElement.classList.toggle('sis-inking',ON);}
else if(d.sis==='inks'){INKS=d.list||[];gone={};if(live){live.remove();live=null;}paint();}
else if(d.sis==='inkbox'){var L={},A={};[].forEach.call(layer().querySelectorAll('path[data-id]'),function(p){var b=p.getBBox(),m=p.transform.baseVal.consolidate(),tx=m?m.matrix.e:0,ty=m?m.matrix.f:0,l=p.getAttribute('data-l'),r=L[l]||[1e9,1e9,-1e9,-1e9],w=+(p.getAttribute('stroke-width')||0)/2;L[l]=[Math.min(r[0],b.x+tx-w),Math.min(r[1],b.y+ty-w),Math.max(r[2],b.x+b.width+tx+w),Math.max(r[3],b.y+b.height+ty+w)];A[p.getAttribute('data-id')]=[tx,ty];});
P.postMessage({sis:'inkbox',tag:d.tag,labels:L,anchors:A,page:[Math.max(document.documentElement.scrollWidth,innerWidth),Math.max(document.documentElement.scrollHeight,innerHeight)]},'*');}
else if(d.sis==='freeze'){var c=document.documentElement.cloneNode(true),src=document.querySelectorAll('canvas'),dst=c.querySelectorAll('canvas'),fi=document.querySelectorAll('input,textarea,select'),fo=c.querySelectorAll('input,textarea,select');
for(var i=0;i<src.length&&i<dst.length;i++){try{var R=src[i].getBoundingClientRect(),im=document.createElement('img');im.src=src[i].toDataURL();im.setAttribute('style',(src[i].getAttribute('style')||'')+';width:'+R.width+'px;height:'+R.height+'px');dst[i].replaceWith(im);}catch(x){}}
for(var j=0;j<fi.length&&j<fo.length;j++){var a=fi[j],b=fo[j],y=(a.type||'').toLowerCase();if(y==='checkbox'||y==='radio'){if(a.checked)b.setAttribute('checked','');else b.removeAttribute('checked');}else if(a.tagName==='TEXTAREA')b.textContent=a.value;else if(a.tagName==='SELECT'){[].forEach.call(b.options,function(o,k){if(a.options[k]&&a.options[k].selected)o.setAttribute('selected','');else o.removeAttribute('selected');});}else b.setAttribute('value',a.value);}
[].forEach.call(c.querySelectorAll('script,.sis-ink,.sis-note,iframe'),function(x){x.remove();});
P.postMessage({sis:'frozen',tag:d.tag,html:'<!doctype html>'+c.outerHTML,w:document.documentElement.clientWidth||innerWidth,h:Math.max(document.documentElement.scrollHeight,innerHeight)},'*');}});
window.addEventListener('resize',function(){if(INKS.length)paint();});
function watch(){if(window.ResizeObserver&&document.body)new ResizeObserver(function(){if(INKS.length)paint();}).observe(document.body);}
var st=document.createElement('style');st.textContent='html.sis-inking,html.sis-inking body{touch-action:none}html.sis-inking body *{cursor:crosshair}';(document.head||document.documentElement).appendChild(st);
if(document.readyState==='complete')setTimeout(watch,0);else window.addEventListener('load',function(){setTimeout(watch,0);});
P.postMessage({sis:'inkready'},'*');})();<\/script>`,
  inks(b) { const k = b && b.htmlInk; return k && k.media === b.media ? k.strokes || [] : []; },
  /** A stroke as the page draws it: the notes' own outline (13zf INK.path), in its pin's coordinates. */
  /** The pen's "ink" colour on a page (pages are light; #1d1d1b would follow the app's theme once the ink leaves the page) */
  AUTO: '#141414',
  look: s => ({ id: s.id, label: s.label, at: s.at, d: INK.path(s), c: !s.c || s.c === 'auto' || s.c === '#1d1d1b' ? HTMLX.AUTO : s.c, w: s.w, line: !!s.hl, hl: !!s.hl, o: s.o || null }),
  inkPaint(srcId, only) { const b = M.block(srcId); if (!b) return; const m = { sis: 'inks', list: HTMLX.inks(b).map(HTMLX.look) }; if (only) only.contentWindow && only.contentWindow.postMessage(m, '*'); else HTMLX.post(srcId, m); },
  /** Pen mode for the pages: on with any hand but pan (and zoom), for the pen, the highlighter and the eraser. */
  inkOn() {
    const hand = window.SIS_LAB && SIS_LAB.handNow ? SIS_LAB.handNow() : (INK.writing() ? INK.tool : 'move'), hl = INK.tool === 'hl', c = hl ? (INK.HL[INK.hlColor] || INK.HL[0]) : (INK.COLORS[INK.color] || 'auto');
    return { sis: 'ink', on: INK.writing() && /^(pen|hl|eraser)$/.test(hand) && /^(pen|hl|eraser)$/.test(INK.tool), c: !c || c === 'auto' ? HTMLX.AUTO : c, w: INK.WIDTHS[INK.width] || 2.4, hl, erase: INK.tool === 'eraser', mouse: !!INK.mouse,
      palm: window.SIS_PALM ? [SIS_PALM.SIZE, SIS_PALM.QUIET] : [90, 600] };   // V3.945 — a finger scrolls the page while the pen writes; a palm does neither (13zf PALM)
  },
  /** V3.945 — a page that fills the window (maximised, or beside the note at full screen) keeps the note's ✎ pill: that
      note's pill (lab-mode §11) is lifted above the page, alone, and moved inside it if it would sit outside the page
      (on the highlights panel); the pen settings it opens come too. Move to scroll and select; pen to write. */
  lift() {
    const ov = [...$$('.embed-max')].filter(x => !x.classList.contains('rd-docked')).pop(), b = ov && M.block(ov.dataset.src);
    const pane = b && b.kind === 'html' ? App.panes().find(p => p.docId === b.docId) || App.panes()[0] : null, host = pane && pane.host;
    $$('.mx-pills').forEach(x => { if (x !== host) { x.classList.remove('mx-pills'); x.style.removeProperty('--mx-dx'); x.style.removeProperty('--mx-dy'); } });
    if (!host) return;
    host.classList.add('mx-pills'); host.style.setProperty('--mx-dx', '0px'); host.style.setProperty('--mx-dy', '0px');
    const pill = $(':scope > .lab-pills > .lab-pill-hand', host), main = $('.mx-main', ov) || ov; if (!pill) return;
    const r = pill.getBoundingClientRect(), m = main.getBoundingClientRect(), g = 12;
    const dx = r.right > m.right - g ? m.right - g - r.right : r.left < m.left + g ? m.left + g - r.left : 0, dy = r.bottom > m.bottom - g ? m.bottom - g - r.bottom : r.top < m.top + g ? m.top + g - r.top : 0;
    host.style.setProperty('--mx-dx', Math.round(dx) + 'px'); host.style.setProperty('--mx-dy', Math.round(dy) + 'px');
  },
  inkMode() { const m = HTMLX.inkOn(); $$('iframe').forEach(fr => { const b = fr._qsrc && M.block(fr._qsrc); if (b && b.kind === 'html' && fr.contentWindow) fr.contentWindow.postMessage(m, '*'); }); },
  /** Strokes written close together are one ink label (in this session: each label's box on the page as it was written). */
  boxes: new Map(),
  labelFor(srcId, abs) {
    const L = HTMLX.boxes.get(srcId) || []; HTMLX.boxes.set(srcId, L); const m = 60, a = abs || [0, 0, 0, 0];
    let hit = L.find(x => a[0] < x.b[2] + m && a[2] > x.b[0] - m && a[1] < x.b[3] + m && a[3] > x.b[1] - m && HTMLX.inks(M.block(srcId)).some(s => s.label === x.id));
    if (!hit) { hit = { id: uid('hk'), b: a.slice() }; L.push(hit); } else hit.b = [Math.min(hit.b[0], a[0]), Math.min(hit.b[1], a[1]), Math.max(hit.b[2], a[2]), Math.max(hit.b[3], a[3])];
    return hit.id;
  },
  setInk(b, strokes) { b.htmlInk = { media: b.media, strokes }; b.modified = isoLocal(new Date()); DB.put('blocks', b); },
  /* asking a page and waiting for its answer */
  wait: new Map(),
  ask(fr, msg, ms = 30000) { const tag = uid('t'); return new Promise((res, rej) => { HTMLX.wait.set(tag, res); fr.contentWindow.postMessage(Object.assign({ tag }, msg), '*'); setTimeout(() => { if (HTMLX.wait.delete(tag)) rej(new Error('the page did not answer')); }, ms); }); },
  h2c: () => { const el = document.getElementById('wk-html2canvas'); return el ? el.textContent : ''; },
  /** A frozen page drawn into a picture: in a hidden frame of this app where no script can run (sandbox without
      allow-scripts), as wide as the page was shown, cut to rect [x, y, w, h] at twice the size. */
  async render(fz, rect) {
    if (!window.html2canvas) { const code = HTMLX.h2c(); if (!code) throw new Error('the page drawer is missing from this build'); (0, eval)(code); }
    const fr = h('iframe', { sandbox: 'allow-same-origin', 'aria-hidden': 'true', style: { position: 'fixed', left: '-20000px', top: '0', width: fz.w + 'px', height: fz.h + 'px', border: '0', visibility: 'hidden' } });
    document.body.append(fr);
    try {
      await new Promise(res => { fr.onload = res; fr.srcdoc = fz.html; setTimeout(res, 5000); }); await new Promise(r => setTimeout(r, 250));
      const doc = fr.contentDocument; if (!doc) throw new Error('the copy could not be opened');
      const cv = await window.html2canvas(doc.documentElement, { x: rect[0], y: rect[1], width: rect[2], height: rect[3], scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: fz.w, windowHeight: fz.h });
      return cv.toDataURL('image/png');
    } finally { fr.remove(); }
  },
  /** ⋯ → Export ink labels: each label, cropped from the page with the ink on it, as an image panel connected to the page. */
  async exportInk(srcId) {
    const b = M.block(srcId); if (!b || !HTMLX.inks(b).length) return toast('No ink in this page yet — write on it with the pen');
    const mx = [...$$('.embed-max iframe')].find(f => f._qsrc === srcId), fr = mx || HTMLX.frames(srcId)[0]; if (!fr) return toast('Show the page first');
    let info; try { info = await HTMLX.ask(fr, { sis: 'inkbox' }); } catch (e) { return toast('The page did not answer — try again'); }
    const labels = Object.keys(info.labels || {}); let n = 0;
    for (const id of labels) { const done = await HTMLX.exportLabel(srcId, fr, id, info, n); if (done === 'stop') break; if (done) n++; }
    if (n) toast(plural(n, 'ink label') + ' exported — each an image of the page with its ink, connected to the page · Ctrl+Z undoes');
  },
  async exportLabel(srcId, fr, label, info, n) {
    const bb = info.labels[label], pw = info.page[0], ph = info.page[1], pad = 160;
    const R = [Math.max(0, bb[0] - pad), Math.max(0, bb[1] - pad)]; R.push(Math.min(pw, bb[2] + pad) - R[0], Math.min(ph, bb[3] + pad) - R[1]);
    let snap; try { const fz = await HTMLX.ask(fr, { sis: 'freeze' }, 30000); snap = { png: await HTMLX.render(fz, R) }; } catch (e) { toast('The page could not be drawn: ' + (e.message || e)); return 'stop'; }
    const strokes = HTMLX.inks(M.block(srcId)).filter(s => s.label === label);
    const crop = await HTMLX.cropDialog(snap.png, R, bb, strokes, info.anchors); if (crop === 'stop' || !crop) return crop;
    // the crop as a picture (the snap is drawn at scale 2)
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = snap.png; }), k2 = img.naturalWidth / R[2];
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(crop.w * k2)); cv.height = Math.max(1, Math.round(crop.h * k2));
    cv.getContext('2d').drawImage(img, (crop.x - R[0]) * k2, (crop.y - R[1]) * k2, crop.w * k2, crop.h * k2, 0, 0, cv.width, cv.height);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png')), src = M.block(srcId), d = M.doc(src.docId), rec = MEDIA.get(src.media);
    const file = new File([blob], ((rec && rec.name) || 'page').replace(/\.[^.]+$/, '') + ' · ink label.png', { type: 'image/png' });
    DB.beginGroup('export ink');
    const fig = FIG.create(d, { x: (src.x || 0) + (src.w || 616) + 56, y: (src.y || 0) + n * 40 }, 1, 1); fig.label = 'Ink label'; FIG.cells(fig)[0].caption = 'From ' + ((rec && rec.name) || 'the page') + ', with its ink';
    await FIG.addFiles(fig, [file]); M.wire(fig.id, srcId, 'c:cropped from', true);
    await new Promise(r => setTimeout(r, 160));
    // the ink, on the image where it was on the page
    const pane = App.panes().find(p => p.docId === d.id && p.paper), cell = pane && $(`:scope > .box[data-id="${fig.id}"] .fg-cell`, pane.paper.world);
    let ox, oy, k; if (cell) { const r = cell.getBoundingClientRect(), a = pane.paper.toWorld(r.left, r.top), z = pane.paper.toWorld(r.right, r.bottom); ox = a.x; oy = a.y; k = (z.x - a.x) / crop.w; }
    else { const f = M.block(fig.id); ox = (f.x || 0) + 14; oy = (f.y || 0) + 44; k = ((f.w || 560) - 28) / crop.w; }
    const pts = strokes.map(s => { const A = info.anchors[s.id] || [0, 0]; return Object.assign({}, s, { c: HTMLX.look(s).c, w: (s.w || 2.4) * k, p: s.p.map(q => [ox + (A[0] + q[0] - crop.x) * k, oy + (A[1] + q[1] - crop.y) * k, q[2]]) }); });
    _suppress++; const ib = M.addBlock(d.id, null, { kind: 'ink', label: 'Ink label', x: INK.r1(ox), y: INK.r1(oy), w: 60, inkH: 60, ink: { strokes: [] }, glue: { to: fig.id, dx: 0, dy: 0 } }); _suppress--;
    ib.body = { text: '', marks: [] }; ib.ink.strokes = pts.map(s => { const o = Object.assign({}, s); delete o.id; delete o.label; delete o.at; o.p = s.p.map(q => [INK.r1(q[0] - ib.x), INK.r1(q[1] - ib.y), q[2]]); return o; });
    INK.fit(ib); DB.put('blocks', ib);
    const cur = M.block(srcId); HTMLX.setInk(cur, HTMLX.inks(cur).filter(s => s.label !== label));
    changed(); setTimeout(() => HTMLX.inkPaint(srcId), 200); return true;
  },
  /** The page around the label, the label's ink over it, a crop box to adjust (drag inside to move it, a corner to size it,
      outside to draw a new one). Resolves to {x, y, w, h} in the page's own pixels, null (skip) or 'stop'. */
  cropDialog(png, R, bb, strokes, anchors) {
    return new Promise(done => {
      const s = Math.min(720 / R[2], 460 / R[3], 1.6), W = Math.round(R[2] * s), H = Math.round(R[3] * s), m = 24;
      let k = { x: Math.max(R[0], bb[0] - m), y: Math.max(R[1], bb[1] - m) }; k.w = Math.min(R[0] + R[2], bb[2] + m) - k.x; k.h = Math.min(R[1] + R[3], bb[3] + m) - k.y;
      const ink = SV('svg', { width: W, height: H, viewBox: `${R[0]} ${R[1]} ${R[2]} ${R[3]}`, class: 'hx-cink' });
      strokes.forEach(st => { const A = anchors[st.id] || [0, 0], L = HTMLX.look(st), p = SV('path', { d: L.d, transform: `translate(${A[0]},${A[1]})` });
        if (L.line) { p.setAttribute('fill', 'none'); p.setAttribute('stroke', L.c); p.setAttribute('stroke-width', L.w); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('opacity', '.4'); } else p.setAttribute('fill', L.c); ink.append(p); });
      const box = h('div.hx-cbox', ['nw', 'ne', 'sw', 'se'].map(c => h('i.hx-ch', { 'data-h': c })));
      const stage = h('div.hx-cstage', { style: { width: W + 'px', height: H + 'px' } }, h('img', { src: png, style: { width: W + 'px', height: H + 'px', display: 'block' } }), ink, box);
      const paint = () => Object.assign(box.style, { left: (k.x - R[0]) * s + 'px', top: (k.y - R[1]) * s + 'px', width: k.w * s + 'px', height: k.h * s + 'px' });
      const fix = () => { if (k.w < 0) { k.x += k.w; k.w = -k.w; } if (k.h < 0) { k.y += k.h; k.h = -k.h; } k.x = clamp(k.x, R[0], R[0] + R[2] - 8); k.y = clamp(k.y, R[1], R[1] + R[3] - 8); k.w = clamp(k.w, 8, R[0] + R[2] - k.x); k.h = clamp(k.h, 8, R[1] + R[3] - k.y); };
      stage.addEventListener('pointerdown', e => { e.preventDefault(); const r0 = stage.getBoundingClientRect(), at = ev => [R[0] + clamp(ev.clientX - r0.left, 0, W) / s, R[1] + clamp(ev.clientY - r0.top, 0, H) / s], p0 = at(e), k0 = Object.assign({}, k), hd = e.target.dataset && e.target.dataset.h, mode = hd || (e.target === box ? 'move' : 'new');
        const mv = ev => { const p = at(ev), dx = p[0] - p0[0], dy = p[1] - p0[1];
          if (mode === 'move') { k.x = k0.x + dx; k.y = k0.y + dy; } else if (mode === 'new') k = { x: p0[0], y: p0[1], w: dx, h: dy };
          else { if (mode.includes('e')) k.w = k0.w + dx; if (mode.includes('s')) k.h = k0.h + dy; if (mode.includes('w')) { k.x = k0.x + dx; k.w = k0.w - dx; } if (mode.includes('n')) { k.y = k0.y + dy; k.h = k0.h - dy; } }
          fix(); paint(); };
        const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
      paint(); let out = null;
      modal({ title: 'Crop the page for this ink label', wide: true, onClose: () => done(out),
        body: h('div', h('p.tiny.muted', { style: { marginTop: 0 } }, 'This part of the page comes out as an image with the ink on it, connected to the page. Drag inside the box to move it, a corner to size it, or outside to draw a new one.'), h('div.hx-cwrap', stage)),
        actions: [{ label: 'Stop', run: () => { out = 'stop'; } }, { label: 'Skip this label', run: () => { out = null; } }, { label: 'Export', pri: true, run: () => { out = Object.assign({}, k); } }] });
    });
  },
};
QUOTE.more = HTMLX.more;
{
  window.addEventListener('message', e => { const d = e.data; if (!d || !d.sis) return;
    const fr = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source); if (!fr || !fr._qsrc) return; const src = fr._qsrc, b = M.block(src); if (!b) return;
    const at = (x, y) => { const r = fr.getBoundingClientRect(), k = r.width / (fr.clientWidth || r.width || 1); return { x: r.left + x * k, y: r.top + y * k }; };
    if (d.sis === 'state') { b.htmlState = { media: b.media, v: d.state || {} }; HTMLX.pend.add(b.id); HTMLX.flush(); HTMLX.post(src, { sis: 'restore', state: b.htmlState.v }, fr); }
    else if (d.sis === 'hello') { fr.contentWindow.postMessage({ sis: 'restore', state: HTMLX.state(b) }, '*'); QUOTE.paintMarks(src); }   // a page reloaded (⟳) gets what it was left at since
    else if (d.sis === 'spot') { HTMLX._pick && HTMLX._pick.off(); const p = at(d.x, d.y); HTMLX.write(src, { at: d.at }, p.x, p.y + 10); }
    else if (d.sis === 'pickoff') HTMLX._pick && HTMLX._pick.off();
    else if (d.sis === 'note') { const q = M.block(d.id); if (q && q.quote && q.quote.note) { const p = at(d.x, d.y); HTMLX.write(src, null, p.x, p.y + 6, q); } }
    // V3.943 — ink in the page
    else if (d.sis === 'inkready') { fr.contentWindow.postMessage(HTMLX.inkOn(), '*'); HTMLX.inkPaint(src, fr); }
    else if (d.sis === 'inkstroke') { const s = d.s || {}; if (!Array.isArray(s.p) || !s.p.length) return;
      const pressed = INK.pressure && !s.hl && s.p.some(q => q[2] !== .5);
      const st = { id: uid('hs'), label: HTMLX.labelFor(src, d.abs), at: s.at, c: s.c, w: +s.w || 2.4, p: s.p.map(q => [+q[0] || 0, +q[1] || 0, pressed ? Math.round(INK.mapP(q[2]) * 100) / 100 : .5]) };
      if (s.hl) st.hl = true;
      if (pressed) { st.pr = true; st.wr = [INK.curve.min, INK.curve.max]; const m = st.p.reduce((a, q) => a + q[2], 0) / st.p.length; st.o = Math.round(clamp(1 - INK.curve.fade * (1 - m) * 1.15, .22, 1) * 100) / 100; }
      DB.beginGroup('ink'); HTMLX.setInk(b, [...HTMLX.inks(b), st]); HTMLX.inkPaint(src); }
    else if (d.sis === 'inkerase') { const gone = new Set(d.ids || []), S = HTMLX.inks(b); if (!S.some(s => gone.has(s.id))) return; DB.beginGroup('erase'); HTMLX.setInk(b, S.filter(s => !gone.has(s.id))); HTMLX.inkPaint(src); }
    else if ((d.sis === 'inkbox' || d.sis === 'frozen') && d.tag && HTMLX.wait.has(d.tag)) { const res = HTMLX.wait.get(d.tag); HTMLX.wait.delete(d.tag); res(d); } });
  // V3.943 — the pages' pen follows the ink bar and the hand (pen, highlighter, eraser — or none in pan mode)
  { const pb = INK.paintBars; INK.paintBars = function () { const r = pb.apply(this, arguments); HTMLX.inkMode(); return r; }; }
  // Esc while choosing the spot cancels that, not the maximised view
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && HTMLX._pick) { e.stopImmediatePropagation(); e.preventDefault(); HTMLX._pick.off(); } }, true);
  // the pins follow the quotes: drawn whenever the highlights are
  const pm = QUOTE.paintMarks; QUOTE.paintMarks = function (srcId) { const r = pm.call(QUOTE, srcId); const s = M.block(srcId); if (s && s.kind === 'html') HTMLX.paint(srcId); return r; };
  // ✎ Note in the maximised page's bar
  const em = EMBED.max; EMBED.max = function (b) { const r = em.call(EMBED, b), ov = [...$$('.embed-max')].pop(), bar = ov && $(':scope > .em-bar', ov);
    if (bar) { const btn = h('button.btn.sm', { title: 'Write a note in the page: click where it goes (or select text, then ✎ Note)', on: { click: () => HTMLX._pick ? HTMLX._pick.off() : HTMLX.pick(ov, b.id) } }, '✎ Note'), a = $('a.btn', bar); a ? a.before(btn) : bar.append(btn);
      const ex = h('button.btn.sm', { title: 'The ink written on the page comes out: each ink label with a crop of the page under it, as an image panel connected to the page', on: { click: () => HTMLX.exportInk(b.id) } }, 'Export ink labels'); btn.after(ex); }
    lift(); return r; };
  // V3.945 — the same two in the bar of a page read beside the note (13zzb)
  const ro = RDOCK.open; RDOCK.open = function (b) { const r = ro.apply(this, arguments), st = RDOCK.st;
    if (st && b && st.id === b.id && b.kind === 'html') { const ov = st.ov, xs = (label, title, fn) => h('button.btn.xs', { title, on: { click: e => { e.stopPropagation(); fn(); } } }, label);
      st.hl.before(xs('✎ Note', 'Write a note in the page: click where it goes (or select text, then ✎ Note)', () => HTMLX._pick ? HTMLX._pick.off() : HTMLX.pick(ov, b.id)),
        xs('Export ink labels', 'The ink written on the page comes out: each ink label with a crop of the page under it, as an image panel connected to the page', () => HTMLX.exportInk(b.id))); }
    lift(); return r; };
  // V3.945 — the ✎ pill over a page that fills the window: when one opens, goes, or changes size, or the pill is dropped
  function lift() { cancelAnimationFrame(HTMLX._lr); HTMLX._lr = requestAnimationFrame(() => { try { HTMLX.lift(); } catch (e) { console.warn('[html pill]', e); } }); }
  ['full', 'close'].forEach(k => { const f = RDOCK[k]; RDOCK[k] = function () { const r = f.apply(this, arguments); lift(); return r; }; });
  new MutationObserver(lift).observe(document.body, { childList: true });
  addEventListener('resize', lift);
  document.addEventListener('pointerup', e => { if (e.target.closest && e.target.closest('.mx-pills > .lab-pills')) setTimeout(lift, 60); }, true);
  // ✎ Note on a selected passage
  const qm = QUOTE.menu; QUOTE.menu = function (sel, x, y) { const r = qm.call(QUOTE, sel, x, y), src = M.block(sel.src);
    if (src && src.kind === 'html' && sel.frame) { const pop = $('.pop.q-menu') || [...$$('.pop')].pop(), row = pop && $('.q-cols', pop);
      if (row) row.append(h('button.btn.xs', { title: 'A note on this passage, pinned in the page', on: { click: () => { closePop(); const w = { exact: sel.exact, prefix: sel.prefix, suffix: sel.suffix }; QUOTE.clearSel(sel); HTMLX.write(sel.src, w, x, y); } } }, '✎ Note')); }
    return r; };
  // a note component says where it is pinned
  const bx = DocView.box; DocView.box = function (b) { const el = bx.apply(this, arguments);
    if (el && b && b.quote && b.quote.note) { el.classList.remove('q-box'); el.classList.add('hn-box'); const f = $(':scope > .q-from', el); if (f) f.replaceChildren('✎ pinned in ', h('b', b.quote.file || 'the page'), ' — show it'); }
    return el; };
  // ⋯ on the page: forget what it was left at
  const wm = WIDGETS.html.menu; WIDGETS.html.menu = b => [...wm(b), Object.keys(HTMLX.state(b)).length ? { label: 'Back to how the page starts', sub: 'Forgets the values you left it at', run: () => { delete b.htmlState; DB.put('blocks', b); changed(); } } : null,
    HTMLX.inks(b).length ? { label: 'Export ink labels', sub: 'Each ink label with a crop of the page under it, as an image panel connected to the page', run: () => HTMLX.exportInk(b.id) } : null];
}
