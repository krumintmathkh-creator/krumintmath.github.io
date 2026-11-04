/* รัน: node tests/engine.test.js */
const E = require('../js/engine.js');
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL:', name, extra !== undefined ? extra : ''); }
}
const P = (s) => { const r = E.parsePoly(s); return r.ok ? r.poly : null; };

/* ---- parser ---- */
t('parse 3x+5x', E.peq(P('3x+5x'), [0, 8]));
t('parse x^2 - 3x - 2', E.peq(P('x^2 - 3x - 2'), [-2, -3, 1]));
t('parse 4x² − 3x − 2 (unicode)', E.peq(P('4x² − 3x − 2'), [-2, -3, 4]));
t('parse (3x^2+2x-5)+(x^2-5x+3)', E.peq(P('(3x^2+2x-5)+(x^2-5x+3)'), [-2, -3, 4]));
t('parse -(2x-1)', E.peq(P('-(2x-1)'), [1, -2]));
t('parse 2(x+3)', E.peq(P('2(x+3)'), [6, 2]));
t('parse (x+1)(x-1)', E.peq(P('(x+1)(x-1)'), [-1, 0, 1]));
t('parse --3', E.peq(P('--3'), [3]));
t('parse 5-+3', E.peq(P('5-+3'), [2]));
t('parse thai digits', E.peq(P('๓x+๒'), [2, 3]));
t('parse 0', E.peq(P('0'), []));
t('parse x2 rejected', !E.parsePoly('x2').ok);
t('parse empty rejected', !E.parsePoly('').ok);
t('parse trailing op rejected', !E.parsePoly('3x+').ok);
t('parse unmatched paren rejected', !E.parsePoly('(3x+2').ok);
t('parse letters rejected', !E.parsePoly('3y+2').ok);
t('parse x^ rejected', !E.parsePoly('x^').ok);
t('parse 2x^2^3?', E.parsePoly('x^9').ok === false);

/* ---- simplified ---- */
t('simplified ok', E.checkSimplified('4x^2-3x-2').ok);
t('simplified rejects paren', !E.checkSimplified('(4x^2)-3x').ok);
t('simplified rejects like terms', !E.checkSimplified('3x+5x').ok);
t('simplified accepts any order', E.checkSimplified('-2-3x+4x^2').ok);
t('simplified accepts leading minus', E.checkSimplified('-3x+2').ok);

/* ---- generator: ความถูกต้องของคำตอบ + ไม่ซ้ำ ---- */
for (const level of [1, 2, 3]) {
  E.setRng(E.mulberry32(1000 + level));
  E.resetSeen();
  const keys = new Set();
  let allOk = true, dupe = false, zero = false, noParen = true, negHit = true;
  for (let i = 0; i < 400; i++) {
    const p = E.newProblem(level);
    // ตรวจคำตอบด้วยการอ่านโจทย์ใหม่จากข้อความ (ตัวพิมพ์ธรรมดา) แล้วเปรียบเทียบ
    const txt = p.parts.map((pt, k) => (k === 0 ? (pt.sign < 0 ? '-' : '') : (pt.sign < 0 ? '-' : '+')) + '(' + E.plainPoly(pt.poly) + ')').join('');
    const r = E.parsePoly(txt);
    if (!r.ok || !E.peq(r.poly, p.answer)) { allOk = false; console.log('bad', txt, r, p.answer); }
    if (keys.has(p.key)) dupe = true;
    keys.add(p.key);
    if (!p.answer.length) zero = true;
    if (level === 3) {
      const sub = p.parts.filter((x) => x.sign < 0);
      if (!sub.length || !sub.every((x) => x.poly.some((v) => v < 0))) negHit = false;
    }
    if (level >= 2 && p.parts.some((x) => !x.paren)) noParen = false;
    // HTML ต้องสร้างได้
    if (!E.problemHTML(p).length) allOk = false;
  }
  t('L' + level + ' answers match', allOk);
  t('L' + level + ' no duplicates', !dupe);
  t('L' + level + ' no zero answers', !zero);
  if (level === 3) t('L3 every subtracted poly has a negative term', negHit);
  if (level >= 2) t('L' + level + ' uses parentheses', noParen);
}

