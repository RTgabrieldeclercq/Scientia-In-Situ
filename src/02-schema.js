/* ==========================================================================
   02 · Schema — the single source of truth for stores, kinds and defaults.
   Export, import, reindex and Settings all READ this. Adding a store is one
   row here (and a DB_VERSION bump so IndexedDB creates it).
   Rule (§1): only what a person authors is stored. Everything else —
   occurrences, backlinks, lineage closure, roll-ups, day stats, review
   panels — is derived in memory by IX and can be thrown away.
   ========================================================================== */
const DB_NAME = 'scientia-in-situ';
const DB_VERSION = 9;

const STORES = {
  settings:  { key: 'id',  doc: 'App settings singleton' },
  profiles:  { key: 'type', doc: 'Note types as data (§4) — a new type is a row' },
  projects:  { key: 'id',  doc: 'Funded, publishable wholes' },
  themes:    { key: 'id',  doc: 'Lines of attack inside a project (with lineage)', idx: ['projectId'] },
  aims:      { key: 'id',  doc: 'Objectives on a theme; weighted milestones; versioned', idx: ['themeId'] },
  documents: { key: 'id',  doc: 'Notes: one session of work', idx: ['projectId', 'themeId', 'type'] },
  blocks:    { key: 'id',  doc: 'Components — the universal atom', idx: ['docId'] },
  items:     { key: 'id',  doc: 'Structures: claim, barrier, resolution… (claims & evidence are project records)', idx: ['kind', 'originDocId'] },
  terms:     { key: 'id',  doc: 'Wikilink terms, project-scoped, importable', idx: ['projectId'] },
  wires:     { key: 'id',  doc: 'Directed connections between components', idx: ['from', 'to'] },
  library:   { key: 'id',  doc: 'Papers & links, full CSL-JSON' },
  blobs:     { key: 'id',  doc: 'Images: journal logos, figures; media kept in the browser until the images folder is reachable' },
  datasets:  { key: 'id',  doc: 'Raw data by reference — folder handle + relative path, size, mtime, head/tail fingerprint; the bytes stay on disk', idx: ['projectId'] },
  views:     { key: 'id',  doc: 'Live views: {source, where (predicate tree), layout table|board|calendar|timeline, columns, formulas, sort, group}' },
  canvases:  { key: 'id',  doc: 'Spatial canvases (lab): nodes are references to components, structures, library entries, datasets; edges are real wires' },
  equations: { key: 'id', doc: 'Registered equations — LaTeX plus a legend of their terms (name, unit); looked up and inserted in any note, solved by linked calculators' },
  reminders: { key: 'id', doc: 'Deadlines, meetings and reminders — time, optional end/place, alert lead, repeat, linked project/theme/note' },
  chores:    { key: 'id',  doc: 'Recurring lab chores (passaging, media changes) — surfaced in the day note and the review, never a task list' },
  media:     { key: 'id',  doc: 'Images, GIFs and videos — the files live in the app’s images/ folder' },
  sessions:  { key: 'id',  doc: 'Time: timer segments, steps, manual entries', idx: ['docId'] },
  flags:     { key: 'id',  doc: 'Review flags with carry count', idx: ['status'] },
  reviews:   { key: 'id',  doc: 'Weekly review decisions (id = week start day)' },
  templates: { key: 'id',  doc: 'Note templates per type', idx: ['type'] },
  verdicts:  { key: 'id',  doc: 'Accepted/dismissed suggested links' },
  inklib:    { key: 'id',  doc: 'Saved ink (the ink library): strokes to place again anywhere' },
  libsets:   { key: 'id',  doc: 'Library themes and groups: {kind: theme | group, name, themeId, paperIds} — a paper can be in several groups' },
  journal:   { key: 'seq', auto: true, doc: 'Append-only change log with previous values (undo, time travel)' },
};
const AUTHORED = Object.keys(STORES);

