// Builds docs/marketing/welcome-email.html and newsletter-template.html in the shared e-mail look
// (same shell as supabase/functions/send-auth-email). Draft only: nothing here sends anything.
const fs = require('fs'), path = require('path');
const EYEBROW = "margin:0 0 8px;font-family:'Share Tech Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#44C0B9";
const H1 = "margin:0 0 14px;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;line-height:1.25;color:#E8E8E8";
const H2 = "margin:22px 0 8px;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:1.3;color:#E8E8E8";
const P = "margin:0 0 16px;font-size:15px;line-height:1.6;color:#9AA0A6";
const SMALL = "margin:0 0 8px;font-size:12px;line-height:1.6;color:#9AA0A6";
const BTN = "display:inline-block;background:#E8C56A;color:#1A1400;text-decoration:none;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:15px 24px;border-radius:12px";
const BOX = "margin:0 0 16px;padding:14px 16px;background:#080808;border:1px solid #15302F;border-radius:12px";
const TODO = "background:#3a2f0a;color:#E8C56A;padding:1px 5px;border-radius:4px";
const strong = t => `<strong style="color:#E8E8E8">${t}</strong>`;
const a = (h, t) => `<a href="${h}" style="color:#44C0B9">${t}</a>`;
const todo = t => `<span style="${TODO}">[PETE TO CONFIRM: ${t}]</span>`;
const TRADER = 'Vault-It is run by PT Live Design, A57, 11 St Mary&#39;s Street, Lincoln LN5 7EQ · ' + a('mailto:hello@vault-it.co', 'hello@vault-it.co');
function shell(title, pre, body, footer) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#080808;color:#E8E8E8;font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#080808">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:18px;max-width:560px;width:100%">
<tr><td style="padding:28px 36px 18px;border-bottom:1px solid #102221">
<img src="https://vault-it.co/email/lockup.png" width="190" alt="Vault-It" style="display:block;border:0;outline:none;height:auto;width:190px;max-width:100%;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;color:#E8E8E8">
<div style="margin-top:8px;font-size:12px;letter-spacing:.04em;color:#9AA0A6">Get out of the red and into your home.</div>
</td></tr>
<tr><td style="padding:26px 36px 10px">${body}</td></tr>
<tr><td style="padding:16px 36px 26px;border-top:1px solid #102221">
<p style="margin:0 0 8px;font-size:12px;color:#E8E8E8">Not regulated by the FCA. Not financial advice.</p>
<p style="margin:0;font-size:11px;line-height:1.6;color:#9AA0A6">${footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}
const UNSUB = '{{unsubscribe_url}}';
const footer = `You are getting this because you joined the Vault-It list and confirmed your address.<br><a href="${UNSUB}" style="display:inline-block;padding:12px 0;color:#44C0B9">Unsubscribe in one click</a><br>${TRADER}`;

