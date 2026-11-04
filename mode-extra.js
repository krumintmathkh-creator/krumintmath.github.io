/* แดชบอร์ดความก้าวหน้า, ห้องแต่งตัว/ปลดล็อก, บทเรียนสั้น */
(function () {
  'use strict';
  const { $, $$ } = UI;
  UI.esc = UI.esc || function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  const esc = UI.esc;

  const ADVICE = {
    sign: { text: 'คุณมักพลาดเรื่อง <b>การกระจายเครื่องหมายลบหน้าวงเล็บ</b> — จำไว้ว่าต้องเปลี่ยนเครื่องหมาย “ทุกพจน์” ในวงเล็บ', go: ['train', { level: 3 }], btn: 'ฝึกระดับ 3' },
    combine: { text: 'คุณมักรวมพจน์ที่ <b>ไม่คล้ายกัน</b> เช่น x² กับ x — ลองอ่านบทเรียนเรื่องพจน์คล้ายอีกครั้ง', go: ['lesson', {}], btn: 'เปิดบทเรียน' },
    x2: { text: 'พจน์ <b>x²</b> ผิดบ่อย — ฝึกบวก-ลบพหุนามเพิ่มเติม', go: ['train', { level: 2 }], btn: 'ฝึกระดับ 2' },
    x: { text: 'พจน์ <b>x</b> ผิดบ่อย — ฝึกบวก-ลบพหุนามเพิ่มเติม', go: ['train', { level: 2 }], btn: 'ฝึกระดับ 2' },
    const: { text: '<b>ค่าคงที่</b> ผิดบ่อย — ระวังเครื่องหมายของตัวเลขที่ไม่มี x', go: ['train', { level: 2 }], btn: 'ฝึกระดับ 2' },
    multi: { text: 'มักผิดหลายพจน์พร้อมกัน — ลองทำทีละขั้นโดยใช้คำใบ้ แล้วฝึกเกมลากวางเพื่อจัดกลุ่มพจน์', go: ['match', {}], btn: 'เล่นลากวาง' },
    calc: { text: 'การ <b>บวก-ลบสัมประสิทธิ์</b> ยังพลาด — ฝึกเพิ่มในเกมลากวาง', go: ['match', {}], btn: 'เล่นลากวาง' },
    group: { text: 'การ <b>จัดกลุ่มพจน์คล้าย</b> ยังพลาด — ลองเล่นเกมลากวางอีกครั้ง', go: ['match', {}], btn: 'เล่นลากวาง' },
    other: { text: 'ลองฝึกบ่อย ๆ และใช้คำใบ้ทีละขั้นเมื่อไม่แน่ใจ', go: ['train', { level: 1 }], btn: 'ฝึกระดับ 1' },
  };

  /* ---------- แดชบอร์ด ---------- */
  Screens.dashboard = {
    mount(el) {
      this.el = el;
      const st = Store.state, s = st.stats;
      const tone = (p) => (p >= 80 ? 'good' : p >= 60 ? 'mid' : 'low');
      const skills = Object.keys(Store.SKILL_LABELS).map((k) => {
        const v = s.bySkill[k] || { a: 0, c: 0 };
        const p = v.a ? Math.round((v.c / v.a) * 100) : 0;
        return '<div class="bar-row"><div class="bar-label">' + Store.SKILL_LABELS[k] + '</div><div class="bar"><i class="' + (v.a ? tone(p) : '') + '" style="width:' + p + '%"></i></div>' +
          '<div class="bar-val">' + (v.a ? p + '% (' + v.c + '/' + v.a + ')' : 'ยังไม่เคยทำ') + '</div></div>';
      }).join('');
      const errKeys = Object.keys(s.errors).sort((a, b) => s.errors[b] - s.errors[a]);
      const maxErr = errKeys.length ? s.errors[errKeys[0]] : 1;
      const errs = errKeys.length ? errKeys.map((k) =>
        '<div class="bar-row"><div class="bar-label">' + (Engine.ERR_LABELS[k] || k) + '</div><div class="bar"><i class="err" style="width:' + Math.round((s.errors[k] / maxErr) * 100) + '%"></i></div><div class="bar-val">' + s.errors[k] + ' ครั้ง</div></div>').join('')
        : '<p class="muted">ยังไม่มีข้อผิดพลาดที่บันทึกไว้ 🎉</p>';
      const weak = Store.weakest();
      const tag = weak.topErr;
      const adv = tag ? ADVICE[tag] || ADVICE.other : null;
      const hist = s.history.length ? '<div class="history">' + s.history.map((h) => '<span class="hq ' + (h ? 'ok' : 'no') + '"></span>').join('') + '</div><small class="muted">40 ข้อล่าสุด (เขียว = ถูก, แดง = ผิด)</small>' : '<p class="muted">ยังไม่มีประวัติการตอบ</p>';
      const mistakes = st.mistakes.map(Engine.restoreProblem).filter(Boolean);
      const maxStars = 3 * 3 + 4 * 3 + 3;
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>📊 แดชบอร์ดความก้าวหน้า</h2></div>' +
        '<div class="stat-grid">' +
        '<div class="card stat"><span>ตอบทั้งหมด</span><b>' + s.total + '</b></div>' +
        '<div class="card stat"><span>แม่นยำ</span><b>' + Store.accuracy() + '%</b></div>' +
        '<div class="card stat"><span>ดาวสะสม</span><b>' + Store.totalStars() + '/' + maxStars + '</b></div>' +
        '<div class="card stat"><span>ใช้คำใบ้</span><b>' + s.hints + '</b></div></div>' +
        '<div class="card"><h3>🎯 ข้อแนะนำสำหรับคุณ</h3>' +
        (adv ? '<p>' + adv.text + '</p><button class="btn warn" id="dAdv">' + adv.btn + '</button>' : '<p class="muted">ทำโจทย์เพิ่มอีกสักหน่อย ระบบจะวิเคราะห์จุดอ่อนให้ที่นี่</p>') + '</div>' +
        '<div class="card"><h3>ความแม่นยำแยกตามทักษะ</h3>' + skills + '</div>' +
        '<div class="card"><h3>ข้อผิดพลาดที่พบบ่อย</h3>' + errs + '</div>' +
        '<div class="card"><h3>ประวัติการตอบล่าสุด</h3>' + hist + '</div>' +
        '<div class="card"><h3>🔁 ข้อที่ต้องทบทวน (' + mistakes.length + ')</h3>' +
        (mistakes.length ? mistakes.map((p) => '<div class="mistake"><span class="math">' + Engine.problemHTML(p) + '</span><span class="muted"> = </span><span class="math">' + Engine.polyHTML(p.answer, true) + '</span></div>').join('') +
          '<button class="btn primary" id="dReview">ทบทวนข้อที่ผิด</button>' : '<p class="muted">ไม่มีข้อค้าง เก่งมาก!</p>') + '</div>' +
        '<div class="card tools"><h3>⚙️ ตั้งค่า</h3>' +
        '<label class="check"><input type="checkbox" id="dSound" ' + (st.settings.sound ? 'checked' : '') + '> เปิดเสียงเอฟเฟกต์</label>' +
        '<label class="check"><input type="checkbox" id="dTeacher" ' + (st.teacher ? 'checked' : '') + '> โหมดครู: ปลดล็อกทุกด่านและทุกตัวละคร</label>' +
        '<button class="btn danger" id="dReset">ล้างข้อมูลผู้เล่นทั้งหมด</button></div></section>';
      const a = $('#dAdv'); if (a) a.addEventListener('click', () => App.go(adv.go[0], adv.go[1]));
      const r = $('#dReview'); if (r) r.addEventListener('click', () => App.go('train', { review: true }));
      $('#dSound').addEventListener('change', (e) => { Store.state.settings.sound = e.target.checked; Store.save(); App.renderTopbar(); });
      $('#dTeacher').addEventListener('change', (e) => { Store.state.teacher = e.target.checked; Store.save(); UI.toast(e.target.checked ? '🔓 เปิดโหมดครูแล้ว' : '🔒 ปิดโหมดครูแล้ว'); });
      $('#dReset').addEventListener('click', () => {
        if (window.confirm('ล้างข้อมูลผู้เล่น (ชื่อ คะแนน ดาว สถิติ) ทั้งหมด? ย้อนกลับไม่ได้')) {
          Store.reset(); App.go('welcome');
        }
      });
    },
  };

  /* ---------- ห้องแต่งตัว ---------- */
  Screens.wardrobe = {
    mount(el) {
      this.el = el;
      this.render();
    },
    render() {
      const st = Store.state, L = Store.level();
      const item = (kind, it, cur) => {
        const open = Store.isUnlocked(it);
        return '<button class="card wd-item ' + (cur === it.id ? 'cur ' : '') + (open ? '' : 'locked') + '" data-kind="' + kind + '" data-id="' + it.id + '" ' + (open ? '' : 'disabled') + '>' +
          '<div class="wd-emoji">' + (open ? (it.emoji || '🚫') : '🔒') + '</div><div class="wd-name">' + it.name + '</div>' +
          (open ? (cur === it.id ? '<small>ใส่อยู่</small>' : '') : '<small>ปลดล็อกที่ระดับ ' + it.level + '</small>') + '</button>';
      };
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>🎭 ห้องแต่งตัว</h2></div>' +
        '<div class="card wd-preview">' + UI.heroHTML('huge') + '<div><label class="field">ชื่อผู้เล่น<input id="wdName" maxlength="20" value="' + esc(st.name) + '"></label>' +
        '<p class="muted">ระดับ ' + L + ' · เก็บ EXP จากการเล่นเพื่อปลดล็อกตัวละครและหมวกใหม่</p></div></div>' +
        '<h3 class="sec-title">ตัวละคร</h3><div class="wd-grid">' + Store.AVATARS.map((a) => item('avatar', a, st.avatar)).join('') + '</div>' +
        '<h3 class="sec-title">หมวก / เครื่องแต่งกาย</h3><div class="wd-grid">' + Store.HATS.map((h) => item('hat', h, st.hat)).join('') + '</div></section>';
      $$('.wd-item', this.el).forEach((b) => b.addEventListener('click', () => {
        FX.click();
        if (b.dataset.kind === 'avatar') Store.state.avatar = b.dataset.id; else Store.state.hat = b.dataset.id;
        Store.save(); this.render(); App.renderTopbar();
      }));
      $('#wdName').addEventListener('change', (e) => {
        const v = e.target.value.trim().slice(0, 20);
        if (v) { Store.state.name = v; Store.save(); App.renderTopbar(); UI.toast('บันทึกชื่อแล้ว'); } else e.target.value = Store.state.name;
      });
    },
  };

  /* ---------- บทเรียนสั้น ---------- */
  const T = (c, d) => Engine.renderTerms([{ c, d, cls: Engine.degCls(d) }]);
  Screens.lesson = {
    mount(el) {
      this.el = el;
      this.lv = 3;
      this.render();
    },
    sample() {
      const prob = Engine.newProblem(this.lv, { allowRepeat: true });
      const steps = Engine.buildSteps(prob);
      $('#lsSample').innerHTML =
        '<div class="math big">' + Engine.problemHTML(prob) + '</div>' +
        '<div class="hints">' + steps.map((s, i) => '<div class="hint-step"><div class="hint-no">' + (i + 1) + '</div><div class="hint-body"><b>' + s.title + '</b><p>' + s.text + '</p><div class="math">' + s.html + '</div></div></div>').join('') + '</div>';
    },
    render() {
      this.el.innerHTML =
        '<section class="screen lesson"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>📘 บทเรียนสั้น: บวก-ลบพหุนาม</h2></div>' +
        '<div class="card"><h3>1) พจน์คล้ายคืออะไร?</h3><p>พจน์คล้ายคือพจน์ที่มี <b>ตัวแปรและเลขยกกำลังเหมือนกัน</b> ต่างกันได้แค่ตัวเลขหน้าตัวแปร (สัมประสิทธิ์)</p>' +
        '<div class="math big">' + T(3, 2) + ' และ ' + T(5, 2) + ' <span class="tag good">คล้ายกัน ✓</span></div>' +
        '<div class="math big">' + T(3, 2) + ' และ ' + T(5, 1) + ' <span class="tag bad">ไม่คล้ายกัน ✗</span></div></div>' +
        '<div class="card"><h3>2) รวมพจน์คล้ายกัน</h3><p>บวก/ลบเฉพาะสัมประสิทธิ์ แล้วคงตัวแปรไว้เหมือนเดิม</p>' +
        '<div class="math big"><span class="grp d1">(3 + 5)' + Engine.varHTML(1) + '</span> <span class="sg b">=</span> <span class="t d1">8' + Engine.varHTML(1) + '</span></div></div>' +
        '<div class="card"><h3>3) เครื่องหมายหน้าวงเล็บ</h3>' +
        '<p><b>เครื่องหมายบวก</b> หน้าวงเล็บ: เอาวงเล็บออกได้เลย พจน์ข้างในไม่เปลี่ยน</p>' +
        '<p><b>เครื่องหมายลบ</b> หน้าวงเล็บ: ต้องเปลี่ยนเครื่องหมาย <b>ทุกพจน์</b> ข้างใน (+ เป็น −, − เป็น +)</p>' +
        '<div class="math big">' + '<span class="sg b">−</span><span class="par">(</span>' + Engine.renderTerms([{ c: 2, d: 2 }, { c: -5, d: 1 }, { c: -1, d: 0 }]) + '<span class="par">)</span> <span class="sg b">=</span> ' +
        Engine.renderTerms([{ c: -2, d: 2, cls: 'flip' }, { c: 5, d: 1, cls: 'flip' }, { c: 1, d: 0, cls: 'flip' }]) + '</div></div>' +
        '<div class="card"><h3>4) ดูตัวอย่างพร้อมเฉลยทีละขั้น</h3><div class="seg" id="lsSeg">' +
        [1, 2, 3].map((L) => '<button type="button" data-l="' + L + '" class="' + (L === this.lv ? 'on' : '') + '">ระดับ ' + L + '</button>').join('') +
        '</div><button class="btn primary" id="lsNew">🎲 สุ่มตัวอย่างใหม่</button><div id="lsSample"></div></div>' +
        '<div class="actions center"><button class="btn good" data-go="train">ไปฝึกฝนเลย →</button></div></section>';
      $$('#lsSeg button', this.el).forEach((b) => b.addEventListener('click', () => {
        this.lv = +b.dataset.l; $$('#lsSeg button').forEach((x) => x.classList.toggle('on', x === b)); FX.click(); this.sample();
      }));
      $('#lsNew').addEventListener('click', () => { FX.click(); this.sample(); });
      this.sample();
    },
  };
})();
