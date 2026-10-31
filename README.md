# HoopReel

HoopReel is an imaginary basketball product: it turns a full youth game recording into a 60-second personal highlight reel and a scouting profile. It exists to demo an end-to-end, zero-cost AI marketing system built on n8n.

This repo holds the landing page and the form endpoint. The marketing agents live in n8n.

## Structure

```
public/              static landing page (Hebrew, RTL), served by Cloudflare Pages
  dashboard/         private leads dashboard at /dashboard
  blog.css           styles for the blog pages
functions/           Cloudflare Pages Functions
  _middleware.js     password-protects /dashboard and /api/leads (HTTP Basic Auth)
  api/signup.js      POST /api/signup: validates the waitlist form, forwards it to n8n
  api/leads.js       GET /api/leads: reads the waitlist from Supabase for the dashboard
  blog/index.js      GET /blog: published posts, newest first
  blog/[slug].js     GET /blog/<slug>: one published post
  dashboard/post/[id].js  GET /dashboard/post/<id>: private full preview of any draft
lib/auth.js          the password check used by the middleware
lib/supabase.js      server-side Supabase REST helper
lib/blog.js          markdown rendering and the blog page template
```

## How a signup flows

1. A visitor submits the waitlist form on the landing page.
2. `functions/api/signup.js` validates it (name, email, lead type, consent, honeypot) and forwards it to the n8n lead-intake webhook. The n8n URL stays server-side.
3. n8n stores the lead in Supabase, has Gemini write a personalized welcome email, sends it through Gmail, and posts every new lead to Slack.

## Leads dashboard

`/dashboard` shows totals, a 30-day signup chart and a searchable, filterable table with CSV export. The browser asks for a password (any username). Data comes from `/api/leads`, which reads Supabase server-side, so the Supabase key never reaches the browser.

## Blog

Posts are written by the n8n content factory (Gemini writer, Gemini critic, approval buttons in Slack #approvals) and stored in the Supabase table `content_drafts`. The blog pages read rows with `channel=blog` and `status=published` on every request (cached for 60 seconds), so approving a post in Slack publishes it without a deploy. The Slack approval message links to `/dashboard/post/<id>` for the full draft.

## Deploy (Cloudflare Pages)

- Framework preset: None
- Build command: leave empty
- Build output directory: `public`
- Environment variables (Settings > Variables and Secrets):
  - `N8N_WEBHOOK_URL`: production URL of the n8n lead-intake webhook
  - `WEBHOOK_SECRET`: shared secret, checked by n8n against the `X-HoopReel-Secret` header
  - `SUPABASE_URL`: `https://<project-ref>.supabase.co`
  - `SUPABASE_SECRET_KEY`: Supabase secret (service_role) key, as a Secret
  - `DASHBOARD_PASSWORD`: password for `/dashboard`, as a Secret

Until `N8N_WEBHOOK_URL` is set, the form answers that signups are not connected yet.

## Stack

Cloudflare Pages and Functions, n8n Cloud, Gemini API, Cloudflare Workers AI, Supabase, Slack and Gmail, all on free tiers.
