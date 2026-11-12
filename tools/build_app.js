#!/usr/bin/env node
// index.html is built from src/app/ (owner, 9 Nov 2026: split the app into parts per tab and sub-tab that still build ONE index.html).
// src/app/manifest.json lists the parts in stitch order, which is also the order the browser runs them in. Each part is a run of
// whole lines; the build joins them with nothing added, so index.html comes out byte for byte the same as the parts.
// A part is found in index.html by its anchor: a line (at least 20 characters, unique in the file) that sits `offset` lines
// below the part's first line. No line numbers are stored, so the anchors survive edits elsewhere in the file.
//
//   node tools/build_app.js            join the parts into index.html (writes only if the bytes differ)
//   node tools/build_app.js --check    exit 1 if index.html differs from the parts, or a part breaks a rule below
//   node tools/build_app.js --absorb   re-split an edited index.html into the parts by the anchors (branches cut before the split)
//   node tools/build_app.js --where N  which part holds index.html line N, and the line inside it
//   node tools/build_app.js --map      parts with their line counts, for the session-start map
//   node tools/build_app.js --init <starts.txt>   one-off: split index.html at "<first line> <part path>" rows and write the manifest
// Rules (--check): no carriage returns or byte order marks, every part ends in a newline, every file under src/app is listed and
// every listed file exists, anchors unique and in order, exactly one generated 3D engine block (written by tools/build_hb3d.js).
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src', 'app'), MAN = path.join(SRC, 'manifest.json'), OUT = path.join(ROOT, 'index.html');

function readManifest() { return JSON.parse(fs.readFileSync(MAN, 'utf8')).parts; }
function lines(text) { const L = text.split('\n'); if (L[L.length - 1] === '') L.pop(); return L; }   // every line ends in \n
function join(parts) { return Buffer.concat(parts.map(p => fs.readFileSync(path.join(SRC, p.file)))); }

function anchorIndex(L, parts) {   // index.html line of each part's anchor, searching forward so the order is checked too
  const out = []; let from = 0;
  for (const p of parts) {
    let at = -1, n = 0;
    for (let i = 0; i < L.length; i++) if (L[i].startsWith(p.anchor)) { n++; if (at < 0 && i >= from) at = i; }
    if (n !== 1 || at < 0) throw new Error('anchor for ' + p.file + (n === 0 ? ' not found' : n > 1 ? ' is on ' + n + ' lines' : ' is out of order') + ': ' + JSON.stringify(p.anchor.slice(0, 60)));
    out.push(at - (p.offset || 0)); from = at + 1;
  }
  return out;
}
function splitByAnchors(text, parts) {
  const L = lines(text), st = anchorIndex(L, parts);
  if (st[0] !== 0) throw new Error('the first part must start at line 1');
  return parts.map((p, i) => L.slice(st[i], i + 1 < parts.length ? st[i + 1] : L.length).map(x => x + '\n').join(''));
}

function check(opts) {
  opts = opts || {}; const problems = [];
  const parts = readManifest(), listed = new Set(parts.map(p => p.file));
  const walk = (d, rel) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (r !== 'manifest.json' && r !== 'README.md' && !listed.has(r)) problems.push('not in the manifest: src/app/' + r); });
  walk(SRC, '');
  let hb = 0;
  for (const p of parts) {
    const f = path.join(SRC, p.file);
    if (!fs.existsSync(f)) { problems.push('missing part: src/app/' + p.file); continue; }
    const b = fs.readFileSync(f);
    if (b.includes(13)) problems.push('carriage return in src/app/' + p.file + ' (save it with LF line endings)');
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) problems.push('byte order mark in src/app/' + p.file);
    if (!b.length || b[b.length - 1] !== 10) problems.push('src/app/' + p.file + ' does not end in a newline');
    const n = b.toString('utf8').split('// <<HB3D_ENGINE').length - 1; if (n) { hb += n; if (!/^hb3d\//.test(p.file)) problems.push('the 3D engine block is in ' + p.file + ', not src/app/hb3d/'); }
  }
  if (hb !== 1) problems.push('expected one generated 3D engine block, found ' + hb);
  if (!problems.some(x => /^missing/.test(x))) {
    const built = join(parts), cur = fs.existsSync(OUT) ? fs.readFileSync(OUT) : Buffer.alloc(0);
    if (Buffer.compare(built, cur) !== 0) {
      const a = lines(built.toString('utf8')), c = lines(cur.toString('utf8')); let i = 0; while (i < a.length && i < c.length && a[i] === c[i]) i++;
      problems.push('index.html differs from src/app at line ' + (i + 1) + ' (' + where(i + 1, parts) + '): run `node tools/build_app.js` to rebuild, or `--absorb` if index.html was edited directly');
    }
    try { anchorIndex(lines(built.toString('utf8')), parts); } catch (e) { problems.push(e.message); }
  }
  if (!opts.quiet) problems.forEach(x => console.error('build_app: ' + x));
  return { problems };
}

