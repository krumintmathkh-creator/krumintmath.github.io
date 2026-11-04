/* Polynomial Math Lab - เอนจินพหุนาม: สุ่มโจทย์ ตรวจคำตอบ วินิจฉัยข้อผิดพลาด สร้างเฉลยทีละขั้น */
(function (root) {
  'use strict';

  /* ---------- ตัวสุ่ม ---------- */
  let rng = Math.random;
  function setRng(fn) { rng = fn || Math.random; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function coef(max, nonzero) {
    let c;
    do { c = ri(-max, max); } while (nonzero !== false && c === 0);
    return c;
  }

  /* ---------- พหุนามเป็นอาร์เรย์สัมประสิทธิ์ index = ดีกรี ---------- */
  const EPS = 1e-9;
  function trim(p) {
    const a = p.map((v) => (Math.abs(v) < EPS ? 0 : v));
    while (a.length && a[a.length - 1] === 0) a.pop();
    return a;
  }
  function padd(a, b) {
    const n = Math.max(a.length, b.length), r = [];
    for (let i = 0; i < n; i++) r[i] = (a[i] || 0) + (b[i] || 0);
    return trim(r);
  }
  function pscale(a, k) { return trim(a.map((v) => v * k)); }
  function psub(a, b) { return padd(a, pscale(b, -1)); }
  function pmul(a, b) {
    a = trim(a); b = trim(b);
    if (!a.length || !b.length) return [];
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
    return trim(r);
  }
  function peq(a, b) {
    a = trim(a); b = trim(b);
    if (a.length !== b.length) return false;
    return a.every((v, i) => Math.abs(v - b[i]) < EPS);
  }
  function pkey(a) { return trim(a).join(','); }
  function mono(c, d) { const a = new Array(d + 1).fill(0); a[d] = c; return a; }
  function nonzeroCount(p) { return trim(p).filter((v) => v !== 0).length; }
  function evalAt1(p) { return p.reduce((s, v) => s + v, 0); }

  /* ---------- ตัวอ่านคำตอบที่นักเรียนพิมพ์ ---------- */
  function normalize(input) {
    return String(input)
      .toLowerCase()
      .replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0E50))
      .replace(/[−–—‒﹣－]/g, '-')
      .replace(/[×·∙]/g, '*')
      .replace(/[（［｛\[{]/g, '(')
      .replace(/[）］｝\]}]/g, ')')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
      .replace(/\s+/g, '');
  }

  function parsePoly(input) {
    const s = normalize(input);
    if (!s) return { ok: false, error: 'ยังไม่ได้พิมพ์คำตอบ' };
    if (!/^[0-9x+\-*^().]+$/.test(s)) return { ok: false, error: 'ใช้ได้เฉพาะตัวเลข ตัวแปร x และเครื่องหมาย + − ^ ( )' };
    if (/x\d/.test(s)) return { ok: false, error: 'เลขยกกำลังต้องมี ^ นำหน้า เช่น x^2 (หรือกดปุ่ม x²)' };
    let i = 0;
    const peek = () => s[i];
    function parseExpr() {
      let neg = false;
      while (peek() === '+' || peek() === '-') { if (peek() === '-') neg = !neg; i++; }
      let v = parseTerm();
      if (neg) v = pscale(v, -1);
      while (peek() === '+' || peek() === '-') {
        let n = false;
        while (peek() === '+' || peek() === '-') { if (peek() === '-') n = !n; i++; }
        const t = parseTerm();
        v = n ? psub(v, t) : padd(v, t);
      }
      return v;
    }
    function parseTerm() {
      let v = parseFactor();
      while (i < s.length) {
        const c = peek();
        if (c === '*') { i++; v = pmul(v, parseFactor()); }
        else if (c === 'x' || c === '(' || (c >= '0' && c <= '9') || c === '.') v = pmul(v, parseFactor());
        else break;
      }
      return v;
    }
    function parseFactor() {
      let base;
      const c = peek();
      if (c === '(') {
        i++;
        base = parseExpr();
        if (peek() !== ')') throw new Error('วงเล็บไม่ครบคู่');
        i++;
      } else if (c === 'x') {
        i++; base = [0, 1];
      } else if ((c >= '0' && c <= '9') || c === '.') {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const num = parseFloat(s.slice(i, j));
        if (isNaN(num)) throw new Error('ตัวเลขไม่ถูกต้อง');
        i = j; base = trim([num]);
      } else {
        throw new Error('รูปแบบคำตอบยังไม่สมบูรณ์ ตรวจเครื่องหมาย + − ที่ท้ายคำตอบ');
      }
      if (peek() === '^') {
        i++;
        let j = i;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        if (j === i) throw new Error('หลังเครื่องหมาย ^ ต้องเป็นตัวเลข');
        const e = parseInt(s.slice(i, j), 10);
        if (e > 6) throw new Error('เลขยกกำลังสูงเกินไป');
        i = j;
        let r = [1];
        for (let k = 0; k < e; k++) r = pmul(r, base);
        base = r;
      }
      return base;
    }
    try {
      const poly = parseExpr();
      if (i < s.length) throw new Error('รูปแบบคำตอบไม่ถูกต้อง (ตรวจวงเล็บหรือเครื่องหมาย)');
      return { ok: true, poly: trim(poly) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ต้องจัดรูปอย่างง่าย: ไม่มีวงเล็บ และไม่มีพจน์คล้ายที่ยังไม่รวม
  function checkSimplified(input) {
    const s = normalize(input);
    if (/[()]/.test(s)) return { ok: false, error: 'ตอบให้อยู่ในรูปอย่างง่าย คือกระจายและรวมพจน์ให้เสร็จ ไม่เหลือวงเล็บ' };
    const parts = s.replace(/^[+-]+/, '').split(/[+-]+/).filter(Boolean);
    const seen = {};
    for (const t of parts) {
      const r = parsePoly(t);
      if (!r.ok) return { ok: true };
      const d = r.poly.length - 1;
      if (seen[d]) return { ok: false, error: 'ยังมีพจน์คล้ายกันที่ยังไม่ได้รวม ให้รวมให้เหลือพจน์เดียวต่อหนึ่งชนิด' };
      seen[d] = true;
    }
    return { ok: true };
  }

  /* ---------- การแสดงผล (HTML) ---------- */
  const degCls = (d) => 'd' + Math.min(d, 3);
  function fmtNum(n) {
    const a = Math.abs(n);
    return String(a % 1 ? +a.toFixed(4) : a);
  }
  function varHTML(d) {
    if (d === 0) return '';
    return '<i class="v">x</i>' + (d > 1 ? '<sup>' + d + '</sup>' : '');
  }
  function monoHTML(c, d) {
    const a = Math.abs(c);
    if (d === 0) return fmtNum(a);
    return (a === 1 ? '' : fmtNum(a)) + varHTML(d);
  }
  // terms: [{c,d,cls}]
  function renderTerms(terms) {
    if (!terms.length) return '<span class="t">0</span>';
    return terms.map((t, i) => {
      let sg = '';
      if (i === 0) { if (t.c < 0) sg = '<span class="sg u">−</span>'; }
      else sg = '<span class="sg b">' + (t.c < 0 ? '−' : '+') + '</span>';
      return '<span class="t ' + (t.cls || '') + '">' + sg + monoHTML(t.c, t.d) + '</span>';
    }).join('');
  }
  function polyTerms(p, colored) {
    p = trim(p);
    const out = [];
    for (let d = p.length - 1; d >= 0; d--) if (p[d]) out.push({ c: p[d], d, cls: colored ? degCls(d) : '' });
    return out;
  }
  function polyHTML(p, colored) { return renderTerms(polyTerms(p, colored)); }
  function numsHTML(list) {
    return list.map((c, i) => {
      if (i === 0) return (c < 0 ? '<span class="sg u">−</span>' : '') + fmtNum(c);
      return '<span class="sg b">' + (c < 0 ? '−' : '+') + '</span>' + fmtNum(c);
    }).join('');
  }
  function problemHTML(prob) {
    return prob.parts.map((pt, i) => {
      const inner = pt.paren ? '<span class="par">(</span>' + polyHTML(pt.poly) + '<span class="par">)</span>' : polyHTML(pt.poly);
      if (i === 0) return (pt.sign < 0 ? '<span class="sg u">−</span>' : '') + inner;
      return '<span class="sg b">' + (pt.sign < 0 ? '−' : '+') + '</span>' + inner;
    }).join('');
  }
  function prettyTyped(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\^\s*(\d+)/g, '<sup>$1</sup>')
      .replace(/²/g, '<sup>2</sup>').replace(/³/g, '<sup>3</sup>')
      .replace(/-/g, '−')
      .replace(/x/gi, '<i class="v">x</i>');
  }
  function plainPoly(p) {
    p = trim(p);
    if (!p.length) return '0';
    let s = '';
    for (let d = p.length - 1; d >= 0; d--) {
      if (!p[d]) continue;
      const a = Math.abs(p[d]);
      const body = d === 0 ? fmtNum(a) : (a === 1 ? '' : fmtNum(a)) + 'x' + (d > 1 ? '^' + d : '');
      s += (s ? (p[d] < 0 ? ' - ' : ' + ') : (p[d] < 0 ? '-' : '')) + body;
    }
    return s;
  }

  /* ---------- สร้างโจทย์ ---------- */
  const SKILL_BY_LEVEL = { 1: 'like', 2: 'add', 3: 'sub' };
  let seenKeys = new Set();
  let idCounter = 0;

  function genLike() {
    const d = pick([1, 1, 2, 2]);
    const paren = rng() < 0.35;
    const n = rng() < 0.6 ? 2 : 3;
    const parts = [];
    for (let k = 0; k < n; k++) {
      if (paren) parts.push({ sign: 1, paren: true, poly: mono(coef(9), d) });
      else parts.push({ sign: k === 0 ? 1 : (rng() < 0.35 ? -1 : 1), paren: false, poly: mono(ri(1, 9), d) });
    }
    if (rng() < 0.25) {
      const d2 = pick([0, 1, 2].filter((x) => x !== d));
      const idx = ri(0, parts.length);
      const extra = paren
        ? { sign: 1, paren: true, poly: mono(coef(9), d2) }
        : { sign: idx === 0 ? 1 : (rng() < 0.3 ? -1 : 1), paren: false, poly: mono(ri(1, 9), d2) };
      parts.splice(idx, 0, extra);
      if (!paren && parts[0].sign < 0) parts[0].sign = 1;
    }
    return parts;
  }

  function randPoly(opts) {
    opts = opts || {};
    const p = [0, 0, 0];
    let cnt = 0;
    for (let d = 2; d >= 0; d--) {
      if (rng() < (d === 2 ? 0.9 : 0.85)) { p[d] = coef(opts.max || 9); cnt++; }
    }
    if (cnt < 2) { const d = pick([0, 1, 2].filter((x) => !p[x])); p[d] = coef(opts.max || 9); }
    return trim(p);
  }

  function genAdd() {
    const n = rng() < 0.82 ? 2 : 3;
    const parts = [];
    for (let k = 0; k < n; k++) parts.push({ sign: 1, paren: true, poly: randPoly() });
    return parts;
  }

  function genSub() {
    const r = rng();
    const signs = r < 0.65 ? [1, -1] : r < 0.8 ? [1, 1, -1] : r < 0.92 ? [1, -1, 1] : [1, -1, -1];
    return signs.map((sg) => {
      const poly = randPoly();
      if (sg < 0 && !poly.some((v) => v < 0)) {
        const idxs = [];
        poly.forEach((v, d) => { if (v) idxs.push(d); });
        const d = pick(idxs);
        poly[d] = -Math.abs(poly[d]);
      }
      return { sign: sg, paren: true, poly };
    });
  }

  function answerOf(parts) {
    let r = [];
    parts.forEach((pt) => { r = padd(r, pscale(pt.poly, pt.sign)); });
    return r;
  }

  function newProblem(level, opts) {
    opts = opts || {};
    let tries = 0, parts, ans, key;
    do {
      parts = level === 1 ? genLike() : level === 2 ? genAdd() : genSub();
      ans = answerOf(parts);
      key = level + '|' + parts.map((p) => p.sign + (p.paren ? 'p' : 'n') + pkey(p.poly)).join('/');
      tries++;
    } while ((!ans.length || (seenKeys.has(key) && !opts.allowRepeat)) && tries < 200);
    if (seenKeys.size > 5000) seenKeys = new Set();
    seenKeys.add(key);
    return { id: ++idCounter, level, skill: SKILL_BY_LEVEL[level], parts, answer: ans, key };
  }
  function resetSeen() { seenKeys = new Set(); }
  function restoreProblem(raw) {
    if (!raw || !raw.parts) return null;
    return { id: ++idCounter, level: raw.level, skill: raw.skill, parts: raw.parts, answer: answerOf(raw.parts), key: raw.key };
  }
  function mixedProblem(maxLevel) { return newProblem(ri(1, maxLevel || 3)); }

  /* ---------- วิเคราะห์ข้อผิด ---------- */
  function flatten(prob) {
    const out = [];
    prob.parts.forEach((pt, pi) => {
      for (let d = pt.poly.length - 1; d >= 0; d--) {
        if (pt.poly[d]) out.push({ c: pt.sign * pt.poly[d], orig: pt.poly[d], d, flipped: pt.sign < 0, part: pi });
      }
    });
    return out;
  }
  // ผิดแบบ: เปลี่ยนเครื่องหมายเฉพาะพจน์แรกในวงเล็บที่ถูกลบ
  function signErrorPoly(prob) {
    let r = [];
    prob.parts.forEach((pt) => {
      if (pt.sign < 0 && pt.paren) {
        const hi = trim(pt.poly).length - 1;
        r = padd(r, pt.poly.map((v, d) => (d === hi ? -v : v)));
      } else r = padd(r, pscale(pt.poly, pt.sign));
    });
    return r;
  }
  // ผิดแบบ: มองการลบเป็นการบวก
  function allPlusPoly(prob) {
    let r = [];
    prob.parts.forEach((pt) => { r = padd(r, pt.poly); });
    return r;
  }

  const ERR_LABELS = {
    sign: 'กระจายเครื่องหมายลบผิด',
    combine: 'รวมพจน์ที่ไม่คล้ายกัน',
    x2: 'สัมประสิทธิ์ของ x² ผิด',
    x: 'สัมประสิทธิ์ของ x ผิด',
    const: 'ค่าคงที่ผิด',
    multi: 'คำนวณผิดหลายพจน์',
    calc: 'บวก-ลบสัมประสิทธิ์ผิด',
    group: 'จัดกลุ่มพจน์คล้ายผิด',
    other: 'ข้อผิดพลาดอื่น ๆ',
  };
  const ERR_FEEDBACK = {
    sign: 'ระวังเครื่องหมายลบ! ถ้ามีเครื่องหมายลบนำหน้าวงเล็บ ต้องเปลี่ยนเครื่องหมาย "ทุกพจน์" ในวงเล็บนั้น (+ เป็น −, − เป็น +)',
    combine: 'พจน์ที่ตัวแปรหรือเลขยกกำลังต่างกัน เช่น x² กับ x ห้ามรวมกัน ให้เก็บแยกพจน์ไว้',
    x2: 'ตรวจพจน์ x² อีกครั้ง: นำสัมประสิทธิ์ของ x² ทุกพจน์มาบวก/ลบกัน',
    x: 'ตรวจพจน์ x อีกครั้ง: นำสัมประสิทธิ์ของ x ทุกพจน์มาบวก/ลบกัน',
    const: 'ตรวจค่าคงที่ (พจน์ที่ไม่มี x) อีกครั้ง',
    multi: 'ยังมีหลายพจน์ที่ไม่ถูกต้อง ลองกดดูคำใบ้ทีละขั้นได้เลย',
    calc: 'ตรวจการบวก-ลบสัมประสิทธิ์อีกครั้ง',
    group: 'พจน์คล้ายต้องมีตัวแปรและเลขยกกำลังเหมือนกัน',
    other: 'ยังไม่ถูกต้อง ลองกดดูคำใบ้ทีละขั้นได้เลย',
  };

  function diagnose(prob, studentPoly) {
    const sp = trim(studentPoly);
    if (peq(sp, prob.answer)) return { tag: 'correct', degrees: [] };
    const hasSub = prob.parts.some((p) => p.sign < 0);
    if (hasSub && (peq(sp, signErrorPoly(prob)) || peq(sp, allPlusPoly(prob)))) return { tag: 'sign', degrees: [] };
    const a = trim(prob.answer);
    const n = Math.max(a.length, sp.length);
    const diffs = [];
    for (let d = 0; d < n; d++) if (Math.abs((a[d] || 0) - (sp[d] || 0)) > EPS) diffs.push(d);
    if (diffs.length > 1 && nonzeroCount(sp) < nonzeroCount(a) && Math.abs(evalAt1(sp) - evalAt1(a)) < EPS) {
      return { tag: 'combine', degrees: diffs };
    }
    if (diffs.length === 1) {
      const d = diffs[0];
      return { tag: d === 2 ? 'x2' : d === 1 ? 'x' : d === 0 ? 'const' : 'other', degrees: diffs };
    }
    return { tag: 'multi', degrees: diffs };
  }

  // ประเมินคำตอบที่เป็นข้อความ -> {status:'invalid'|'correct'|'wrong', ...}
  function evaluateText(prob, text) {
    const r = parsePoly(text);
    if (!r.ok) return { status: 'invalid', message: r.error };
    const s = checkSimplified(text);
    if (!s.ok) return { status: 'invalid', message: s.error };
    const diag = diagnose(prob, r.poly);
    return { status: diag.tag === 'correct' ? 'correct' : 'wrong', diag, poly: r.poly };
  }

  /* ---------- ตัวเลือกคำตอบ (ตัวลวงมาจากข้อผิดพลาดที่พบบ่อย) ---------- */
  function makeChoices(prob, n) {
    n = n || 4;
    const correct = trim(prob.answer);
    const seen = new Set([pkey(correct)]);
    const out = [];
    const add = (p, tag) => {
      const t = trim(p);
      if (!t.length) return;
      const k = pkey(t);
      if (seen.has(k)) return;
      seen.add(k); out.push({ poly: t, tag });
    };
    const hasSub = prob.parts.some((p) => p.sign < 0);
    if (hasSub) { add(signErrorPoly(prob), 'sign'); if (rng() < 0.6) add(allPlusPoly(prob), 'sign'); }
    if (correct.length > 1 && nonzeroCount(correct) > 1 && rng() < 0.5) {
      const c = mono(evalAt1(correct), correct.length - 1);
      add(c, 'combine');
    }
    const maxD = Math.max(correct.length - 1, 1);
    let tries = 0;
    while (out.length < n - 1 && tries < 200) {
      tries++;
      const p = correct.slice();
      const d = ri(0, maxD);
      while (p.length <= d) p.push(0);
      const mode = ri(0, 2);
      if (mode === 0) p[d] = (p[d] || 0) + pick([1, -1, 2, -2]);
      else if (mode === 1) p[d] = -(p[d] || 0) || 1;
      else p[d] = (p[d] || 0) + pick([3, -3, 4, -4]);
      add(p, 'deg');
    }
    return shuffle([{ poly: correct, tag: 'correct' }].concat(out.slice(0, n - 1)));
  }

  /* ---------- เฉลยทีละขั้น ---------- */
  function buildSteps(prob) {
    const flat = flatten(prob);
    const hasParen = prob.parts.some((p) => p.paren);
    const hasNegParen = prob.parts.some((p) => p.paren && p.sign < 0);
    const steps = [];
    const flatTerms = flat.map((t) => ({ c: t.c, d: t.d, cls: degCls(t.d) + (t.flipped && hasNegParen ? ' flip' : '') }));

    if (hasNegParen) {
      steps.push({
        title: 'แจกแจงเครื่องหมายลบเข้าไปในวงเล็บ',
        text: 'เครื่องหมายลบหน้าวงเล็บทำให้ทุกพจน์ในวงเล็บนั้นเปลี่ยนเครื่องหมาย (+ เป็น −, − เป็น +) พจน์ที่มีกรอบสีแดงคือพจน์ที่เปลี่ยนแล้ว',
        html: '<div class="eq">' + problemHTML(prob) + '</div><div class="eq"><span class="sg b">=</span>' + renderTerms(flatTerms) + '</div>',
      });
    } else if (hasParen) {
      steps.push({
        title: 'เอาวงเล็บออก',
        text: 'เครื่องหมายบวกหน้าวงเล็บไม่ทำให้เครื่องหมายของพจน์ข้างในเปลี่ยน เขียนพจน์ทั้งหมดต่อกันได้เลย',
        html: '<div class="eq">' + problemHTML(prob) + '</div><div class="eq"><span class="sg b">=</span>' + renderTerms(flatTerms) + '</div>',
      });
    } else {
      steps.push({
        title: 'สังเกตพจน์ที่คล้ายกัน',
        text: 'พจน์คล้ายกันคือพจน์ที่มีตัวแปรและเลขยกกำลังเหมือนกัน (สีเดียวกัน) เครื่องหมายหน้าพจน์ติดไปกับสัมประสิทธิ์',
        html: '<div class="eq">' + renderTerms(flatTerms) + '</div>',
      });
    }

    const degs = [];
    flat.forEach((t) => { if (!degs.includes(t.d)) degs.push(t.d); });
    degs.sort((a, b) => b - a);
    const names = degs.map((d) => (d === 0 ? 'ค่าคงที่' : d === 1 ? 'x' : 'x' + (d === 2 ? '²' : '^' + d)));
    const groups = degs.map((d) => flat.filter((t) => t.d === d));

    steps.push({
      title: 'จัดกลุ่มพจน์ที่คล้ายกัน',
      text: 'จัดกลุ่ม: ' + names.join(', ') + ' (เมื่อย้ายพจน์ ให้เครื่องหมายหน้าพจน์ย้ายตามไปด้วย)',
      html: '<div class="eq">' + groups.map((g, gi) =>
        (gi ? '<span class="sg b">+</span>' : '') + '<span class="grp"><span class="par">(</span>' +
        renderTerms(g.map((t) => ({ c: t.c, d: t.d, cls: degCls(t.d) }))) + '<span class="par">)</span></span>').join('') + '</div>',
    });

    const hasZero = groups.some((g) => Math.abs(g.reduce((s, t) => s + t.c, 0)) < EPS);
    steps.push({
      title: 'นำสัมประสิทธิ์มาบวกลบกัน',
      text: 'บวก/ลบเฉพาะตัวเลขหน้าตัวแปรของแต่ละกลุ่ม แล้วคงตัวแปรเดิมไว้' + (hasZero ? ' (ถ้าผลรวมเป็น 0 พจน์นั้นจะหายไป)' : ''),
      html: '<div class="eq">' + groups.map((g, gi) => {
        const d = g[0].d;
        return (gi ? '<span class="sg b">+</span>' : '') + '<span class="grp ' + degCls(d) + '"><span class="par">(</span>' +
          numsHTML(g.map((t) => t.c)) + '<span class="par">)</span>' + varHTML(d) + '</span>';
      }).join('') + '</div><div class="eq"><span class="sg b">=</span>' + polyHTML(prob.answer, true) + '</div>',
    });

    steps.push({
      title: 'คำตอบ',
      text: 'เรียงพจน์จากเลขยกกำลังมากไปน้อย จะได้คำตอบในรูปอย่างง่าย',
      html: '<div class="eq ans">' + polyHTML(prob.answer, true) + '</div>',
    });
    return steps;
  }

  /* ---------- โจทย์สำหรับเกมลากวาง ---------- */
  function makeMatchRound(level) {
    const prob = newProblem(level);
    const flat = flatten(prob);
    const tiles = flat.map((t, i) => ({ id: i, c: t.orig, d: t.d, neg: t.flipped, eff: t.c }));
    const degrees = [];
    tiles.forEach((t) => { if (!degrees.includes(t.d)) degrees.push(t.d); });
    degrees.sort((a, b) => b - a);
    const sums = {};
    degrees.forEach((d) => { sums[d] = tiles.filter((t) => t.d === d).reduce((s, t) => s + t.eff, 0); });
    const naive = {};
    degrees.forEach((d) => { naive[d] = tiles.filter((t) => t.d === d).reduce((s, t) => s + t.c, 0); });
    return { problem: prob, tiles: shuffle(tiles), degrees, sums, naive };
  }

  root.Engine = {
    setRng, mulberry32, ri, pick, shuffle,
    trim, padd, psub, pscale, pmul, peq, mono,
    parsePoly, checkSimplified, normalize,
    degCls, fmtNum, varHTML, monoHTML, renderTerms, polyTerms, polyHTML, numsHTML, problemHTML, prettyTyped, plainPoly,
    newProblem, mixedProblem, restoreProblem, resetSeen, answerOf, flatten,
    diagnose, evaluateText, makeChoices, buildSteps, makeMatchRound,
    signErrorPoly, allPlusPoly,
    ERR_LABELS, ERR_FEEDBACK,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Engine;
})(typeof window !== 'undefined' ? window : globalThis);
