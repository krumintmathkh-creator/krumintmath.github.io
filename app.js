/* Polynomial Math Lab - ตัวเริ่มระบบ เราเตอร์ หน้าต้อนรับ และหน้าหลัก */
(function () {
  'use strict';
  const { $, $$ } = UI;
  const esc = UI.esc;

  Screens.welcome = {
    mount(el) {
      el.innerHTML =
        '<section class="screen welcome"><div class="card welcome-card">' +
        '<div class="logo-big">🧪</div><h1>Polynomial Math Lab</h1><p class="lead">ห้องทดลองพหุนาม — ฝึกบวก-ลบพหุนามผ่านเกม ต่อสู้กับบอส แข่งเวลา และลากวางพจน์คล้าย</p>' +
        '<form id="wForm"><label class="field">ชื่อของคุณ<input id="wName" maxlength="20" placeholder="พิมพ์ชื่อหรือชื่อเล่น" autocomplete="off" required></label>' +
        '<button class="btn primary big" type="submit">🚀 เริ่มผจญภัย</button></form>' +
        '<p class="muted small">ข้อมูลความก้าวหน้าจะถูกเก็บไว้ในเบราว์เซอร์เครื่องนี้</p></div></section>';
      const form = $('#wForm');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#wName').value.trim().slice(0, 20);
        if (!name) { UI.shake($('#wName')); return; }
        Store.state.name = name; Store.save();
        FX.levelUp();
        App.go('home');
        UI.toast('ยินดีต้อนรับ ' + esc(name) + '! เริ่มจากบทเรียนสั้นหรือฝึกระดับ 1 ได้เลย', 'level', 3600);
      });
      $('#wName').focus();
    },
  };

  const MENU = [
    { go: 'train', icon: '🎯', title: 'ฝึกฝน', desc: 'ด่านระดับ 1–3 พร้อมคำใบ้ทีละขั้น', cls: 'c-green' },
    { go: 'boss', icon: '⚔️', title: 'ศึกบอสพหุนาม', desc: 'ตอบถูกเพื่อร่ายเวทโจมตีบอส', cls: 'c-red' },
    { go: 'time', icon: '⏱️', title: 'แข่งเวลา 60 วินาที', desc: 'ตอบให้ได้มากที่สุด สะสมคอมโบ', cls: 'c-orange' },
    { go: 'match', icon: '🧩', title: 'ลากวางจับคู่พจน์', desc: 'ลากพจน์คล้ายใส่ถังให้ถูกกลุ่ม', cls: 'c-blue' },
    { go: 'dashboard', icon: '📊', title: 'แดชบอร์ด', desc: 'ดูจุดอ่อนและความก้าวหน้า', cls: 'c-purple' },
    { go: 'wardrobe', icon: '🎭', title: 'ห้องแต่งตัว', desc: 'ปลดล็อกตัวละครและหมวกใหม่', cls: 'c-pink' },
    { go: 'lesson', icon: '📘', title: 'บทเรียนสั้น', desc: 'ทบทวนพจน์คล้ายและเครื่องหมายลบ', cls: 'c-teal' },
  ];

  Screens.home = {
    mount(el) {
      const st = Store.state, info = Store.expInfo(), s = st.stats;
      const weak = Store.weakest();
      let rec;
      if (!s.total) rec = { text: 'เริ่มต้นง่าย ๆ: อ่านบทเรียนสั้น แล้วลองฝึกระดับ 1', btn: 'เริ่มฝึกระดับ 1', go: ['train', { level: 1 }] };
      else if (weak.skill) rec = { text: 'จุดอ่อนตอนนี้: <b>' + Store.SKILL_LABELS[weak.skill] + '</b> (ถูก ' + Math.round(weak.acc * 100) + '%)', btn: 'ฝึกจุดอ่อน', go: weak.skill === 'group' ? ['match', {}] : ['train', { level: { like: 1, add: 2, sub: 3 }[weak.skill] }] };
      else if (st.mistakes.length) rec = { text: 'มี ' + st.mistakes.length + ' ข้อที่เคยผิด มาแก้มือกัน', btn: 'ทบทวนข้อที่ผิด', go: ['train', { review: true }] };
      else {
        const next = [1, 2, 3].find((L) => st.stars.train[L] < 1) || 0;
        rec = next ? { text: 'ด่านถัดไปที่รอคุณอยู่: ระดับ ' + next, btn: 'ไปเลย', go: ['train', { level: next }] } : { text: 'ท้าทายบอสตัวใหญ่หรือทำลายสถิติแข่งเวลา!', btn: 'ไปสู้บอส', go: ['boss', {}] };
      }
      el.innerHTML =
        '<section class="home"><div class="card hero-card">' + UI.heroHTML('huge') +
        '<div class="hero-info"><h1>สวัสดี ' + esc(st.name) + '!</h1><p>ระดับ <b>' + info.level + '</b> · ⭐ ' + Store.totalStars() + ' ดาว · แม่นยำ ' + Store.accuracy() + '%</p>' +
        '<div class="expbar" title="EXP"><i style="width:' + info.pct + '%"></i></div><small>EXP ' + info.cur + '/' + info.need + ' เพื่อเลื่อนเป็นระดับ ' + (info.level + 1) + '</small></div></div>' +
        '<div class="card rec"><span>🎯</span><p>' + rec.text + '</p><button class="btn warn" id="hRec">' + rec.btn + '</button></div>' +
        '<div class="menu-grid">' + MENU.map((m) =>
          '<button class="menu-card ' + m.cls + '" data-go="' + m.go + '"><span class="m-icon">' + m.icon + '</span><b>' + m.title + '</b><small>' + m.desc + '</small></button>').join('') + '</div></section>';
      $('#hRec').addEventListener('click', () => { FX.click(); App.go(rec.go[0], rec.go[1]); });
      $$('.menu-card', el).forEach((c) => UI.tilt(c, 6));
    },
  };

  const App = window.App = {
    view: null,
    current: null,
    go(name, params) {
      const scr = Screens[name];
      if (!scr) return;
      if (name !== 'welcome' && !Store.hasProfile()) name = 'welcome';
      if (this.current && this.current.destroy) this.current.destroy();
      this.current = Screens[name];
      this.name = name;
      this.view.className = 'view view-' + name;
      this.view.innerHTML = '';
      window.scrollTo(0, 0);
      this.current.mount(this.view, params || {});
      this.renderTopbar();
    },
    renderTopbar() {
      const bar = $('#topbar');
      if (!bar) return;
      if (!Store.hasProfile()) { bar.innerHTML = '<button class="logo" data-go="home">🧪 <span>Polynomial Math Lab</span></button>'; return; }
      const info = Store.expInfo();
      bar.innerHTML =
        '<button class="logo" data-go="home" aria-label="หน้าหลัก">🧪 <span>Polynomial Math Lab</span></button>' +
        '<button class="player-chip" data-go="wardrobe" aria-label="ห้องแต่งตัว">' + UI.heroHTML('small') +
        '<span class="pc-text"><b>' + esc(Store.state.name) + '</b><small>ระดับ ' + info.level + '</small></span>' +
        '<span class="pc-exp"><i style="width:' + info.pct + '%"></i></span></button>' +
        '<button class="icon-btn" id="sndBtn" aria-label="เปิด/ปิดเสียง" title="เปิด/ปิดเสียง">' + (Store.state.settings.sound ? '🔊' : '🔇') + '</button>';
      const snd = $('#sndBtn');
      snd.addEventListener('click', () => {
        Store.state.settings.sound = !Store.state.settings.sound;
        Store.save();
        if (Store.state.settings.sound) FX.click();
        this.renderTopbar();
      });
    },
    boot() {
      Store.load();
      FX.init();
      this.view = $('#view');
      document.addEventListener('click', (e) => {
        const g = e.target.closest('[data-go]');
        if (g && !g.disabled) { FX.click(); App.go(g.dataset.go); }
      });
      this.go(Store.hasProfile() ? 'home' : 'welcome');
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
  else App.boot();
})();
