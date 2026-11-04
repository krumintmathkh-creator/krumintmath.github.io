/* โหมดแข่งเวลา 60 วินาที: ตอบให้ได้มากที่สุด มีคอมโบเพิ่มคะแนน */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const DURATION = 60;

  Screens.time = {
    mount(el, params) {
      this.el = el;
      this.T = UI.makeTimers();
      this.tok = (this.tok || 0) + 1;
      params = params || {};
      if (params.mode) this.start(params.mode); else this.menu();
    },
    destroy() { this.tok++; if (this.T) this.T.clear(); },

    modes() {
      const maxOpen = [1, 2, 3].filter((L) => Store.levelUnlocked(L)).length;
      return [
        { key: '1', title: 'ระดับ 1', desc: 'รวมพจน์คล้าย', icon: '🌱', open: true },
        { key: '2', title: 'ระดับ 2', desc: 'บวกพหุนาม', icon: '🌿', open: Store.levelUnlocked(2) },
        { key: '3', title: 'ระดับ 3', desc: 'ลบพหุนาม', icon: '🔥', open: Store.levelUnlocked(3) },
        { key: 'mix', title: 'ผสมทุกระดับ', desc: 'สุ่มโจทย์ระดับ 1–' + maxOpen, icon: '🎲', open: true, maxOpen },
      ];
    },

    menu() {
      const cards = this.modes().map((m) =>
        '<button class="card level-card ' + (m.open ? '' : 'locked') + '" data-mode="' + m.key + '" ' + (m.open ? '' : 'disabled') + '>' +
        '<div class="lv-icon">' + (m.open ? m.icon : '🔒') + '</div><div class="lv-body"><h3>' + m.title + '</h3><p>' + m.desc + '</p>' +
        (m.open ? '<small>🏅 คะแนนสูงสุด: <b>' + (Store.state.high[m.key] || 0) + '</b></small>' : '<small>ผ่านด่านฝึกฝนก่อนหน้าเพื่อปลดล็อก</small>') + '</div></button>').join('');
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>⏱️ แข่งเวลา ' + DURATION + ' วินาที</h2></div>' +
        '<p class="lead">ตอบให้ได้มากที่สุดภายใน ' + DURATION + ' วินาที! ถูกต่อเนื่องจะได้คอมโบโบนัส ตอบผิดคอมโบจะรีเซ็ตและแสดงเฉลยสั้น ๆ</p>' +
        '<div class="level-list">' + cards + '</div></section>';
      $$('.level-card', this.el).forEach((b) => b.addEventListener('click', () => { FX.click(); this.start(b.dataset.mode); }));
    },

    newProb() {
      const S = this.S;
      return S.mode === 'mix' ? Engine.mixedProblem(S.maxOpen) : Engine.newProblem(+S.mode);
    },

    start(mode) {
      const m = this.modes().find((x) => x.key === mode);
      const S = this.S = { mode, maxOpen: m.maxOpen || 3, score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, endAt: 0, running: false, over: false, lastTickSec: -1 };
      this.el.innerHTML =
        '<section class="play time-play">' +
        '<div class="play-head"><button class="btn ghost small" id="tExit">← ออก</button><div class="pill">⏱️ ' + m.title + '</div></div>' +
        '<div class="time-stats"><div class="tstat"><span>เวลา</span><b id="tmLeft">' + DURATION + '</b></div>' +
        '<div class="tstat"><span>คะแนน</span><b id="tmScore">0</b></div><div class="tstat"><span>คอมโบ</span><b id="tmCombo">0</b></div></div>' +
        '<div class="timerbar"><i id="tmBar"></i></div>' +
        '<div class="card problem-card"><div class="prompt" id="tmPrompt">เตรียมตัว...</div><div class="math big" id="tmProb"></div></div>' +
        '<div id="tmPad"></div><div id="tmFb" class="feedback" aria-live="polite"></div>' +
        '<div class="countdown" id="tmCount"></div></section>';
      this.pad = new UI.AnswerPad($('#tmPad'), { onResult: (r) => this.onResult(r), onInvalid: (msg) => this.fb('warn', '⚠️ ' + msg) });
      $('#tExit').addEventListener('click', () => App.go('time'));
      this.pad.setProblem(Engine.newProblem(+mode || 1), false);
      this.pad.lock(true);
      $('#tmProb').innerHTML = '<span class="muted">พร้อมนะ...</span>';
      this.runCountdown(3);
    },

    runCountdown(n) {
      const c = $('#tmCount');
      if (!c) return;
      if (n <= 0) { c.textContent = ''; c.classList.remove('show'); this.begin(); return; }
      c.textContent = n; c.classList.add('show');
      FX.tick();
      this.T.later(() => this.runCountdown(n - 1), 800);
    },

    begin() {
      const S = this.S;
      S.running = true;
      S.endAt = Date.now() + DURATION * 1000;
      this.nextQ();
      this.T.every(() => this.tick(), 100);
    },

    fb(kind, html) { const f = $('#tmFb'); if (f) { f.className = 'feedback ' + kind; f.innerHTML = html; } },

    nextQ() {
      this.prob = this.newProb();
      $('#tmProb').innerHTML = Engine.problemHTML(this.prob);
      $('#tmPrompt').textContent = 'รวมให้เป็นรูปอย่างง่าย — กด Enter เพื่อส่ง';
      this.pad.setProblem(this.prob);
    },

    tick() {
      const S = this.S;
      if (!S.running || S.over) return;
      const left = Math.max(0, S.endAt - Date.now());
      const sec = Math.ceil(left / 1000);
      $('#tmLeft').textContent = sec;
      $('#tmBar').style.width = (left / (DURATION * 1000)) * 100 + '%';
      $('#tmBar').className = sec <= 10 ? 'low' : '';
      if (sec <= 5 && sec !== S.lastTickSec && sec > 0) { S.lastTickSec = sec; FX.tick(); }
      if (left <= 0) this.finish();
    },

    onResult(r) {
      const S = this.S;
      if (!S.running || S.over) return;
      Store.recordAttempt(this.prob, r.correct, r.diag.tag);
      if (r.correct) {
        S.combo++; S.correct++;
        S.maxCombo = Math.max(S.maxCombo, S.combo);
        const pts = 10 + 2 * Math.min(S.combo - 1, 10);
        S.score += pts;
        FX.correct();
        this.fb('good', '✅ +' + pts + (S.combo > 1 ? ' · คอมโบ ×' + S.combo + ' 🔥' : ''));
        Store.removeMistake(this.prob.key);
      } else {
        S.combo = 0; S.wrong++;
        Store.addMistake(this.prob);
        FX.wrong();
        this.fb('bad', '❌ เฉลยข้อที่แล้ว: <span class="math">' + Engine.problemHTML(this.prob) + ' <span class="sg b">=</span> ' + Engine.polyHTML(this.prob.answer, true) + '</span>');
      }
      $('#tmScore').textContent = S.score;
      $('#tmCombo').textContent = S.combo;
      this.nextQ();
    },

    finish() {
      const S = this.S;
      if (S.over) return;
      S.over = true; S.running = false;
      this.T.clear();
      const key = S.mode;
      const isHigh = S.score > (Store.state.high[key] || 0);
      if (isHigh) Store.state.high[key] = S.score;
      Store.save();
      const exp = S.correct * 4 + (isHigh && S.score > 0 ? 20 : 0);
      if (exp) UI.gainExp(exp);
      if (S.correct >= 5) { FX.win(); FX.confetti(100); } else FX.click();
      const total = S.correct + S.wrong;
      const acc = total ? Math.round((S.correct / total) * 100) : 0;
      this.el.innerHTML =
        '<section class="screen result"><div class="card result-card"><h2>⏰ หมดเวลา!</h2>' +
        '<div class="big-score">' + S.score + '<small> คะแนน</small></div>' + (isHigh && S.score > 0 ? '<div class="badge-new">🏅 สถิติใหม่!</div>' : '') +
        '<ul class="stat-list"><li>ตอบถูก <b>' + S.correct + '</b> ข้อ · ผิด <b>' + S.wrong + '</b> ข้อ (แม่นยำ ' + acc + '%)</li>' +
        '<li>คอมโบสูงสุด <b>' + S.maxCombo + '</b></li><li>คะแนนสูงสุดของโหมดนี้ <b>' + Store.state.high[key] + '</b></li><li>EXP <b>+' + exp + '</b></li></ul>' +
        '<div class="actions center"><button class="btn primary" id="tmAgain">เล่นอีกครั้ง</button><button class="btn ghost" data-go="time">เลือกโหมด</button><button class="btn ghost" data-go="home">หน้าหลัก</button></div></div></section>';
      $('#tmAgain').addEventListener('click', () => this.start(S.mode));
    },
  };
})();
