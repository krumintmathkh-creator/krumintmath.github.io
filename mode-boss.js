/* โหมดศึกบอส (RPG): ตอบถูกเพื่อร่ายเวทโจมตี ตอบผิดหรือหมดเวลาบอสจะโจมตีกลับ */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const MAX_HEARTS = 5;

  Screens.boss = {
    mount(el, params) {
      this.el = el;
      this.T = UI.makeTimers();
      this.tok = (this.tok || 0) + 1;
      params = params || {};
      if (params.id) this.start(params.id); else this.menu();
    },
    destroy() { this.tok++; if (this.T) this.T.clear(); },

    menu() {
      const st = Store.state;
      const cards = Store.BOSSES.map((b) => {
        const open = Store.bossUnlocked(b.id);
        const lvText = b.level ? 'โจทย์ระดับ ' + b.level : 'โจทย์ผสมทุกระดับ';
        return '<button class="card boss-card ' + (open ? '' : 'locked') + '" data-id="' + b.id + '" ' + (open ? '' : 'disabled') + '>' +
          '<div class="boss-emoji">' + (open ? b.emoji : '🔒') + '</div>' +
          '<div class="lv-body"><h3>' + b.name + '</h3><p>' + lvText + ' · พลังชีวิต ' + b.hp + ' · ' + b.time + ' วินาที/ข้อ</p>' +
          (open ? UI.stars(st.stars.boss[b.id]) : '<small>' + (b.id === 4 ? 'ชนะบอสทั้ง 3 ตัวก่อน' : 'ชนะบอสตัวก่อนหน้าเพื่อปลดล็อก') + '</small>') + '</div></button>';
      }).join('');
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>⚔️ ศึกบอสพหุนาม</h2></div>' +
        '<p class="lead">บอสจะปล่อยโจทย์มา! ตอบถูกเพื่อร่ายเวทโจมตี ตอบผิดหรือหมดเวลาบอสจะโจมตีกลับ (คุณมี ' + MAX_HEARTS + ' หัวใจ)</p>' +
        '<div class="level-list">' + cards + '</div></section>';
      $$('.boss-card', this.el).forEach((b) => b.addEventListener('click', () => { FX.click(); this.start(+b.dataset.id); }));
    },

    start(id) {
      const boss = Store.BOSSES[id - 1];
      const S = this.S = { boss, hp: boss.hp, hearts: MAX_HEARTS, q: 0, busy: false, lost: 0, correct: 0, wrong: 0, over: false, qStart: 0 };
      this.el.innerHTML =
        '<section class="play boss-play">' +
        '<div class="play-head"><button class="btn ghost small" id="bExit">← หนี</button>' +
        '<div class="pill">⚔️ ' + boss.name + '</div><div class="hearts" id="bHearts" aria-live="polite"></div></div>' +
        '<div class="arena" id="arena"><div class="arena-floor"></div>' +
        '<div class="boss-wrap"><div class="speech" id="bSay"></div><div class="boss" id="bossEl">' + boss.emoji + '</div>' +
        '<div class="hpbar" aria-label="พลังชีวิตบอส"><i id="bHp"></i><span id="bHpTxt"></span></div></div>' +
        '<div class="hero-wrap" id="heroEl">' + UI.heroHTML('big') + '</div><div class="float-layer" id="floatLayer"></div></div>' +
        '<div class="timerbar"><i id="bTimer"></i></div>' +
        '<div class="card problem-card"><div class="prompt" id="bPrompt">ร่ายเวทตอบโจทย์เพื่อโจมตีบอส!</div><div class="math big" id="bProb"></div></div>' +
        '<div id="bPad"></div><div id="bFb" class="feedback" aria-live="polite"></div>' +
        '<div class="actions"><button class="btn warn" id="bHint">💡 คำใบ้ทีละขั้น</button></div>' +
        '<div id="bHints"></div><div id="bExplain"></div></section>';
      this.pad = new UI.AnswerPad($('#bPad'), { onResult: (r) => this.onResult(r), onInvalid: (m) => this.fb('warn', '⚠️ ' + m) });
      this.hints = new UI.HintBox($('#bHints'));
      $('#bExit').addEventListener('click', () => App.go('boss'));
      $('#bHint').addEventListener('click', () => {
        if (S.busy || S.over) return;
        FX.click();
        if (!this.hints.next()) { UI.toast('แสดงคำใบ้ครบทุกขั้นแล้ว'); return; }
        Store.recordHint();
      });
      this.renderHearts(); this.renderHp();
      this.T.every(() => this.tick(), 100);
      this.nextQ();
    },

    fb(kind, html) { const f = $('#bFb'); if (f) { f.className = 'feedback ' + kind; f.innerHTML = html; } },
    renderHearts() {
      const S = this.S;
      let h = '';
      for (let i = 0; i < MAX_HEARTS; i++) h += '<span class="heart ' + (i < S.hearts ? 'on' : 'off') + '">' + (i < S.hearts ? '❤️' : '🖤') + '</span>';
      $('#bHearts').innerHTML = h;
    },
    renderHp() {
      const S = this.S;
      $('#bHp').style.width = Math.max(0, (S.hp / S.boss.hp) * 100) + '%';
      $('#bHpTxt').textContent = Math.max(0, S.hp) + '/' + S.boss.hp;
    },
    float(text, cls, target) {
      const layer = $('#floatLayer'), t = $(target);
      if (!layer || !t) return;
      const lr = layer.getBoundingClientRect(), r = t.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'float ' + cls;
      el.textContent = text;
      el.style.left = (r.left - lr.left + r.width / 2) + 'px';
      el.style.top = (r.top - lr.top) + 'px';
      layer.appendChild(el);
      this.T.later(() => el.remove(), 1100);
    },
    say(text) { const s = $('#bSay'); if (s) { s.textContent = text; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } },

    tick() {
      const S = this.S;
      if (!S || S.busy || S.over) return;
      const total = S.boss.time * 1000;
      const left = total - (Date.now() - S.qStart);
      const bar = $('#bTimer');
      if (bar) { bar.style.width = Math.max(0, (left / total) * 100) + '%'; bar.className = left < total * 0.25 ? 'low' : ''; }
      if (left <= 0) this.timeout();
    },

    nextQ() {
      const S = this.S;
      if (S.over) return;
      S.q++; S.busy = false;
      const lvl = S.boss.level;
      this.prob = lvl ? Engine.newProblem(lvl) : Engine.mixedProblem(3);
      $('#bProb').innerHTML = Engine.problemHTML(this.prob);
      $('#bPrompt').textContent = 'ข้อ ' + S.q + ' — ตอบให้ถูกเพื่อโจมตี!';
      this.pad.setProblem(this.prob);
      this.hints.set(this.prob);
      $('#bExplain').innerHTML = '';
      this.fb('', '');
      this.say(Engine.pick(S.boss.taunt));
      S.qStart = Date.now();
    },

    onResult(r) {
      const S = this.S;
      if (S.busy || S.over) return;
      S.busy = true;
      Store.recordAttempt(this.prob, r.correct, r.diag.tag);
      this.pad.lock(true);
      if (r.correct) {
        S.correct++;
        Store.removeMistake(this.prob.key);
        this.pad.showCorrect();
        this.fb('good', '✨ ถูกต้อง! ร่ายเวทโจมตี!');
        this.playerAttack();
      } else {
        S.wrong++;
        Store.addMistake(this.prob);
        FX.wrong();
        this.bossAttack('❌ ตอบผิด — ' + Engine.ERR_FEEDBACK[r.diag.tag]);
      }
    },

    timeout() {
      const S = this.S;
      if (S.busy || S.over) return;
      S.busy = true;
      this.pad.lock(true);
      S.wrong++;
      this.bossAttack('⏰ หมดเวลา! บอสโจมตีกลับ');
    },

    playerAttack() {
      const S = this.S, tok = this.tok;
      FX.magic();
      FX.bolt($('#heroEl'), $('#bossEl'), '#c77dff').then(() => {
        if (tok !== this.tok || S.over) return;
        FX.hit();
        const bossEl = $('#bossEl');
        bossEl.classList.remove('hurt'); void bossEl.offsetWidth; bossEl.classList.add('hurt');
        S.hp--;
        this.renderHp();
        this.float('-1', 'dmg', '#bossEl');
        if (S.hp <= 0) this.T.later(() => this.victory(), 500);
        else this.T.later(() => this.nextQ(), 700);
      });
    },

    bossAttack(msg) {
      const S = this.S, tok = this.tok;
      FX.bolt($('#bossEl'), $('#heroEl'), '#ff6b6b').then(() => {
        if (tok !== this.tok || S.over) return;
        FX.hit();
        S.hearts--; S.lost++;
        this.renderHearts();
        const hero = $('#heroEl');
        hero.classList.remove('hurt'); void hero.offsetWidth; hero.classList.add('hurt');
        this.float('💔', 'dmg', '#heroEl');
        this.fb('bad', msg);
        this.explain();
      });
    },

    explain() {
      const S = this.S;
      this.hints.clear();
      const steps = Engine.buildSteps(this.prob);
      $('#bExplain').innerHTML =
        '<div class="card explain"><h3>📖 เฉลยโจทย์ข้อนี้</h3><div class="math big">' + Engine.problemHTML(this.prob) + ' <span class="sg b">=</span> ' + Engine.polyHTML(this.prob.answer, true) + '</div>' +
        '<div class="hints">' + steps.slice(0, steps.length - 1).map((s, i) =>
          '<div class="hint-step"><div class="hint-no">' + (i + 1) + '</div><div class="hint-body"><b>' + s.title + '</b><p>' + s.text + '</p><div class="math">' + s.html + '</div></div></div>').join('') + '</div>' +
        '<div class="actions center"><button class="btn primary" id="bCont">' + (S.hearts <= 0 ? 'ดูผลการต่อสู้' : 'สู้ต่อ ⚔️') + '</button></div></div>';
      const btn = $('#bCont');
      btn.addEventListener('click', () => { FX.click(); if (S.hearts <= 0) this.defeat(); else this.nextQ(); });
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    victory() {
      const S = this.S;
      if (S.over) return;
      S.over = true;
      const stars = S.lost <= 1 ? 3 : S.lost <= 3 ? 2 : 1;
      const exp = S.boss.id * 20 + stars * 10;
      Store.setStars('boss', S.boss.id, stars);
      const boss = $('#bossEl'); if (boss) boss.classList.add('dead');
      FX.win(); FX.confetti(160);
      UI.gainExp(exp);
      const nextOpen = S.boss.id < 4 && Store.bossUnlocked(S.boss.id + 1);
      this.T.later(() => {
        $('#bExplain').innerHTML =
          '<div class="card result-card"><h2>🏆 ชนะ' + S.boss.name + 'แล้ว!</h2><div class="big-stars">' + UI.stars(stars) + '</div>' +
          '<ul class="stat-list"><li>ตอบถูก <b>' + S.correct + '</b> ข้อ ตอบผิด/หมดเวลา <b>' + S.wrong + '</b> ครั้ง</li><li>หัวใจที่เสียไป <b>' + S.lost + '</b> ดวง</li><li>EXP <b>+' + exp + '</b></li></ul>' +
          '<div class="actions center"><button class="btn primary" id="bAgain">สู้อีกครั้ง</button>' +
          (nextOpen ? '<button class="btn good" id="bNextBoss">บอสตัวต่อไป →</button>' : '') +
          '<button class="btn ghost" data-go="boss">เลือกบอส</button></div></div>';
        $('#bAgain').addEventListener('click', () => this.start(S.boss.id));
        const nb = $('#bNextBoss'); if (nb) nb.addEventListener('click', () => this.start(S.boss.id + 1));
        $('#bExplain').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 600);
    },

    defeat() {
      const S = this.S;
      if (S.over) return;
      S.over = true;
      FX.lose();
      UI.gainExp(5);
      const lv = S.boss.level || 3;
      $('#bExplain').innerHTML =
        '<div class="card result-card"><h2>💀 พ่ายแพ้ให้' + S.boss.name + '</h2>' +
        '<ul class="stat-list"><li>ตอบถูก <b>' + S.correct + '</b> ข้อ ก่อนหัวใจหมด</li><li>EXP ปลอบใจ <b>+5</b> — ไปฝึกเพิ่มแล้วกลับมาแก้มือนะ!</li></ul>' +
        '<div class="actions center"><button class="btn primary" id="bAgain">ลองใหม่</button>' +
        '<button class="btn warn" id="bTrain">ไปฝึกระดับ ' + lv + '</button><button class="btn ghost" data-go="boss">เลือกบอส</button></div></div>';
      $('#bAgain').addEventListener('click', () => this.start(S.boss.id));
      $('#bTrain').addEventListener('click', () => App.go('train', { level: lv }));
    },
  };
})();
