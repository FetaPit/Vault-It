// Index split (owner, 9 Nov 2026: "split the MVP html file into separate tabs and sub tabs", option 1: source parts that still
// build ONE index.html). index.html is build output: src/app/manifest.json lists the parts in order, and tools/build_app.js joins
// them with nothing added. Checks: the parts rebuild the committed index.html byte for byte; every part file is listed and every
// listed file exists; no part has a carriage return or byte order mark, and each ends in a newline; each anchor is unique in
// index.html and the anchors come in order; exactly one generated 3D engine block, in its own part; re-splitting index.html by the
// anchors gives back the same parts.
// Run: node tests/test_app_build.js
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src', 'app');
const man = path.join(SRC, 'manifest.json');
ok(fs.existsSync(man), 'src/app/manifest.json exists');
if (!fs.existsSync(man)) { console.log('FAILURES ' + fails); process.exit(1); }
const B = require(path.join(ROOT, 'tools', 'build_app.js'));
const r = B.check({ quiet: true });
ok(r.problems.length === 0, 'tools/build_app.js check finds no problems (' + r.problems.slice(0, 5).join(' | ') + ')');
const parts = B.readManifest();
ok(parts.length >= 20, 'index.html is split into tab and shared parts (' + parts.length + ')');
const joined = Buffer.concat(parts.map(p => fs.readFileSync(path.join(SRC, p.file))));
const committed = fs.readFileSync(path.join(ROOT, 'index.html'));
ok(Buffer.compare(joined, committed) === 0, 'the parts join to the committed index.html byte for byte (' + joined.length + ' vs ' + committed.length + ' bytes)');
const hb = parts.filter(p => fs.readFileSync(path.join(SRC, p.file), 'utf8').includes('// <<HB3D_ENGINE'));
ok(hb.length === 1 && /^hb3d\//.test(hb[0].file), 'one part holds the generated 3D engine block (' + hb.map(p => p.file) + ')');
const split = B.splitByAnchors(committed.toString('utf8'), parts);
ok(split.every((t, i) => t === fs.readFileSync(path.join(SRC, parts[i].file), 'utf8')), 're-splitting index.html by the anchors gives back the same parts');
const tabs = ['overview', 'budget', 'debt', 'assets', 'house', 'biz', 'network', 'achievements', 'connections'];
ok(tabs.every(t => parts.some(p => p.file.startsWith(t + '/'))), 'each main tab has its own folder (' + tabs.filter(t => !parts.some(p => p.file.startsWith(t + '/'))) + ')');
ok(['cash', 'stocks', 'crypto', 'metals', 'liabilities', 'other'].every(s => parts.some(p => p.file === 'assets/' + s + '.html')), 'each Assets sub-tab has its own part');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
