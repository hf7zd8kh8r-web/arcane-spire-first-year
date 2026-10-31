// Arcane Spire: First Year — static file server + WebSocket relay for PvP duels.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 8080;
const MAX_ROOM = 8;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/health') { res.writeHead(200); res.end('ok'); return; }
  let f = path.normalize(path.join(ROOT, u === '/' ? 'index.html' : u));
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) {
      if (path.extname(u)) { res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('not found'); return; }
      f = path.join(ROOT, 'index.html');
    }
    fs.readFile(f, (e, data) => {
      if (e) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
        'Cache-Control': f.endsWith('.html') ? 'no-cache, no-store, must-revalidate' : (u.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'),
      });
      res.end(data);
    });
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
const rooms = new Map();
let nextId = 1;
const clean = (s, n = 16) => String(s || '').replace(/[<>&"]/g, '').slice(0, n);

wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams;
  const room = clean(q.get('room') || 'lobby', 12).toUpperCase();
  if (!rooms.has(room)) rooms.set(room, new Map());
  const R = rooms.get(room);
  if (R.size >= MAX_ROOM) { ws.send(JSON.stringify({ t: 'full' })); ws.close(); return; }
  const id = nextId++;
  const me = { ws, id, info: null, msgs: 0 };
  R.set(id, me);
  ws.send(JSON.stringify({
    t: 'welcome', id, room,
    peers: [...R.values()].filter(p => p.id !== id && p.info).map(p => ({ id: p.id, ...p.info })),
  }));
  const bc = (o, ex = id) => {
    const s = JSON.stringify(o);
    for (const p of R.values()) if (p.id !== ex && p.ws.readyState === 1) p.ws.send(s);
  };
  ws.on('message', raw => {
    me.msgs++; if (me.msgs > 80) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'hello') {
      me.info = { name: clean(m.name), house: clean(m.house, 16), lvl: m.lvl | 0 };
      bc({ t: 'join', id, ...me.info });
    } else if (m.t === 'duel') {
      const T = R.get(m.to | 0);
      if (T && T.ws.readyState === 1 && T.id !== id) {
        T.ws.send(JSON.stringify({
          t: 'duel', id, k: clean(m.k, 8), lvl: m.lvl | 0,
          name: clean(m.name, 24), house: clean(m.house, 16),
        }));
      }
    } else if (m.t === 'dstate') {
      bc({ t: 'dstate', id, p: (m.p || []).slice(0, 3).map(Number), a: +m.a || 0, h: +m.h || 0 });
    } else if (m.t === 'dhit') {
      const T = R.get(m.to | 0);
      if (T && T.ws.readyState === 1) T.ws.send(JSON.stringify({ t: 'dhit', id, d: Math.min(80, +m.d || 0), spell: clean(m.spell, 16) }));
    } else if (m.t === 'chat') {
      bc({ t: 'chat', id, name: me.info ? me.info.name : '?', msg: clean(m.msg, 120) });
    } else if (m.t === 's') {
      bc({ t: 's', id, p: (m.p || []).slice(0, 5).map(Number), a: m.a | 0 });
    }
  });
  ws.on('close', () => { R.delete(id); bc({ t: 'leave', id }); if (!R.size) rooms.delete(room); });
});
setInterval(() => { for (const R of rooms.values()) for (const p of R.values()) p.msgs = 0; }, 1000);

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Arcane Spire: First Year on http://${HOST}:${PORT}  (ws /ws)`));
let stopping = false;
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  if (stopping) return; stopping = true;
  console.log(`[server] ${sig}`); setTimeout(() => process.exit(0), 2000);
});