function where(n, parts) {
  parts = parts || readManifest(); let at = 0;
  for (const p of parts) { const k = lines(fs.readFileSync(path.join(SRC, p.file), 'utf8')).length; if (n <= at + k) return 'src/app/' + p.file + ':' + (n - at); at += k; }
  return 'past the end';
}

function build(opts) {
  opts = opts || {}; const built = join(readManifest()), cur = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
  if (cur && Buffer.compare(built, cur) === 0) { if (!opts.quiet) console.log('index.html is up to date (' + built.length + ' bytes)'); return false; }
  fs.writeFileSync(OUT, built); if (!opts.quiet) console.log('index.html built from src/app (' + built.length + ' bytes)'); return true;
}

function absorb() {
  const parts = readManifest(), text = fs.readFileSync(OUT, 'utf8'), out = splitByAnchors(text, parts); let n = 0;
  parts.forEach((p, i) => { const f = path.join(SRC, p.file); if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== out[i]) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, out[i]); n++; console.log('updated src/app/' + p.file); } });
  console.log(n ? n + ' part(s) updated from index.html' : 'the parts already match index.html');
}

function init(startsFile) {
  const L = lines(fs.readFileSync(OUT, 'utf8')), rows = fs.readFileSync(startsFile, 'utf8').split('\n').filter(Boolean).map(r => { const m = r.trim().match(/^(\d+)\s+(\S+)$/); if (!m) throw new Error('bad row: ' + r); return { s: +m[1] - 1, file: m[2] }; });
  if (rows[0].s !== 0) throw new Error('the first row must start at line 1');
  const count = {}; L.forEach(x => { count[x] = (count[x] || 0) + 1; });
  const parts = rows.map((r, i) => {
    const end = i + 1 < rows.length ? rows[i + 1].s : L.length;
    if (end <= r.s) throw new Error('rows out of order at ' + r.file);
    for (let k = r.s; k < Math.min(end, r.s + 40); k++) {
      const x = L[k]; if (x.trim().length < 20) continue;
      for (let len = 20; len <= x.length; len += 10) { const a = x.slice(0, len); if (L.filter(y => y.startsWith(a)).length === 1) return { file: r.file, anchor: a, offset: k - r.s }; }
      if (count[x] === 1 && L.filter(y => y.startsWith(x)).length === 1) return { file: r.file, anchor: x, offset: k - r.s };
    }
    throw new Error('no unique anchor line near the start of ' + r.file);
  });
  fs.mkdirSync(SRC, { recursive: true });
  fs.writeFileSync(MAN, JSON.stringify({ about: 'index.html is built from these parts, in this order (tools/build_app.js). Edit the parts, run the build, commit both.', parts }, null, 1) + '\n');
  absorb();
}

module.exports = { readManifest, splitByAnchors, check, build, where };
if (require.main === module) {
  const a = process.argv.slice(2);
  try {
    if (a[0] === '--check') { const r = check(); if (r.problems.length) process.exit(1); console.log('index.html matches src/app (' + readManifest().length + ' parts)'); }
    else if (a[0] === '--absorb') { absorb(); const r = check(); process.exit(r.problems.length ? 1 : 0); }
    else if (a[0] === '--where') console.log(where(+a[1]));
    else if (a[0] === '--map') { const m = {}; readManifest().forEach(p => { const d = p.file.split('/')[0]; const k = lines(fs.readFileSync(path.join(SRC, p.file), 'utf8')).length; (m[d] = m[d] || []).push(p.file.split('/').slice(1).join('/') + ' ' + k); }); Object.keys(m).forEach(d => console.log('src/app/' + d + '/: ' + m[d].join(', '))); }
    else if (a[0] === '--init') { init(a[1]); const r = check(); process.exit(r.problems.length ? 1 : 0); }
    else build();
  } catch (e) { console.error('build_app: ' + e.message); process.exit(1); }
}
