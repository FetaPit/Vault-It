# Signatures and addresses: setup

Three signatures, each with its own animated footer. Images and copy-ready pages are served from https://media.vault-it.co (Worker `vault-it-email-media`, see `../email-media/README.md`).

| Address | Signature page (open, copy, paste) | Footer |
|---|---|---|
| ptlived@gmail.com, pete@ptlive.design | https://media.vault-it.co/sig/founder-signature | Vault-It and PT Live Design |
| pete@vault-it.co | https://media.vault-it.co/sig/vault-it-founder-signature | Vault-It, "From the founder" |
| hello@vault-it.co | https://media.vault-it.co/sig/hello-signature | Vault-It, "The Vault-It team" |

## State (4 Nov 2026)

- **ptlived@gmail.com**: done. Signature "Founder (PT Live Design and Vault-It)" is the default for new e-mails and replies.
- **pete@vault-it.co**: created as a Cloudflare Email Routing address. Mail to it lands in ptlived@gmail.com, like hello@vault-it.co. Sending from it is set up below.
- **pete@ptlive.design**: runs on Google Workspace (ptlive.design MX is Google). Add the signature with the steps below.

## Add a signature to any Gmail or Google Workspace account

In Chrome, signed in to that account:

1. Open the signature page for the address (table above).
2. Press Ctrl+A, then Ctrl+C.
3. In Gmail: the gear, then **See all settings**, then the **General** tab, then **Signature**, then **Create new**. Name it, for example "Founder".
4. Click in the empty signature box and press Ctrl+V. The dark card, photo and footer appear.
5. Under **Signature defaults**, choose it for new e-mails and for replies. If the account sends from more than one address, Gmail shows an address list above the defaults: pick the address first.
6. Scroll to the bottom and click **Save Changes**.

For pete@ptlive.design, do this signed in as pete@ptlive.design (or ask Claude to do it in Chrome once you are signed in there).

## Send from pete@vault-it.co and hello@vault-it.co

Receiving already works. To reply as these addresses, pick one of these:

### Option A: today, in ptlived@gmail.com (free, 10 minutes)

1. Your Google account needs 2-Step Verification. Then open https://myaccount.google.com/apppasswords, create one called "Vault-It send as" and keep the 16 letters it shows.
2. Gmail settings, **Accounts and Import**, **Send mail as**, **Add another email address**.
3. Name `Pete Thickett`, address `pete@vault-it.co`, leave "Treat as an alias" ticked, **Next step**.
4. SMTP server `smtp.gmail.com`, port `587`, username `ptlived@gmail.com`, password: the 16 letters, TLS. **Add account**.
5. Gmail sends a confirmation to pete@vault-it.co. It arrives in this same inbox: click the link.
6. Repeat for `hello@vault-it.co` with the name `Vault-It`.
7. Add the matching signature for each address (steps above, choosing the address in step 5).

Catch: mail goes out through gmail.com, so some recipients see "via gmail.com" and it is more likely to land in spam than option B.

### Option B: a proper mailbox through your Google Workspace (recommended for pete@vault-it.co)

1. In the Workspace admin console (admin.google.com, signed in as the ptlive.design admin): **Account**, **Domains**, **Manage domains**, **Add a domain**, enter `vault-it.co` as a **secondary domain**.
2. Google shows a TXT record to prove you own it. Claude adds it to Cloudflare DNS.
3. Turn on DKIM for vault-it.co in Workspace (**Apps**, **Gmail**, **Authenticate email**) and Claude adds that TXT record too, plus `include:_spf.google.com` in the vault-it.co SPF record.
4. Give pete@ptlive.design the alias `pete@vault-it.co` (**Users**, Pete, **Alternate email addresses**). Free: no extra licence.
5. Claude points the Cloudflare forward for pete@vault-it.co at pete@ptlive.design. The MX records stay on Cloudflare, so hello@vault-it.co keeps working as it does.
6. In pete@ptlive.design's Gmail, **Accounts**, **Send mail as**: pete@vault-it.co appears (or add it with no SMTP step). Add the Vault-It founder signature for it.

Mail then leaves through Google signed for vault-it.co, which recipients' spam filters trust.
