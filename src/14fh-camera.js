/* ==========================================================================
   14fh · Take a photo into the note (V4.93 — Gabe, 20 Nov: "Include a
   capture image in quick cast that routes to the device's camera to take a
   picture, and logs it into the note you were in as a 1x1 image panel.")
   - The ＋ Quick cast's Photo (lab-mode §11 and its cut, vendor/lab-pills.js)
     and /photo open the camera: what it sees, live; Take; then Retake or
     Use it. Used, the picture goes into the note you were in as a 1×1 image
     panel, "Photo · 16:20", in the middle of what you see.
   - The back camera first on a tablet or a phone (Settings: or the front);
     with two cameras, ⇄ switches. Where the browser cannot reach a camera
     (no permission, none attached, an insecure page) the device's own
     camera or file chooser opens instead (capture="environment").
   - The picture is kept as a JPEG at most the size set in Settings; nothing
     leaves the device but the notebook's own sync.
   Settings → Pen & touch → Photo from the camera (camera, 20a).
   CAMERA: on() · take(d, pane) · log(d, file, pane) · fallback(d, pane)
   ========================================================================== */
const CAMERA = {
  ICON: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.83 6.18A2.31 2.31 0 0 1 5.19 7.23c-.38.05-.76.11-1.13.18C3 7.58 2.25 8.5 2.25 9.57V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.57c0-1.07-.75-1.99-1.8-2.17-.38-.06-.76-.12-1.14-.17a2.31 2.31 0 0 1-1.64-1.06l-.82-1.31a2.19 2.19 0 0 0-1.74-1.04 48.8 48.8 0 0 0-5.23 0 2.19 2.19 0 0 0-1.74 1.04l-.82 1.31Z"/><path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"/></svg>',
  on: () => typeof FEAT === 'undefined' || FEAT.on('camera'),
  tn(k, d) { try { const v = FEAT.tune('camera', k); return v == null ? d : v; } catch (e) { return d; } },
  stream: null, facing: null,
  stop() { try { if (CAMERA.stream) CAMERA.stream.getTracks().forEach(t => t.stop()); } catch (e) { } CAMERA.stream = null; },
  paneOf(d, pane) { return (pane && pane.paper && pane.docId === d.id) ? pane : (App.panes ? App.panes() : []).find(p => p && p.paper && p.docId === d.id) || null; },
  /** The camera: live, Take, then Retake / Use it. */
  async take(d, pane) {
    d = d || M.doc((pane || DocView).docId); if (!d) return toast('Open a note first — the photo goes into it');
    if (!CAMERA.on()) return toast('Photos from the camera are off — Settings → Pen & touch → Photo from the camera');
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return CAMERA.fallback(d, pane);
    CAMERA.facing = CAMERA.facing || CAMERA.tn('facing', 'environment');
    const video = h('video.cam-v', { autoplay: true, playsinline: true, muted: true }), shot = h('img.cam-shot', { alt: 'The photo taken', hidden: true }), msg = h('p.cam-msg', 'Asking for the camera…');
    let blob = null;
    const go = h('button.btn.pri.cam-take', { type: 'button', disabled: true, on: { click: () => snap() } }, 'Take'),
      again = h('button.btn.cam-again', { type: 'button', hidden: true, on: { click: () => { blob = null; shot.hidden = true; video.hidden = false; again.hidden = use.hidden = true; go.hidden = false; } } }, 'Retake'),
      use = h('button.btn.pri.cam-use', { type: 'button', hidden: true, on: { click: () => { const f = new File([blob], 'Photo ' + localDate(new Date()) + ' ' + fmtTime(new Date()).replace(':', '') + '.jpg', { type: 'image/jpeg' }); m.close(); CAMERA.log(d, f, pane); } } }, 'Use it'),
      flip = h('button.btn.ghost.cam-flip', { type: 'button', hidden: true, title: 'The other camera', on: { click: () => { CAMERA.facing = CAMERA.facing === 'user' ? 'environment' : 'user'; start(); } } }, '⇄');
    const start = async () => {
      CAMERA.stop(); go.disabled = true; msg.hidden = false; msg.textContent = 'Asking for the camera…';
      try { CAMERA.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CAMERA.facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        video.srcObject = CAMERA.stream; await video.play().catch(() => { }); msg.hidden = true; go.disabled = false;
        try { const devs = await navigator.mediaDevices.enumerateDevices(); flip.hidden = devs.filter(x => x.kind === 'videoinput').length < 2; } catch (e) { }
      } catch (e) { CAMERA.stop(); m.close(); toast('The camera could not be reached (' + (e && e.name || 'no camera') + ') — choose a picture instead', 3200); CAMERA.fallback(d, pane); }
    };
    const snap = () => {
      const W = video.videoWidth || 1280, H = video.videoHeight || 720, max = +CAMERA.tn('size', '2048') || 2048, k = Math.min(1, max / Math.max(W, H));
      const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k); c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      c.toBlob(b => { if (!b) return toast('The photo could not be taken'); blob = b; shot.src = URL.createObjectURL(b); shot.hidden = false; video.hidden = true; go.hidden = true; again.hidden = use.hidden = false; }, 'image/jpeg', .9);
    };
    const m = modal({ title: 'Photo — into “' + (d.title || 'this note') + '”', wide: true, body: h('div.cam', h('div.cam-stage', video, shot, msg), h('div.cam-bar', flip, h('span.spacer'), again, go, use)), actions: [{ label: 'Cancel' }], onClose: () => CAMERA.stop() });
    start();
  },
  /** Where the browser cannot reach a camera: the device's own camera, or a file. */
  fallback(d, pane) { const i = h('input', { type: 'file', accept: 'image/*', capture: CAMERA.tn('facing', 'environment') }); i.onchange = () => { const f = i.files && i.files[0]; if (f) CAMERA.log(d, f, pane); }; i.click(); },
  /** The picture into the note: a 1×1 image panel in the middle of what you see. */
  log(d, file, pane) {
    const P = CAMERA.paneOf(d, pane); let at = { x: 0, y: 200 };
    try { if (P) { const r = P.paper.rect(), c = P.paper.toWorld(r.left + r.width / 2, r.top + r.height / 2); at = { x: c.x - 210, y: c.y - 160 }; } else if (typeof MOVE !== 'undefined' && MOVE.spot) at = MOVE.spot(d); } catch (e) { }
    DB.beginGroup('Photo'); const b = FIG.create(d, at, 1, 1, [file]); const cur = M.block(b.id); cur.label = 'Photo · ' + fmtTime(new Date()); cur.w = 420; cur.fig.letters = false; DB.put('blocks', cur); changed();
    toast('Photo in “' + (d.title || 'the note') + '” — a 1×1 image panel · Ctrl+Z takes it out', 2600);
    if (!P || App.route.name !== 'doc') App.openComponent(b.id); return cur;
  },
  preview() {
    const back = CAMERA.tn('facing', 'environment') !== 'user';
    return [h('div.pv-cam', h('div.pv-camv', h('span.pv-camsub'), h('b', back ? 'Back camera' : 'Front camera'), h('i', 'Take')), h('span.pv-camar', '→'), h('div.pv-camp', h('span.pv-camh', 'Photo · 16:20'), h('span.pv-camimg'))),
      PV.cap('The ＋ Quick cast’s Photo (and /photo) opens the camera — the ' + (back ? 'back' : 'front') + ' one first. Take, then Use it: the picture goes into the note you were in as a 1×1 image panel, at most ' + CAMERA.tn('size', '2048') + ' px on its long side.')];
  },
};
{
  if (typeof CMD !== 'undefined' && CMD.add) CMD.add({ slash: 'photo', label: 'Photo — take a picture with this device’s camera into this note', args: [], alias: ['camera', 'snap'], group: 'Note', sub: 'A 1×1 image panel in the middle of what you see',
    run: (A, ctx) => { const d = (ctx && ctx.doc) || M.doc(DocView.docId); if (!d) throw new Error('Open a note first'); CAMERA.take(d, ctx && ctx.pane); } });
}
