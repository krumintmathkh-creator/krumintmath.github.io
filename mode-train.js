/* โหมดฝึกฝน: ด่านระดับ 1-3 รอบละ 5 ข้อ ให้ดาวตามจำนวนข้อที่ตอบถูกในครั้งแรก */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const TOTAL = 5;
  const PROMPTS = {
    1: 'รวมพจน์ที่คล้ายกัน แล้วตอบในรูปอย่างง่าย',
    2: 'หาผลบวกของพหุนาม แล้วตอบในรูปอย่างง่าย',
    3: 'หาผลลัพธ์ (ระวังเครื่องหมายลบหน้าวงเล็บ!)',
  };

  Screens.train = {
    mount(el, params) {
      this.el = el;
      this.T = UI.makeTimers();
      this.tok = (this.tok || 0) + 1;
      params = params || {};
      if (params.level || params.review) this.start(params); else this.menu();
    },
    destroy() { this.tok++; if (this.T) this.T.clear(); },

    menu() {
      const st = Store.state;
      const weak = Store.weakest();
      const cards = [1, 2, 3].map((L) => {
        const info = Store.TRAIN_LEVELS[L];
        const open = Store.levelUnlocked(L);
        return '<button class="card level-card ' + (open ? '' : 'locked') + '" data-level="' + L + '" ' + (open ? '' : 'disabled') + '>' +
          '<div class="lv-icon">' + (open ? info.icon : '🔒') + '</div>' +
          '<div class="lv-body"><h3>ระดับ ' + L + ' · ' + info.title + '</h3><p>' + info.desc + '</p>' +
          (open ? UI.stars(st.stars.train[L]) : '<small>ได้ ≥ 1 ดาวในระดับ ' + (L - 1) + ' เพื่อปลดล็อก</small>') + '</div></button>';
      }).join('');
      const nm = st.mistakes.length;
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>🎯 ฝึกฝน</h2></div>' +
        '<p class="lead">แต่ละรอบมี ' + TOTAL + ' ข้อ ตอบถูกในครั้งแรกให้ได้ ≥ 3 ข้อเพื่อรับดาว — ตอบผิดมีคำใบ้ทีละขั้นให้เสมอ</p>' +
        '<div class="level-list">' + cards + '</div>' +
        '<div class="level-list">' +
        '<button class="card level-card" id="trReview" ' + (nm ? '' : 'disabled') + '><div class="lv-icon">🔁</div><div class="lv-body"><h3>ทบทวนข้อที่เคยผิด</h3><p>' + (nm ? 'มี ' + nm + ' ข้อรอให้กลับมาแก้' : 'ยังไม่มีข้อที่ต้องทบทวน') + '</p></div></button>' +
        (weak.skill && weak.skill !== 'group' ? '<button class="card level-card weak" id="trWeak"><div class="lv-icon">🎯</div><div class="lv-body"><h3>ฝึกจุดอ่อนของฉัน</h3><p>' + Store.SKILL_LABELS[weak.skill] + ' (ถูก ' + Math.round(weak.acc * 100) + '%)</p></div></button>' : '') +
        '</div></section>';
      $$('.level-card[data-level]', this.el).forEach((b) => b.addEventListener('click', () => { FX.click(); this.start({ level: +b.dataset.level }); }));
      const rv = $('#trReview', this.el);
      if (rv) rv.addEventListener('click', () => { FX.click(); this.start({ review: true }); });
      const wk = $('#trWeak', this.el);
      if (wk) wk.addEventListener('click', () => { FX.click(); this.start({ level: { like: 1, add: 2, sub: 3 }[weak.skill] }); });
    },

    start(params) {
      const S = this.S = { level: params.level || 0, review: !!params.review, q: 0, total: TOTAL, firstTry: 0, exp: 0, queue: null, results: [] };
      if (S.review) {
        S.queue = Store.state.mistakes.map(Engine.restoreProblem).filter(Boolean).slice(0, TOTAL);
        if (!S.queue.length) { UI.toast('ยังไม่มีข้อที่ต้องทบทวน'); return this.menu(); }
        S.total = S.queue.length;
      }
      const info = S.review ? { title: 'ทบทวนข้อที่ผิด', icon: '🔁' } : Store.TRAIN_LEVELS[S.level];
      this.el.innerHTML =
        '<section class="play">' +
        '<div class="play-head"><button class="btn ghost small" id="tExit">← ออก</button>' +
        '<div class="pill">' + info.icon + ' ' + (S.review ? info.title : 'ระดับ ' + S.level + ' · ' + info.title) + '</div><div class="dots" id="tDots"></div></div>' +
        '<div class="card problem-card"><div class="prompt" id="tPrompt"></div><div class="math big" id="tProb"></div></div>' +
        '<div id="tPad"></div>' +
        '<div id="tFb" class="feedback" aria-live="polite"></div>' +
        '<div class="actions"><button class="btn warn" id="tHint">💡 คำใบ้ทีละขั้น</button>' +
        '<button class="btn ghost" id="tReveal" disabled>👁️ ดูเฉลย</button>' +
        '<button class="btn primary" id="tNext" hidden>ข้อต่อไป →</button></div>' +
        '<div id="tHints"></div></section>';
      this.pad = new UI.AnswerPad($('#tPad'), { onResult: (r) => this.onResult(r), onInvalid: (m) => this.fb('warn', '⚠️ ' + m) });
      this.hints = new UI.HintBox($('#tHints'));
      $('#tExit').addEventListener('click', () => App.go('train'));
      $('#tHint').addEventListener('click', () => this.useHint());
      $('#tReveal').addEventListener('click', () => this.reveal());
      $('#tNext').addEventListener('click', () => { FX.click(); this.nextQ(); });
      this.nextQ();
    },

    dots() {
      const S = this.S;
      let h = '';
      for (let i = 0; i < S.total; i++) {
        const r = S.results[i];
        h += '<span class="dot ' + (r || '') + (i === S.q - 1 ? ' cur' : '') + '"></span>';
      }
      $('#tDots').innerHTML = h;
    },
    fb(kind, html) { const f = $('#tFb'); f.className = 'feedback ' + kind; f.innerHTML = html; },
    buttons() {
      const solved = this.solved;
      $('#tHint').hidden = solved;
      $('#tReveal').hidden = solved;
      $('#tReveal').disabled = !(this.attempts >= 1 || this.hints.n >= 2);
      $('#tNext').hidden = !solved;
      $('#tNext').textContent = this.S.q >= this.S.total ? 'ดูผลสรุป 🏁' : 'ข้อต่อไป →';
    },

    nextQ() {
      const S = this.S;
      if (S.q >= S.total) return this.finish();
      S.q++;
      this.prob = S.review ? S.queue[S.q - 1] : Engine.newProblem(S.level);
      this.attempts = 0; this.solved = false;
      $('#tProb').innerHTML = Engine.problemHTML(this.prob);
      $('#tPrompt').textContent = 'ข้อ ' + S.q + '/' + S.total + ' — ' + PROMPTS[this.prob.level];
      this.pad.setProblem(this.prob);
      this.hints.set(this.prob);
      this.fb('', '');
      this.dots();
      this.buttons();
    },

    onResult(r) {
      if (this.solved) return;
      const S = this.S;
      this.attempts++;
      Store.recordAttempt(this.prob, r.correct, r.diag.tag);
      if (r.correct) {
        this.solved = true;
        const first = this.attempts === 1 && this.hints.n === 0;
        if (first) S.firstTry++;
        const gain = first ? 10 : 5;
        S.exp += gain;
        S.results[S.q - 1] = first ? 'good' : 'ok';
        Store.removeMistake(this.prob.key);
        FX.correct();
        this.fb('good', '🎉 <b>ถูกต้อง!</b> ' + (first ? 'ตอบถูกตั้งแต่ครั้งแรก' : 'ทำได้แล้ว') + ' <span class="math">' + Engine.polyHTML(this.prob.answer, true) + '</span>');
        this.pad.lock(true); this.pad.showCorrect();
        UI.gainExp(gain);
        const rect = $('#tFb').getBoundingClientRect();
        FX.burst(rect.left + rect.width / 2, rect.top, '#6bcB77', 30);
      } else {
        Store.addMistake(this.prob);
        S.results[S.q - 1] = 'bad';
        FX.wrong();
        this.fb('bad', '❌ <b>ยังไม่ถูกต้อง</b> — ' + Engine.ERR_FEEDBACK[r.diag.tag] + '<br><small>ลองแก้ไขแล้วตอบใหม่ หรือกด “คำใบ้ทีละขั้น”</small>');
        UI.shake($('#tFb'));
      }
      this.dots(); this.buttons();
    },

    useHint() {
      if (this.solved) return;
      FX.click();
      if (!this.hints.next()) { UI.toast('แสดงคำใบ้ครบทุกขั้นแล้ว'); return; }
      Store.recordHint();
      if (this.S.results[this.S.q - 1] !== 'bad') this.S.results[this.S.q - 1] = 'hint';
      this.dots();
      this.buttons();
      const h = $('#tHints'); h.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    reveal() {
      if (this.solved) return;
      FX.click();
      this.hints.all();
      this.solved = true;
      Store.addMistake(this.prob);
      this.S.results[this.S.q - 1] = 'skip';
      this.fb('info', '👁️ ดูเฉลยแล้ว — ข้อนี้ไม่ได้ EXP แต่เก็บไว้ในรายการ “ทบทวนข้อที่ผิด” ให้กลับมาฝึกอีกครั้ง คำตอบคือ <span class="math">' + Engine.polyHTML(this.prob.answer, true) + '</span>');
      this.pad.lock(true); this.pad.showCorrect();
      this.dots(); this.buttons();
    },

    finish() {
      const S = this.S;
      let stars = 0;
      if (!S.review) stars = S.firstTry >= 5 ? 3 : S.firstTry >= 4 ? 2 : S.firstTry >= 3 ? 1 : 0;
      const bonus = S.review ? 5 : (stars ? stars * 10 : 0);
      if (!S.review) Store.setStars('train', S.level, stars);
      if (bonus) UI.gainExp(bonus);
      if (stars >= 2) { FX.win(); FX.confetti(120); } else if (stars === 1) FX.win(); else FX.click();
      const next = !S.review && S.level < 3 && Store.levelUnlocked(S.level + 1);
      this.el.innerHTML =
        '<section class="screen result"><div class="card result-card">' +
        '<h2>' + (S.review ? 'ทบทวนเสร็จแล้ว!' : stars ? 'ผ่านด่านแล้ว!' : 'ยังไม่ผ่าน ลองอีกรอบนะ') + '</h2>' +
        (S.review ? '' : '<div class="big-stars">' + UI.stars(stars) + '</div>') +
        '<ul class="stat-list"><li>ตอบถูกตั้งแต่ครั้งแรก <b>' + S.firstTry + '/' + S.total + '</b> ข้อ</li>' +
        '<li>EXP ที่ได้ในรอบนี้ <b>+' + (S.exp + bonus) + '</b></li>' +
        (S.review || stars ? '' : '<li class="muted">ต้องตอบถูกครั้งแรกอย่างน้อย 3 ข้อเพื่อรับดาว</li>') + '</ul>' +
        '<div class="actions center"><button class="btn primary" id="rAgain">เล่นอีกรอบ</button>' +
        (next ? '<button class="btn good" id="rNext">ไประดับ ' + (S.level + 1) + ' →</button>' : '') +
        '<button class="btn ghost" data-go="train">เมนูฝึกฝน</button><button class="btn ghost" data-go="home">หน้าหลัก</button></div></div></section>';
      $('#rAgain').addEventListener('click', () => this.start(S.review ? { review: true } : { level: S.level }));
      const n = $('#rNext'); if (n) n.addEventListener('click', () => this.start({ level: S.level + 1 }));
    },
  };
})();
