// Runs before every request. Guards the leads dashboard and its data API with a password
// and keeps them out of search engines and caches.
import { requireAuth } from "../lib/auth.js";

const PRIVATE = [/^\/dashboard(\/|$)/, /^\/api\/leads$/];

export async function onRequest({ request, env, next }) {
  const { pathname } = new URL(request.url);
  if (!PRIVATE.some((re) => re.test(pathname))) return next();

  const denied = requireAuth(request, env);
  if (denied) return denied;

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "no-store");
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
