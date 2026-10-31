// Blog rendering for Pages Functions: posts live in Supabase (content_drafts, channel=blog,
// status=published) and are turned into HTML on each request, so a new post needs no deploy.

export const POST_COLUMNS = "slug,title,excerpt,body,audience,published_at";
export const SLUG = /^[a-z0-9][a-z0-9-]{1,79}$/;

const AUDIENCE = { parent: "להורים", player: "לשחקנים", coach: "למאמנים", general: "לכולם" };

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Inline markdown on already-escaped text: **bold** and *italic*.
const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");

// Minimal markdown: ## and ### headings, - and 1. lists, > quotes, paragraphs. Raw HTML is escaped.
export function renderMarkdown(md) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of esc(md).split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara(); flushList();
      const level = Math.max(2, m[1].length); // the page title is the only h1
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^(?:[-*•]|(\d+)[.)])\s+(.*)$/))) {
      flushPara();
      const tag = m[1] ? "ol" : "ul";
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[2]);
    } else if ((m = line.match(/^&gt;\s?(.*)$/))) {
      flushPara(); flushList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return out.join("\n");
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });

export const audienceLabel = (a) => AUDIENCE[a] || AUDIENCE.general;

export function page({ title, description, body, status = 200 }) {
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta name="theme-color" content="#0a0a0c">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏀</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/blog.css">
</head>
<body>
  <header class="b-nav">
    <a class="b-logo" href="/">Hoop<b>Reel</b></a>
    <a class="b-link" href="/blog">הבלוג</a>
    <a class="b-cta" href="/#join">גישה מוקדמת</a>
  </header>
  <main class="b-main">
${body}
  </main>
  <footer class="b-foot">
    <p>HoopReel הוא מוצר דמיוני שנבנה כפרויקט הדגמה של שיווק אוטומטי עם סוכני AI. הפוסטים נכתבים על ידי סוכן AI ומאושרים ידנית.</p>
  </footer>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
}
