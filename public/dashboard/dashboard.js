const TYPES = {
  parent: { label: "הורה", plural: "הורים", color: "var(--parent)" },
  player: { label: "שחקן", plural: "שחקנים", color: "var(--player)" },
  coach: { label: "מאמן", plural: "מאמנים", color: "var(--coach)" },
};
const STATUSES = {
  new: { label: "חדש", color: "var(--accent-2)" },
  emailed: { label: "נשלח מייל", color: "var(--good)" },
  hot: { label: "נשלח מייל", color: "var(--good)" }, // older rows, from when leads were scored
  unsubscribed: { label: "הוסר", color: "var(--bad)" },
};
const TZ = "Asia/Jerusalem";
const DAY = 86400000;

const $ = (id) => document.getElementById(id);
const state = { leads: [], type: "", status: "", query: "", newestFirst: true };

const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const fmtDate = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtShort = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, day: "numeric", month: "numeric" });
const country = (notes) => (notes || "").split("|")[0].trim().toUpperCase();
const flag = (cc) => /^[A-Z]{2}$/.test(cc) ? cc : "–";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function load() {
  $("updated").textContent = "טוען…";
  try {
    const res = await fetch("/api/leads", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "שגיאה בטעינת הלידים");
    state.leads = body.leads.map((l) => ({ ...l, at: new Date(l.created_at) }));
    $("alert").hidden = true;
    $("updated").textContent = "עודכן " + new Intl.DateTimeFormat("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date());
    render();
  } catch (err) {
    $("alert").textContent = err.message;
    $("alert").hidden = false;
    $("updated").textContent = "";
  }
}

function renderKpis() {
  const now = Date.now();
  const today = dayKey(new Date());
  const inRange = (from, to) => state.leads.filter((l) => l.at >= from && l.at < to).length;
  const week = inRange(now - 7 * DAY, now + DAY);
  const prevWeek = inRange(now - 14 * DAY, now - 7 * DAY);

  $("kTotal").textContent = state.leads.length;
  $("kToday").textContent = state.leads.filter((l) => dayKey(l.at) === today).length;
  $("kWeek").textContent = week;
  const delta = week - prevWeek;
  $("kWeekDelta").textContent = prevWeek || week ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} לעומת השבוע הקודם` : "";
  $("kWeekDelta").className = delta > 0 ? "up" : delta < 0 ? "down" : "";

  const total = state.leads.length || 1;
  const counts = Object.keys(TYPES).map((t) => [t, state.leads.filter((l) => l.lead_type === t).length]);
  $("mixBar").innerHTML = counts.map(([t, n]) => `<i style="width:${(n / total) * 100}%;background:${TYPES[t].color}" title="${TYPES[t].plural}: ${n}"></i>`).join("");
  $("mixLegend").innerHTML = counts.map(([t, n]) => `<li style="--c:${TYPES[t].color}">${TYPES[t].plural} <b>${n}</b></li>`).join("");
}

function renderChart() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    days.push({ key: dayKey(d), label: fmtShort.format(d), n: 0 });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const l of state.leads) {
    const d = byKey[dayKey(l.at)];
    if (d) d.n++;
  }
  const W = Math.max(280, $("chart").clientWidth), H = 180, top = 14, bottom = 24, gap = W < 500 ? 2 : 4;
  const max = Math.max(4, ...days.map((d) => d.n));
  const bw = W / days.length - gap;
  const y = (n) => H - bottom - (n / max) * (H - top - bottom);
  // Oldest day on the right, to read naturally in Hebrew.
  const x = (i) => W - (i + 1) * (bw + gap) + gap / 2;
  const grid = [0, Math.round(max / 2), max].map((n) => `<line class="grid" x1="0" x2="${W}" y1="${y(n)}" y2="${y(n)}"/><text x="${W}" y="${y(n) - 3}" text-anchor="end">${n}</text>`);
  const bars = days.map((d, i) => {
    const h = Math.max(2, H - bottom - y(d.n));
    const every = W < 500 ? 7 : 5;
    const label = i % every === 0 || (i === days.length - 1 && i % every > 2) ? `<text x="${x(i) + bw / 2}" y="${H - 6}" text-anchor="middle">${d.label}</text>` : "";
    return `<rect class="col${d.n ? "" : " zero"}" x="${x(i)}" y="${H - bottom - h}" width="${bw}" height="${h}" rx="3"><title>${d.label}: ${d.n} נרשמים</title></rect>${label}`;
  });
  $("chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" >${grid.join("")}${bars.join("")}</svg>`;
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  return state.leads
    .filter((l) => !state.type || l.lead_type === state.type)
    .filter((l) => !state.status || l.status === state.status || (state.status === "emailed" && l.status === "hot"))
    .filter((l) => !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q))
    .sort((a, b) => (state.newestFirst ? b.at - a.at : a.at - b.at));
}

function renderTable() {
  const rows = filtered();
  $("shown").textContent = rows.length === state.leads.length ? `(${rows.length})` : `(${rows.length} מתוך ${state.leads.length})`;
  $("empty").hidden = rows.length > 0;
  $("rows").innerHTML = rows.map((l) => {
    const t = TYPES[l.lead_type] || { label: l.lead_type, color: "var(--muted)" };
    const s = STATUSES[l.status] || { label: l.status, color: "var(--muted)" };
    return `<tr>
      <td class="name">${esc(l.name)}</td>
      <td class="email"><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></td>
      <td><span class="badge" style="--c:${t.color}">${esc(t.label)}</span></td>
      <td><span class="status" style="--c:${s.color}">${esc(s.label)}</span></td>
      <td class="src">${esc(l.source || "–")}</td>
      <td class="country">${flag(country(l.notes))}</td>
      <td class="date">${fmtDate.format(l.at)}</td>
    </tr>`;
  }).join("");
}

function render() {
  renderKpis();
  renderChart();
  renderTable();
}

function exportCsv() {
  const head = ["שם", "מייל", "סוג", "סטטוס", "מקור", "מדינה", "תאריך הרשמה"];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = filtered().map((l) => [l.name, l.email, TYPES[l.lead_type]?.label || l.lead_type, STATUSES[l.status]?.label || l.status, l.source, country(l.notes), fmtDate.format(l.at)].map(cell).join(","));
  // The BOM makes Excel open the Hebrew correctly.
  const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `hoopreel-leads-${dayKey(new Date())}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}

document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === chip));
  state.type = chip.dataset.type;
  renderTable();
}));
$("status").addEventListener("change", (e) => { state.status = e.target.value; renderTable(); });
$("search").addEventListener("input", (e) => { state.query = e.target.value; renderTable(); });
$("sort").addEventListener("click", () => {
  state.newestFirst = !state.newestFirst;
  $("sortDir").textContent = state.newestFirst ? "↓" : "↑";
  renderTable();
});
$("refresh").addEventListener("click", load);
$("export").addEventListener("click", exportCsv);
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => state.leads.length && renderChart(), 150); });
setInterval(() => { if (!document.hidden) load(); }, 60000);
load();
