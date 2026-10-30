const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- nav background on scroll ---------- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- reveal on scroll ---------- */
const revealTargets = document.querySelectorAll(".section-head, .player, .split-copy, .scout, .g, .steps li, .who-panels, .faq details, .join-copy, .form");
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  revealTargets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    io.observe(el);
  });
}

/* ---------- audience tabs ---------- */
const tabs = [...document.querySelectorAll(".who-tab")];
function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.classList.toggle("is-on", on);
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    panel.hidden = !on;
    panel.classList.toggle("is-on", on);
  }
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

/* ---------- demo: simulated AI tracking ---------- */
const SVG = "http://www.w3.org/2000/svg";
const LOOP = 9; // seconds
const HOOP = { x: 132, y: 450 };
const SHOT_AT = 4.8;
const MADE_AT = 6.0;

// [time, x, y] keyframes; the star is jersey #7.
const star = [[0, 1120, 660], [1.6, 940, 560], [3.0, 760, 640], [4.4, 650, 650], [7.2, 650, 650], [9, 1120, 660]];

const teammates = [
  { n: 4, base: [980, 260], amp: [70, 40], speed: 0.7 },
  { n: 11, base: [560, 300], amp: [50, 60], speed: 0.9 },
  { n: 23, base: [360, 720], amp: [60, 30], speed: 0.6 },
  { n: 9, base: [300, 300], amp: [40, 50], speed: 1.1 },
];
const defenders = [
  { n: 5, base: [600, 580], amp: [40, 30], speed: 1.0, guard: true },
  { n: 12, base: [880, 300], amp: [60, 40], speed: 0.8 },
  { n: 30, base: [470, 360], amp: [40, 40], speed: 0.9 },
  { n: 8, base: [300, 640], amp: [40, 40], speed: 0.7 },
  { n: 15, base: [230, 430], amp: [30, 50], speed: 1.2 },
];

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
function along(frames, t) {
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, x0, y0] = frames[i];
    const [t1, x1, y1] = frames[i + 1];
    if (t >= t0 && t <= t1) {
      const k = ease((t - t0) / (t1 - t0 || 1));
      return [lerp(x0, x1, k), lerp(y0, y1, k)];
    }
  }
  const last = frames.at(-1);
  return [last[1], last[2]];
}

function makePlayer(group, n, fill, ink, r = 34) {
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("class", "pl");
  const c = document.createElementNS(SVG, "circle");
  c.setAttribute("r", r);
  c.setAttribute("fill", fill);
  const t = document.createElementNS(SVG, "text");
  t.setAttribute("fill", ink);
  t.textContent = n;
  g.append(c, t);
  group.append(g);
  return g;
}

