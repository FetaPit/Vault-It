// Build an SVG per screen spec so Figma imports it as editable rects, text and vectors.
const fs = require('fs'); const path = require('path');
const [,, SPEC, OUT, only] = process.argv; fs.mkdirSync(OUT, { recursive: true });
const FAM = { S: 'Syne', D: 'DM Sans', M: 'Share Tech Mono', A: 'Archivo', P: 'Space Mono', I: 'Inter' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const idSafe = s => String(s || '').replace(/[^A-Za-z0-9 _.#-]/g, '').trim().slice(0, 60);
const col = c => c ? '#' + c.h : 'none';
let n = 0;
for (const f of fs.readdirSync(SPEC).filter(f => f.endsWith('.json'))) {
  if (only && !f.startsWith(only)) continue;
  const spec = JSON.parse(fs.readFileSync(path.join(SPEC, f), 'utf8'));
  if (!spec.items || !spec.items.length || !spec.w || !spec.h) { console.log('skip', f); continue; }
  const W = spec.w, H = spec.h; const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  if (spec.bg) parts.push(`<rect id="background" x="0" y="0" width="${W}" height="${H}" fill="#${spec.bg.h}"/>`);
  let k = 0;
  for (const it of spec.items) {
    k++;
    if (it.t === 'r') {
      const a = [`x="${it.x}"`, `y="${it.y}"`, `width="${Math.max(1, it.w)}"`, `height="${Math.max(1, it.h)}"`];
      if (it.br) a.push(`rx="${Math.min(it.br, it.w / 2, it.h / 2)}"`);
      if (it.bg) { a.push(`fill="${col(it.bg)}"`); if (it.bg.a < 1) a.push(`fill-opacity="${it.bg.a}"`); } else a.push('fill="none"');
      if (it.bw && it.bc) { a.push(`stroke="${col(it.bc)}"`, `stroke-width="${it.bw}"`); if (it.bc.a < 1) a.push(`stroke-opacity="${it.bc.a}"`); }
      if (it.op) a.push(`opacity="${it.op}"`);
      if (it.n) a.push(`id="${esc(idSafe(it.n))}"`);
      parts.push(`<rect ${a.join(' ')}/>`);
    } else if (it.t === 'x') {
      const fs_ = it.fs || 14; const lineH = it.h || fs_ * 1.3;
      const y = it.v ? (it.y + it.h / 2 + fs_ * 0.35) : (it.y + (lineH - fs_) / 2 + fs_ * 0.8);
      let x = it.x; let anchor = '';
      if (it.al === 'c') { x = it.x + it.w / 2; anchor = ' text-anchor="middle"'; } else if (it.al === 'r') { x = it.x + it.w; anchor = ' text-anchor="end"'; }
      const a = [`x="${Math.round(x * 10) / 10}"`, `y="${Math.round(y * 10) / 10}"`, `font-family="${FAM[it.f] || 'Inter'}"`, `font-size="${fs_}"`, `font-weight="${it.fw || 400}"`, `fill="${col(it.c)}"`];
      if (it.c && it.c.a < 1) a.push(`fill-opacity="${it.c.a}"`);
      if (it.op && it.op < 1) a.push(`opacity="${it.op}"`);
      if (it.ls) a.push(`letter-spacing="${it.ls}"`);
      parts.push(`<text ${a.join(' ')}${anchor} xml:space="preserve">${esc(it.s)}</text>`);
    } else if (it.t === 's' && it.svg) {
      const m = it.svg.match(/^<svg([^>]*)>([\s\S]*)<\/svg>\s*$/); if (!m) continue;
      const attrs = m[1]; let inner = m[2];
      const vb = (attrs.match(/viewBox="([^"]+)"/) || [])[1]; let sx = 1, sy = 1, tx = 0, ty = 0;
      if (vb) { const v = vb.trim().split(/[\s,]+/).map(parseFloat); if (v.length === 4 && v[2] > 0 && v[3] > 0) { sx = it.w / v[2]; sy = it.h / v[3]; tx = -v[0]; ty = -v[1]; } }
      const pre = 'g' + k + '_'; inner = inner.replace(/id="([^"]+)"/g, (_, id) => `id="${pre}${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${pre}${id})`).replace(/href="#([^"]+)"/g, (_, id) => `href="#${pre}${id}"`);
      const colour = (attrs.match(/ color="([^"]+)"/) || [])[1];
      parts.push(`<g id="${esc(idSafe(it.n || 'icon'))}" transform="translate(${it.x} ${it.y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${tx} ${ty})"${colour ? ` color="${colour}"` : ''}>${inner}</g>`);
    }
  }
  parts.push('</svg>');
  const out = path.join(OUT, f.replace(/\.json$/, '.svg')); fs.writeFileSync(out, parts.join('\n')); n++;
  console.log(`${f.replace('.json', '')}: ${W}x${H} ${Math.round(fs.statSync(out).size / 1024)}KB`);
}
console.log('svgs', n);
