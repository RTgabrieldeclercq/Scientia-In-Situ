/* ==========================================================================
   13zzm · Snip a figure, a table or an equation out of an HTML page onto the
   canvas (V3.961, Gabe: "add the snip figure from PDFs to HTMLs") — what
   13zza does for a PDF, for a page.
   • Point at a figure in the page (the card, the maximised page or the page
     read beside the note) and it is outlined with "＋ Figure · its title":
     click it and it becomes an image panel on top of the page (over the
     place it came from when the card shows it), titled with its heading,
     its caption from the page under it, "from <file>" to go back to it.
     The scissors (the card's tools, the maximised page's bar, beside): every
     figure outlined, click one or drag a box round anything (Picture or
     Equation); Esc or the scissors again ends it. V3.962: on the card the
     scissors are "Snip figure" in its header, outside the page; a snip ends
     clip mode, and one from the maximised page brings you back to the note.
   • What a figure is: an SVG, a canvas, a picture, a video, a table or a
     <figure>, at least 72 × 56 (a table under 2400 px tall), with the box
     around it that holds it and nothing else of its size — its heading, its
     legend, its caption (a page drawn by its own scripts, as exported
     reports and plots are, is read after it has drawn). The heading becomes
     the label, text beside the drawing the caption; the picture is the
     drawing with its legend (a box of several parts is drawn whole with its
     heading and caption left out). A display equation (KaTeX, MathJax, MathML) is
     one too: KaTeX's own LaTeX goes straight into the equation editor.
   • The picture: the page's frozen copy (13zze, its SVG with the styles it
     was drawn with) drawn by html2canvas — that element alone, on the colour
     it sits on, about 1600 px wide; a box, the page's part under it.
   • A clip is an image panel (an equation component) with `clip` { src,
     media, kind: 'html', at (the element's path), rect (0–1 of the page),
     label, file } and a "clipped from" wire, as a PDF's.
   The page stays sandboxed: SCRIPT, added to its copy (13zw QUOTE.more),
   finds and outlines the figures and says which was picked.
   ========================================================================== */