/* ---- ตัวอย่างโจทย์จากโจทย์ต้นฉบับ ---- */
{
  const prob = {
    id: 1, level: 3, skill: 'sub', key: 'x',
    parts: [{ sign: 1, paren: true, poly: [2, -3, 4] }, { sign: -1, paren: true, poly: [-1, -5, 2] }],
  };
  prob.answer = E.answerOf(prob.parts); // (4x²-3x+2)-(2x²-5x-1) = 2x²+2x+3
  t('example L3 answer', E.peq(prob.answer, [3, 2, 2]), prob.answer);
  t('diagnose correct', E.diagnose(prob, [3, 2, 2]).tag === 'correct');
  // ลืมแจกลบทุกพจน์: 4x²-3x+2 - 2x² +5x -1 ... ที่ผิดคือเปลี่ยนเฉพาะพจน์แรก = 2x² -3x+2 -5x -1 = 2x²-8x+1
  t('diagnose sign error (first term only)', E.diagnose(prob, E.signErrorPoly(prob)).tag === 'sign', E.signErrorPoly(prob));
  t('diagnose all plus', E.diagnose(prob, E.allPlusPoly(prob)).tag === 'sign');
  t('diagnose x coeff', E.diagnose(prob, [3, 3, 2]).tag === 'x');
  t('diagnose const', E.diagnose(prob, [4, 2, 2]).tag === 'const');
  t('diagnose x2', E.diagnose(prob, [3, 2, 3]).tag === 'x2');
  t('diagnose multi', E.diagnose(prob, [4, 1, 3]).tag === 'multi');
  t('diagnose combine', E.diagnose(prob, [7]).tag !== 'correct');
  t('combine detection', E.diagnose(prob, E.mono(7, 2)).tag === 'combine');

  t('evaluateText correct', E.evaluateText(prob, '2x^2 + 2x + 3').status === 'correct');
  t('evaluateText correct any order', E.evaluateText(prob, '3 + 2x + 2x²').status === 'correct');
  t('evaluateText wrong', E.evaluateText(prob, '2x^2+2x+4').status === 'wrong');
  t('evaluateText invalid unsimplified', E.evaluateText(prob, '2x^2+x+x+3').status === 'invalid');
  t('evaluateText invalid parse', E.evaluateText(prob, '2x^2+').status === 'invalid');

  const steps = E.buildSteps(prob);
  t('steps L3 count 4', steps.length === 4, steps.length);
  t('steps first is distribute', steps[0].title.indexOf('แจกแจง') >= 0);
  t('steps contain flip class', steps[0].html.indexOf('flip') >= 0);
  t('steps all have html', steps.every((s) => s.html && s.title && s.text));

  // ตัวเลือก
  for (let i = 0; i < 100; i++) {
    const c = E.makeChoices(prob, 4);
    const keys = new Set(c.map((x) => E.trim(x.poly).join(',')));
    if (c.length !== 4 || keys.size !== 4 || c.filter((x) => x.tag === 'correct').length !== 1) { t('choices unique 4', false, c); break; }
    if (i === 99) t('choices unique 4', true);
  }
}

/* ---- ขั้นตอนเฉลยของทุกระดับ + ตัวเลือก ---- */
for (const level of [1, 2, 3]) {
  E.setRng(E.mulberry32(7 * level));
  E.resetSeen();
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const p = E.newProblem(level);
    const steps = E.buildSteps(p);
    if (steps.length < 4) ok = false;
    const ch = E.makeChoices(p, 4);
    if (ch.length !== 4) ok = false;
    if (new Set(ch.map((c) => E.pkey ? 0 : c.poly.join(','))).size < 1) ok = false;
    const uniq = new Set(ch.map((c) => E.trim(c.poly).join(',')));
    if (uniq.size !== 4) ok = false;
    if (ch.filter((c) => E.peq(c.poly, p.answer)).length !== 1) ok = false;
  }
  t('L' + level + ' steps+choices valid', ok);
}

/* ---- match round ---- */
for (const level of [1, 2, 3]) {
  E.setRng(E.mulberry32(99 + level));
  let ok = true;
  for (let i = 0; i < 100; i++) {
    const r = E.makeMatchRound(level);
    const total = r.degrees.reduce((s, d) => s + r.sums[d] * 1, 0);
    const ans = E.trim(r.problem.answer);
    r.degrees.forEach((d) => { if (Math.abs((ans[d] || 0) - r.sums[d]) > 1e-9) ok = false; });
    if (r.tiles.length < 2) ok = false;
  }
  t('match L' + level + ' sums match answer', ok);
}

/* ---- restore ---- */
{
  E.setRng(E.mulberry32(5));
  const p = E.newProblem(3);
  const raw = JSON.parse(JSON.stringify(p));
  const q = E.restoreProblem(raw);
  t('restore keeps answer', E.peq(p.answer, q.answer));
}

console.log('\nผ่าน', pass, 'ไม่ผ่าน', fail);
process.exit(fail ? 1 : 0);
