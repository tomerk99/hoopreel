// Cloudflare Pages Function: GET /blog
// Lists the published blog posts from Supabase, newest first.
import { supabaseConfigured, supabaseGet } from "../../lib/supabase.js";
import { POST_COLUMNS, esc, formatDate, audienceLabel, page } from "../../lib/blog.js";

export async function onRequestGet({ env }) {
  let posts = [];
  if (supabaseConfigured(env)) {
    const res = await supabaseGet(
      env,
      `content_drafts?select=${POST_COLUMNS}&channel=eq.blog&status=eq.published&slug=not.is.null&order=published_at.desc&limit=100`,
    );
    if (res.ok) posts = await res.json();
  }

  const cards = posts
    .map(
      (p) => `    <a class="b-card" href="/blog/${esc(p.slug)}">
      <span class="b-meta">${esc(audienceLabel(p.audience))} · ${esc(formatDate(p.published_at))}</span>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.excerpt)}</p>
      <span class="b-more">לקריאה ←</span>
    </a>`,
    )
    .join("\n");

  return page({
    title: "הבלוג של HoopReel",
    description: "טיפים לשחקנים, להורים ולמאמנים: היילייטס, סקאוטינג והתפתחות בכדורסל נוער.",
    body: `    <section class="b-hero">
      <p class="b-kicker">הבלוג</p>
      <h1>כדורסל נוער, מהיציע ועד הסקאוט</h1>
      <p>טיפים לשחקנים, להורים ולמאמנים.</p>
    </section>
    <section class="b-grid">
${cards || '    <p class="b-empty">הפוסט הראשון בדרך.</p>'}
    </section>`,
  });
}
