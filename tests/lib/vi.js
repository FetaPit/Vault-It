'use strict';
// Shared test setup: where the app under test is, and how browser tests reach it.
//
//   VI_INDEX=/path/to/index.html   the index.html under test (default: this repo's). Its folder is the repo root.
//   VI_FILE=1                      open file:// URLs as they are (no local web server), for comparing with the old way
//
// Browser tests name the app as a file URL (FILE_URL below). When a test launches Playwright's Chromium, this module
// serves the root folder over http://127.0.0.1 (one small static server per test process, a free port, closed when the
// process ends) and turns every file:// URL inside the root into the matching http:// one at page.goto. Headless Chrome
// on file:// sometimes empties or loses localStorage, and the live site is http(s), so http is the truer test.
// Nothing here needs /home/user, /tmp or a particular drive: it works from __dirname, os.tmpdir() and the environment.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { pathToFileURL, fileURLToPath } = require('url');

const REPO = path.resolve(__dirname, '..', '..');
const INDEX = path.resolve(process.env.VI_INDEX || path.join(REPO, 'index.html'));
const ROOT = path.dirname(INDEX);
const FILE_URL = pathToFileURL(INDEX).href;
const TMP = os.tmpdir();
const LOG_DIR = process.env.LOG_DIR || path.join(TMP, 'vaultit-test-logs');
const LEGACY = '/home/user/Vault-It';   // the old fixed checkout path; URLs still spelled that way are mapped onto ROOT

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };

let serverP = null, ORIGIN = null;
function serve() {   // resolves to 'http://127.0.0.1:PORT'
  if (serverP) return serverP;
  serverP = new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let rel; try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(ROOT, '.' + rel);
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
      fs.stat(file, (e, st) => {
        if (e || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
        fs.createReadStream(file).pipe(res);
      });
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => { srv.unref(); ORIGIN = 'http://127.0.0.1:' + srv.address().port; resolve(ORIGIN); });
  });
  return serverP;
}

// file:// URL -> path inside ROOT (relative, with its ?query and #hash), or null when it is not ours
function relInRoot(u) {
  let p, tail = '';
  const m = /^(file:\/\/[^?#]*)([?#].*)?$/.exec(u); if (!m) return null; tail = m[2] || '';
  try { p = fileURLToPath(m[1]); } catch (e) { return null; }
  const norm = x => path.resolve(x);
  const n = norm(p);
  const legacy = norm(LEGACY);
  if (n === legacy || n.startsWith(legacy + path.sep)) { const r = path.relative(legacy, n).split(path.sep).join('/'); return (r === 'index.html' ? path.basename(INDEX) : r) + tail; }
  if (n === ROOT || n.startsWith(ROOT + path.sep)) return path.relative(ROOT, n).split(path.sep).join('/') + tail;
  if (n === INDEX) return path.basename(INDEX) + tail;
  return null;
}
async function toHttp(u) {
  if (typeof u !== 'string' || process.env.VI_FILE || !/^file:/i.test(u)) return u;
  const r = relInRoot(u); if (r === null) return u;
  return (await serve()) + '/' + r.split('/').map((s, i, a) => i === a.length - 1 ? s : encodeURIComponent(s)).join('/');
}

// Patch Playwright once so goto() understands file URLs inside ROOT. Quietly does nothing for tests that do not use Playwright.
let patched = false;
function patchPlaywright() {
  if (patched || process.env.VI_FILE) return; let pw; try { pw = require('playwright'); } catch (e) { return; }
  patched = true;
  const wrapGoto = proto => { if (!proto || proto.__viGoto) return; const orig = proto.goto; proto.goto = async function (u, o) { return orig.call(this, await toHttp(u), o); }; proto.__viGoto = true; };
  // "Offline" tests abort every http(s) request. The app now arrives over http from our own server, so an abort aimed at
  // that server (and only that one) is passed on instead; every other host stays blocked.
  const wrapRoute = proto => { if (!proto || proto.__viRoute || !proto.route) return; const orig = proto.route; proto.__viRoute = true;
    proto.route = function (url, handler, opts) { if (typeof handler !== 'function') return orig.call(this, url, handler, opts);
      const h = function (route, request) { let u = ''; try { u = (request || route.request()).url(); } catch (e) {}
        if (ORIGIN && u.startsWith(ORIGIN + '/')) route = new Proxy(route, { get(t, k) { return k === 'abort' ? () => t.fallback() : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]); } });
        return handler.call(this, route, request); };
      return orig.call(this, url, h, opts); }; };
  const seePage = page => { if (!page) return page; wrapGoto(Object.getPrototypeOf(page)); wrapRoute(Object.getPrototypeOf(page)); try { wrapGoto(Object.getPrototypeOf(page.mainFrame())); } catch (e) {} return page; };
  const wrapMaker = (proto, name, after) => { if (!proto || !proto[name] || proto[name].__vi) return; const orig = proto[name]; const w = async function () { return after(await orig.apply(this, arguments)); }; w.__vi = true; proto[name] = w; };
  const seeContext = ctx => { if (!ctx) return ctx; const cp = Object.getPrototypeOf(ctx); wrapRoute(cp); wrapMaker(cp, 'newPage', seePage); ctx.pages().forEach(seePage); ctx.on('page', seePage); return ctx; };
  const seeBrowser = b => { if (!b) return b; const bp = Object.getPrototypeOf(b); wrapMaker(bp, 'newContext', seeContext); wrapMaker(bp, 'newPage', seePage); b.contexts().forEach(seeContext); return b; };
  for (const bt of [pw.chromium, pw.firefox, pw.webkit]) {
    if (!bt) continue; const bp = Object.getPrototypeOf(bt);
    wrapMaker(bp, 'launch', seeBrowser); wrapMaker(bp, 'connect', seeBrowser); wrapMaker(bp, 'connectOverCDP', seeBrowser); wrapMaker(bp, 'launchPersistentContext', seeContext);
  }
}
patchPlaywright();

module.exports = { REPO, ROOT, INDEX, FILE_URL, TMP, LOG_DIR, serve, toHttp, fileUrl: rel => pathToFileURL(path.join(ROOT, rel)).href };
