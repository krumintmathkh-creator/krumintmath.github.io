/* เซิร์ฟเวอร์ static สำหรับทดสอบ: node tests/serve.js [port]
   POST /report?name=xxx  -> เขียนผลทดสอบลง tests/results/xxx.txt */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = +process.argv[2] || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && u.pathname === '/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const dir = path.join(__dirname, 'results');
      fs.mkdirSync(dir, { recursive: true });
      const name = (u.searchParams.get('name') || 'result').replace(/[^\w-]/g, '');
      fs.writeFileSync(path.join(dir, name + '.txt'), body, 'utf8');
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  let p = decodeURIComponent(u.pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving ' + root + ' on http://localhost:' + port));
