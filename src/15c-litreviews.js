/* ==========================================================================
   15c · Literature reviews. A review is a literature note outside any project
   that carries review { topic, projectIds }: a canvas of papers, quotes and
   notes on one question, linked to every project it serves. The same record
   the lab website's Lit reviews tab makes, so a review written here shows
   there and back. Its own tab after Portfolio; its head box holds the topic
   and the projects; reviews are not quick notes.
   On the website the lab layer draws its own tab and head box over the same
   data — this module then leaves the drawing to it (window.SIS_LAB).
   ========================================================================== */
const LITREV = {
  is: d => !!(d && !d.deleted && d.review && typeof d.review === 'object'),
  all: () => DB.where('documents', d => LITREV.is(d)).sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || ''))),
  projects: d => LITREV.is(d) ? (d.review.projectIds || []).map(id => M.project(id)).filter(Boolean) : [],
  of: pid => LITREV.all().filter(d => (d.review.projectIds || []).includes(pid)),
  lab: () => !!window.SIS_LAB,
  filter: '',
  stats(d) {
    const o = { papers: 0, quotes: 0, notes: 0 };
    M.liveBlocks(d.id).forEach(b => { if (b.kind === 'pdf') o.papers++; else if (b.quote) o.quotes++; else o.notes++; });
    return o;
  },
  line(d) { const s = LITREV.stats(d); return [plural(s.papers, 'paper'), plural(s.quotes, 'quote'), plural(s.notes, 'note')].join(' · '); },
  create(pre = {}) {
    const d = M.createDoc({ type: 'literature', projectId: null, themeId: null, title: pre.title || 'Literature review · ' + fmtDay(new Date()), templateId: null });
    const cur = M.doc(d.id);
    cur.review = { topic: pre.topic || '', projectIds: (pre.projectIds || []).filter(id => !!M.project(id)) };
    M.touchDoc(cur);
    App.go('#/doc/' + cur.id);
    return cur;
  },
  set(docId, patch) {
    const d = M.doc(docId); if (!LITREV.is(d)) return;
    d.review = Object.assign({}, d.review, patch); M.touchDoc(d); App.refresh();
  },
  link(docId, pid) {
    const d = M.doc(docId), p = M.project(pid); if (!LITREV.is(d) || !p || (d.review.projectIds || []).includes(pid)) return;
    LITREV.set(docId, { projectIds: [...(d.review.projectIds || []), pid] }); toast('Linked to ' + p.name);
  },
  unlink(docId, pid) {
    const d = M.doc(docId), p = M.project(pid); if (!LITREV.is(d)) return;
    LITREV.set(docId, { projectIds: (d.review.projectIds || []).filter(x => x !== pid) }); toast(p ? 'No longer linked to ' + p.name : 'Unlinked');
  },
  /** projects a review can be linked to: yours, then the ones RM assigned you (not the ones it took back) */
  linkable(d) {
    const have = new Set((d.review && d.review.projectIds) || []), byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
    const ps = DB.all('projects').filter(p => !have.has(p.id) && !p.deleted && p.status !== 'archived' && !(p.rm && p.rmAssigned === false));
    return { assigned: ps.filter(p => p.rm).sort(byName), own: ps.filter(p => !p.rm).sort(byName) };
  },
  /** the review's part of its head box: topic and projects (the title is the note's own, ✎) */
  headFields(d, travel) {
    const stop = e => e.stopPropagation(), rv = d.review || {}, linked = LITREV.projects(d), { assigned, own } = LITREV.linkable(d);
    const topic = h('textarea.hin.lr-topic', { rows: 2, placeholder: 'The question this review asks', disabled: !!travel,
      on: { pointerdown: stop, keydown: stop, change: e => LITREV.set(d.id, { topic: e.target.value.trim() }) } });
    topic.value = rv.topic || '';
    const opt = p => h('option', { value: p.id }, p.name);
    const add = travel ? null : h('select.hin.lr-link', { on: { pointerdown: stop, change: e => { const v = e.target.value; e.target.value = ''; if (v) LITREV.link(d.id, v); } } },
      h('option', { value: '' }, linked.length ? '+ Link another project…' : '+ Link a project…'),
      assigned.length ? h('optgroup', { label: 'Assigned to you' }, assigned.map(opt)) : null, own.length ? h('optgroup', { label: 'Your projects' }, own.map(opt)) : null);
    return h('div.hgrid.lr-head',
      h('label.hf', h('span', 'Topic'), topic),
      h('div.hf', h('span', 'Projects'), h('div.lr-links',
        linked.map(p => h('span.pill.lr-chip', h('a', { title: 'Open the project', on: { click: () => App.go('#/project/' + p.id) } }, p.name),
          travel ? null : h('button.lr-x', { title: 'Unlink this project', on: { pointerdown: stop, click: e => { e.stopPropagation(); LITREV.unlink(d.id, p.id); } } }, '×'))),
        add)));
  },
  card(d) {
    const linked = LITREV.projects(d);
    return h('div.lr-card', { on: { click: () => App.go('#/doc/' + d.id) } },
      h('div.row', h('span.pill', 'Lit review'), h('span.spacer'), h('span.mono.tiny.muted', fmtDay(d.modified))),
      h('div.lr-name', d.title),
      d.review.topic ? h('div.lr-q', snippet(d.review.topic, 200)) : null,
      h('div.tiny.muted', LITREV.line(d)),
      h('div.lr-ps', linked.length ? linked.map(p => h('a.pill' + (p.rm ? '.teal' : ''), { title: 'Open the project', on: { click: e => { e.stopPropagation(); App.go('#/project/' + p.id); } } }, p.name))
        : h('span.tiny.muted', 'Not linked to a project yet')));
  }
};

