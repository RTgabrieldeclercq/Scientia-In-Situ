/* ==========================================================================
   13f · Calculator. A box on the paper (open as many as you like, in any
   note) with its own history. Scientific keys by default, more in tabs.
   It reads the keyboard; the result shows as you type; Enter files the line
   in this calculator's history and starts a new line with the result.
   The expression is parsed here (no eval).
   ========================================================================== */
const CALC = {
  /* ---------------- evaluation ---------------- */
  CONST: { pi: Math.PI, 'π': Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2,
    NA: 6.02214076e23, kB: 1.380649e-23, R: 8.314462618, F: 96485.33212, c: 299792458, h: 6.62607015e-34, qe: 1.602176634e-19,
    g: 9.80665, eps0: 8.8541878128e-12, mu0: 1.25663706212e-6, me: 9.1093837015e-31, mp: 1.67262192369e-27, amu: 1.66053906660e-27, atm: 101325, kT: 4.11e-21 },
  FN: {
    sin: (x, A) => Math.sin(A(x)), cos: (x, A) => Math.cos(A(x)), tan: (x, A) => Math.tan(A(x)),
    asin: (x, A, I) => I(Math.asin(x)), acos: (x, A, I) => I(Math.acos(x)), atan: (x, A, I) => I(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    floor: Math.floor, ceil: Math.ceil, round: (x, A, I, d) => d == null ? Math.round(x) : Math.round(x * 10 ** d) / 10 ** d, sign: Math.sign,
    fact: x => CALC.fact(x), inv: x => 1 / x,
  },
  /** Functions of a list: mean(1, 2, 3)… */
  LIST: {
    mean: a => a.reduce((s, x) => s + x, 0) / a.length, sum: a => a.reduce((s, x) => s + x, 0), min: a => Math.min(...a), max: a => Math.max(...a),
    median: a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; },
    var: a => { const m = CALC.LIST.mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); }, sd: a => Math.sqrt(CALC.LIST.var(a)),
    sem: a => CALC.LIST.sd(a) / Math.sqrt(a.length), cv: a => CALC.LIST.sd(a) / CALC.LIST.mean(a) * 100, count: a => a.length,
    gmean: a => Math.exp(a.reduce((s, x) => s + Math.log(x), 0) / a.length),
    nCr: ([n, r]) => CALC.fact(n) / (CALC.fact(r) * CALC.fact(n - r)), nPr: ([n, r]) => CALC.fact(n) / CALC.fact(n - r),
    gcd: a => a.reduce((x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; }),
    lcm: a => a.reduce((x, y) => Math.abs(x * y) / CALC.LIST.gcd([x, y])), mod: ([x, y]) => ((x % y) + y) % y,
    root: ([x, n]) => x < 0 && n % 2 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n), logb: ([x, b]) => Math.log(x) / Math.log(b), hypot: a => Math.hypot(...a),
    dilute: ([c1, v1, c2]) => c1 * v1 / c2, molar: ([g, mw, l]) => g / mw / l,
  },
  fact(x) {
    if (x < 0) return NaN; if (Number.isInteger(x)) { if (x > 170) return Infinity; let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; }
    // Γ(x+1), Lanczos
    const g = 7, p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    const G = z => { if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * G(1 - z)); z -= 1; let a = p[0]; const t = z + g + 0.5; for (let i = 1; i < 9; i++) a += p[i] / (z + i); return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * a; };
    return G(x + 1);
  },
  tokens(s) {
    const out = [], re = /\s*(?:(\d*\.\d+|\d+\.?)(?:[eE]([+-]?\d+))?|(0x[0-9a-fA-F]+|0b[01]+)|([A-Za-zπτ_][A-Za-z0-9_]*)|(\*\*|[-+−×*÷/^!%(),²³√∛]))/y;
    let m, i = 0; s = s.replace(/\s+$/, '');
    while (i < s.length) { re.lastIndex = i; m = re.exec(s); if (!m || m.index !== i && !/^\s*$/.test(s.slice(i, m.index))) throw new Error('?'); if (!m[0]) throw new Error('?'); i = re.lastIndex;
      if (m[1] != null) out.push({ t: 'n', v: parseFloat(m[1] + (m[2] ? 'e' + m[2] : '')) });
      else if (m[3]) out.push({ t: 'n', v: parseInt(m[3]) || (m[3].startsWith('0b') ? parseInt(m[3].slice(2), 2) : 0) });
      else if (m[4]) out.push({ t: 'id', v: m[4] });
      else out.push({ t: 'op', v: ({ '−': '-', '×': '*', '÷': '/', '**': '^' })[m[5]] || m[5] }); }
    return out;
  },
  /** Evaluate an expression. ctx = {deg, ans}. Throws on anything incomplete. */
  eval(src, ctx = {}) {
    const T = CALC.tokens(src); let k = 0;
    const A = x => ctx.deg ? x * Math.PI / 180 : x, I = x => ctx.deg ? x * 180 / Math.PI : x;
    const peek = () => T[k], take = () => T[k++], isOp = v => peek() && peek().t === 'op' && peek().v === v;
    const starts = () => { const t = peek(); return t && (t.t === 'n' || t.t === 'id' || (t.t === 'op' && (t.v === '(' || t.v === '√' || t.v === '∛'))); };
    const expr = () => { let a = term(); while (isOp('+') || isOp('-')) { const o = take().v, b = term(); a = o === '+' ? a + b : a - b; } return a; };
    const term = () => { let a = unary(); for (;;) { if (isOp('*') || isOp('/')) { const o = take().v, b = unary(); a = o === '*' ? a * b : a / b; } else if (peek() && peek().t === 'id' && peek().v === 'mod') { take(); const b = unary(); a = ((a % b) + b) % b; } else if (starts()) a = a * unary(); else return a; } };
    const unary = () => { if (isOp('-')) { take(); return -unary(); } if (isOp('+')) { take(); return unary(); } return power(); };
    const power = () => { const a = postfix(); if (isOp('^')) { take(); return Math.pow(a, unary()); } return a; };
    const postfix = () => { let a = primary(); for (;;) { if (isOp('!')) { take(); a = CALC.fact(a); } else if (isOp('%')) { take(); a = a / 100; } else if (isOp('²')) { take(); a = a * a; } else if (isOp('³')) { take(); a = a * a * a; } else return a; } };
    const args = () => { if (!isOp('(')) throw new Error('('); take(); const out = [expr()]; while (isOp(',')) { take(); out.push(expr()); } if (!isOp(')')) throw new Error(')'); take(); return out; };
    const primary = () => {
      const t = take(); if (!t) throw new Error('end');
      if (t.t === 'n') return t.v;
      if (t.t === 'op') { if (t.v === '(') { const v = expr(); if (!isOp(')')) throw new Error(')'); take(); return v; } if (t.v === '√') return Math.sqrt(power()); if (t.v === '∛') return Math.cbrt(power()); throw new Error(t.v); }
      const id = t.v;
      if (id === 'ans') return ctx.ans ?? 0;
      if (ctx.vars && id in ctx.vars && !isOp('(')) return ctx.vars[id];
      if (CALC.LIST[id]) { const a = args(); const r = CALC.LIST[id](a); return r; }
      if (CALC.FN[id]) { const a = isOp('(') ? args() : [power()]; return CALC.FN[id](a[0], A, I, a[1]); }
      if (id in CALC.CONST) return CALC.CONST[id];
      if (ctx.vars && id in ctx.vars) return ctx.vars[id];
      throw new Error('unknown ' + id);
    };
    if (!T.length) throw new Error('empty');
    const v = expr(); if (k < T.length) throw new Error('trailing');
    return v;
  },
  fmt(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) return 'not a number';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e12 || a < 1e-6) return v.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', 'e');
    return String(parseFloat(v.toPrecision(12)));
  },

  /* ---------------- the widget ---------------- */
  TABS: {
    sci: { label: 'Scientific', rows: [
      ['sin', 'cos', 'tan', 'ln', 'log', '√'], ['x²', '^', '!', 'π', 'e', '%'], ['7', '8', '9', '(', ')', '⌫'],
      ['4', '5', '6', '×', '÷', 'AC'], ['1', '2', '3', '+', '−', '◀'], ['0', '.', 'E', 'ans', '=', '▶']] },
    fn: { label: 'Functions', rows: [
      ['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh'], ['exp', 'log2', 'logb', 'root', '∛', '1/x'], ['abs', 'floor', 'ceil', 'round', 'mod', 'sign'],
      ['nCr', 'nPr', 'gcd', 'lcm', 'hypot', ','], ['(', ')', '⌫', 'AC', '◀', '▶']] },
    const: { label: 'Constants', rows: [
      ['NA', 'kB', 'R', 'F', 'c', 'h'], ['qe', 'g', 'eps0', 'mu0', 'me', 'mp'], ['amu', 'atm', 'kT', 'tau', 'phi', 'π'], ['(', ')', '⌫', 'AC', '◀', '▶']] },
    stats: { label: 'Stats', rows: [
      ['mean', 'sd', 'sem', 'median', 'var', 'cv'], ['sum', 'min', 'max', 'count', 'gmean', ','], ['dilute', 'molar', '(', ')', '⌫', 'AC'], ['7', '8', '9', '.', '◀', '▶'], ['4', '5', '6', '1', '2', '3'], ['0', '−', '+', '×', '÷', '=']] },
  },
  HINT: { NA: 'Avogadro 6.022e23 /mol', kB: 'Boltzmann 1.381e-23 J/K', R: 'gas constant 8.314 J/(mol·K)', F: 'Faraday 96485 C/mol', c: 'speed of light m/s', h: 'Planck J·s', qe: 'elementary charge C', g: 'standard gravity m/s²', eps0: 'vacuum permittivity F/m', mu0: 'vacuum permeability H/m', me: 'electron mass kg', mp: 'proton mass kg', amu: 'atomic mass unit kg', atm: '1 atm in Pa', kT: 'kT at 25 °C in J', tau: '2π', phi: 'golden ratio',
    dilute: 'dilute(C1, V1, C2) → V2 = C1·V1/C2', molar: 'molar(grams, MW, litres) → mol/L', logb: 'logb(x, base)', root: 'root(x, n)', mod: 'x mod y', sem: 'standard error of the mean', cv: 'coefficient of variation %', 'E': '×10^ (2E-3 = 0.002)', ans: 'the last result' },
  key(lab) {
    if (/^[0-9]$/.test(lab) || ['.', '(', ')', ',', '+', '−', '×', '÷', '^', '!', '%', 'π', 'e', '√', '∛'].includes(lab)) return { ins: lab };
    if (lab === 'x²') return { ins: '²' }; if (lab === 'E') return { ins: 'E' }; if (lab === '1/x') return { ins: 'inv(', wrap: true };
    if (lab === 'mod') return { ins: ' mod ' };
    if (CALC.FN[lab] || CALC.LIST[lab]) return { ins: lab + '(', wrap: true };
    if (lab in CALC.CONST || lab === 'ans') return { ins: lab };
    return { cmd: lab };
  },
  body(b, d, pane, ro) {
    const hist = b.hist || [], tab = CALC.TABS[b.tab] ? b.tab : 'sci';
    const inp = h('input.cin', { value: b.expr || '', spellcheck: false, autocomplete: 'off', placeholder: '0', readOnly: ro, 'aria-label': 'Expression' });
    const res = h('div.cres'), histEl = h('div.chist');
    let carried = false;
    const ans = () => hist.length ? hist[hist.length - 1].v : 0;
    const live = () => { const s = inp.value.trim(); if (!s) { res.textContent = ''; res.className = 'cres'; return null; }
      try { const v = CALC.eval(s, { deg: b.angle !== 'rad', vars: EQ.calcVars(b), ans: ans() }); res.textContent = '= ' + CALC.fmt(v); res.className = 'cres ok'; return v; } catch { res.textContent = '…'; res.className = 'cres wait'; return null; } };
    const keep = debounce(() => { b.expr = inp.value; DB.put('blocks', b); }, 500);
    const save = () => { b.modified = isoLocal(new Date()); b.body = { text: (b.label || 'Calculator') + '\n' + hist.slice(-50).map(x => x.e + ' = ' + CALC.fmt(x.v)).join('\n'), marks: [] }; b.hist = hist.slice(); DB.put('blocks', b); DB.beginGroup(); };
    /** Change a line: every later line is worked out again from it (a line that starts with “ans” uses the line above). */
    const recompute = from => { let prev = from > 0 ? hist[from - 1].v : 0; for (let j = from; j < hist.length; j++) { let v; try { v = CALC.eval(hist[j].e, { deg: b.angle !== 'rad', vars: EQ.calcVars(b), ans: prev }); } catch { v = NaN; } hist[j] = Object.assign({}, hist[j], { v }); prev = v; } };
    const exprEl = (e, prevV) => { const parts = e.split(/(\bans\b)/); return parts.map(p => p === 'ans' ? h('span.cans', { title: 'the line above: ' + CALC.fmt(prevV) }, CALC.fmt(prevV)) : p); };
    const drawHist = () => { const start = Math.max(0, hist.length - 60);
      histEl.replaceChildren(...hist.slice(start).map((x, k) => { const i = start + k, prevV = i > 0 ? hist[i - 1].v : 0;
        const ex = h('span.che', { title: ro ? '' : 'Click to change this line — the lines after it follow' }, exprEl(x.e, prevV));
        const row = h('div.chl' + (x.note ? '.solved' : ''), h('span.chn', i + 1), x.note ? h('span.chnote', { title: 'Worked out by the equation solver' }, x.note) : null, ex, h('button.chv', { title: 'Use this result in the current line', on: { click: e => { e.stopPropagation(); ins(CALC.fmt(x.v).replace('e', 'E')); inp.focus(); } } }, '= ' + CALC.fmt(x.v)));
        if (!ro) ex.addEventListener('click', e => { e.stopPropagation(); const ed = h('input.chin', { value: x.e, spellcheck: false });
          const done = ok => { if (ok) { const v = ed.value.trim().replace(/\*/g, '×').replace(/\//g, '÷'); if (v && v !== x.e) { try { CALC.eval(v, { deg: b.angle !== 'rad', vars: EQ.calcVars(b), ans: prevV }); } catch { ed.classList.add('bad'); return; } hist[i] = Object.assign({}, hist[i], { e: v, edited: isoLocal(new Date()) }); recompute(i); save(); } } drawHist(); live(); inp.focus(); };
          ed.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); done(true); } else if (ev.key === 'Escape') { ev.preventDefault(); done(false); } });
          ed.addEventListener('input', () => { ed.classList.remove('bad'); try { const v = CALC.eval(ed.value, { deg: b.angle !== 'rad', vars: EQ.calcVars(b), ans: prevV }); row.querySelector('.chv').textContent = '= ' + CALC.fmt(v); } catch { row.querySelector('.chv').textContent = '…'; } });
          ed.addEventListener('blur', () => setTimeout(() => ed.isConnected && done(true), 0));
          ex.replaceWith(ed); ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); });
        return row; }));
      histEl.scrollTop = 1e9; };
    const ins = (t, wrap) => { if (carried && inp.value === 'ans' && /^[\d.(a-zA-Zπ√∛]/.test(t)) inp.value = ''; carried = false; const a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? a, sel = inp.value.slice(a, z);
      if (wrap && sel) { inp.setRangeText(t + sel + ')', a, z, 'end'); } else { inp.setRangeText(t, a, z, 'end'); if (wrap) { inp.setRangeText(')', inp.selectionStart, inp.selectionStart, 'start'); } }
      live(); keep(); };
    const commit = () => { const s = inp.value.trim(); if (!s) return; let v; try { v = CALC.eval(s, { deg: b.angle !== 'rad', vars: EQ.calcVars(b), ans: ans() }); } catch { res.textContent = 'incomplete'; res.className = 'cres bad'; return; }
      hist.push({ e: s, v, at: isoLocal(new Date()) }); save();
      // the next line carries this result as “ans”, so changing this line later flows into it
      inp.value = Number.isFinite(v) ? 'ans' : ''; carried = !!inp.value; b.expr = inp.value;
      drawHist(); live(); inp.setSelectionRange(inp.value.length, inp.value.length); };
    let hi = null;
    const cmd = c => { const a = inp.selectionStart, z = inp.selectionEnd;
      if (c === '⌫') { if (a !== z) inp.setRangeText('', a, z, 'end'); else if (a > 0) { const fn = inp.value.slice(0, a).match(/[A-Za-z_]+\($/); const n = fn ? fn[0].length : 1; inp.setRangeText('', a - n, a, 'end'); } }
      else if (c === 'AC') inp.value = '';
      else if (c === '◀') { const p = Math.max(0, a - 1); inp.setSelectionRange(p, p); }
      else if (c === '▶') { const p = Math.min(inp.value.length, z + 1); inp.setSelectionRange(p, p); }
      else if (c === '=') commit();
      live(); keep(); };
    const press = lab => { if (ro) return; const k = CALC.key(lab); inp.focus(); if (k.cmd) cmd(k.cmd); else ins(k.ins, k.wrap); };
    inp.addEventListener('beforeinput', e => { if (carried && inp.value === 'ans' && inp.selectionStart === 3 && e.data && /^[\d.(a-zA-Zπ√∛]/.test(e.data)) inp.value = ''; carried = false; });
    inp.addEventListener('input', () => { const p = inp.selectionStart, v = inp.value, n = v.replace(/\*/g, '×').replace(/\//g, '÷').replace(/(^|[^E\d])-/g, (m, a) => a + '−'); if (n !== v) { inp.value = n; inp.setSelectionRange(p, p); } hi = null; live(); keep(); });
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' || (e.key === '=' && !e.shiftKey)) { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); if (inp.value) { inp.value = ''; live(); keep(); } else inp.blur(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (!hist.length) return; hi = hi == null ? hist.length : hi; hi = clamp(hi + (e.key === 'ArrowUp' ? -1 : 1), 0, hist.length); inp.value = hi === hist.length ? '' : hist[hi].e; live(); }
      else if (e.key === 'Backspace' && !e.ctrlKey && inp.selectionStart === inp.selectionEnd && /[A-Za-z_]+\($/.test(inp.value.slice(0, inp.selectionStart))) { e.preventDefault(); cmd('⌫'); }
    });
    inp.addEventListener('focus', () => { CALC._focus = b.id; }); inp.addEventListener('blur', () => { if (CALC._focus === b.id) setTimeout(() => { if (document.activeElement !== inp) CALC._focus = null; }, 0); });
    const tabs = h('div.ctabs', Object.entries(CALC.TABS).map(([k, t]) => h('button' + (k === tab ? '.on' : ''), { on: { click: () => { b.tab = k; DB.put('blocks', b); pad.replaceChildren(...keys(k)); $$('button', tabs).forEach(x => x.classList.toggle('on', x.textContent === t.label)); inp.focus(); } } }, t.label)));
    const keys = k => CALC.TABS[k].rows.flat().map(lab => h('button.ck' + (/^[0-9.]$/.test(lab) ? '.num' : ['+', '−', '×', '÷', '^'].includes(lab) ? '.op' : lab === '=' ? '.eq' : ['AC', '⌫'].includes(lab) ? '.del' : ['◀', '▶'].includes(lab) ? '.nav' : '.fn'), { title: CALC.HINT[lab] || '', on: { mousedown: e => e.preventDefault(), click: () => press(lab) } }, lab));
    const pad = h('div.cpad', keys(tab));
    const ang = h('button.cang', { title: 'Angles in degrees or radians', on: { click: () => { b.angle = b.angle === 'rad' ? 'deg' : 'rad'; ang.textContent = b.angle === 'rad' ? 'RAD' : 'DEG'; DB.put('blocks', b); live(); inp.focus(); } } }, b.angle === 'rad' ? 'RAD' : 'DEG');
    const clr = h('button.cang', { title: 'Clear this calculator’s history (this box only)', on: { click: () => { if (!hist.length) return; b.hist = []; hist.length = 0; DB.put('blocks', b); drawHist(); } } }, '⟲');
    const push = (e, v, note) => { hist.push({ e, v, at: isoLocal(new Date()), note }); save(); inp.value = 'ans'; carried = true; b.expr = inp.value; drawHist(); live(); };
    const solver = typeof EQ !== 'undefined' ? EQ.solverPanel(b, { ans, push, focus: () => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }) : null;
    const screen = h('div.cscreen', { on: { click: e => { if (!e.target.closest('.chl')) inp.focus(); } } }, histEl, h('div.cline', inp), res);
    const el = h('div.calc.nopan' + (solver ? '.solving' : ''), solver, screen, h('div.cbar', ang, tabs, h('span.spacer'), ro || solver ? null : h('button.cang', { title: 'Wire an equation: its terms become fields and the calculator solves for the ones you leave empty', on: { click: () => EQ.addToCalc(b) } }, '∑'), clr), pad);
    drawHist(); live();
    if (CALC._focus === b.id) setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
    return el;
  },
  open(pane) {
    const r = pane.paper.rect(), p = pane.paper.toWorld(r.right - 380, r.top + 70), n = M.liveBlocks(pane.docId).filter(b => b.kind === 'calc' && b.status !== 'removed').length + 1;
    const b = M.addBlock(pane.docId, null, { kind: 'calc', label: n > 1 ? 'Calculator ' + n : 'Calculator', hist: [], expr: '', angle: 'deg', tab: 'sci', x: Math.round(p.x / 14) * 14, y: Math.round(p.y / 14) * 14, w: 336 });
    b.body = { text: b.label, marks: [] }; DB.put('blocks', b); CALC._focus = b.id; changed(); return b;
  },
};
WIDGETS.calc = { label: 'calculator', w: 336, body: CALC.body, menu: b => [{ label: 'Copy history', run: () => { navigator.clipboard && navigator.clipboard.writeText((b.hist || []).map(x => x.e + ' = ' + CALC.fmt(x.v)).join('\n')); toast('History copied'); } }] };
INSERTS.push({ id: 'calc', group: 'Tools', icon: '🖩', label: 'Calculator', sub: 'Scientific; keeps its own history in this note', run: (d, p, pane) => { const b = CALC.open(pane); b.x = p.x; b.y = p.y; DB.put('blocks', b); changed(); } });
