/* โหมดลากวาง: ลากพจน์คล้ายใส่ถังให้ถูกกลุ่ม แล้วรวมสัมประสิทธิ์ของแต่ละกลุ่ม */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const ROUNDS = 3;
  const DEG_NAME = { 0: 'ค่าคงที่', 1: 'x', 2: 'x²', 3: 'x³' };

  function tileHTML(t) {
    const sign = t.c < 0 ? '−' : '+';
    return '<div class="tile ' + Engine.degCls(t.d) + (t.neg ? ' neg' : '') + '" data-id="' + t.id + '" tabindex="0" role="button" aria-label="พจน์">' +
      (t.neg ? '<span class="tbadge">ถูกลบ</span>' : '') +
      '<span class="math"><span class="sg u">' + sign + '</span>' + Engine.monoHTML(t.c, t.d) + '</span></div>';
  }

  Screens.match = {
    mount(el, params) {
      this.el = el;
      this.T = UI.makeTimers();
      this.tok = (this.tok || 0) + 1;
      params = params || {};
      if (params.level) this.start(params.level); else this.menu();
    },
    destroy() {
      this.tok++;
      if (this.T) this.T.clear();
      $$('.tile.ghost').forEach((g) => g.remove());
    },

    menu() {
      const cards = [1, 2, 3].map((L) => {
        const info = Store.TRAIN_LEVELS[L], open = Store.levelUnlocked(L);
        return '<button class="card level-card ' + (open ? '' : 'locked') + '" data-level="' + L + '" ' + (open ? '' : 'disabled') + '>' +
          '<div class="lv-icon">' + (open ? info.icon : '🔒') + '</div><div class="lv-body"><h3>ระดับ ' + L + ' · ' + info.title + '</h3><p>' + info.desc + '</p>' +
          (open ? '' : '<small>ผ่านด่านฝึกฝนก่อนหน้าเพื่อปลดล็อก</small>') + '</div></button>';
      }).join('');
      this.el.innerHTML =
        '<section class="screen"><div class="screen-head"><button class="btn ghost small" data-go="home">← หน้าหลัก</button><h2>🧩 ลากวางจับคู่พจน์</h2></div>' +
        '<p class="lead">ลากพจน์ที่คล้ายกันไปใส่ถังสีเดียวกัน (หรือแตะพจน์แล้วแตะถัง) จากนั้นรวมสัมประสิทธิ์ของแต่ละถัง — ทั้งหมด ' + ROUNDS + ' รอบ</p>' +
        '<div class="level-list">' + cards + '</div>' +
        '<p class="stars-line">ดาวสะสมของโหมดนี้ ' + UI.stars(Store.state.stars.match) + '</p></section>';
      $$('.level-card', this.el).forEach((b) => b.addEventListener('click', () => { FX.click(); this.start(+b.dataset.level); }));
    },

    start(level) {
      this.M = { level, round: 0, totalStars: 0, exp: 0 };
      this.nextRound();
    },

    nextRound() {
      const M = this.M;
      M.round++;
      const R = this.R = Engine.makeMatchRound(M.level);
      R.mistakes = 0; R.placed = 0; R.phase = 1; R.sel = null; R.sumTries = 0;
      const info = Store.TRAIN_LEVELS[M.level];
      this.el.innerHTML =
        '<section class="play match-play">' +
        '<div class="play-head"><button class="btn ghost small" id="mExit">← ออก</button><div class="pill">🧩 ระดับ ' + M.level + ' · ' + info.title + '</div>' +
        '<div class="pill soft">รอบ ' + M.round + '/' + ROUNDS + '</div></div>' +
        '<div class="card problem-card"><div class="prompt" id="mPrompt">ลากพจน์ที่คล้ายกันใส่ถังให้ถูกกลุ่ม</div><div class="math big">' + Engine.problemHTML(R.problem) + '</div></div>' +
        '<div class="tray" id="tray" aria-label="พจน์ที่ต้องจัดกลุ่ม">' + R.tiles.map(tileHTML).join('') + '</div>' +
        '<div class="buckets" id="buckets">' + R.degrees.map((d) =>
          '<div class="bucket ' + Engine.degCls(d) + '" data-d="' + d + '"><div class="b-title">ถัง ' + (d === 0 ? 'ค่าคงที่' : '<span class="math">' + Engine.varHTML(d) + '</span>') + '</div>' +
          '<div class="b-tiles"></div><div class="b-sum" hidden><span>ผลรวม =</span><input type="number" step="1" inputmode="numeric" data-d="' + d + '" aria-label="ผลรวมสัมประสิทธิ์ของกลุ่ม ' + DEG_NAME[d] + '">' +
          '<span class="math">' + (d === 0 ? '' : Engine.varHTML(d)) + '</span></div></div>').join('') + '</div>' +
        '<div id="mFb" class="feedback" aria-live="polite"></div>' +
        '<div class="actions"><button class="btn primary" id="mCheck" hidden>ตรวจผลรวม</button><button class="btn good" id="mNext" hidden></button></div>' +
        '</section>';
      $('#mExit').addEventListener('click', () => App.go('match'));
      $$('.tile', this.el).forEach((t) => this.bindTile(t));
      $$('.bucket', this.el).forEach((b) => b.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        if (R.sel) this.drop(R.sel, b);
      }));
      $('#mCheck').addEventListener('click', () => this.checkSums());
      $$('.b-sum input', this.el).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.checkSums(); }));
      this.fb('info', 'ลากพจน์ลงถังที่มีตัวแปรและเลขยกกำลังเหมือนกัน — พจน์ที่มีป้ายแดง “ถูกลบ” คือพจน์ในวงเล็บที่มีเครื่องหมายลบนำหน้า');
    },

    fb(kind, html) { const f = $('#mFb'); if (f) { f.className = 'feedback ' + kind; f.innerHTML = html; } },

    select(tile) {
      const R = this.R;
      $$('.tile.sel').forEach((t) => t.classList.remove('sel'));
      if (R.sel === tile) { R.sel = null; return; }
      R.sel = tile; tile.classList.add('sel');
      FX.click();
      this.fb('info', 'เลือกพจน์แล้ว — แตะถังที่ต้องการวาง');
    },

    bindTile(tile) {
      const self = this, tok = this.tok;
      tile.addEventListener('pointerdown', (e) => {
        if (tile.classList.contains('placed') || self.R.phase !== 1) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let dragging = false, ghost = null;
        try { tile.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const bucketAt = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.closest('.bucket') : null; };
        const move = (ev) => {
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
            dragging = true;
            ghost = tile.cloneNode(true);
            ghost.classList.add('ghost');
            document.body.appendChild(ghost);
            tile.classList.add('lifting');
          }
          if (dragging) {
            ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
            $$('.bucket').forEach((b) => b.classList.remove('hot'));
            const b = bucketAt(ev.clientX, ev.clientY);
            if (b) b.classList.add('hot');
          }
        };
        const up = (ev) => {
          tile.removeEventListener('pointermove', move);
          tile.removeEventListener('pointerup', up);
          tile.removeEventListener('pointercancel', up);
          $$('.bucket').forEach((b) => b.classList.remove('hot'));
          if (tok !== self.tok) { if (ghost) ghost.remove(); return; }
          if (dragging) {
            ghost.remove();
            tile.classList.remove('lifting');
            if (ev.type === 'pointerup') { const b = bucketAt(ev.clientX, ev.clientY); if (b) self.drop(tile, b); }
          } else if (ev.type === 'pointerup') self.select(tile);
        };
        tile.addEventListener('pointermove', move);
        tile.addEventListener('pointerup', up);
        tile.addEventListener('pointercancel', up);
      });
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (this.R.phase === 1 && !tile.classList.contains('placed')) this.select(tile); } });
    },

    drop(tile, bucket) {
      const R = this.R;
      if (R.phase !== 1 || tile.classList.contains('placed')) return;
      const t = R.tiles.find((x) => x.id === +tile.dataset.id);
      if (t.d === +bucket.dataset.d) {
        tile.classList.remove('sel', 'lifting');
        tile.classList.add('placed');
        $('.b-tiles', bucket).appendChild(tile);
        R.sel = null;
        R.placed++;
        Store.recordSkill('group', true);
        FX.correct();
        const r = tile.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height / 2, '#6bcB77', 14);
        if (R.placed === R.tiles.length) this.phase2(); else this.fb('good', '✅ ถูกกลุ่ม! เหลืออีก ' + (R.tiles.length - R.placed) + ' พจน์');
      } else {
        R.mistakes++;
        Store.recordSkill('group', false, 'group');
        FX.wrong();
        UI.shake(tile);
        tile.classList.remove('sel'); R.sel = null;
        this.fb('bad', '❌ พจน์นี้ไม่ใช่พจน์คล้ายของถังนั้น — ' + Engine.ERR_FEEDBACK.group);
      }
    },

    phase2() {
      const R = this.R;
      R.phase = 2;
      $$('.b-sum', this.el).forEach((s) => { s.hidden = false; });
      $('#mCheck').hidden = false;
      $('#mPrompt').textContent = 'จัดกลุ่มครบแล้ว! ต่อไปรวมสัมประสิทธิ์ของแต่ละถัง';
      FX.win();
      this.fb('info', '🧮 พิมพ์ผลรวมสัมประสิทธิ์ของแต่ละถัง — พจน์ที่มีป้าย “ถูกลบ” ต้องนำไป <b>ลบ</b> ส่วนพจน์ที่ติดเครื่องหมายลบอยู่แล้วให้รวมตามเครื่องหมายของมัน');
      const first = $('.b-sum input', this.el);
      if (first && !UI.coarse()) first.focus();
    },

    checkSums() {
      const R = this.R;
      if (R.phase !== 2) return;
      let allOk = true, empty = false;
      const wrongTags = [];
      $$('.b-sum input', this.el).forEach((inp) => {
        const d = +inp.dataset.d;
        inp.classList.remove('ok', 'bad');
        if (inp.value.trim() === '') { empty = true; return; }
        const v = parseFloat(inp.value);
        if (Math.abs(v - R.sums[d]) < 1e-9) inp.classList.add('ok');
        else { allOk = false; inp.classList.add('bad'); wrongTags.push(Math.abs(v - R.naive[d]) < 1e-9 && R.naive[d] !== R.sums[d] ? 'sign' : 'calc'); }
      });
      if (empty) { this.fb('warn', '⚠️ กรอกผลรวมให้ครบทุกถังก่อนนะ'); return; }
      if (!allOk) {
        R.sumTries++; R.mistakes++;
        const tag = wrongTags.includes('sign') ? 'sign' : 'calc';
        Store.recordSkill('group', false, tag);
        FX.wrong();
        this.fb('bad', '❌ ' + (tag === 'sign' ? 'ระวังป้าย “ถูกลบ”! พจน์ที่ถูกลบต้องเปลี่ยนเครื่องหมายก่อนรวม' : Engine.ERR_FEEDBACK.calc) + ' (ช่องสีแดงยังไม่ถูก)');
        return;
      }
      Store.recordSkill('group', true);
      this.roundDone();
    },

    roundDone() {
      const R = this.R, M = this.M;
      R.phase = 3;
      const stars = R.mistakes === 0 ? 3 : R.mistakes <= 2 ? 2 : 1;
      M.totalStars += stars;
      const exp = 5 + stars * 5;
      M.exp += exp;
      $('#mCheck').hidden = true;
      $('#mPrompt').textContent = 'ครบทุกถังแล้ว!';
      FX.win(); FX.confetti(70);
      UI.gainExp(exp);
      this.fb('good', '🎉 <b>เยี่ยม!</b> ' + UI.stars(stars) + ' ผลลัพธ์คือ <span class="math">' + Engine.polyHTML(R.problem.answer, true) + '</span>');
      const next = $('#mNext');
      next.hidden = false;
      next.textContent = M.round >= ROUNDS ? 'ดูผลสรุป 🏁' : 'รอบถัดไป →';
      next.addEventListener('click', () => { FX.click(); if (M.round >= ROUNDS) this.finish(); else this.nextRound(); });
    },

    finish() {
      const M = this.M;
      const avg = Math.max(1, Math.round(M.totalStars / ROUNDS));
      Store.setStars('match', null, avg);
      this.el.innerHTML =
        '<section class="screen result"><div class="card result-card"><h2>🧩 จบเกมลากวาง!</h2><div class="big-stars">' + UI.stars(avg) + '</div>' +
        '<ul class="stat-list"><li>ดาวรวม <b>' + M.totalStars + '/' + ROUNDS * 3 + '</b></li><li>EXP รวมในรอบนี้ <b>+' + M.exp + '</b></li></ul>' +
        '<div class="actions center"><button class="btn primary" id="mAgain">เล่นอีกครั้ง</button><button class="btn ghost" data-go="match">เมนูลากวาง</button><button class="btn ghost" data-go="home">หน้าหลัก</button></div></div></section>';
      $('#mAgain').addEventListener('click', () => this.start(M.level));
    },
  };
})();