VIEWS.litreviews = {
  title: true,
  render() {
    const all = LITREV.all(), used = new Map();
    all.forEach(d => LITREV.projects(d).forEach(p => used.set(p.id, p)));
    const f = LITREV.filter && M.project(LITREV.filter) ? LITREV.filter : '', list = f ? all.filter(d => (d.review.projectIds || []).includes(f)) : all;
    const ups = [...used.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    App.setTitle('Lit reviews', [h('span', plural(all.length, 'review'))]);
    return h('div.page.lr-page',
      h('div.eyebrow', 'Research'), h('h1.title', 'Literature reviews'),
      h('p.stand', 'A review is a canvas for researching one topic: the papers, the quotes that matter, and your notes on them. Link it to every project it serves; it shows there too.'),
      h('div.row.lr-bar',
        h('button.btn.pri', { title: 'A blank canvas; its topic and projects are in its first box', on: { click: () => LITREV.create({ projectIds: f ? [f] : [] }) } }, '+ New review'),
        ups.length ? h('select.inp.lr-filter', { on: { change: e => { LITREV.filter = e.target.value; App.refresh(); } } },
          h('option', { value: '' }, 'Every project'), ups.map(p => h('option', { value: p.id, selected: p.id === f }, p.name))) : null),
      list.length ? h('div.lr-grid', list.map(LITREV.card))
        : h('div.empty', all.length ? 'No review is linked to this project yet.' : 'No literature reviews yet. + New review opens a blank canvas; give it a topic and link it to your projects in its first box.'));
  }
};

{ // the tab after Portfolio; a review on screen lights it; reviews are not quick notes; the head box carries the review's fields
  const at = TABS.findIndex(t => t[0] === 'portfolio');
  if (!TABS.some(t => t[0] === 'litreviews')) TABS.splice(at + 1, 0, ['litreviews', 'Lit reviews']);
  TABOF.litreviews = 'litreviews';
  const tabs = App.renderTabs;
  App.renderTabs = function () {
    const r = App.route || {}, d = r.name === 'doc' ? M.doc((r.args || [])[0]) : null, was = TABOF.doc;
    if (LITREV.is(d)) TABOF.doc = 'litreviews';
    try { return tabs.apply(this, arguments); } finally { TABOF.doc = was; }
  };
  const gen = GENERAL.docs;
  GENERAL.docs = function () { return gen.apply(this, arguments).filter(d => !LITREV.is(d)); };
  const head = DocView.headBox;
  DocView.headBox = function (d) {
    const box = head.apply(this, arguments);
    if (LITREV.is(d) && !LITREV.lab()) { const g = $('.hgrid', box); (g ? g.parentNode : box).insertBefore(LITREV.headFields(d, this.travel), g ? g.nextSibling : null); }
    return box;
  };
}
