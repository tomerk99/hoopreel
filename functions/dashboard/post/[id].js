// Cloudflare Pages Function: GET /dashboard/post/<id>
// Full preview of any draft (pending, rejected or published), so a post can be read on the phone
// before approving it in Slack. The password check lives in functions/_middleware.js.
import { supabaseConfigured, supabaseGet } from "../../../lib/supabase.js";
import { esc, renderMarkdown, formatDate, audienceLabel, page } from "../../../lib/blog.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUS = { pending: "ממתין לאישור", approved: "אושר", rejected: "נדחה", published: "פורסם" };

export async function onRequestGet({ params, env }) {
  const id = String(params.id || "").toLowerCase();
  let post = null;
  if (UUID.test(id) && supabaseConfigured(env)) {
    const res = await supabaseGet(
      env,
      `content_drafts?select=id,created_at,slug,title,excerpt,body,audience,status,critic_notes,owner_notes,published_at&id=eq.${id}&limit=1`,
    );
    if (res.ok) [post] = await res.json();
  }

  if (!post) {
    return page({
      title: "טיוטה לא נמצאה · HoopReel",
      description: "",
      status: 404,
      body: `    <article class="b-post"><h1>הטיוטה לא נמצאה</h1></article>`,
    });
  }

  const live = post.status === "published" && post.slug
    ? ` · <a href="/blog/${esc(post.slug)}">לפוסט באתר</a>` : "";
  return page({
    title: `טיוטה: ${post.title} · HoopReel`,
    description: post.excerpt || "",
    body: `    <article class="b-post">
      <div class="b-draft">
        <b>${esc(STATUS[post.status] || post.status)}</b>${live}
        ${post.owner_notes ? `<details open><summary>ההערות שלך</summary>${renderMarkdown(post.owner_notes)}</details>` : ""}
        ${post.critic_notes ? `<details><summary>הערות המבקר</summary>${renderMarkdown(post.critic_notes)}</details>` : ""}
      </div>
      <span class="b-meta">${esc(audienceLabel(post.audience))} · ${esc(formatDate(post.published_at || post.created_at))}</span>
      <h1>${esc(post.title)}</h1>
      <p class="b-lead">${esc(post.excerpt)}</p>
      <div class="b-body">
${renderMarkdown(post.body)}
      </div>
    </article>`,
  });
}