const HSNIP = {
  on: new Set(), busy: false,
  SCRIPT: `<script>(function(){var P=window.parent,OK=false,MODE=false,INK=false,FIGS=null,AT=0,DIRTY=true,L=null,CAP=null,HOT=null,DRAG=null,ASK=null;
var EQ='.katex-display,mjx-container[display="true"],math[display="block"]',ART='svg,canvas,img,video,button,input,select,textarea,i,[class*="swatch"],[class*="legend"],[class*="key"],[style*="background"]';
function kids(p){return [].filter.call(p.children,function(c){return !(c.tagName==='MARK'&&c.classList.contains('sis-q'));});}
function pathOf(el){var a=[];while(el&&el.parentElement&&el!==document.body){a.unshift(kids(el.parentElement).indexOf(el));el=el.parentElement;}return a.join('/');}
function byPath(s){var el=document.body;if(!s)return el;var a=String(s).split('/');for(var i=0;i<a.length&&el;i++)el=kids(el)[+a[i]];return el||null;}
function R(el){var q=el.getBoundingClientRect();return {x:q.left+scrollX,y:q.top+scrollY,w:q.width,h:q.height};}
function shown(el){var q=el.getBoundingClientRect();if(q.width<2||q.height<2)return false;var cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>.05;}
function ours(el){return !!(el.closest&&el.closest('.sis-snip,.sis-ink,.sis-note'));}
function txt(el){return String(el.innerText||el.textContent||'').replace(/\\s+/g,' ').trim();}
function drawings(){var out=[];[].forEach.call(document.querySelectorAll('svg,canvas,img,video,table,figure,'+EQ),function(el){if(ours(el))return;var t=el.tagName.toLowerCase(),eq=el.matches(EQ),up=el.parentElement;
if(up&&up.closest(EQ))return;if(t==='svg'&&up&&up.closest('svg'))return;if(t!=='figure'&&up&&up.closest('figure'))return;if(t==='table'&&up&&up.closest('table'))return;
if(!shown(el))return;var q=el.getBoundingClientRect();if(!eq&&(q.width<72||q.height<56))return;if(t==='table'&&(q.height>2400||!el.rows||el.rows.length<2))return;out.push(el);});return out;}
function frameOf(g,all){if(g.tagName.toLowerCase()==='figure'||g.matches(EQ))return g;var f=g,q=g.getBoundingClientRect(),A=q.width*q.height,tg=txt(g).length;
for(var p=g.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){var r=p.getBoundingClientRect();
if(all.some(function(o){return o!==g&&p.contains(o)&&!g.contains(o);}))break;
if(r.width*r.height>A*3.2+20000||r.height>q.height+340||r.width>Math.max(q.width*1.8,q.width+380))break;
if(txt(p).length-tg>700)break;f=p;}return f;}
function plain(c){return !c.matches(ART)&&!c.querySelector(ART);}
function before(a,b){return !!(a.compareDocumentPosition(b)&4);}
function headIn(f,g){var w=document.createTreeWalker(f,1,null),n;while((n=w.nextNode())){if(g.contains(n)||n.contains(g)||!shown(n))continue;var own=[].filter.call(n.childNodes,function(x){return x.nodeType===3;}).map(function(x){return x.nodeValue;}).join(' ').replace(/\\s+/g,' ').trim();
if(own&&own.length<120&&(/^H[1-6]$/.test(n.tagName)||/^(B|STRONG)$/.test(n.tagName)||/title|head/i.test(n.className&&n.className.baseVal==null?n.className:'')||+getComputedStyle(n).fontWeight>=600))return txt(n).slice(0,120);}return '';}
function headBefore(g){var H=[].filter.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6'),function(x){return before(x,g)&&!ours(x)&&shown(x);});return H.length?txt(H[H.length-1]).slice(0,120):'';}
function describe(g,all){var f=frameOf(g,all),t=g.tagName.toLowerCase(),eq=g.matches(EQ),F={kind:eq?'equation':t==='table'?'table':'figure',label:'',cap:[],tex:'',num:'',hide:[]},art=[],words=[];
if(f===g){art=[g];if(t==='figure'){var fc=g.querySelector('figcaption');if(fc){F.cap.push(txt(fc));art=[].filter.call(g.children,function(c){return c!==fc&&shown(c);});if(!art.length)art=[g];}}}
else [].forEach.call(f.children,function(c){if(!shown(c)||ours(c))return;if(c===g||c.contains(g)){art.push(c);return;}if(plain(c)){var s=txt(c);if(!s)return;words.push(c);if(!F.label&&!art.length&&s.length<160){F.label=s;return;}F.cap.push(s);return;}art.push(c);});
if(!art.length)art=[g];
if(!F.label)F.label=headIn(f,g)||g.getAttribute('aria-label')||g.getAttribute('title')||(t==='svg'&&g.querySelector('title')?txt(g.querySelector('title')):'')||g.getAttribute('alt')||headBefore(g);
if(eq){var an=g.querySelector('annotation[encoding="application/x-tex"]');if(an)F.tex=an.textContent.trim();var tg=g.querySelector('.tag,mjx-mtd.mjx-tag,mjx-labels');if(tg)F.num=txt(tg).replace(/[^0-9a-z.]/gi,'');}
var u=null;art.forEach(function(c){var r=R(c);u=u?{x:Math.min(u.x,r.x),y:Math.min(u.y,r.y),w:Math.max(u.x+u.w,r.x+r.w)-Math.min(u.x,r.x),h:Math.max(u.y+u.h,r.y+r.h)-Math.min(u.y,r.y)}:r;});
var tgt=art.length===1?art[0]:f,fr=R(tgt);
if(/^(svg|canvas|img|video|math)$/.test(tgt.tagName.toLowerCase())&&tgt.parentElement){var pr=R(tgt.parentElement);if(pr.x<=fr.x+1&&pr.y<=fr.y+1&&pr.x+pr.w>=fr.x+fr.w-1&&pr.y+pr.h>=fr.y+fr.h-1){tgt=tgt.parentElement;fr=pr;}}
var pad=6,cx=Math.max(fr.x,u.x-pad),cy=Math.max(fr.y,u.y-pad),cw=Math.min(fr.x+fr.w,u.x+u.w+pad)-cx,ch=Math.min(fr.y+fr.h,u.y+u.h+pad)-cy;
F.art={x:Math.max(0,u.x-pad),y:Math.max(0,u.y-pad),w:u.w+2*pad,h:u.h+2*pad};F.target=pathOf(tgt);F.size=[fr.w,fr.h];
F.crop=Math.abs(cx-fr.x)<1&&Math.abs(cy-fr.y)<1&&Math.abs(cw-fr.w)<1&&Math.abs(ch-fr.h)<1?null:[cx-fr.x,cy-fr.y,cw,ch];
if(tgt===f&&art.length>1){F.hide=words.map(pathOf);F.crop=null;}F.cap=F.cap.join('\\n').slice(0,1500);return F;}
function figs(){if(FIGS&&!DIRTY&&Date.now()-AT<1500)return FIGS;var all=drawings();FIGS=all.map(function(g){try{return describe(g,all);}catch(x){return null;}}).filter(Boolean);AT=Date.now();DIRTY=false;return FIGS;}
function short(F){var m=/^\\s*((?:fig(?:ure)?|table|scheme|eq(?:uation)?)\\.?\\s*S?\\d+[a-z]?)/i.exec(F.label||F.cap||'');if(m)return {n:m[1].replace(/^fig(?:ure)?\\.?\\s*/i,'Figure ').replace(/^table\\s*/i,'Table ').replace(/^eq(?:uation)?\\.?\\s*/i,'Equation ').replace(/\\s+/g,' '),own:true};return {n:F.kind==='equation'?(F.num?'Equation '+F.num:'Equation'):F.kind==='table'?'Table':'Figure',own:false};}
function badge(F){var s=short(F),l=F.label||'';return s.n+(!s.own&&l?' \\u00b7 '+(l.length>28?l.slice(0,27)+'\\u2026':l):'');}
function page(){return [Math.max(document.documentElement.scrollWidth,innerWidth),Math.max(document.documentElement.scrollHeight,innerHeight)];}
function rect(r){return [r.x,r.y,r.w,r.h];}
function client(r){return [r.x-scrollX,r.y-scrollY,r.w,r.h];}
function go(F){P.postMessage({sis:'snip',fig:{kind:F.kind,label:F.label,cap:F.cap,tex:F.tex,num:F.num,name:short(F).n,target:F.target,crop:F.crop,hide:F.hide,size:F.size,art:rect(F.art)},client:client(F.art),page:page()},'*');}
function layer(){if(!L||!L.isConnected){L=document.createElement('div');L.className='sis-snip';document.documentElement.appendChild(L);}return L;}
function outline(F){var a=F.art,d=document.createElement('div'),b=document.createElement('button');d.className='sis-snip-hs'+(F.kind==='equation'?' eq':'')+(a.h<64?' low':'');d.style.cssText='left:'+a.x+'px;top:'+a.y+'px;width:'+a.w+'px;height:'+a.h+'px';
b.type='button';b.className='sis-snip-b';b.textContent='\\uff0b '+badge(F);b.title=(F.label?F.label+'\\n':'')+(F.kind==='equation'?'Into an equation on top of the page (checked by you first)':'Put it on the canvas, on top of the page');
b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();go(F);});d.appendChild(b);return d;}
function paint(){var g=layer();if(!OK||INK){g.replaceChildren();return;}var list=MODE?figs():HOT?[HOT]:[];
if(MODE){if(!CAP){CAP=document.createElement('div');CAP.className='sis-snip-cap';}var p=page();CAP.style.width=p[0]+'px';CAP.style.height=p[1]+'px';if(CAP.parentNode!==g)g.insertBefore(CAP,g.firstChild);}else if(CAP)CAP.remove();
[].slice.call(g.children).forEach(function(c){if(c!==CAP)c.remove();});   // the capture layer stays put: a box being drawn holds the pointer on it
list.forEach(function(F){g.appendChild(outline(F));});if(DRAG&&DRAG.mq)g.appendChild(DRAG.mq);if(ASK){g.appendChild(ASK.bar);g.appendChild(ASK.keep);}document.documentElement.classList.toggle('sis-snipping',MODE);}
function hit(x,y){var best=null;figs().forEach(function(F){var a=F.art;if(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h&&(!best||a.w*a.h<best.art.w*best.art.h))best=F;});return best;}
function holder(r){var cx=r.x+r.w/2-scrollX,cy=r.y+r.h/2-scrollY,el=[].filter.call(document.elementsFromPoint(cx,cy),function(x){return !ours(x);})[0];   // the smallest element holding the box: drawn alone, it is quick
for(;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){var q=R(el);if(q.x<=r.x+1&&q.y<=r.y+1&&q.x+q.w>=r.x+r.w-1&&q.y+q.h>=r.y+r.h-1)return /^(svg|canvas|img|video|math)$/i.test(el.tagName)?el.parentElement:el;}return null;}
function off(){if(!MODE)return;MODE=false;DRAG=null;ASK=null;paint();P.postMessage({sis:'snipoff'},'*');}
function ask(r){var keep=document.createElement('div'),bar=document.createElement('div');keep.className='sis-snip-mq kept';keep.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px';
bar.className='sis-snip-ask';var low=r.y+r.h+40<page()[1];bar.style.cssText='left:'+r.x+'px;top:'+(low?r.y+r.h+6:Math.max(0,r.y-34))+'px';
[['Picture','An image panel of this part of the page, on top of it','picture'],['Equation','Read it into an equation on top of the page (checked by you first)','equation'],['\\u2715','Never mind','']].forEach(function(o){var b=document.createElement('button');b.type='button';b.textContent=o[0];b.title=o[1];
b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();ASK=null;paint();if(!o[2])return;var h=holder(r),q=h&&R(h);P.postMessage({sis:'snipbox',as:o[2],rect:rect(r),client:client(r),page:page(),target:h?pathOf(h):null,crop:q?[r.x-q.x,r.y-q.y,r.w,r.h]:null,size:q?[q.w,q.h]:null},'*');});bar.appendChild(b);});
ASK={bar:bar,keep:keep};paint();}
window.addEventListener('pointerdown',function(e){var t=e.target;if(!t.closest)return;if(t.closest('.sis-snip-b,.sis-snip-ask')){e.stopPropagation();return;}if(!t.closest('.sis-snip-cap')||e.button>0)return;e.preventDefault();e.stopPropagation();
ASK=null;var x0=e.pageX,y0=e.pageY,mq=document.createElement('div');mq.className='sis-snip-mq';DRAG={id:e.pointerId,x0:x0,y0:y0,r:null,mq:null};try{t.setPointerCapture(e.pointerId);}catch(x){}
function mv(ev){if(ev.pointerId!==DRAG.id)return;var x1=ev.pageX,y1=ev.pageY,r={x:Math.min(x0,x1),y:Math.min(y0,y1),w:Math.abs(x1-x0),h:Math.abs(y1-y0)};DRAG.r=r;if(!DRAG.mq&&(r.w>4||r.h>4)){DRAG.mq=mq;paint();}mq.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px';}
function up(ev){if(ev.pointerId!==DRAG.id)return;t.removeEventListener('pointermove',mv);t.removeEventListener('pointerup',up);t.removeEventListener('pointercancel',up);var r=DRAG.r;DRAG=null;if(ev.type==='pointercancel'){paint();return;}
if(r&&r.w>=10&&r.h>=10)return ask(r);paint();var F=hit(x0,y0);if(F)go(F);}
t.addEventListener('pointermove',mv);t.addEventListener('pointerup',up);t.addEventListener('pointercancel',up);},true);
var raf=0,last=null;window.addEventListener('pointermove',function(e){if(!OK||INK||MODE||e.pointerType==='touch'||e.buttons)return;last=e;if(raf)return;raf=requestAnimationFrame(function(){raf=0;var F=hit(last.pageX,last.pageY);if(F!==HOT){HOT=F;paint();}});},{passive:true});
document.documentElement.addEventListener('mouseleave',function(){if(HOT&&!MODE){HOT=null;paint();}});
window.addEventListener('keydown',function(e){if(e.key==='Escape'&&MODE){e.preventDefault();e.stopPropagation();off();}},true);
function dirty(){DIRTY=true;}window.addEventListener('resize',function(){dirty();if(MODE)paint();});document.addEventListener('scroll',dirty,true);
function flash(r){var f=document.createElement('div');f.className='sis-snip-flash';f.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px';layer().appendChild(f);setTimeout(function(){f.remove();},2400);}
window.addEventListener('message',function(e){var d=e.data||{};
if(d.sis==='snipset'){OK=!!d.ok;MODE=OK&&!!d.mode;HOT=null;ASK=null;dirty();paint();}
else if(d.sis==='ink'){INK=!!d.on;HOT=null;paint();}
else if(d.sis==='snipgoto'){var el=d.at?byPath(d.at):null,p=page(),r=el&&el!==document.body?null:d.rect?{x:d.rect[0]*p[0],y:d.rect[1]*p[1],w:d.rect[2]*p[0],h:d.rect[3]*p[1]}:null;
if(el&&el!==document.body){el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(function(){flash(R(el));},500);}else if(r){scrollTo({top:Math.max(0,r.y-60),behavior:'smooth'});setTimeout(function(){flash(r);},500);}}});
function watch(){if(window.MutationObserver&&document.body)new MutationObserver(dirty).observe(document.body,{childList:true,subtree:true});}
var st=document.createElement('style');st.textContent='.sis-snip{position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147482980;pointer-events:none}'
+'.sis-snip-hs{position:absolute;box-sizing:border-box;border:2px dashed rgba(13,124,112,.85);border-radius:4px;background:rgba(13,124,112,.06);pointer-events:none}.sis-snip-hs.eq{border-color:rgba(10,132,194,.85);background:rgba(10,132,194,.06)}'
+'.sis-snip-b{position:absolute;left:6px;top:6px;pointer-events:auto;border:0;border-radius:5px;padding:4px 9px;font:600 11.5px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;background:#0d7c70;color:#fff;cursor:pointer;white-space:nowrap;box-shadow:0 1px 5px rgba(0,0,0,.25);max-width:none}'
+'.sis-snip-hs.eq .sis-snip-b{background:#0a84c2}.sis-snip-hs.low .sis-snip-b{top:-28px;left:0}.sis-snip-b:hover{filter:brightness(1.12)}'
+'.sis-snip-cap{position:absolute;left:0;top:0;pointer-events:auto;cursor:crosshair;touch-action:none;background:rgba(13,124,112,.03)}html.sis-snipping .sis-snip-hs{border-style:solid;border-width:1.5px}'
+'.sis-snip-mq{position:absolute;box-sizing:border-box;border:1.5px solid #0d7c70;background:rgba(13,124,112,.12);pointer-events:none}'
+'.sis-snip-ask{position:absolute;display:flex;gap:4px;pointer-events:auto;padding:3px;border-radius:7px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25)}.sis-snip-ask button{border:1px solid #d5d8da;background:#fff;color:#1b1b1a;border-radius:5px;padding:3px 9px;font:500 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer}.sis-snip-ask button:hover{background:#eef3f2}'
+'.sis-snip-flash{position:absolute;box-sizing:border-box;outline:3px solid #e08a00;background:rgba(255,160,0,.16);border-radius:4px;pointer-events:none}';
(document.head||document.documentElement).appendChild(st);
if(document.readyState==='complete')setTimeout(watch,0);else window.addEventListener('load',function(){setTimeout(watch,0);});
P.postMessage({sis:'snipready'},'*');})();<\/script>`,

  /** May this page be snipped: an HTML component, live, not in a note seen as it stood or an exported note (box: its card). */
  editable(b, box) {
    if (!b || b.kind !== 'html' || b.status !== 'live' || (typeof VIEWER !== 'undefined' && VIEWER)) return false;
    const pane = box && DV(box); if (pane) return !pane.travel && box.dataset.id === b.id;
    return !App.panes().some(p => p.travel && p.docId === b.docId);
  },
  ok: fr => !!(fr && fr._qsrc) && HSNIP.editable(M.block(fr._qsrc), fr.closest('.box')),
  set(srcId) { HTMLX.frames(srcId).forEach(fr => fr.contentWindow.postMessage({ sis: 'snipset', ok: HSNIP.ok(fr), mode: HSNIP.on.has(srcId) }, '*')); },
  /** The scissors: every figure outlined, a box drawn anywhere. */
  btn(b, cls = 'button.clip-btn.hs-btn', text = '') {
    const el = h(cls + (HSNIP.on.has(b.id) ? '.on' : ''), { type: 'button', 'data-for': b.id, title: 'Snip a figure — every figure outlined: click one, or drag a box round anything (Esc ends)', on: { click: e => { e.stopPropagation(); e.preventDefault(); HSNIP.toggle(b.id); } } });
    el.innerHTML = CLIP.ICON + (text ? ' ' + text : ''); return el;
  },
  /** V3.962: a snip ends clip mode; from the maximised page it brings you back to the note, where the snip is. */
  after(src, fr) { HSNIP.toggle(src.id, false); const ov = fr && fr.closest('.embed-max'); if (ov && !ov.classList.contains('rd-docked')) MXHL.close(ov); },
  toggle(id, on) { on = on == null ? !HSNIP.on.has(id) : on; on ? HSNIP.on.add(id) : HSNIP.on.delete(id); $$(`.hs-btn[data-for="${id}"]`).forEach(b => b.classList.toggle('on', on)); HSNIP.set(id); },
  /** The picture: the page's copy drawn by html2canvas — the element alone (o.target), or the part under a box (o.rect, page px). */
  async canvas(fr, o, px) {
    const fz = await HTMLX.ask(fr, { sis: 'freeze', mark: o.target || null, hide: o.hide || [] }, 30000);
    if (!o.target) { const r = o.rect, s = Math.min(clamp(px / Math.max(40, r[2]), 1.5, 3), 6000 / Math.max(r[2], r[3])); return HTMLX.render(fz, r, { scale: s, canvas: true }); }
    const W = (o.size && o.size[0]) || 600, H = (o.size && o.size[1]) || 400, aw = o.crop ? o.crop[2] : W, s = Math.max(.5, Math.min(clamp(px / Math.max(40, aw), 1.5, 3), 6000 / Math.max(W, H), Math.sqrt(30e6 / Math.max(1, W * H))));
    const cv = await HTMLX.render(fz, null, { mark: true, scale: s, canvas: true }); if (!o.crop) return cv;
    const k = cv.width / W, c = o.crop, out = h('canvas', { width: Math.max(1, Math.round(c[2] * k)), height: Math.max(1, Math.round(c[3] * k)) });
    out.getContext('2d').drawImage(cv, Math.round(c[0] * k), Math.round(c[1] * k), out.width, out.height, 0, 0, out.width, out.height); cv.width = cv.height = 0; return out;
  },
  /** Where a new clip goes, w wide: over the place it came from when the card shows it, else as a PDF's (13zza CLIP.spot). */
  spot(src, fr, c, w) {
    const box = fr && fr.closest('.box'), pane = box && DV(box);
    if (c && pane && pane.paper && box.dataset.id === src.id) { const r = fr.getBoundingClientRect(), k = r.width / (fr.clientWidth || r.width || 1), sx = r.left + c[0] * k, sy = r.top + c[1] * k, pr = pane.paper.rect();
      if (sx >= Math.max(pr.left, r.left) && sx < Math.min(pr.right, r.right) && sy >= Math.max(pr.top, r.top) && sy < Math.min(pr.bottom, r.bottom)) { const p = pane.paper.toWorld(sx, sy); return { x: p.x + 14, y: p.y + 14 }; } }
    return CLIP.spot(src, 0, null, w);
  },
  clipOf(src, o, page, label) { const rec = MEDIA.get(src.media), r = o.rect, W = page && page[0] || 1, H = page && page[1] || 1;
    return { src: src.id, media: src.media, kind: 'html', at: o.target || null, rect: [r[0] / W, r[1] / H, r[2] / W, r[3] / H].map(v => +clamp(v, 0, 1).toFixed(4)), label, file: rec ? rec.name.replace(/\.html?$/i, '') : (src.label || 'the page') }; },
  async picture(src, fr, o, page, client, label, caption) {
    if (HSNIP.busy) return; HSNIP.busy = true; toast('Snipping ' + (label || 'the page') + '…', 6000);
    try {
      const cv = await HSNIP.canvas(fr, o, 1600), blob = await new Promise(res => cv.toBlob(res, 'image/webp', .92)) || await new Promise(res => cv.toBlob(res, 'image/png')); cv.width = cv.height = 0;
      if (!blob) throw new Error('the picture could not be made');
      const clip = HSNIP.clipOf(src, o, page, label || 'Clip'), ext = blob.type === 'image/png' ? 'png' : 'webp';
      DB.beginGroup('clip');
      const rec = await MEDIA.add(new File([blob], `${clip.label} · ${clip.file}.${ext}`.replace(/[\\/:*?"<>|]+/g, '-'), { type: blob.type })), w = rec.w >= rec.h * .9 ? 476 : 336;
      const b = FIG.create(M.doc(src.docId), HSNIP.spot(src, fr, client, w), 1, 1); FIG.cells(b)[0].media = rec.id; b.fig.letters = false; b.label = clip.label; b.w = w; CLIP.lift(b); b.clip = clip;
      M.saveBlockBody(b, { text: caption || '', marks: [] }); FIG.save(b); M.wire(b.id, src.id, CLIP.REL, true); changed(); HSNIP.after(src, fr); CLIP.fresh(b);
      $$('#toasts > *').forEach(t => t.remove()); toast(b.label + ' is on top of the page: drag it where you want it');
    } catch (e) { $$('#toasts > *').forEach(t => t.remove()); toast('Could not snip that: ' + (e.message || e)); }
    finally { HSNIP.busy = false; }
  },
  /** An equation: KaTeX's own LaTeX, else a snip read (CLIP.read) or typed against — checked in the editor (13zza CLIP.eqEdit). */
  async equation(src, fr, o, page, client, label, tex) {
    if (HSNIP.busy) return; let snip = null;
    if (!tex) { HSNIP.busy = true; try { const cv = await HSNIP.canvas(fr, o, 1000); snip = cv.toDataURL('image/jpeg', .9); cv.width = cv.height = 0; } catch (e) { return toast('Could not snip that: ' + (e.message || e)); } finally { HSNIP.busy = false; } }
    const clip = HSNIP.clipOf(src, o, page, label || 'Equation'); HSNIP.toggle(src.id, false);
    CLIP.eqEdit(src, { snip, tex, at: HSNIP.spot(src, fr, client, 392), name: clip.label, title: clip.label + ' · ' + clip.file, clip, ready: tex ? 'The page’s own LaTeX — check it, then Done.' : '', done: () => HSNIP.after(src, fr) });
  },
  /** Back to where a clip came from: the page maximised or beside the note if either shows it, else its card. */
  show(fig) {
    const c = fig && fig.clip, src = c && M.block(c.src); if (!src || src.status !== 'live') return toast('The page it came from is gone');
    const go = () => { const fs = HTMLX.frames(src.id), mx = fs.filter(f => f.closest('.embed-max')); (mx.length ? mx : fs).forEach(f => f.contentWindow.postMessage({ sis: 'snipgoto', at: c.at || null, rect: c.rect }, '*')); };
    if (HTMLX.frames(src.id).some(f => f.closest('.embed-max'))) return go();
    App.jump(src.id, null); setTimeout(go, 500);
  },
};
QUOTE.more = (more => srcId => (more ? more(srcId) : '') + HSNIP.SCRIPT)(QUOTE.more);
{
  window.addEventListener('message', e => { const d = e.data; if (!d || !d.sis || !/^snip/.test(d.sis)) return;
    const fr = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source); if (!fr || !fr._qsrc) return; const src = M.block(fr._qsrc); if (!src) return;
    if (d.sis === 'snipready') return fr.contentWindow.postMessage({ sis: 'snipset', ok: HSNIP.ok(fr), mode: HSNIP.on.has(src.id) }, '*');
    if (d.sis === 'snipoff') return HSNIP.toggle(src.id, false);
    if (!HSNIP.ok(fr)) return;
    if (d.sis === 'snip' && d.fig) { const f = d.fig, o = { target: f.target, crop: f.crop, hide: f.hide, size: f.size, rect: f.art }, label = f.kind === 'equation' ? f.name : (f.label || f.name);
      return f.kind === 'equation' ? HSNIP.equation(src, fr, o, d.page, d.client, f.name, f.tex) : HSNIP.picture(src, fr, o, d.page, d.client, label, f.cap); }
    if (d.sis === 'snipbox' && d.rect) { const o = d.target ? { target: d.target, crop: d.crop, size: d.size, rect: d.rect } : { rect: d.rect }; return d.as === 'equation' ? HSNIP.equation(src, fr, o, d.page, d.client, 'Equation', '') : HSNIP.picture(src, fr, o, d.page, d.client, 'Clip', ''); }
  });
  // the scissors: "Snip figure" in the card's header (13zg docks the card's bar there, V3.962), the maximised page's bar, the bar of the page read beside the note
  SLIM.BARS.html = '.hs-bar';
  const eb = WIDGETS.html.body; WIDGETS.html.body = function (b, d, pane, ro) { const w = eb.apply(this, arguments); if (!ro && w && w.classList && w.classList.contains('embed') && HSNIP.editable(b, null)) w.append(h('div.hs-bar', HSNIP.btn(b, 'button.btn.xs.clip-btn.hs-btn', 'Snip figure'))); return w; };   // the card's body (V3.961 wrapped EMBED.body, which the card does not call)
  const em = EMBED.max; EMBED.max = function (b) { const r = em.apply(this, arguments), ov = [...$$('.embed-max')].pop(), bar = ov && $(':scope > .em-bar', ov);
    if (bar && HSNIP.editable(M.block(b.id), null)) { const at = [...bar.children].find(x => /Export ink labels/.test(x.textContent)) || $('a.btn', bar); const s = HSNIP.btn(b, 'button.btn.sm.clip-btn.hs-btn', 'Snip'); at ? at.after(s) : bar.append(s); }
    return r; };
  const ro = RDOCK.open; RDOCK.open = function (b) { const r = ro.apply(this, arguments), st = RDOCK.st;
    if (st && b && st.id === b.id && b.kind === 'html' && st.hl && !$('.hs-btn', st.hl.parentNode)) st.hl.before(HSNIP.btn(b, 'button.btn.xs.clip-btn.hs-btn'));
    return r; };
  // Esc ends clip mode first (the maximised view would close on it)
  window.addEventListener('keydown', e => { if (e.key !== 'Escape' || !HSNIP.on.size || $('.ovl')) return; e.preventDefault(); e.stopPropagation(); [...HSNIP.on].forEach(id => HSNIP.toggle(id, false)); }, true);
}
