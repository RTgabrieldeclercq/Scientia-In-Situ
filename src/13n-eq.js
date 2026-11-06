/* ==========================================================================
   13n · Equations. An equation box holds LaTeX and, beneath it, a legend of
   its terms (symbol, name, unit). Equations can be registered — looked up
   and inserted in any note — and wired to a calculator, which then shows
   one field per term: fill in what you know and it works out the rest, for
   one equation or a set of them that share terms. It can also rearrange
   them for a term. All of it is parsed and solved here (no eval, no CAS).
   ========================================================================== */
const TEX = {
  GREEK: { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', ell: 'ℓ', hbar: 'ħ' },
  FUNCS: { sin: 'sin', cos: 'cos', tan: 'tan', sec: 'sec', csc: 'csc', cot: 'cot', arcsin: 'asin', arccos: 'acos', arctan: 'atan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', ln: 'ln', log: 'log', lg: 'log', exp: 'exp', sqrt: 'sqrt', abs: 'abs' },
  ACCENT: { hat: '\u0302', bar: '\u0304', overline: '\u0304', vec: '\u20D7', dot: '\u0307', ddot: '\u0308', tilde: '\u0303', widehat: '\u0302' },
  SKIP: new Set(['left', 'right', 'big', 'Big', 'bigg', 'Bigg', ',', ';', ':', '!', ' ', 'quad', 'qquad', 'displaystyle', 'textstyle', 'limits', 'nolimits', 'mathstrut']),
  lex(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) { const m = /^\d*\.?\d+(?:\.\d*)?|^\d+\.?/.exec(s.slice(i)); out.push({ k: 'num', v: m[0] }); i += m[0].length; continue; }
      if (c === '\\') { const m = /^\\([A-Za-z]+)/.exec(s.slice(i)); if (m) { out.push({ k: 'cmd', v: m[1] }); i += m[0].length; } else { out.push({ k: 'cmd', v: s[i + 1] || '' }); i += 2; } continue; }
      out.push({ k: 'ch', v: c }); i++;
    }
    return out;
  },
  /** LaTeX → {L, R} (or {L} for an expression). Throws with a readable message. */
  parse(src) {
    const T = TEX.lex(String(src || '').replace(/\\operatorname\*?/g, '\\mathrm')); let k = 0;
    T.forEach(t => { if (t.k === 'cmd' && (t.v === '{' || t.v === 'lbrace')) Object.assign(t, { k: 'ch', v: '(' }); else if (t.k === 'cmd' && (t.v === '}' || t.v === 'rbrace')) Object.assign(t, { k: 'ch', v: ')' }); else if (t.k === 'cmd' && ['vert', 'lvert', 'rvert', '|'].includes(t.v)) Object.assign(t, { k: 'ch', v: '|' }); });
    const skip = () => { while (T[k] && T[k].k === 'cmd' && TEX.SKIP.has(T[k].v)) { const v = T[k++].v; if ((v === 'left' || v === 'right') && T[k] && T[k].k === 'ch' && T[k].v === '.') k++; } };
    const peek = () => { skip(); return T[k]; };
    const isCh = v => { const t = peek(); return t && t.k === 'ch' && t.v === v; };
    const isCmd = v => { const t = peek(); return t && t.k === 'cmd' && (Array.isArray(v) ? v.includes(t.v) : t.v === v); };
    const need = v => { if (!isCh(v)) throw new Error('expected ' + v); k++; };
    const raw = () => { // the raw text of a {group} or one token
      skip(); const t = T[k]; if (!t) throw new Error('incomplete');
      if (t.k === 'ch' && t.v === '{') { k++; let depth = 1, s = ''; while (k < T.length) { const x = T[k++]; if (x.k === 'ch' && x.v === '{') depth++; if (x.k === 'ch' && x.v === '}' && !--depth) break; s += x.k === 'cmd' ? '\\' + x.v + (/[A-Za-z]$/.test(x.v) ? ' ' : '') : x.v; } return s.trim(); }
      k++; if (t.k === 'num' && t.v.length > 1) { T.splice(k, 0, { k: 'num', v: t.v.slice(1) }); return t.v[0]; } return t.k === 'cmd' ? '\\' + t.v : t.v;
    };
    const group = () => { // {expr} or a single atom (x^2, x^ab = x^a b)
      if (isCh('{')) { k++; const e = expr(); need('}'); return e; }
      const t = peek(); if (t && t.k === 'num' && t.v.length > 1) { k++; T.splice(k, 0, { k: 'num', v: t.v.slice(1) }); return { t: 'n', v: +t.v[0] }; }
      return primary(true);
    };
    const subName = () => { const s = raw(); return { tex: /^[A-Za-z0-9]$/.test(s) ? s : '{' + s + '}', key: s.replace(/\\(mathrm|text|mathit|mathbf)\s*/g, '').replace(/[{}\\ ]/g, '').replace(/^([A-Za-z]+)$/, (m, g) => TEX.GREEK[g] || g) }; };
    const variable = (keyBase, texBase) => {
      let key = keyBase, tex = texBase;
      for (;;) { if (isCh("'")) { k++; key += "'"; tex += "'"; continue; } if (isCh('_')) { k++; const s = subName(); key += '_' + TEX.greekify(s.key); tex += '_' + s.tex; continue; } break; }
      return { t: 'v', k: key, tex };
    };
    const funcArg = () => { if (isCh('(') || isCmd('left')) return primary(); if (isCh('{')) return group(); return power(); };
    const primary = (single) => {
      const t = peek(); if (!t) throw new Error('incomplete');
      if (t.k === 'num') { k++; return { t: 'n', v: parseFloat(t.v) }; }
      if (t.k === 'ch') {
        if (t.v === '(' || t.v === '[') { k++; const e = expr(); skip(); if (!(isCh(')') || isCh(']'))) throw new Error('missing )'); k++; return e; }
        if (t.v === '{') { k++; const e = expr(); need('}'); return e; }
        if (t.v === '|') { k++; const e = expr(); need('|'); return { t: 'f', f: 'abs', a: e }; }
        if (/[A-Za-z]/.test(t.v)) { k++; if (t.v === 'e' && !isCh('_')) return { t: 'c', k: 'e' }; return variable(t.v, t.v); }
        throw new Error('unexpected ' + t.v);
      }
      // commands
      const c = t.v; k++;
      if (c === 'frac' || c === 'dfrac' || c === 'tfrac' || c === 'cfrac') { const a = group(), b = group(); return { t: '/', a, b }; }
      if (c === 'sqrt') { let n = null; if (isCh('[')) { k++; n = expr(); need(']'); } const a = group(); return n ? { t: '^', a, b: { t: '/', a: { t: 'n', v: 1 }, b: n } } : { t: 'f', f: 'sqrt', a }; }
      if (c === 'pi') return { t: 'c', k: 'pi' };
      if (c === 'mathrm' || c === 'text' || c === 'mathit' || c === 'mathbf' || c === 'mathsf') { const s = raw().replace(/\s+/g, ''); if (TEX.FUNCS[s]) return fn(TEX.FUNCS[s]); if (s === 'e') return { t: 'c', k: 'e' }; return variable(s, '\\' + c + '{' + s + '}'); }
      if (TEX.FUNCS[c]) return fn(TEX.FUNCS[c]);
      if (TEX.ACCENT[c]) { const inner = raw(); const key = TEX.greekify(inner.replace(/\\([A-Za-z]+)/g, (m, g) => TEX.GREEK[g] || g).replace(/[{}\s]/g, '')) + TEX.ACCENT[c]; return variable(key, '\\' + c + '{' + inner + '}'); }
      if (c === 'Delta' || c === 'delta') { const nx = peek(); if (nx && nx.k === 'ch' && /[A-Za-z]/.test(nx.v) && !single) { k++; return variable(TEX.GREEK[c] + nx.v, '\\' + c + ' ' + nx.v); } }
      if (TEX.GREEK[c]) return variable(TEX.GREEK[c], '\\' + c);
      throw new Error('\\' + c + ' is not supported here');
    };
    const fn = f => {
      let base = null, pw = null;
      if (f === 'log' && isCh('_')) { k++; base = group(); if (base.t === 'n' && base.v === 10) base = null; }
      if (isCh('^')) { k++; pw = group(); }
      const a = funcArg(); let node = base ? { t: '/', a: { t: 'f', f: 'ln', a }, b: { t: 'f', f: 'ln', a: base } } : { t: 'f', f, a };
      return pw ? { t: '^', a: node, b: pw } : node;
    };
    const postfix = () => { let a = primary(); for (;;) { if (isCh('!')) { k++; a = { t: '!', a }; } else return a; } };
    const power = () => { const a = postfix(); if (isCh('^')) { k++; const b = group(); return { t: '^', a, b }; } return a; };
    const unary = () => { if (isCh('-')) { k++; return { t: 'neg', a: unary() }; } if (isCh('+') || isCmd('pm')) { k++; return unary(); } return power(); };
    const starts = () => { const t = peek(); if (!t) return false; if (t.k === 'num') return true; if (t.k === 'ch') return /[A-Za-z({[|]/.test(t.v); return t.k === 'cmd' && !['cdot', 'times', 'div', 'ast', 'right', 'approx', 'equiv', 'pm', 'mp', 'rvert', 'quad'].includes(t.v); };
    const term = () => { let a = unary(); for (;;) {
      if (isCh('*') || isCmd(['cdot', 'times', 'ast'])) { k++; a = { t: '*', a, b: unary() }; }
      else if (isCh('/') || isCmd('div')) { k++; a = { t: '/', a, b: unary() }; }
      else if (starts() && !isCh('|')) a = { t: '*', a, b: power() };
      else return a; } };
    const expr = () => { let a = term(); for (;;) { if (isCh('+')) { k++; a = { t: '+', a, b: term() }; } else if (isCh('-') || isCmd('mp')) { k++; a = { t: '-', a, b: term() }; } else return a; } };
    const L = expr(); let R = null;
    if (isCh('=') || isCmd(['approx', 'equiv'])) { k++; R = expr(); }
    skip(); if (k < T.length) throw new Error('could not read “' + (T[k].k === 'cmd' ? '\\' + T[k].v : T[k].v) + '”');
    return { L, R };
  },
  greekify: s => s.replace(/[A-Za-z]+/g, w => w.length > 1 && TEX.GREEK[w] ? TEX.GREEK[w] : w),
  /** Every term in a tree, in reading order: [{k, tex}] */
  vars(...nodes) { const seen = new Map(); const walk = n => { if (!n) return; if (n.t === 'v') { if (!seen.has(n.k)) seen.set(n.k, n.tex); return; } walk(n.a); walk(n.b); }; nodes.forEach(walk); return [...seen].map(([k, tex]) => ({ k, tex })); },
  count(n, key) { if (!n) return 0; if (n.t === 'v') return n.k === key ? 1 : 0; return TEX.count(n.a, key) + TEX.count(n.b, key); },
  has: (n, key) => TEX.count(n, key) > 0,
  consts(...nodes) { const s = new Set(); const walk = n => { if (!n) return; if (n.t === 'c') s.add(n.k); walk(n.a); walk(n.b); }; nodes.forEach(walk); return [...s]; },
  FN: { sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x), asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh, ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs },
  INV: { sin: 'asin', cos: 'acos', tan: 'atan', asin: 'sin', acos: 'cos', atan: 'tan', sinh: 'asinh', cosh: 'acosh', tanh: 'atanh', asinh: 'sinh', acosh: 'cosh', atanh: 'tanh', ln: 'exp', exp: 'ln' },
  ev(n, env) {
    switch (n.t) {
      case 'n': return n.v;
      case 'c': return n.k === 'pi' ? Math.PI : Math.E;
      case 'v': { const v = env.get ? env.get(n.k) : env[n.k]; if (v == null) throw new Error('no value for ' + n.k); return v; }
      case '+': return TEX.ev(n.a, env) + TEX.ev(n.b, env);
      case '-': return TEX.ev(n.a, env) - TEX.ev(n.b, env);
      case '*': return TEX.ev(n.a, env) * TEX.ev(n.b, env);
      case '/': return TEX.ev(n.a, env) / TEX.ev(n.b, env);
      case '^': { const a = TEX.ev(n.a, env), b = TEX.ev(n.b, env); if (a < 0 && !Number.isInteger(b)) { const inv = 1 / b; if (Number.isInteger(inv) && inv % 2) return -Math.pow(-a, b); } return Math.pow(a, b); }
      case 'neg': return -TEX.ev(n.a, env);
      case '!': return CALC.fact(TEX.ev(n.a, env));
      case 'f': { if (n.f === 'log10') return Math.log10(TEX.ev(n.a, env)); return TEX.FN[n.f](TEX.ev(n.a, env)); }
    }
    throw new Error('?');
  },
  /* ---------------- symbolic: substitute, isolate, simplify, print ---------------- */
  subst(n, key, by) { if (!n) return n; if (n.t === 'v') return n.k === key ? by : n; const o = Object.assign({}, n); if (n.a) o.a = TEX.subst(n.a, key, by); if (n.b) o.b = TEX.subst(n.b, key, by); return o; },
  N: v => ({ t: 'n', v }),
  /** Solve L = R for key when it occurs once: undo the operations around it. Returns a tree, or null. */
  isolate(L, R, key) {
    if (TEX.count(L, key) + TEX.count(R, key) !== 1) return null;
    if (!TEX.has(L, key)) [L, R] = [R, L];
    for (let guard = 0; guard < 200; guard++) {
      if (L.t === 'v') return TEX.simplify(R);
      const inA = L.a && TEX.has(L.a, key);
      switch (L.t) {
        case '+': R = inA ? { t: '-', a: R, b: L.b } : { t: '-', a: R, b: L.a }; L = inA ? L.a : L.b; break;
        case '-': R = inA ? { t: '+', a: R, b: L.b } : { t: '-', a: L.a, b: R }; L = inA ? L.a : L.b; break;
        case '*': R = { t: '/', a: R, b: inA ? L.b : L.a }; L = inA ? L.a : L.b; break;
        case '/': R = inA ? { t: '*', a: R, b: L.b } : { t: '/', a: L.a, b: R }; L = inA ? L.a : L.b; break;
        case '^': if (inA) { R = { t: '^', a: R, b: { t: '/', a: TEX.N(1), b: L.b } }; L = L.a; } else { R = { t: '/', a: { t: 'f', f: 'ln', a: R }, b: { t: 'f', f: 'ln', a: L.a } }; L = L.b; } break;
        case 'neg': R = { t: 'neg', a: R }; L = L.a; break;
        case 'f': if (L.f === 'sqrt') R = { t: '^', a: R, b: TEX.N(2) }; else if (L.f === 'log') R = { t: '^', a: TEX.N(10), b: R }; else if (L.f === 'abs') R = R; else if (TEX.INV[L.f]) R = { t: 'f', f: TEX.INV[L.f], a: R }; else return null; L = L.a; break;
        default: return null;
      }
    }
    return null;
  },
  isNum: (n, v) => n && n.t === 'n' && (v == null || n.v === v),
  simplify(n) {
    if (!n || !n.a) return n;
    const a = TEX.simplify(n.a), b = n.b && TEX.simplify(n.b), x = Object.assign({}, n, { a, b }), I = TEX.isNum;
    if (I(a) && (!b || I(b)) && n.t !== 'f') { try { const v = TEX.ev(x, {}); if (Number.isFinite(v) && (n.t !== '/' && n.t !== '^' || Number.isInteger(v)) && Math.abs(v - Math.round(v * 1e9) / 1e9) < 1e-12) return TEX.N(+v.toPrecision(12)); } catch { } }
    if ((n.t === '*' || n.t === '/') && a.t === 'neg') return TEX.simplify({ t: 'neg', a: { t: n.t, a: a.a, b } });
    if ((n.t === '*' || n.t === '/') && b.t === 'neg') return TEX.simplify({ t: 'neg', a: { t: n.t, a, b: b.a } });
    switch (n.t) {
      case '+': if (I(a, 0)) return b; if (I(b, 0)) return a; if (b.t === 'neg') return { t: '-', a, b: b.a }; break;
      case '-': if (I(b, 0)) return a; if (I(a, 0)) return TEX.simplify({ t: 'neg', a: b }); if (b.t === 'neg') return { t: '+', a, b: b.a }; break;
      case '*': if (b.t === '/' && !I(b.a, 1)) return TEX.simplify({ t: '/', a: { t: '*', a, b: b.a }, b: b.b }); if (a.t === '/' && !I(a.a, 1)) return TEX.simplify({ t: '/', a: { t: '*', a: a.a, b }, b: a.b });
        if (I(a, 1)) return b; if (I(b, 1)) return a; if (I(a, 0) || I(b, 0)) return TEX.N(0); if (I(b) && !I(a)) return { t: '*', a: b, b: a }; break;
      case '/': if (I(b, 1)) return a; if (b.t === '/') return TEX.simplify({ t: '/', a: { t: '*', a, b: b.b }, b: b.a }); if (a.t === '/') return TEX.simplify({ t: '/', a: a.a, b: { t: '*', a: a.b, b } }); break;
      case '^': if (a.t === '/' && I(b)) return TEX.simplify({ t: '/', a: { t: '^', a: a.a, b }, b: { t: '^', a: a.b, b } });
        if (I(b, 1)) return a; if (I(b, 0)) return TEX.N(1); if (b.t === '/' && I(b.a, 1) && I(b.b, 2)) return { t: 'f', f: 'sqrt', a }; if (a.t === 'f' && a.f === 'sqrt' && I(b, 2)) return a.a; if (a.t === '^' && I(b) && I(a.b) && Number.isInteger(a.b.v * b.v)) return TEX.simplify({ t: '^', a: a.a, b: TEX.N(a.b.v * b.v) }); if (a.t === '^' && b.t === '/' && I(b.a, 1) && TEX.eqTree(b.b, a.b)) return a.a; break;
      case 'neg': if (a.t === 'neg') return a.a; if (I(a)) return TEX.N(-a.v); break;
      case 'f': if (n.f === 'ln' && a.t === 'c' && a.k === 'e') return TEX.N(1); if (n.f === 'ln' && a.t === '^' && a.a.t === 'c' && a.a.k === 'e') return a.b; if (n.f === 'log' && a.t === '^' && I(a.a, 10)) return a.b;
        if (a.t === 'f' && TEX.INV[n.f] === a.f && ['ln', 'exp'].includes(n.f)) return a.a; if (n.f === 'sqrt' && a.t === '^' && I(a.b, 2)) return a.a; break;
    }
    return x;
  },
  eqTree: (p, q) => JSON.stringify(p) === JSON.stringify(q),
  PREC: { '+': 1, '-': 1, neg: 2, '*': 3, '/': 4, '^': 5, '!': 6, f: 6, n: 7, v: 7, c: 7 },
  tex(n, outer = 0) {
    const P = TEX.PREC[n.t], wrap = (s, p) => p < outer ? '\\left(' + s + '\\right)' : s;
    switch (n.t) {
      case 'n': return n.v < 0 && outer > 1 ? '\\left(' + TEX.num(n.v) + '\\right)' : TEX.num(n.v);
      case 'c': return n.k === 'pi' ? '\\pi' : 'e';
      case 'v': return n.tex;
      case '+': return wrap(TEX.tex(n.a, 1) + '+' + TEX.tex(n.b, 1), P);
      case '-': return wrap(TEX.tex(n.a, 1) + '-' + TEX.tex(n.b, 2), P);
      case 'neg': return wrap('-' + TEX.tex(n.a, 3), P);
      case '*': { const A = TEX.tex(n.a, 3), B = TEX.tex(n.b, 3), dot = /[0-9.]$/.test(A) && /^[0-9.\-]/.test(B) || /^\\frac/.test(B) && /[0-9]$/.test(A); return wrap(A + (dot || n.b.t === 'n' ? '\\cdot ' : (/[A-Za-z}]$/.test(A) && /^[A-Za-z]/.test(B) ? '\\,' : '')) + B, P); }
      case '/': { const f = '\\frac{' + TEX.tex(n.a, 0) + '}{' + TEX.tex(n.b, 0) + '}'; return outer >= 5 ? '\\left(' + f + '\\right)' : f; }
      case '^': return wrap((n.a.t === 'f' && n.a.f !== 'sqrt' && n.a.f !== 'abs' ? '\\left(' + TEX.tex(n.a, 0) + '\\right)' : TEX.tex(n.a, 6)) + '^{' + TEX.tex(n.b, 0) + '}', P);
      case '!': return TEX.tex(n.a, 6) + '!';
      case 'f': { if (n.f === 'sqrt') return '\\sqrt{' + TEX.tex(n.a, 0) + '}'; if (n.f === 'abs') return '\\left|' + TEX.tex(n.a, 0) + '\\right|';
        const name = { asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', asinh: '\\operatorname{arsinh}', acosh: '\\operatorname{arcosh}', atanh: '\\operatorname{artanh}' }[n.f] || '\\' + n.f;
        return name + '\\left(' + TEX.tex(n.a, 0) + '\\right)'; }
    }
    return '?';
  },
  num(v) { if (!Number.isFinite(v)) return String(v); const a = Math.abs(v); if (a && (a >= 1e6 || a < 1e-4)) { const [m, e] = v.toExponential(6).split('e'); return parseFloat(m) + '\\times 10^{' + (+e) + '}'; } return String(+v.toPrecision(10)); },

  /* ---------------- numeric solving ---------------- */
  /** f(x) = 0 in one unknown: exact when it can be isolated, otherwise Newton from many starts, then a scan with bisection. */
  solve1(eq, key, env) {
    const iso = TEX.isolate(eq.L, eq.R, key);
    if (iso) { try { const v = TEX.ev(iso, env); if (Number.isFinite(v)) return v; } catch { } }
    const f = x => { const e = new Map(env); e.set(key, x); return TEX.ev(eq.L, e) - TEX.ev(eq.R, e); };
    const scale = x => { const e = new Map(env); e.set(key, x); return Math.abs(TEX.ev(eq.L, e)) + Math.abs(TEX.ev(eq.R, e)) + 1e-300; };
    const ok = x => { try { const r = f(x); return Number.isFinite(r) && Math.abs(r) <= 1e-9 * scale(x); } catch { return false; } };
    for (const x0 of [1, 0.5, 2, 10, 0.1, -1, 100, 0.01, -10, 1e3, 1e-3, 1e6, 1e-6]) {
      let x = x0;
      for (let i = 0; i < 80; i++) { let fx; try { fx = f(x); } catch { break; } if (!Number.isFinite(fx)) break; const hh = 1e-7 * Math.max(1, Math.abs(x)); let d; try { d = (f(x + hh) - fx) / hh; } catch { break; } if (!d || !Number.isFinite(d)) break; const nx = x - fx / d; if (!Number.isFinite(nx)) break; if (Math.abs(nx - x) <= 1e-13 * Math.max(1, Math.abs(x))) { x = nx; break; } x = nx; }
      if (ok(x)) return x;
    }
    // scan for a sign change on a log grid both sides of zero
    const grid = []; for (let p = -12; p <= 12; p += 0.25) { grid.push(10 ** p); grid.push(-(10 ** p)); } grid.push(0); grid.sort((a, b) => a - b);
    let prev = null;
    for (const x of grid) { let y; try { y = f(x); } catch { prev = null; continue; } if (!Number.isFinite(y)) { prev = null; continue; }
      if (prev && Math.sign(y) !== Math.sign(prev[1])) { let [a, fa] = prev, b = x; for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; } const r = (a + b) / 2; if (ok(r)) return r; }
      prev = [x, y]; }
    return null;
  },
  /** A set of equations in several unknowns: Levenberg–Marquardt from several starts. */
  solveN(eqs, keys, env) {
    const F = x => { const e = new Map(env); keys.forEach((k, i) => e.set(k, x[i])); return eqs.map(q => { const l = TEX.ev(q.L, e), r = TEX.ev(q.R, e); return (l - r) / (Math.abs(l) + Math.abs(r) + 1e-12); }); };
    const norm = v => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    const starts = [keys.map(() => 1), keys.map(() => 0.5), keys.map(() => 2), keys.map(() => 10), keys.map(() => 0.1), keys.map((_, i) => 1 + i), keys.map(() => 100), keys.map(() => 0.01)];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; for (let s = 0; s < 12; s++) starts.push(keys.map(() => 10 ** (rnd() * 8 - 4) * (rnd() < .15 ? -1 : 1)));
    for (const x0 of starts) {
      let x = x0.slice(), fx; try { fx = F(x); } catch { continue; } if (fx.some(v => !Number.isFinite(v))) continue;
      let lam = 1e-3;
      for (let it = 0; it < 200; it++) {
        const n0 = norm(fx); if (n0 < 1e-12) break;
        const J = keys.map((_, j) => { const hh = 1e-7 * Math.max(1, Math.abs(x[j])), xp = x.slice(); xp[j] += hh; let fp; try { fp = F(xp); } catch { fp = fx.map(() => NaN); } return fp.map((v, i) => (v - fx[i]) / hh); }); // J[j][i]
        const m = keys.length, A = [...Array(m)].map((_, r) => [...Array(m)].map((_, c) => J[r].reduce((s, v, i) => s + v * J[c][i], 0))), g = [...Array(m)].map((_, r) => -J[r].reduce((s, v, i) => s + v * fx[i], 0));
        let improved = false;
        for (let tries = 0; tries < 12; tries++) {
          const Ad = A.map((row, r) => row.map((v, c) => v + (r === c ? lam * (v || 1) : 0))), dx = TEX.gauss(Ad, g.slice()); if (!dx) { lam *= 10; continue; }
          const xn = x.map((v, i) => v + dx[i]); let fn; try { fn = F(xn); } catch { lam *= 10; continue; }
          if (fn.every(Number.isFinite) && norm(fn) < n0) { x = xn; fx = fn; lam = Math.max(lam / 10, 1e-12); improved = true; break; } lam *= 10;
        }
        if (!improved) break;
      }
      if (norm(fx) < 1e-9) return x;
    }
    return null;
  },
  gauss(A, b) { const n = b.length; for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-300) return null; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } } return b.map((v, i) => v / A[i][i]); },
  /**
   * Solve linked equations given known values. eqs: [{L, R}], known: Map(key → number).
   * One-unknown equations are solved first and their results fed forward; what is left is solved together.
   */
  system(eqs, known) {
    const vals = new Map(known), solved = [], keysOf = q => TEX.vars(q.L, q.R).map(v => v.k);
    let rest = eqs.slice(), progress = true;
    while (progress) { progress = false;
      for (const q of rest.slice()) { const unk = keysOf(q).filter(k => !vals.has(k));
        if (!unk.length) { rest = rest.filter(x => x !== q); continue; }
        if (unk.length === 1) { const v = TEX.solve1(q, unk[0], vals); if (v != null) { vals.set(unk[0], v); solved.push(unk[0]); rest = rest.filter(x => x !== q); progress = true; } } } }
    const unk = [...new Set(rest.flatMap(q => keysOf(q).filter(k => !vals.has(k))))];
    let need = 0, failed = false;
    if (unk.length) {
      if (rest.length >= unk.length) { const x = TEX.solveN(rest, unk, vals); if (x) unk.forEach((k, i) => { vals.set(k, x[i]); solved.push(k); }); else failed = true; }
      else need = unk.length - rest.length;
    }
    const residual = eqs.map(q => { try { const l = TEX.ev(q.L, vals), r = TEX.ev(q.R, vals); return Math.abs(l - r) / (Math.abs(l) + Math.abs(r) + 1e-300); } catch { return null; } });
    return { vals, solved, unknown: unk.filter(k => !vals.has(k)), need, failed, residual };
  },
  /** Rearrange for a term: isolate it in each equation that holds it once; with values given, also substitute the other unknowns from the other equations. */
  rearrange(eqs, key, knownKeys = new Set()) {
    const out = [];
    eqs.forEach((q, i) => { const r = TEX.isolate(q.L, q.R, key); if (r) out.push({ from: [i], expr: r }); });
    if (eqs.length > 1 && knownKeys.size) for (const base of out.slice()) {
      let expr = base.expr; const used = new Set(base.from);
      for (let round = 0; round < eqs.length; round++) {
        const u = TEX.vars(expr).map(v => v.k).find(k => k !== key && !knownKeys.has(k)); if (!u) break;
        const j = eqs.findIndex((q, j) => !used.has(j) && !TEX.has(q.L, key) && !TEX.has(q.R, key) && TEX.isolate(q.L, q.R, u)); if (j < 0) break;
        expr = TEX.simplify(TEX.subst(expr, u, TEX.isolate(eqs[j].L, eqs[j].R, u))); used.add(j);
      }
      if (used.size > 1) out.push({ from: [...used], expr, combined: true });
    }
    return out;
  },
  /** A name the calculator can type: σ_0 → sigma_0. */
  ascii(key) { const back = Object.fromEntries(Object.entries(TEX.GREEK).map(([n, g]) => [g, n])); return key.replace(/[^\x00-\x7F]/g, ch => back[ch] || '').replace(/'/g, 'p').replace(/[^A-Za-z0-9_]/g, '') || 'x'; },
};

/* ---------------- equation boxes, the registry, and the calculator's solver ---------------- */
const EQ = {
  _parsed: new Map(),
  parsed(tex) { tex = tex || ''; if (!EQ._parsed.has(tex)) { let v; try { v = TEX.parse(tex); } catch (e) { v = { err: e.message }; } EQ._parsed.set(tex, v); } return EQ._parsed.get(tex); },
  rec: b => b && b.eqId ? DB.get('equations', b.eqId) : null,
  data(b) { const r = EQ.rec(b); return r || b.eq || { tex: '', vars: {} }; },
  terms(tex) { const p = EQ.parsed(tex); return p.err ? [] : TEX.vars(p.L, p.R); },
  label(b) { const r = EQ.rec(b); return (r && r.name) || b.label || 'Equation'; },
  /** Edits go to the registry when the box is registered, so every note that uses it follows. */
  save(b, patch) {
    const r = EQ.rec(b), data = Object.assign({}, EQ.data(b), patch); data.vars = Object.assign({}, data.vars);
    if (r) { Object.assign(r, patch, { modified: isoLocal(new Date()) }); DB.put('equations', r); }
    b.eq = { tex: data.tex, vars: data.vars }; EQ.syncText(b); DB.put('blocks', b); changed();
  },
  syncText(b) { const d = EQ.data(b), names = EQ.terms(d.tex).map(v => v.k + ' ' + ((d.vars || {})[v.k] || {}).name || '').join(' · '); b.body = { text: [EQ.label(b), d.tex, names].filter(Boolean).join('\n'), marks: [] }; b.modified = isoLocal(new Date()); },
  create(d, at, init = {}) {
    const rec = init.eqId && DB.get('equations', init.eqId);
    const b = M.addBlock(d.id, null, { kind: 'eq', label: rec ? rec.name : 'Equation', eqId: init.eqId || null, eq: { tex: rec ? rec.tex : init.tex || '', vars: Object.assign({}, rec ? rec.vars : init.vars || {}) }, x: Math.round(at.x / 14) * 14, y: Math.round(at.y / 14) * 14, w: 420 });
    if (rec) { rec.uses = (rec.uses || 0) + 1; DB.put('equations', rec); }
    EQ.syncText(b); DB.put('blocks', b); changed(); return b;
  },
  /** New equation: the editor first, the box once there is something in it. */
  newAt(d, at, tex = '') { MATH.editor({ tex, display: true, title: 'New equation', onSave: t => { if (t) EQ.create(d, at, { tex: t }); } }); },
  viewPoint(pane) { const r = pane.paper.rect(), p = pane.paper.toWorld(r.left + r.width / 2 - 200, r.top + 120); return p; },
  newMenu(pane, e) {
    const d = M.doc(pane.docId), at = EQ.viewPoint(pane), n = DB.all('equations').length;
    ctxMenu(e.clientX - 160, e.clientY + 10, [{ head: 'Equation' }, { label: 'New equation…', sub: 'Typed in the equation editor; a legend of its terms goes beneath', run: () => EQ.newAt(d, at) },
      { label: 'Registered equation…', sub: n ? plural(n, 'equation') + ' in the registry — search and insert' : 'None registered yet — use “Register…” on an equation box', run: () => EQ.pick(r => EQ.create(d, at, { eqId: r.id })) }]);
  },
  pick(onPick, title = 'Insert a registered equation') {
    const m = modal({ title, wide: true, actions: [{ label: 'Close' }], body: optionPicker({ placeholder: 'Search by name, term or meaning (e.g. “stiffness”, “Hooke”)…', sort: 'equations',
      items: q => DB.all('equations').filter(r => !q || (r.name + ' ' + r.tex + ' ' + Object.entries(r.vars || {}).map(([k, v]) => k + ' ' + (v.name || '') + ' ' + (v.unit || '')).join(' ')).toLowerCase().includes(q)).map(r => Object.assign({ title: r.name, date: r.modified || r.created }, r)),
      render: r => { const eqh = h('span.eqpick'); const html = MATH.html(r.tex, false); if (html) eqh.innerHTML = html; else eqh.textContent = r.tex;
        return h('div', h('b', r.name), ' ', eqh, h('span.s', EQ.terms(r.tex).map(v => v.k + ((r.vars || {})[v.k] && r.vars[v.k].name ? ' ' + r.vars[v.k].name : '')).join(' · ') + (r.uses ? ' · used ' + plural(r.uses, 'time') : ''))); },
      emptyText: 'No registered equations yet — write one, then “Register…” on its box', onPick: r => { m.close(); onPick(r); } }) });
  },
  register(b) {
    const d = EQ.data(b); if (!d.tex) return toast('Write the equation first');
    askText('Register this equation', 'Name (how you will look it up)', b.label && b.label !== 'Equation' ? b.label : '').then(name => { if (!name) return;
      const r = { id: uid('eq'), name: name.trim(), tex: d.tex, vars: Object.assign({}, d.vars), created: isoLocal(new Date()), modified: isoLocal(new Date()), uses: 1, from: b.id };
      DB.put('equations', r); b.eqId = r.id; b.label = r.name; EQ.syncText(b); DB.put('blocks', b); changed(); toast('Registered — insert it in any note with ∑ Equation → Registered'); });
  },
  unregister(b) { const r = EQ.rec(b); if (!r) return; b.eq = { tex: r.tex, vars: Object.assign({}, r.vars) }; b.eqId = null; DB.put('blocks', b); changed(); toast('This box keeps its copy; the registry entry stays for other notes'); },
  removeFromRegistry(r) { DB.where('blocks', x => x.eqId === r.id).forEach(x => { x.eq = { tex: r.tex, vars: Object.assign({}, r.vars) }; x.eqId = null; DB.put('blocks', x); }); DB.del('equations', r.id); changed(); toast('Removed from the registry — boxes keep their copies'); },
  widen(c) { if ((c.w || 336) < 420) { c.w = 420; DB.put('blocks', c); } },
  linkedTo: calc => IX.wiresOf(calc.id).map(w => M.block(w.from === calc.id ? w.to : w.from)).filter(x => x && x.kind === 'eq' && x.status === 'live'),
  calcsOf: eqb => IX.wiresOf(eqb.id).map(w => M.block(w.from === eqb.id ? w.to : w.from)).filter(x => x && x.kind === 'calc' && x.status === 'live'),
  /** Wire an equation to a calculator in its note (making one beside it if there is none). */
  toCalc(eqb, pane) {
    const have = EQ.calcsOf(eqb); if (have.length) return toast('Already wired to ' + have.map(x => x.label).join(', '));
    const calcs = M.liveBlocks(eqb.docId).filter(x => x.kind === 'calc' && x.status !== 'removed');
    const link = c => { EQ.widen(c); M.wire(eqb.id, c.id, 'related', false); CALC._focus = c.id; toast('Wired — the calculator now solves it'); };
    if (calcs.length === 1) return link(calcs[0]);
    if (calcs.length > 1) return pickModal('Which calculator?', 'The equation’s terms appear in it as fields.', calcs.map(c => ({ label: c.label || 'Calculator', run: () => link(c) })));
    const c = CALC.open(pane); c.x = (eqb.x || 0) + (eqb.w || 420) + 70; c.y = eqb.y || 0; DB.put('blocks', c); link(c);
  },
  html(tex, display, cls = 'span.eqr') { const el = h(cls); const s = MATH.html(tex, display); if (s) el.innerHTML = s; else el.textContent = tex; return el; },

  /* ---------------- the box ---------------- */
  body(b, d, pane, ro) {
    const data = EQ.data(b), rec = EQ.rec(b), p = EQ.parsed(data.tex), terms = p.err ? [] : TEX.vars(p.L, p.R), consts = p.err ? [] : TEX.consts(p.L, p.R);
    const edit = () => { if (ro) return; MATH.editor({ tex: data.tex, display: true, title: rec ? 'Edit “' + rec.name + '” (registered — every note that uses it follows)' : 'Equation', onSave: t => { if (t != null && t !== data.tex) EQ.save(b, { tex: t }); } }); };
    const shown = EQ.html(data.tex || '\\square', true, 'div.eqshow'); shown.title = ro ? '' : 'Click to edit'; if (!ro) shown.addEventListener('click', e => { e.stopPropagation(); edit(); });
    const setVar = (k, f, v) => { const vars = Object.assign({}, data.vars), cur = Object.assign({}, vars[k]); cur[f] = v; vars[k] = cur; EQ.save(b, { vars }); };
    const legend = terms.length ? h('table.eqleg', h('tbody', terms.map(v => { const V = (data.vars || {})[v.k] || {};
      return h('tr', h('td.sym', EQ.html(v.tex, false)), h('td', h('input.inp.sm', { value: V.name || '', placeholder: 'what it is…', readOnly: ro, on: { change: e => setVar(v.k, 'name', e.target.value.trim()), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } } })),
        h('td.u', h('input.inp.sm', { value: V.unit || '', placeholder: 'unit', readOnly: ro, on: { change: e => setVar(v.k, 'unit', e.target.value.trim()), keydown: e => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } } }))); }),
      consts.map(c => h('tr.const', h('td.sym', EQ.html(c === 'pi' ? '\\pi' : 'e', false)), h('td', { colSpan: 2 }, h('span.tiny.muted', c === 'pi' ? 'π = 3.14159… (constant)' : 'e = 2.71828… (constant)')))))) : null;
    const calcs = EQ.calcsOf(b);
    return h('div.eqbox', shown,
      p.err ? h('div.tiny', { style: { color: 'var(--bad)', margin: '4px 2px' } }, 'Can’t read it for solving: ' + p.err) : !p.R && data.tex ? h('div.tiny.muted', { style: { margin: '4px 2px' } }, 'An expression, not an equation — add “=” to solve it') : null,
      legend ? h('div.eqlegh', h('span.lab', 'Legend'), h('span.tiny.muted', plural(terms.length, 'term'))) : null, legend,
      h('div.eqfoot', rec ? h('span.pill.teal', { title: 'Registered — edits here change it everywhere' }, '∑ ' + rec.name) : ro ? null : h('button.btn.xs', { on: { click: () => EQ.register(b) } }, 'Register…'),
        h('span.spacer'), calcs.length ? h('span.tiny.muted', '⇄ ' + calcs.map(c => c.label || 'Calculator').join(', ')) : null,
        ro ? null : h('button.btn.xs', { title: 'Wire it to a calculator: its terms become fields you fill in', on: { click: () => EQ.toCalc(b, pane) } }, '🖩 Solve in calculator')));
  },

  /* ---------------- inside a wired calculator ---------------- */
  /** Values the calculator's own lines can use by name (σ_0 → sigma_0). */
  calcVars(cb) { const o = {}; Object.entries((cb.solve || {}).out || {}).forEach(([k, v]) => { if (Number.isFinite(v)) o[TEX.ascii(k)] = v; }); return o; },
  solverPanel(cb, api) {
    const eqbs = EQ.linkedTo(cb); if (!eqbs.length) return null;
    const S = cb.solve = Object.assign({ vals: {}, out: {}, rearr: '' }, cb.solve || {});
    const items = eqbs.map(e => ({ b: e, d: EQ.data(e), p: EQ.parsed(EQ.data(e).tex) })), good = items.filter(x => !x.p.err && x.p.R);
    const seen = new Map(); good.forEach(x => TEX.vars(x.p.L, x.p.R).forEach(v => { if (!seen.has(v.k)) seen.set(v.k, { k: v.k, tex: v.tex, name: '', unit: '' }); const V = (x.d.vars || {})[v.k] || {}, s = seen.get(v.k); s.name = s.name || V.name || ''; s.unit = s.unit || V.unit || ''; }));
    const terms = [...seen.values()];
    const rows = new Map(), status = h('div.cs-st'), rearrEl = h('div.cs-rearr');
    const persist = debounce(() => DB.put('blocks', cb), 300);
    const run = () => {
      const known = new Map(), bad = [];
      terms.forEach(t => { const s = (S.vals[t.k] || '').trim(); if (!s) return; try { const v = CALC.eval(s, { deg: cb.angle !== 'rad', ans: api.ans() }); if (Number.isFinite(v)) known.set(t.k, v); else bad.push(t.k); } catch { bad.push(t.k); } });
      const R = good.length ? TEX.system(good.map(x => x.p), known) : { vals: known, solved: [], unknown: [], need: 0, residual: [] };
      S.out = {}; R.vals.forEach((v, k) => S.out[k] = v); S._solved = R.solved;
      terms.forEach(t => { const r = rows.get(t.k); if (!r) return; const given = known.has(t.k), solved = R.solved.includes(t.k);
        r.inp.classList.toggle('bad', bad.includes(t.k)); r.row.classList.toggle('solved', solved); r.row.classList.toggle('given', given);
        r.out.textContent = solved ? '= ' + CALC.fmt(R.vals.get(t.k)) : given ? '' : '?'; r.out.title = solved ? 'Worked out from the others · Enter adds it to the calculator' : ''; });
      const allKnown = terms.length && terms.every(t => known.has(t.k));
      status.className = 'cs-st';
      if (!good.length) status.textContent = 'No equation here can be solved yet (needs an “=”).';
      else if (!known.size) status.textContent = 'Type the values you know — the rest is worked out.';
      else if (allKnown) { const okAll = R.residual.every(x => x != null && x < 1e-6); status.textContent = okAll ? '✓ These values satisfy ' + (good.length > 1 ? 'every equation' : 'the equation') : '✗ These values do not satisfy ' + (good.length > 1 ? 'the equations' : 'the equation') + ' — empty one to solve for it'; status.classList.add(okAll ? 'ok' : 'bad'); }
      else if (R.need) { status.textContent = 'Enter ' + plural(R.need, 'more value') + ' — ' + plural(terms.length - known.size, 'term') + ' unknown, ' + plural(good.length, 'equation'); status.classList.add('wait'); }
      else if (R.failed && !R.solved.length) { status.textContent = 'No solution found from these values.'; status.classList.add('bad'); }
      else { status.textContent = 'Solved for ' + R.solved.map(k => k).join(', ') + (R.unknown.length ? ' · still unknown: ' + R.unknown.join(', ') : '') + ' · Enter adds ' + (R.solved.length > 1 ? 'them' : 'it') + ' to the calculator'; status.classList.add('ok'); }
      persist(); drawRearr();
      return R;
    };
    const send = () => { const R = run(); const ks = (R.solved || []).filter(k => Number.isFinite(R.vals.get(k))); if (!ks.length) { api.focus(); return; }
      ks.forEach(k => api.push(CALC.fmt(R.vals.get(k)).replace('∞', 'Infinity'), R.vals.get(k), k + ' =')); api.focus(); };
    const drawRearr = () => {
      if (!S.rearr || !seen.has(S.rearr)) { rearrEl.replaceChildren(); return; }
      const t = seen.get(S.rearr), known = new Set(terms.filter(x => (S.vals[x.k] || '').trim()).map(x => x.k));
      const outs = TEX.rearrange(good.map(x => x.p), t.k, known);
      if (!outs.length) { rearrEl.replaceChildren(h('div.tiny.muted', 'It can’t be rearranged for ' + t.k + ' by moving terms (it appears more than once) — the solver still works it out numerically.')); return; }
      rearrEl.replaceChildren(...outs.map(o => { const tex = t.tex + '=' + TEX.tex(o.expr);
        return h('div.cs-ro', EQ.html(tex, false), h('span.tiny.muted', o.combined ? 'combining ' + o.from.map(i => '(' + (i + 1) + ')').join(' + ') : good.length > 1 ? 'from (' + (o.from[0] + 1) + ')' : ''), h('span.spacer'),
          h('button.btn.xs', { title: 'Add it to the note as its own equation box', on: { click: () => { const src = good[o.from[0]].b, vars = {}; good.forEach(x => Object.assign(vars, x.d.vars)); const nb = EQ.create(M.doc(cb.docId), { x: (cb.x || 0), y: (cb.y || 0) - 220 }, { tex, vars }); toast('Added as an equation box'); } } }, '+ box')); }));
    };
    const grid = h('div.cs-vars', terms.map(t => {
      const inp = h('input.cs-in', { value: S.vals[t.k] || '', placeholder: '?', spellcheck: false, 'aria-label': t.k, on: {
        input: e => { S.vals[t.k] = e.target.value; run(); },
        keydown: e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); send(); } else if (e.key === 'Escape') { e.preventDefault(); if (e.target.value) { e.target.value = ''; S.vals[t.k] = ''; run(); } else e.target.blur(); }
          else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const all = $$('.cs-in', grid), i = all.indexOf(e.target), nx = all[i + (e.key === 'ArrowDown' ? 1 : -1)]; nx && nx.focus(); } } } });
      const out = h('span.cs-out'), row = h('div.cs-row', h('span.cs-sym', EQ.html(t.tex, false)), h('span.cs-name', { title: t.name }, t.name || ''), inp, out, h('span.cs-u', t.unit || ''));
      rows.set(t.k, { row, inp, out }); return row; }));
    const rsel = h('select.inp.sm', { title: 'Rearrange for a term', on: { change: e => { S.rearr = e.target.value; persist(); drawRearr(); } } }, h('option', { value: '' }, 'Rearrange for…'), terms.map(t => h('option', { value: t.k, selected: S.rearr === t.k }, t.k + (t.name ? ' — ' + t.name : ''))));
    const eqList = h('div.cs-eqs', items.map((x, i) => h('div.cs-eq' + (x.p.err || !x.p.R ? '.bad' : ''), h('span.mono.tiny.muted', '(' + (i + 1) + ')'), EQ.html(x.d.tex, false), h('span.spacer'), h('span.tiny.muted', EQ.label(x.b)),
      h('button.ib', { title: 'Unwire this equation from the calculator', on: { click: e => { e.stopPropagation(); IX.wiresOf(cb.id).filter(w => w.from === x.b.id || w.to === x.b.id).forEach(w => M.unwire(w.id)); } } }, '×'))));
    const el = h('div.csolve', h('div.cs-h', h('b', '∑ ' + plural(items.length, 'equation')), h('span.tiny.muted', terms.length ? plural(terms.length, 'term') : ''), h('span.spacer'), rsel,
      h('button.btn.xs', { title: 'Wire another equation (from this note or the registry)', on: { click: () => EQ.addToCalc(cb) } }, '+ equation')), eqList, grid, status, rearrEl,
      h('div.cs-f', h('button.btn.xs.pri', { on: { click: send } }, '↵ To calculator'), h('span.tiny.muted', 'Fill what you know · Enter puts the results in the lines below, then keep calculating — solved terms can be typed by name')));
    setTimeout(run, 0); return el;
  },
  addToCalc(cb) {
    const d = M.doc(cb.docId), here = M.liveBlocks(d.id).filter(x => x.kind === 'eq' && x.status !== 'removed' && !EQ.linkedTo(cb).includes(x));
    const opts = [...here.map(x => ({ t: 'b', x, title: EQ.label(x) })), ...DB.all('equations').map(r => ({ t: 'r', x: r, title: r.name, date: r.modified }))];
    const m = modal({ title: 'Wire an equation to ' + (cb.label || 'the calculator'), wide: true, actions: [{ label: 'Close' }], body: optionPicker({ placeholder: 'Search equations…', sort: 'eqcalc', section: o => o.t === 'b' ? 'In this note' : 'Registered',
      items: q => opts.filter(o => !q || (o.title + ' ' + EQ.data(o.t === 'b' ? o.x : { eq: o.x }).tex + ' ' + (o.t === 'r' ? o.x.tex : '')).toLowerCase().includes(q)),
      render: o => h('div', h('b', o.title), ' ', EQ.html(o.t === 'b' ? EQ.data(o.x).tex : o.x.tex, false, 'span.eqpick')),
      onPick: o => { m.close(); const eb = o.t === 'b' ? o.x : EQ.create(d, { x: (cb.x || 0) - 470, y: cb.y || 0 }, { eqId: o.x.id }); EQ.widen(cb); M.wire(eb.id, cb.id, 'related', false); CALC._focus = cb.id; } }) });
  },
};
WIDGETS.eq = { label: 'equation', w: 420, body: EQ.body, menu: b => [
  { label: 'Edit equation…', run: () => { const box = $(`.box[data-id="${b.id}"] .eqshow`); box && box.click(); } },
  EQ.rec(b) ? { label: 'Unlink from the registry', sub: 'Keep a copy here that no longer follows the registered one', run: () => EQ.unregister(b) } : { label: 'Register…', run: () => EQ.register(b) },
  EQ.rec(b) ? { label: 'Remove “' + EQ.rec(b).name + '” from the registry…', danger: true, sub: 'Boxes that use it keep their copies', run: () => EQ.removeFromRegistry(EQ.rec(b)) } : null,
  { label: 'Copy LaTeX', run: () => { navigator.clipboard && navigator.clipboard.writeText(EQ.data(b).tex); toast('LaTeX copied'); } }].filter(Boolean) };
{ const i = INSERTS.findIndex(x => x.id === 'equation'); const eqIns = { id: 'equation', group: 'Writing', icon: '∑', label: 'Equation', sub: 'With a legend of its terms · or type $…$ in any box for inline math', run: (d, p) => EQ.newAt(d, p) }; if (i >= 0) INSERTS[i] = eqIns; else INSERTS.push(eqIns); }
INSERTS.push({ id: 'equation-reg', group: 'Writing', icon: '∑', label: 'Registered equation…', sub: 'Look one up by name or term and insert it', run: (d, p) => EQ.pick(r => EQ.create(d, p, { eqId: r.id })) });