/** Structure kinds — what Ctrl+Enter can make a phrase into. Spec §3 annotation kinds + §9 takeaway kinds. */
const KINDS = [
  { id: 'claim',       key: 'c', label: 'Claim',       color: '#0E6F66', mode: 'highlight', lifecycle: 'stance', promote: true },
  { id: 'evidence',    key: 'e', label: 'Evidence',    color: '#2F6FB0', mode: 'text',      promote: true },
  { id: 'barrier',     key: 'b', label: 'Barrier',     color: '#B2361F', mode: 'highlight', lifecycle: 'open' },
  { id: 'resolution',  key: 'r', label: 'Resolution',  color: '#1B7A43', mode: 'highlight' },
  { id: 'result',      key: 's', label: 'Result',      color: '#1E5E8C', mode: 'text' },
  { id: 'takeaway',    key: 't', label: 'Takeaway',    color: '#6B4FA3', mode: 'text' },
  { id: 'decision',    key: 'd', label: 'Decision',    color: '#4A5651', mode: 'text' },
  { id: 'question',    key: 'q', label: 'Question',    color: '#B5761B', mode: 'text',      lifecycle: 'open' },
  { id: 'idea',        key: 'i', label: 'Idea',        color: '#9E2A62', mode: 'text' },
  { id: 'deviation',   key: 'v', label: 'Deviation',   color: '#A8571A', mode: 'text' },
  { id: 'observation', key: 'o', label: 'Observation', color: '#5E6B65', mode: 'text' },
  { id: 'reminder',    key: 'm', label: 'Reminder',    color: '#8A5A00', mode: 'text' },
];
/** Kinds no longer offered; kept so older structures still show. */
const RETIRED_KINDS = [];
const KIND = Object.fromEntries([...KINDS, ...RETIRED_KINDS].map(k => [k.id, k]));

/** Wire relations. `dir` = whether direction is meaningful by default. */
const RELATIONS = [
  { id: 'follows',     label: 'follows',     dir: true,  verb: 'comes after',        inv: 'followed by' },
  { id: 'leads',       label: 'leads to',    dir: true,  verb: 'naturally leads to', inv: 'follows from' },
  { id: 'causes',      label: 'caused',      dir: true,  verb: 'caused',             inv: 'caused by' },
  { id: 'resolves',    label: 'resolves',    dir: true,  verb: 'resolves',           inv: 'resolved by' },
  { id: 'supports',    label: 'supports',    dir: true,  verb: 'supports',           inv: 'supported by' },
  { id: 'contradicts', label: 'contradicts', dir: true,  verb: 'contradicts',        inv: 'contradicted by' },
  { id: 'comments',    label: 'comments on', dir: true,  verb: 'comments on',        inv: 'commented on by' },
  { id: 'needs',       label: 'needs',       dir: true,  verb: 'needs',              inv: 'needed by' },
  { id: 'related',     label: 'related',     dir: false, verb: 'is related to',      inv: 'related' },
];
/** A connection you type yourself is stored as rel "c:<your words>" — one-off, directed, read the same way everywhere. */
const REL = new Proxy(Object.fromEntries(RELATIONS.map(r => [r.id, r])), { get(t, k) {
  if (k in t) return t[k]; if (typeof k === 'string' && k.startsWith('c:') && k.length > 2) { const l = k.slice(2); return { id: k, label: l, dir: true, verb: l, inv: '← ' + l, custom: true }; } return undefined; } });
const customRel = s => { s = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40); return s ? 'c:' + s : null; };

