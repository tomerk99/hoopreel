// Cloudflare Pages Function: GET /blog/<slug>
// Renders one published post from Supabase.
import { supabaseConfigured, supabaseGet } from "../../lib/supabase.js";
import { POST_COLUMNS, SLUG, esc, renderMarkdown, formatDate, audienceLabel, page } from "../../lib/blog.js";

const notFound = () =>
  page({
    title: "הפוסט לא נמצא · HoopReel",
    description: "הפוסט לא נמצא.",
    status: 404,
    body: `    <article class="b-post">
      <h1>הפוסט לא נמצא</h1>
      <p><a href="/blog">לכל הפוסטים ←</a></p>
    </article>`,
  });

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || "").toLowerCase();
  if (!SLUG.test(slug) || !supabaseConfigured(env)) return notFound();

  const res = await supabaseGet(
    env,
    `content_drafts?select=${POST_COLUMNS}&channel=eq.blog&status=eq.published&slug=eq.${slug}&limit=1`,
  );
  if (!res.ok) return notFound();
  const [post] = await res.json();
  if (!post) return notFound();

  return page({
    title: `${post.title} · HoopReel`,
    description: post.excerpt || post.title,
    body: `    <article class="b-post">
      <a class="b-back" href="/blog">→ כל הפוסטים</a>
      <span class="b-meta">${esc(audienceLabel(post.audience))} · ${esc(formatDate(post.published_at))}</span>
      <h1>${esc(post.title)}</h1>
      <p class="b-lead">${esc(post.excerpt)}</p>
      <div class="b-body">
${renderMarkdown(post.body)}
      </div>
      <aside class="b-join">
        <h2>רוצים היילייטס מהמשחק הבא?</h2>
        <p>HoopReel הופך צילום של משחק לסרטון של 60 שניות ולפרופיל סקאוטינג.</p>
        <a class="b-cta" href="/#join">הצטרפו לרשימת ההמתנה</a>
      </aside>
    </article>`,
  });
}
