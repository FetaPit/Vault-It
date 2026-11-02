// v0.8 F2 type scale: the hand edits that go with tools/type_floor.js (run the floor tool first). Idempotent.
// Each edit is an exact before/after pair, so a merge that changes the surrounding code shows up as a clear "not found".
// Usage: node tools/type_scale_hand.js
const fs = require('fs');
const file = __dirname + '/../index.html';
let s = fs.readFileSync(file, 'utf8'), bad = 0;
const E = [
  ['floor tokens',
    "html{font-size:calc(var(--vi-base,13px) * var(--vi-scale,1))}\n",
    "html{font-size:calc(var(--vi-base,13px) * var(--vi-scale,1))}\n/* v0.8 type scale (Pedro's spec H): floors under the small sizes, at every width. tools/type_floor.js writes\n   max(<size>,var(--vi-fs-N)) by each declaration's source size; sizes from .81rem up are left alone. */\n:root{--vi-fs-0:10px;--vi-fs-1:10.5px;--vi-fs-2:11.5px;--vi-fs-3:12.5px}\n"],
  ['nav USP/PRO badges at 9 px caps (agreed exception)',
    "#topnav .vi-usp,#topnav .vi-pro{position:absolute;top:1px;right:2px;padding:1px 4px;border-radius:3px;font:800 max(.3rem,var(--vi-fs-1))/1.2 var(--font-display);",
    "#topnav .vi-usp,#topnav .vi-pro{position:absolute;top:1px;right:2px;padding:1px 4px;border-radius:3px;font:800 9px/1.2 var(--font-display);"],
  ['habit circles: month and year labels floored',
    "--hf:clamp(.34rem,.9vw,.6rem);--hy:clamp(.42rem,1vw,.66rem);",
    "--hf:max(clamp(.34rem,.9vw,.6rem),var(--vi-fs-1));--hy:max(clamp(.42rem,1vw,.66rem),var(--vi-fs-0));"],
  ['habit circles under 700',
    "--hc:14px;--hf:.4rem;--hy:.48rem;--hl:3px}",
    "--hc:14px;--hf:max(.4rem,var(--vi-fs-1));--hy:max(.48rem,var(--vi-fs-0));--hl:3px}"],
  ['dev links wrap rather than clip',
    "[data-theme=\"light\"] .dev-links a{color:var(--text)!important}\n",
    "[data-theme=\"light\"] .dev-links a{color:var(--text)!important}\n.dev-links{grid-template-columns:repeat(auto-fill,minmax(min(100%,124px),1fr))!important}   /* v0.8 type scale: the five links wrap rather than clip */\n"],
  ['Budget card sub-line wraps under the amount (keeps the D2 titles clear at 10.5 px)',
    ".bd-tile-sum small{font:max(.5rem,var(--vi-fs-1)) 'Share Tech Mono',monospace;color:var(--t3);font-weight:400}",
    ".bd-tile-sum small{font:max(.5rem,var(--vi-fs-1))/1.2 'Share Tech Mono',monospace;color:var(--t3);font-weight:400;white-space:normal;max-width:7ch;text-align:right}"],
  // Roadmap SVG: real-pixel text (the SVG is not scaled), so the attribute sizes are the drawn sizes
  ['roadmap phase label',
    `text-anchor="middle" font-size="7.5" font-family="Syne,sans-serif" font-weight="800" fill="'+sp.col+'" opacity="'+(sp.done?'0.95':'0.6')+'" letter-spacing="2.5">`,
    `text-anchor="middle" font-size="10.5" font-family="Syne,sans-serif" font-weight="800" fill="'+sp.col+'" opacity="'+(sp.done?'0.95':'0.6')+'" letter-spacing="1.5">`],
  ['roadmap name/desc spacing',
    "var descY=above?(LINE_Y-NODE_R-21):(LINE_Y+NODE_R+36);",
    "var descY=above?(LINE_Y-NODE_R-24):(LINE_Y+NODE_R+40);"],
  ['roadmap stage name',
    `text-anchor="middle" font-size="7.5" font-family="Syne,sans-serif" font-weight="800" fill="'+nameCol+'"`,
    `text-anchor="middle" font-size="11.5" font-family="Syne,sans-serif" font-weight="800" fill="'+nameCol+'"`],
  ['roadmap stage line',
    `text-anchor="middle" font-size="6" font-family="DM Sans,sans-serif"`,
    `text-anchor="middle" font-size="10.5" font-family="DM Sans,sans-serif"`],
  ['roadmap START HERE / NEXT UP tag',
    `out+='<rect x="'+(cx-27)+'" y="'+(LINE_Y-NODE_R-48)+'" width="54" height="12" fill="'+col+'26" stroke="'+col+'" stroke-width="0.8"/>'
        +'<text x="'+cx+'" y="'+(LINE_Y-NODE_R-39.5)+'" text-anchor="middle" font-size="6.2"`,
    `out+='<rect x="'+(cx-40)+'" y="'+(LINE_Y-NODE_R-53)+'" width="80" height="16" fill="'+col+'26" stroke="'+col+'" stroke-width="0.8"/>'
        +'<text x="'+cx+'" y="'+(LINE_Y-NODE_R-41.5)+'" text-anchor="middle" font-size="10"`],
  ['roadmap stage number (decorative, 8 px agreed exception)',
    `+'" y="'+(LINE_Y+NODE_R-2)+'" font-size="5.5" font-family="Share Tech Mono`,
    `+'" y="'+(LINE_Y+NODE_R-2)+'" font-size="8" font-family="Share Tech Mono`],
  ['roadmap phone carousel never shrinks a coin under 1',
    "g.style.transform='scale('+(1.22-0.42*d).toFixed(3)+')';",
    "g.style.transform='scale('+(1.22-0.22*d).toFixed(3)+')';/* never under 1, so stage names keep their size (v0.8 type scale) */"],
  // Mortgage chart: drawn at its real width, so its text sizes are the drawn sizes (a 640-wide drawing squeezed to a phone drew ~4 px text)
  ['mortgage chart width',
    "  var W=640,H=222,L=52,R=10,T=10,B=40,n=Math.max(",
    "  var cw=0;try{cw=document.getElementById('hbc-out').clientWidth-18}catch(e){}\n  var W=cw>200?Math.round(cw):640,stack=W<560,H=stack?250:222,L=56,R=10,T=10,B=stack?68:40,n=Math.max("],
  ['mortgage chart value axis',
    `text-anchor="end" fill="#6b8197" font-size="9" font-family`,
    `text-anchor="end" fill="#6b8197" font-size="10.5" font-family`],
  ['mortgage chart year axis',
    `grid+='<text x="'+X(m).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'" fill="#6b8197" font-size="9" font-family`,
    `grid+='<text x="'+X(m).toFixed(1)+'" y="'+(stack?H-B+16:H-8)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'" fill="#6b8197" font-size="10.5" font-family`],
  ['mortgage chart box',
    `  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;height:230px">'+grid`,
    `  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;height:'+H+'px">'+grid`],
  ['mortgage chart legend',
    `    +'<g font-size="10" font-family="Share Tech Mono,monospace"><text x="'+L+'" y="'+(H-3)+'" fill="#8b97a3">- - balance, no extras</text><text x="'+(L+150)+'" y="'+(H-3)+'" fill="#44c0b9">– balance, your plan</text>'+(eq?'<text x="'+(L+290)+'" y="'+(H-3)+'" fill="#e8c56a">– equity (value − balance)</text>':'')+'</g></svg>';`,
    `    +(stack?'<g font-size="10.5" font-family="Share Tech Mono,monospace"><text x="4" y="'+(H-37)+'" fill="#8b97a3">- - balance, no extras</text><text x="4" y="'+(H-23)+'" fill="#44c0b9">– balance, your plan</text>'+(eq?'<text x="4" y="'+(H-9)+'" fill="#e8c56a">– equity (value − balance)</text>':'')+'</g></svg>'
    :'<g font-size="10.5" font-family="Share Tech Mono,monospace"><text x="'+L+'" y="'+(H-3)+'" fill="#8b97a3">- - balance, no extras</text><text x="'+(L+160)+'" y="'+(H-3)+'" fill="#44c0b9">– balance, your plan</text>'+(eq?'<text x="'+(L+310)+'" y="'+(H-3)+'" fill="#e8c56a">– equity (value − balance)</text>':'')+'</g></svg>');`],
];
for (const [name, from, to] of E) {
  if (s.includes(to)) continue;                       // already applied
  const n = s.split(from).length - 1;
  if (n !== 1) { bad++; console.log(`NOT APPLIED (${n} matches): ${name}`); continue; }
  s = s.replace(from, to);
}
fs.writeFileSync(file, s);
console.log(bad ? `${bad} edit(s) need a look` : `hand edits applied (${E.length})`);
process.exit(bad ? 1 : 0);
