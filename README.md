# HoopReel

HoopReel is an imaginary basketball product: it turns a full youth game recording into a 60-second personal highlight reel and a scouting profile. It exists to demo an end-to-end, zero-cost AI marketing system built on n8n.

This repo holds the landing page and the form endpoint. The marketing agents live in n8n.

## Structure

```
public/              static landing page (Hebrew, RTL), served by Cloudflare Pages
functions/api/       Cloudflare Pages Functions
  signup.js          POST /api/signup: validates the waitlist form, forwards it to n8n
```

## How a signup flows

1. A visitor submits the waitlist form on the landing page.
2. `functions/api/signup.js` validates it (name, email, lead type, consent, honeypot) and forwards it to the n8n lead-intake webhook. The n8n URL stays server-side.
3. n8n classifies and scores the lead with Gemini, stores it in Supabase, sends a personalized email through Gmail and posts hot leads to Slack.

## Deploy (Cloudflare Pages)

- Framework preset: None
- Build command: leave empty
- Build output directory: `public`
- Environment variables (Settings > Variables and Secrets):
  - `N8N_WEBHOOK_URL`: production URL of the n8n lead-intake webhook
  - `WEBHOOK_SECRET`: shared secret, checked by n8n against the `X-HoopReel-Secret` header

Until `N8N_WEBHOOK_URL` is set, the form answers that signups are not connected yet.

## Stack

Cloudflare Pages and Functions, n8n Cloud, Gemini API, Cloudflare Workers AI, Supabase, Slack and Gmail, all on free tiers.