const cta = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td><a href="https://app.vault-it.co" style="${BTN}">Open Vault-It</a></td></tr></table>`;
const welcomeBody = `<p style="${EYEBROW}">Welcome</p>
<h1 style="${H1}">Why Vault-It exists</h1>
<p style="${P}">Hi {{first_name|there}},</p>
<p style="${P}">Thanks for joining. I&#39;m Pete, the person behind Vault-It.</p>
<h2 style="${H2}">The story</h2>
<p style="${P}">I could not see where my contributions were going, or what value I actually owned. I looked for a whole strategy for building wealth and could not find one. So I made one.</p>
<p style="${P}">I wanted to see what I was working towards, and exactly how much I needed to put in to lay one more brick, with real visual feedback.</p>
<h2 style="${H2}">What it is for</h2>
<p style="${P}">Vault-It puts your debts, savings and house deposit on one map. You type in your own figures, and we never ask for your bank login. Every pound you save lays a brick on your house. What you owe sits below the ground, so being in debt is a starting line, not a failure screen. The aim: give anyone, even someone in debt, a live date for when they will hold the keys to their own home.</p>
${cta}
<h2 style="${H2}">Who is behind it</h2>
<p style="${P}">I run PT Live Design in Lincoln, where I have worked on branding and design since 2019. I have been a multimedia designer, including producing training resources for the Royal Air Force Officer Training Academy at Cranwell. I hold a Certified Professional in Psychology of Design from the London School of International Business, and I am a local leader for the Interaction Design Foundation. ${todo('taken only from your LinkedIn. Approve, trim, or add anything else. The landing page says "UK developer", which your profile does not.')}</p>
<p style="${P}">Once a week I will send a short note: what is new, what I fixed, what got better. Reply to this e-mail any time. I read every reply.</p>
<p style="${P}">Thanks,<br>Pete</p>`;

// Day 3 e-mail: the research, kept out of the welcome so the welcome stays short
const researchBody = `<p style="${EYEBROW}">Day 3 · The research</p>
<h1 style="${H1}">If money admin and your brain do not get on</h1>
<p style="${P}">Hi {{first_name|there}},</p>
<p style="${P}">Some people find money admin harder than others, and some of that is how attention and time work. Here is what the research says, and what it does not.</p>
<div style="${BOX}">
<p style="${SMALL};color:#E8E8E8">${strong('Money and ADHD.')} Studies link ADHD with more money difficulty. A Swedish registry study found more overdrafts and unpaid bills in adults with ADHD [1]. A smaller study of 45 adults with ADHD and 51 without found less saving and lower scores on financial tests [2]. These are links, not proof of cause.</p>
<p style="${SMALL};color:#E8E8E8">${strong('Time.')} In children and teenagers with ADHD, a review of 27 studies found time is judged less accurately [3]. I have not found the same review for adults, so I will not claim it. If &quot;later&quot; feels vague, a saving goal is hard to hold on to. Vault-It tries to make later concrete with a date and a house you can see.</p>
<p style="${SMALL};margin:0;color:#E8E8E8">${strong('Seeing the future.')} In lab tasks, people shown a realistic picture of their older self put more aside [4]. That work was not about ADHD, and later replications were mixed.</p>
</div>
<p style="${P}">Vault-It is not a treatment and not a diagnosis tool. I cannot promise it will help you. I would like to find out with you whether it does.</p>
${cta}
<p style="${P}">Thanks,<br>Pete</p>
<p style="${SMALL};margin-top:18px;border-top:1px solid #102221;padding-top:14px;color:#E8E8E8">References</p>
<p style="${SMALL}">[1] Beauchaine, T. P., Ben-David, I. and Bos, M. (2020). ${a('https://doi.org/10.1126/sciadv.aba1551', 'ADHD, financial distress, and suicide in adulthood: a population study')}. Science Advances, 6(40).<br>
[2] Bangma, D. F. and others (2019). ${a('https://doi.org/10.1037/neu0000571', 'Financial decision-making in adults with ADHD')}. Neuropsychology, 33(8), 1065-1077.<br>
[3] Zheng, Q., Wang, X., Chiu, K. Y. and Shum, K. K. (2020). ${a('https://doi.org/10.1177/1087054720978557', 'Time perception deficits in children and adolescents with ADHD: a meta-analysis')}. Journal of Attention Disorders.<br>
[4] Hershfield, H. E. and others (2011). ${a('https://pages.stern.nyu.edu/~hhershfi/resources/Research/JMR-D-ce.pdf', 'Increasing saving behavior through age-progressed renderings of the future self')}. Journal of Marketing Research, 48(SPL), S23-S37.</p>`;

const li = t => `<li style="margin:0 0 6px">${t}</li>`;
const ul = items => `<ul style="${P};padding-left:20px">${items.map(li).join('')}</ul>`;
const newsBody = `<p style="${EYEBROW}">Vault-It weekly · {{week_of}}</p>
<h1 style="${H1}">{{headline: the one thing that matters most this week, one line}}</h1>
<p style="${P}">Hi {{first_name|there}}, {{one or two sentences on the week, in plain words.}}</p>

<h2 style="${H2}">New</h2>
${ul(['{{Feature: what you can now do, in one line. Say where to find it.}}', '{{Feature: ...}}'])}
<h2 style="${H2}">Fixed</h2>
${ul(['{{Bug: what used to go wrong, now fixed. Thank the tester if they agree to be named.}}'])}
<h2 style="${H2}">Better</h2>
${ul(['{{Improvement: what is quicker, clearer or easier.}}'])}
<h2 style="${H2}">Coming up</h2>
<p style="${P}">{{One or two items from the queue, no dates promised.}}</p>
<h2 style="${H2}">One ask</h2>
<p style="${P}">{{A single question or request. Reply to this e-mail. I read every reply.}}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td><a href="https://app.vault-it.co" style="${BTN}">Open Vault-It</a></td></tr></table>
<p style="${P}">Thanks,<br>Pete</p>`;

const out = __dirname;
fs.writeFileSync(path.join(out, 'welcome-email.html'), shell('Why Vault-It exists', 'Why Vault-It exists, and what happens next.', welcomeBody, footer));
fs.writeFileSync(path.join(out, 'newsletter-template.html'), shell('Vault-It weekly', '{{preheader: one line}}', newsBody, footer));
fs.writeFileSync(path.join(out, 'research-email.html'), shell('If money admin and your brain do not get on', 'What the research says about money, attention and time, and what it does not.', researchBody, footer));
console.log('built');
