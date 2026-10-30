// Cloudflare Pages Function: POST /api/signup
// Validates the waitlist form and forwards it to the n8n lead-intake webhook,
// so the n8n URL never appears in the public site.
//
// Environment variables (Cloudflare Pages > Settings > Variables and Secrets):
//   N8N_WEBHOOK_URL  the production URL of the n8n "lead intake" webhook
//   WEBHOOK_SECRET   shared secret, sent as the X-HoopReel-Secret header

const TYPES = new Set(["parent", "player", "coach"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "בקשה לא תקינה" }, 400);
  }

  // Honeypot: real people never fill the hidden "website" field.
  if (data.website) return json({ ok: true });

  const name = String(data.name || "").trim().slice(0, 80);
  const email = String(data.email || "").trim().toLowerCase().slice(0, 120);
  const leadType = String(data.lead_type || "");

  if (!name || !EMAIL.test(email) || !TYPES.has(leadType)) {
    return json({ error: "נא למלא שם, מייל תקין ולבחור הורה, שחקן או מאמן." }, 422);
  }
  if (data.consent !== true) {
    return json({ error: "כדי להירשם צריך לאשר קבלת מיילים." }, 422);
  }

  if (!env.N8N_WEBHOOK_URL) {
    return json({ error: "ההרשמה עוד לא מחוברת. נסו שוב בקרוב." }, 503);
  }

  const res = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HoopReel-Secret": env.WEBHOOK_SECRET || "",
    },
    body: JSON.stringify({
      name,
      email,
      lead_type: leadType,
      source: String(data.source || "direct").slice(0, 100),
      submitted_at: new Date().toISOString(),
      country: request.cf?.country || null,
    }),
  });

  if (!res.ok) {
    return json({ error: "משהו השתבש, נסו שוב בעוד רגע." }, 502);
  }
  return json({ ok: true });
}

export const onRequest = () => json({ error: "Method not allowed" }, 405);
