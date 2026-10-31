// Phone preview of the local build on the home Wi-Fi: builds the site, prints the address to open on the phone, then runs wrangler dev.
// Usage (laptop, Git Bash or any shell): npm run dev:phone        Stop with Ctrl+C.
// Why each flag: --ip 0.0.0.0 lets the phone reach the laptop; --local-upstream localhost stops wrangler using the first route
// (app.vault-it.co), which would redirect the phone to the live site; --local-protocol https makes the page a secure context, so
// sign-in crypto, the service worker and the install prompt work. The phone shows a certificate warning once: Advanced, Proceed.
// Nothing is deployed: this is wrangler's local dev server serving dist/.
const { execSync, spawn } = require('child_process');
const os = require('os');

const port = process.env.PORT || '8787';
execSync('node tools/build_site.js', { stdio: 'inherit' });

const ips = [];
for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
  for (const a of addrs || []) {
    if (a.family !== 'IPv4' && a.family !== 4) continue;
    if (a.internal || a.address.startsWith('169.254.')) continue;          // loopback and link-local are no use to a phone
    if (/vethernet|virtualbox|vmware|docker|wsl|hyper-v/i.test(name)) continue;  // virtual adapters on Windows and Linux
    ips.push({ name, ip: a.address });
  }
}
console.log('\nOpen on the phone (same Wi-Fi):');
if (!ips.length) console.log('  no Wi-Fi address found: check the laptop is on the network');
for (const { name, ip } of ips) console.log(`  https://${ip}:${port}/            app        (${name})\n  https://${ip}:${port}/landing/    landing page`);
console.log('  Sample data without signing in: add ?bypass=websummit\n  Certificate warning: Advanced, then Proceed. If the phone cannot connect, allow Node.js on Private networks in Windows Firewall.\n');

const args = ['wrangler', 'dev', '--ip', '0.0.0.0', '--port', port, '--local-upstream', 'localhost', '--local-protocol', 'https'];
const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code || 0));