const player = document.getElementById("player");
if (player) {
  const layer = document.getElementById("players");
  const ball = document.getElementById("ball");
  const trackBox = document.getElementById("trackBox");
  const trackTag = document.getElementById("trackTag");
  const arc = document.getElementById("shotArc");
  const burst = document.getElementById("burst");
  const events = document.getElementById("events");
  const progress = document.getElementById("progress");
  const clock = document.getElementById("clock");
  const scoreA = document.getElementById("scoreA");

  const mates = teammates.map((p) => ({ ...p, el: makePlayer(layer, p.n, "#f5f5f4", "#111") }));
  const defs = defenders.map((p) => ({ ...p, el: makePlayer(layer, p.n, "#1e3a8a", "#fff") }));
  const starEl = makePlayer(layer, 7, "#f5f5f4", "#111", 38);

  let shotFrom = [650, 610];
  let fired = new Set();

  function toast(icon, text, stamp) {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `<span>${icon}</span><b>${text}</b><small>${stamp}</small>`;
    events.prepend(div);
    while (events.children.length > 3) events.lastChild.remove();
    setTimeout(() => div.classList.add("out"), 3200);
    setTimeout(() => div.remove(), 3700);
  }

  function frame(t) {
    const [sx, sy] = along(star, t);
    starEl.setAttribute("transform", `translate(${sx} ${sy})`);
    trackBox.setAttribute("x", sx - 60);
    trackBox.setAttribute("y", sy - 80);
    trackTag.setAttribute("transform", `translate(${sx - 75} ${sy - 80})`);

    for (const p of mates) {
      const x = p.base[0] + Math.sin(t * p.speed * 1.4 + p.n) * p.amp[0];
      const y = p.base[1] + Math.cos(t * p.speed + p.n) * p.amp[1];
      p.el.setAttribute("transform", `translate(${x} ${y})`);
    }
    for (const p of defs) {
      let x = p.base[0] + Math.sin(t * p.speed + p.n) * p.amp[0];
      let y = p.base[1] + Math.cos(t * p.speed * 1.2 + p.n) * p.amp[1];
      if (p.guard) { x = lerp(x, sx - 90, 0.75); y = lerp(y, sy - 30, 0.75); }
      p.el.setAttribute("transform", `translate(${x} ${y})`);
    }

    // Ball: dribble with #7, fly to the hoop, drop, then hide until the loop restarts.
    let bx, by, bo = 1;
    if (t < SHOT_AT) {
      shotFrom = [sx + 20, sy - 50];
      bx = sx + 34;
      by = sy + 10 - Math.abs(Math.sin(t * 9)) * 34;
      arc.setAttribute("opacity", 0);
    } else if (t < MADE_AT) {
      const k = (t - SHOT_AT) / (MADE_AT - SHOT_AT);
      const cx = (shotFrom[0] + HOOP.x) / 2, cy = 40;
      bx = (1 - k) ** 2 * shotFrom[0] + 2 * (1 - k) * k * cx + k * k * HOOP.x;
      by = (1 - k) ** 2 * shotFrom[1] + 2 * (1 - k) * k * cy + k * k * HOOP.y;
      arc.setAttribute("d", `M${shotFrom[0]} ${shotFrom[1]} Q${cx} ${cy} ${HOOP.x} ${HOOP.y}`);
      arc.setAttribute("opacity", 1);
    } else if (t < 7) {
      const k = Math.min((t - MADE_AT) / 0.6, 1);
      bx = HOOP.x + 10;
      by = HOOP.y + k * 90;
      bo = 1 - Math.max(0, (t - 6.4) / 0.6);
      arc.setAttribute("opacity", Math.max(0, 1 - (t - MADE_AT) * 2));
    } else {
      bx = sx; by = sy; bo = t > 8.6 ? (t - 8.6) / 0.4 : 0;
      arc.setAttribute("opacity", 0);
    }
    ball.setAttribute("cx", bx);
    ball.setAttribute("cy", by);
    ball.setAttribute("opacity", bo);

    const bk = t >= MADE_AT && t < MADE_AT + 1.2 ? (t - MADE_AT) / 1.2 : -1;
    burst.setAttribute("opacity", bk < 0 ? 0 : 1 - bk);
    burst.querySelector("circle").setAttribute("r", bk < 0 ? 40 : 40 + bk * 90);

    progress.style.width = `${(t / LOOP) * 100}%`;
    const secs = Math.max(0, 252 - Math.floor(t * 3));
    clock.textContent = `Q3 0${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  }

  function events_at(t) {
    const fire = (key, at, fn) => { if (t >= at && !fired.has(key)) { fired.add(key); fn(); } };
    fire("id", 0.6, () => toast("🎯", "שחקן #7 זוהה · 98%", "Q3 04:10"));
    fire("drive", 2.4, () => toast("⚡", "חדירה מהאגף", "Q3 04:05"));
    fire("shot", SHOT_AT, () => toast("🏀", "זריקה מ־7.4 מ׳", "Q3 03:58"));
    fire("made", MADE_AT, () => {
      toast("🔥", "שלשה! נוסף להיילייטס", "Q3 03:57");
      scoreA.textContent = "54";
      scoreA.classList.remove("bump");
      void scoreA.offsetWidth;
      scoreA.classList.add("bump");
    });
  }

  if (reduceMotion) {
    frame(5.3);
    scoreA.textContent = "54";
    toast("🔥", "שלשה! נוסף להיילייטס", "Q3 03:57");
  } else {
    let start = null, running = false, raf = 0, lastLoop = -1;
    const tick = (now) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      const loop = Math.floor(elapsed / LOOP);
      const t = elapsed % LOOP;
      if (loop !== lastLoop) {
        lastLoop = loop;
        fired = new Set();
        scoreA.textContent = "51";
      }
      frame(t);
      events_at(t);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; start = null; lastLoop = -1; raf = requestAnimationFrame(tick); }
      if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.25 });
    io.observe(player);
    frame(0);
  }
}

/* ---------- waitlist form ---------- */
const form = document.getElementById("signup");
const msg = form.querySelector(".form-msg");
const button = form.querySelector("button[type=submit]");

function show(text, kind) {
  msg.textContent = text;
  msg.className = `form-msg ${kind}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  if (!data.name?.trim() || !data.email?.trim() || !data.lead_type) {
    show("נא למלא שם, מייל ולבחור הורה, שחקן או מאמן.", "err");
    return;
  }
  if (!data.consent) {
    show("כדי להירשם צריך לאשר קבלת מיילים.", "err");
    return;
  }

  button.disabled = true;
  show("שולח…", "");

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, consent: true, source: location.search.slice(1) || "direct" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "שגיאה בשליחה");
    form.reset();
    show("נרשמת! שלחנו לך מייל אישור בעוד רגע.", "ok");
  } catch (err) {
    show(err.message || "משהו השתבש, נסו שוב בעוד רגע.", "err");
  } finally {
    button.disabled = false;
  }
});
