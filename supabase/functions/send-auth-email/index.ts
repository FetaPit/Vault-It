import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL            = Deno.env.get('FROM_EMAIL') ?? 'Vault·It <onboarding@resend.dev>'
const APP_URL               = Deno.env.get('APP_URL') ?? 'https://fetapit.github.io/Vault-It/'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function emailHtml(magicLink: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to Vault·It</title>
</head>
<body style="margin:0;padding:0;background:#04090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04090f;padding:40px 20px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#060d16;border:1px solid rgba(68,192,185,.18);border-radius:16px;overflow:hidden;max-width:520px;width:100%">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#060d16,#0a1520);padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(68,192,185,.12)">
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:.12em;color:#c9a84c">VAULT·IT</div>
        <div style="font-size:10px;color:rgba(68,192,185,.7);letter-spacing:.18em;margin-top:4px">SECURE FINANCIAL INTELLIGENCE</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px">
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,.45);letter-spacing:.06em">YOUR SIGN-IN LINK</p>
        <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#f0f4f8;line-height:1.3">One tap to open your Vault</h1>
        <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,.6);line-height:1.6">
          Click the button below to sign in to <strong style="color:#e8edf2">${email}</strong>.<br>
          This link expires in <strong style="color:#44c0b9">60 minutes</strong> and can only be used once.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
          <tr><td style="background:linear-gradient(135deg,#c9a84c,#e0bb6a);border-radius:10px">
            <a href="${magicLink}" style="display:inline-block;padding:16px 40px;font-size:14px;font-weight:700;color:#04090f;text-decoration:none;letter-spacing:.08em">OPEN MY VAULT →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,.3);text-align:center">Or copy this link into your browser:</p>
        <p style="margin:0;font-size:11px;color:rgba(68,192,185,.5);text-align:center;word-break:break-all;font-family:monospace">${magicLink}</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 40px 28px;border-top:1px solid rgba(68,192,185,.08);text-align:center">
        <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,.2)">You received this because a sign-in was requested for this email address.</p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,.15)">If you didn't request this, you can safely ignore it. Your vault remains locked.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  if (!RESEND_API_KEY)       return err('RESEND_API_KEY secret not set', 500)
  if (!SUPABASE_SERVICE_KEY) return err('SUPABASE_SERVICE_ROLE_KEY not available', 500)

  let email: string
  try {
    const body = await req.json()
    email = (body.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) return err('Invalid email address')
  } catch {
    return err('Invalid request body')
  }

  // Generate magic link via Supabase admin API
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP_URL },
  })

  if (linkErr || !data?.properties?.action_link) {
    console.error('generateLink error:', linkErr)
    return err(linkErr?.message ?? 'Failed to generate sign-in link', 500)
  }

  const magicLink = data.properties.action_link

  // Send via Resend HTTP API
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: 'Sign in to Vault·It',
      html:    emailHtml(magicLink, email),
    }),
  })

  if (!resendRes.ok) {
    const resendErr = await resendRes.json().catch(() => ({}))
    console.error('Resend error:', resendErr)
    return err(`Email delivery failed: ${resendErr.message ?? resendRes.statusText}`, 502)
  }

  return ok({ success: true })
})
