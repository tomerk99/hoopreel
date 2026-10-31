// Server-side Supabase REST helper for Pages Functions. The secret key never reaches the browser.
//
// Environment variables: SUPABASE_URL, SUPABASE_SECRET_KEY

export function supabaseConfigured(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

// GET /rest/v1/<path>, e.g. "leads?select=id&limit=10". Returns the fetch Response.
export function supabaseGet(env, path) {
  const key = env.SUPABASE_SECRET_KEY;
  const headers = { apikey: key, Accept: "application/json" };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys must not.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, { headers });
}