/** Default note types (§4). Stored in the `profiles` store on first run and editable in Settings. */
const DEFAULT_PROFILES = [
  { type: 'protocol',   label: 'Protocol',   noun: 'Step',    scope: 'project', ordered: true,  steps: true,  bindsTo: null,       headerFields: [{ key: 'version', label: 'Version' }, { key: 'owner', label: 'Owner' }] },
  { type: 'experiment', label: 'Experiment', noun: 'Step',    scope: 'theme',   ordered: true,  steps: true,  bindsTo: 'protocol', headerFields: [{ key: 'sample', label: 'Sample' }, { key: 'conditions', label: 'Conditions' }], stage: 'Run', next: 'analysis' },
  { type: 'analysis',   label: 'Analysis',   noun: 'Pass',    scope: 'theme',   ordered: true,  steps: false, bindsTo: null,       headerFields: [{ key: 'dataset', label: 'Dataset' }, { key: 'code', label: 'Code version' }], stage: 'Analysis', next: 'reflection' },
  { type: 'planning',   label: 'Planning',   noun: 'Option',  scope: 'theme',   ordered: false, steps: false, bindsTo: null,       headerFields: [], stage: 'Planning', next: 'experiment' },
  { type: 'reflection', label: 'Reflection', noun: 'Point',   scope: 'theme',   ordered: false, steps: false, bindsTo: null,       headerFields: [], stage: 'Reflection', next: null },
  { type: 'resource',   label: 'Resource',   noun: 'Record',  scope: 'project', ordered: false, steps: false, bindsTo: null,       headerFields: [{ key: 'kind', label: 'Kind', options: ['cell line', 'antibody', 'gel batch', 'instrument', 'plasmid', 'chemical', 'other'] }, { key: 'lot', label: 'Lot / batch' }, { key: 'passage', label: 'Passage' }, { key: 'conc', label: 'Concentration' }, { key: 'supplier', label: 'Supplier · cat. no.' }, { key: 'location', label: 'Location' }] },
  { type: 'day',        label: 'Day',        noun: 'Entry',   scope: 'global',  ordered: false, steps: false, bindsTo: null,       headerFields: [], system: true },
  { type: 'meeting',    label: 'Meeting',    noun: 'Item',    scope: 'theme',   ordered: true,  steps: false, bindsTo: null,       headerFields: [{ key: 'attendees', label: 'Attendees' }] },
  { type: 'seminar',    label: 'Seminar',    noun: 'Point',   scope: 'global',  ordered: false, steps: false, bindsTo: null,       headerFields: [{ key: 'speaker', label: 'Speaker' }] },
  { type: 'literature', label: 'Literature', noun: 'Section', scope: 'global',  ordered: false, steps: false, bindsTo: null,       headerFields: [] },
  { type: 'note',       label: 'Note',       noun: 'Block',   scope: 'theme',   ordered: false, steps: false, bindsTo: null,       headerFields: [] },
  { type: 'review',     label: 'Review',     noun: 'Lane',    scope: 'global',  ordered: true,  steps: false, bindsTo: null,       headerFields: [{ key: 'week', label: 'Week' }], system: true },
];
let PROFILES = DEFAULT_PROFILES, PROFILE = Object.fromEntries(DEFAULT_PROFILES.map(p => [p.type, p]));
function loadProfiles() { const rows = DB.all('profiles'); PROFILES = rows.length ? DEFAULT_PROFILES.map(d => { const r = rows.find(r => r.type === d.type); if (!r) return d; const m = Object.assign({}, d, r); if (m.stage == null && d.stage) m.stage = d.stage; if (m.next === undefined && d.next !== undefined) m.next = d.next; return m; }).concat(rows.filter(r => !DEFAULT_PROFILES.some(d => d.type === r.type))) : DEFAULT_PROFILES; PROFILE = Object.fromEntries(PROFILES.map(p => [p.type, p])); }
const prof = t => PROFILE[t] || { type: t, label: t, noun: 'Block', scope: 'theme', ordered: false, steps: false, headerFields: [] };
const userProfiles = () => PROFILES.filter(p => !p.system);

/** One standard template per type (toggleable in Settings). */
const STANDARD_TEMPLATES = {
  protocol:   [['Purpose', 'What this protocol establishes and when to use it.'], ['Materials', ''], ['Prepare', ''], ['Run', ''], ['Clean-up', '']],
  experiment: [['Aim of this run', ''], ['Setup', ''], ['Run', ''], ['Observe', ''], ['Outcome', '']],
  analysis:   [['Input data', ''], ['Method', ''], ['Pass 1', ''], ['Result', '']],
  planning:   [['Context', ''], ['Option A', ''], ['Option B', ''], ['Decision', '']],
  reflection: [['What the run showed', ''], ['What went wrong', ''], ['What to change next time', '']],
  meeting:    [['Attendees', ''], ['First topic', ''], ['Second topic', ''], ['Actions', '']],
  seminar:    [['Speaker & topic', ''], ['Key point', ''], ['Relevance to my work', '']],
  literature: [['Citation', ''], ['Main claim', ''], ['Methods worth stealing', ''], ['Doubts', '']],
  note:       [['', '']],
  resource:   [['What it is', ''], ['Preparation / QC', ''], ['Notes', '']],
};

const DEFAULT_SETTINGS = {
  id: 'main',
  kinds: Object.fromEntries(KINDS.map(k => [k.id, { color: k.color, mode: k.mode }])),
  termKey: 'alt+w',            // Ctrl+W works in Focus mode (fullscreen + keyboard lock); browsers reserve it otherwise
  structKey: 'ctrl+enter',
  weekStartDow: 6,             // Saturday → Friday; the review opens on the weekend after
  reviewPreview: false,
  timerCapHours: 4,
  maxTimers: 2,
  idleMinutes: 15,
  citeMode: 'title',
  theme: 'auto',
  autoReplace: { arrows: true, science: true, scripts: true, typo: true }, // typing replacements in components (13u)
  lockAfterDay: false,          // off: everything stays editable; on: recorded structures lock when the day turns
  stampWindowHours: 12,        // ±12 h = the 24-hour window around creation
  inferWindowDays: 21,
  lineageDepth: 3,             // consolidate: generations shown by default
  classifyOn: 'mark',          // §9 concession: 'mark' (default) or 'review'
  backupMinutes: 30,
  seeded: false,
};
