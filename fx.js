/* Polynomial Math Lab - เสียง (WebAudio) และอนุภาค (canvas) */
(function (root) {
  'use strict';
  let actx = null;
  function ac() {
    if (!actx) {
      try { actx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    return actx;
  }
  function tone(freq, dur, type, vol, delay) {
    if (!root.Store || !root.Store.state.settings.sound) return;
    const c = ac();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  /* ----- อนุภาค ----- */
  let canvas = null, g2 = null, parts = [], running = false, W = 0, H = 0, dpr = 1;
  function setup() {
    canvas = document.getElementById('fx');
    if (!canvas) return;
    g2 = canvas.getContext('2d');
    resize();
    root.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    dpr = root.devicePixelRatio || 1;
    W = root.innerWidth; H = root.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const COLORS = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f1c'];
  function loop(ts) {
    if (!g2) { running = false; return; }
    g2.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life > 0);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; p.rot += p.vr;
      const a = Math.max(0, Math.min(1, p.life / p.max));
      g2.globalAlpha = a;
      g2.fillStyle = p.color;
      if (p.shape === 'rect') {
        g2.save(); g2.translate(p.x, p.y); g2.rotate(p.rot);
        g2.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g2.restore();
      } else {
        g2.beginPath(); g2.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); g2.fill();
      }
    });
    g2.globalAlpha = 1;
    if (parts.length) root.requestAnimationFrame(loop);
    else { running = false; g2.clearRect(0, 0, W, H); }
  }
  function kick() {
    if (!running && g2) { running = true; root.requestAnimationFrame(loop); }
  }
  function add(p) { parts.push(p); }

  const FX = {
    init: setup,
    click() { tone(520, 0.06, 'triangle', 0.08); },
    correct() { tone(660, 0.12, 'sine', 0.13); tone(880, 0.18, 'sine', 0.13, 0.1); },
    wrong() { tone(220, 0.22, 'sawtooth', 0.09); tone(160, 0.25, 'sawtooth', 0.09, 0.12); },
    hit() { tone(140, 0.15, 'square', 0.1); tone(90, 0.2, 'square', 0.1, 0.05); },
    magic() { tone(400, 0.1, 'sine', 0.1); tone(800, 0.2, 'triangle', 0.1, 0.08); },
    tick() { tone(880, 0.05, 'square', 0.05); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.12)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.09, i * 0.18)); },
    levelUp() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'square', 0.08, i * 0.09)); },

    confetti(n) {
      if (!g2) return;
      n = n || 120;
      for (let i = 0; i < n; i++) {
        add({
          x: W / 2 + (Math.random() - 0.5) * W * 0.5, y: H * 0.25 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 8 - 2, g: 0.28,
          life: 90 + Math.random() * 70, max: 160, size: 8 + Math.random() * 7,
          color: COLORS[(Math.random() * COLORS.length) | 0], shape: 'rect', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        });
      }
      kick();
    },
    burst(x, y, color, n) {
      if (!g2) return;
      n = n || 26;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 5;
        add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.12, life: 30 + Math.random() * 25, max: 55, size: 4 + Math.random() * 5, color: color || '#ffd93d', shape: 'circle', rot: 0, vr: 0 });
      }
      kick();
    },
    // ยิงลูกเวทจาก element หนึ่งไปอีก element หนึ่ง; resolve เมื่อถึง (มี timeout สำรองเสมอ)
    bolt(fromEl, toEl, color) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const r = toEl && toEl.getBoundingClientRect();
          if (r) FX.burst(r.left + r.width / 2, r.top + r.height / 2, color, 30);
          resolve();
        };
        const DUR = 420;
        setTimeout(finish, DUR + 80);
        if (!g2 || !fromEl || !toEl) { return; }
        const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
        const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
        const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
        const t0 = performance.now();
        const step = (now) => {
          if (done) return;
          const k = Math.min(1, (now - t0) / DUR);
          const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 50;
          for (let i = 0; i < 3; i++) {
            add({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0, life: 18, max: 18, size: 6 + Math.random() * 8, color: color || '#c77dff', shape: 'circle', rot: 0, vr: 0 });
          }
          kick();
          if (k < 1) root.requestAnimationFrame(step); else finish();
        };
        root.requestAnimationFrame(step);
      });
    },
  };
  root.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
