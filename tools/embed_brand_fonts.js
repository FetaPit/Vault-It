// Embeds Chakra Petch (headlines and titles, owner 13 Nov 2026) into the website pages as woff2 data URIs, so no outside font host is
// needed. Writes the block between /* chakra-petch:start */ and /* chakra-petch:end */, at the top of the page's first <style> (or of a
// .css file). Re-run after changing brand/fonts/chakra-petch/. Usage: node tools/embed_brand_fonts.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'brand', 'fonts', 'chakra-petch');
const PAGES = ['landing.html'];
const WEIGHTS = [[300, '100 349'], [400, '350 549'], [700, '550 1000']];   // ranges, so 800 headings use Bold and nothing is faked
const face = ([w, range]) => '@font-face{font-family:"Chakra Petch";font-style:normal;font-weight:' + range + ';font-display:swap;src:url(data:font/woff2;base64,'
  + fs.readFileSync(path.join(DIR, 'chakra-petch-' + w + '.woff2')).toString('base64') + ') format("woff2")}';
const block = '/* chakra-petch:start (tools/embed_brand_fonts.js; SIL OFL 1.1, brand/fonts/chakra-petch/OFL.txt) */' + WEIGHTS.map(face).join('') + '/* chakra-petch:end */';
for (const rel of PAGES) {
  const f = path.join(ROOT, rel); let s = fs.readFileSync(f, 'utf8');
  const re = /\/\* chakra-petch:start[\s\S]*?\/\* chakra-petch:end \*\//;
  if (re.test(s)) s = s.replace(re, block);
  else if (rel.endsWith('.css')) s = block + '\n' + s;
  else { const i = s.indexOf('<style>'); if (i < 0) throw new Error(rel + ': no <style>'); s = s.slice(0, i + 7) + block + '\n' + s.slice(i + 7); }
  fs.writeFileSync(f, s); console.log('embedded Chakra Petch in ' + rel);
}
