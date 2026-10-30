// Shared HTTP Basic Auth check for the private parts of the site.
// Any username works; the password must equal env.DASHBOARD_PASSWORD.

const REALM = 'Basic realm="HoopReel Dashboard", charset="UTF-8"';

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Returns null when the request is allowed, or the Response to send back.
export function requireAuth(request, env) {
  if (!env.DASHBOARD_PASSWORD) {
    return new Response("הדשבורד עוד לא הוגדר: חסר DASHBOARD_PASSWORD.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    } catch {
      decoded = "";
    }
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (decoded.includes(":") && safeEqual(password, env.DASHBOARD_PASSWORD)) return null;
  }
  return new Response("נדרשת סיסמה.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "Content-Type": "text/plain; charset=utf-8" },
  });
}
