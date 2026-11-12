// Builds the branded Supabase Auth e-mail templates in supabase/auth-templates/ (same shell as supabase/functions/send-auth-email).
// Supabase sends these itself when the app's own sender is not used (the built-in fallback, or any auth mail Supabase fires), and they are
// set in the Supabase dashboard (Authentication > Emails > Templates), not deployed from the repo: paste each file there. See README.md in the folder.
// Run: node tools/build_auth_templates.js
const fs = require('fs'), path = require('path');
const EYEBROW = "margin:0 0 8px;font-family:'Share Tech Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#44C0B9";
const H1 = "margin:0 0 14px;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;line-height:1.25;color:#E8E8E8";
const P = "margin:0 0 18px;font-size:15px;line-height:1.6;color:#9AA0A6";
const SMALL = "margin:0 0 8px;font-size:12px;line-height:1.6;color:#9AA0A6";
const BTN = "display:inline-block;background:#E8C56A;color:#1A1400;text-decoration:none;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:15px 24px;border-radius:10px";
const TRADER = 'Vault-It is run by PT Live Design, A57, 11 St Mary&#39;s Street, Lincoln LN5 7EQ · <a href="mailto:hello@vault-it.co" style="color:#44C0B9">hello@vault-it.co</a>';
const strong = (t) => `<strong style="color:#E8E8E8">${t}</strong>`;
const shell = (title, body, footer) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#080808;color:#E8E8E8;font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:18px;max-width:520px;width:100%">
<tr><td style="padding:28px 36px 18px;border-bottom:1px solid #102221">
<img src="https://vault-it.co/email/lockup.gif" width="190" alt="Vault-It" style="display:block;border:0;outline:none;height:auto;width:190px;max-width:100%;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;color:#E8E8E8">
<div style="margin-top:8px;font-size:12px;letter-spacing:.04em;color:#9AA0A6">Get out of the red and into your home.</div>
</td></tr>
<tr><td style="padding:26px 36px 10px">${body}</td></tr>
<tr><td style="padding:16px 36px 26px;border-top:1px solid #102221">
<p style="margin:0 0 8px;font-size:12px;color:#E8E8E8">Not regulated by the FCA. Not financial advice.</p>
<p style="margin:0;font-size:11px;line-height:1.6;color:#9AA0A6">${footer}</p>
</td></tr>
</table></td></tr></table></body></html>`;
const code = (label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr><td style="background:#080808;border:1px solid #15302F;border-radius:12px;padding:18px 32px;text-align:center">
<div style="${EYEBROW};margin:0 0 10px">${label}</div>
<div style="font-family:'Share Tech Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;letter-spacing:.22em;line-height:1;color:#E8E8E8">{{ .Token }}</div>
</td></tr></table>`;
const button = (text) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr><td><a href="{{ .ConfirmationURL }}" style="${BTN}">${text}</a></td></tr></table>`;
const ignore = 'If that was not you, ignore this e-mail: nothing changes and your vault stays locked.';

// file, Supabase template name, subject, eyebrow, heading, copy, action
const T = [
  ['magic-link', 'Magic Link', 'Your Vault-It sign-in code', 'Your sign-in code', 'Open your vault',
   `Enter this code on the Vault-It sign-in screen for ${strong('{{ .Email }}')}. It expires in ${strong('60 minutes')} and works once.`, code('Enter this code')],
  ['confirm-signup', 'Confirm sign up', 'Confirm your Vault-It code', 'Your confirmation code', 'Welcome to Vault-It',
   `Enter this code on the Vault-It screen for ${strong('{{ .Email }}')} to confirm your address. It expires in ${strong('60 minutes')} and works once.`, code('Enter this code')],
  ['reset-password', 'Reset password', 'Your Vault-It reset code', 'Reset code', 'Get back into your vault',
   `Enter this code on the Vault-It screen for ${strong('{{ .Email }}')} to reset your access. It expires in ${strong('60 minutes')} and works once.`, code('Enter this code')],
  ['change-email', 'Change email address', 'Confirm your new Vault-It e-mail address', 'New e-mail address', 'Confirm the change',
   `You asked to change the e-mail on your Vault-It account from ${strong('{{ .Email }}')} to ${strong('{{ .NewEmail }}')}.`, button('Confirm the change')],
  ['invite', 'Invite user', 'You are invited to Vault-It', 'Invitation', 'Your place in Vault-It is ready',
   'You have been invited to Vault-It. Accept the invitation to set up your vault.', button('Accept the invitation')],
  ['reauthentication', 'Reauthentication', 'Your Vault-It confirmation code', 'Confirm it is you', 'One more check',
   'Enter this code in Vault-It to confirm a sensitive change. It expires in ' + strong('60 minutes') + ' and works once.', code('Enter this code')],
];
const dir = path.join(__dirname, '..', 'supabase', 'auth-templates');
fs.mkdirSync(dir, { recursive: true });
const rows = [];
for (const [file, name, subject, eyebrow, h1, copy, action] of T) {
  const body = `<p style="${EYEBROW}">${eyebrow}</p>\n<h1 style="${H1}">${h1}</h1>\n<p style="${P}">${copy}</p>\n${action}\n<p style="${SMALL};text-align:center">${/Token/.test(action) ? 'Type or paste it into the app.' : 'The link works once.'}</p>`;
  const footer = `You received this because a request was made for this address. ${ignore}<br>${TRADER}`;
  fs.writeFileSync(path.join(dir, file + '.html'), shell(subject, body, footer));
  rows.push(`| ${name} | \`${file}.html\` | ${subject} |`);
}
fs.writeFileSync(path.join(dir, 'README.md'), `# Supabase Auth e-mail templates (branded)

Generated by \`node tools/build_auth_templates.js\`. Same look as \`supabase/functions/send-auth-email\` (brand lockup, Night colours, tagline, FCA line). Tested by \`tests/test_auth_templates.js\`.

**These are not deployed from the repo.** Supabase keeps them in the dashboard, and sends them itself whenever the app's own sender (\`send-auth-email\`, via Resend) is not used, for example the built-in fallback in \`index.html\`. Until they are pasted in, those mails look like Supabase's defaults.

## To apply (owner, in a browser)
Supabase dashboard, project \`legpubblzgknxdtvsant\` > Authentication > Emails (Templates). For each row: set the subject, then paste the whole file into the message body.

| Supabase template | File | Subject |
|---|---|---|
${rows.join('\n')}

Then, in Authentication > Emails > SMTP settings, turn on custom SMTP with the Resend details, so these come from Vault-It and not from Supabase's shared sender.
`);
console.log('built', T.length, 'templates');
