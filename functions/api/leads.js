// Cloudflare Pages Function: GET /api/leads
// Returns the waitlist for the dashboard. The password check lives in functions/_middleware.js.
//
// Environment variables (Cloudflare Pages > Settings > Variables and Secrets):
//   SUPABASE_URL          https://<project-ref>.supabase.co
//   SUPABASE_SECRET_KEY   Supabase secret (service_role) key, server-side only
//   DASHBOARD_PASSWORD    password for /dashboard

const COLUMNS = "id,created_at,name,email,lead_type,status,source,notes";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export async function onRequestGet({ env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return json({ error: "הדשבורד עוד לא מחובר ל־Supabase." }, 503);
  }

  const key = env.SUPABASE_SECRET_KEY;
  const headers = { apikey: key, Accept: "application/json" };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys must not.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/leads?select=${COLUMNS}&order=created_at.desc&limit=5000`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    return json({ error: "לא הצלחנו לקרוא את הלידים מ־Supabase." }, 502);
  }
  return json({ leads: await res.json(), fetched_at: new Date().toISOString() });
}

export const onRequest = () => json({ error: "Method not allowed" }, 405);
