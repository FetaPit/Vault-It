# Tester feedback (owner, 31 Oct 2026: the final task before tester launch)

Owner's words: "We need an optimal low effort and maximal utility method for each tester to send their feedback to us. What would be a tech AI enhanced way to do this making it easy for the user and giving us back end and user session activity."

Owner's decisions (31 Oct):
- Session activity: our own activity log in Supabase. No new outside service, no money figures.
- AI-sorted feedback reaches the owner as a daily email digest, plus a weekly themed report that the session turns into queue items.
- A screenshot is attached by default, with money figures hidden before it leaves the device; the tester can untick it.
- Build and test locally; ask the owner before applying the migration and deploying the functions.

## What the tester sees
- A Feedback button on every screen (brand chat icon, bottom right above the nav on phones). It opens one sheet: "What happened, or what would you change?" (text, up to 4,000 characters), an optional 1 to 5 rating, a ticked "Attach a picture of this screen (your figures are hidden)" box with a small preview, and Send.
- After key moments (first budget saved, a house builder level finished) a one-tap "How was that?" (1 to 5, optional comment), at most once per moment.
- Day 3 and day 14 of the trial: a gentle "Anything confusing so far?" nudge, once each.
- Settings: "Share how I use the app with the Vault-It team" (on by default during the beta, with a line on what it records). Off means no activity events are sent; feedback the tester chooses to send is still sent.

## What is attached automatically (never money figures)
App version, screen (tab and sub-tab), viewport and device type, theme, flags (house, nw), standalone (installed) or browser, online, sync state, the last 20 page errors, and a trail of the last 50 actions: `{t, ev, tab, el}` where `el` is a button's id or its short visible label (max 40 characters, digits and £ amounts removed).

## Activity log
Batched in memory, sent every 60 seconds and when the page is hidden (`fetch` with `keepalive`). Events: `session_start`, `session_end` (with duration), `tab` (tab/sub-tab opened, with time on the previous one), `feature` (named actions: budget saved, debt added, level done, 3D view, export ...), `error`. No values, no free text typed by the user.

## Server contract
`POST /functions/v1/tester-feedback`, `Authorization: Bearer <user access token>` (signed-in users only).
- `{kind:'feedback', text, rating|null, moment|null, screenshot|null, context}`: `text` 1 to 4,000 characters (or a rating alone for a moment prompt); `screenshot` a `data:image/jpeg;base64,` string up to 700 KB; `context` the object above (up to 32 KB). Reply `{ok:true, id}`.
- `{kind:'events', session, events:[{t, ev, tab, el, ms}]}`: up to 200 events per call, `session` a UUID. Reply `{ok:true, n}`.
- Errors: 400 bad body, 401 not signed in, 413 too large, 429 rate limited (20 feedback a day, 60 event batches an hour per user).
- After storing feedback, the function asks Claude (key already in Supabase secrets) to triage it: `{type: bug|confusion|idea|praise|other, severity: 1-4, area, summary (one line), steps (likely steps to reproduce from the trail)}`, stored with the row. Severity 4 (data loss, cannot sign in, money figures wrong) emails the owner straight away. If the AI call fails the row is kept untriaged and picked up by the digest.

`POST /functions/v1/feedback-digest` with header `x-digest-key: <FEEDBACK_DIGEST_KEY>` (server secret; called by pg_cron):
- `{mode:'daily'}`: emails the owner the last 24 hours of feedback (grouped by severity, each with summary, type, area, tester (first name or email), screen, link to view) and activity totals (active testers, sessions, median session length, most and least used screens, error count).
- `{mode:'weekly'}`: asks Claude to group the week's feedback and activity into themes ranked by frequency and severity, stores the report in `feedback_reports`, and emails it. The session reads the newest report (Supabase connector) and drafts queue items for the owner's yes.

## Data
Migration `012_tester_feedback.sql`: `tester_feedback` (id, user_id, created_at, text, rating, moment, screenshot, context jsonb, triage jsonb, triaged_at, status), `tester_events` (id, user_id, session_id, at, ev, tab, el, ms), `feedback_reports` (id, created_at, period, body jsonb). RLS on, no client policies (only the functions, with the service role, read or write). Indexes on created_at and user_id. Retention: events older than 120 days and feedback screenshots older than 180 days are deleted by the daily digest run.

Schedule (applied at deploy, not in the migration tests): `pg_cron` + `pg_net` call the digest at 07:41 UK time daily and Monday 07:47 weekly, with the key read from Vault.

## Privacy notice
Update "Our website and app contain no advertising trackers, pixels or analytics" to say: no advertising trackers, pixels or third-party analytics; during the beta the app records how it is used (screens opened, features used, errors, never figures) in our own database to improve it, and this can be switched off in Settings; feedback you send (with the picture of the screen, figures hidden, if you leave it ticked) is stored by us and read by Anthropic (Claude) to sort it.

## Tests
`test_012.mjs` (migration on pglite), `test_feedback_server.js` (function logic with stubs: auth, limits, sizes, triage parsing, severity-4 email, digest), `test_feedback_client.js` (button, sheet, screenshot with figures hidden, context has no figures, activity batching and the Settings switch, moment prompts once), `test_beta_client.js` (no new hosts).
