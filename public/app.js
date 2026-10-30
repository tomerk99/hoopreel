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

/* ---------- demo: simulated AI highlight reel ---------- */
// Half court seen from above, 60 units per meter, rim at (800, 125).
// Three auto-cut clips of jersey #7: a drive, a wing three, an assist.
const SVG = "http://www.w3.org/2000/svg";
const HOOP = { x: 800, y: 125 };
const CLIP_LEN = 5; // seconds per clip

// Offense keyframes are [time, x, y] in clip time. Ball segments run in order;
// after the last one the ball is hidden until the cut.
const clips = [
  {
    name: "חדירה וסל", quarter: "Q1", clock: 511, score: [14, 12], points: 2, made: 3.0,
    offense: {
      7: [[0, 820, 660], [1.2, 870, 470], [2.0, 880, 290], [2.6, 830, 185], [3.6, 870, 240], [5, 900, 280]],
      4: [[0, 560, 560], [5, 540, 520]],
      11: [[0, 1222, 170], [5, 1222, 170]],
      23: [[0, 650, 300], [2, 560, 400], [5, 560, 420]],
      9: [[0, 1090, 480], [5, 1080, 500]],
    },
    ball: [
      { kind: "dribble", who: 7, to: 2.5 },
      { kind: "shot", who: 7, to: 3.0 },
      { kind: "drop", to: 3.5 },
    ],
    events: [[0.4, "🎯", "שחקן #7 זוהה · 98%"], [1.4, "⚡", "חדירה לצבע"], [3.0, "🏀", "סל מחדירה · +2"]],
  },
  {
    name: "שלשה מהכנף", quarter: "Q3", clock: 242, score: [51, 49], points: 3, made: 3.5,
    offense: {
      7: [[0, 960, 300], [1.4, 1100, 470], [4.2, 1090, 450], [5, 1090, 450]],
      4: [[0, 800, 700], [1.0, 790, 620], [5, 780, 620]],
      23: [[0, 1000, 420], [0.8, 1040, 400], [5, 1040, 400]],
      11: [[0, 380, 170], [5, 380, 170]],
      9: [[0, 560, 480], [5, 580, 470]],
    },
    ball: [
      { kind: "dribble", who: 4, to: 1.5 },
      { kind: "pass", who: 4, target: 7, to: 1.9 },
      { kind: "hold", who: 7, to: 2.3 },
      { kind: "shot", who: 7, to: 3.5 },
      { kind: "drop", to: 4.0 },
    ],
    events: [[0.5, "🧱", "חסימה של #23"], [2.3, "🏀", "זריקה מ־7.6 מ׳"], [3.5, "🔥", "שלשה! נוסף להיילייטס"]],
  },
  {
    name: "אסיסט", quarter: "Q4", clock: 72, score: [66, 65], points: 2, made: 2.4,
    offense: {
      7: [[0, 800, 680], [1.4, 770, 560], [5, 780, 560]],
      23: [[0, 500, 360], [1.0, 600, 330], [2.0, 760, 200], [2.6, 790, 170], [5, 820, 220]],
      4: [[0, 1100, 470], [5, 1100, 470]],
      11: [[0, 1222, 170], [5, 1222, 170]],
      9: [[0, 380, 170], [5, 380, 180]],
    },
    ball: [
      { kind: "dribble", who: 7, to: 1.6 },
      { kind: "pass", who: 7, target: 23, to: 2.0 },
      { kind: "shot", who: 23, to: 2.4 },
      { kind: "drop", to: 2.9 },
    ],
    events: [[0.5, "👀", "#7 קורא את ההגנה"], [1.6, "🤝", "אסיסט ל־#23"], [2.4, "✅", "סל · אסיסט נרשם ל־#7"]],
  },
];
const LOOP = clips.length * CLIP_LEN;
const OFFENSE = [7, 4, 11, 23, 9];
const DEFENSE = { 7: 5, 4: 12, 11: 30, 23: 8, 9: 15 }; // offense jersey -> defender jersey

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
  const last = t < frames[0][0] ? frames[0] : frames.at(-1);
  return [last[1], last[2]];
}
const fmtClock = (q, secs) => `${q} ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

function makePlayer(group, n, fill, ink, r = 27) {
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
  const court = player.querySelector(".court");
  const layer = document.getElementById("players");
  const ball = document.getElementById("ball");
  const trackBox = document.getElementById("trackBox");
  const trackTag = document.getElementById("trackTag");
  const arc = document.getElementById("shotArc");
  const burst = document.getElementById("burst");
  const burstText = document.getElementById("burstText");
  const events = document.getElementById("events");
  const progress = document.getElementById("progress");
  const clock = document.getElementById("clock");
  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");
  const clipNum = document.getElementById("clipNum");
  const clipName = document.getElementById("clipName");
  const chips = [...document.querySelectorAll("#clips .clip")];

  const defEls = {};
  const offEls = {};
  for (const n of OFFENSE) defEls[n] = makePlayer(layer, DEFENSE[n], "#1e3a8a", "#fff");
  for (const n of OFFENSE) offEls[n] = makePlayer(layer, n, "#f5f5f4", "#111", n === 7 ? 30 : 27);

  const pos = (clip, n, t) => {
    const [x, y] = along(clip.offense[n], t);
    return [x + Math.sin(t * 2.1 + n) * 5, y + Math.cos(t * 1.7 + n) * 5];
  };

  function toast(icon, text, stamp) {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `<span>${icon}</span><b>${text}</b><small>${stamp}</small>`;
    events.prepend(div);
    while (events.children.length > 3) events.lastChild.remove();
    setTimeout(() => div.classList.add("out"), 3000);
    setTimeout(() => div.remove(), 3500);
  }

  // Where the ball is at clip time t: [x, y, radius, opacity], plus the shot arc if one is in the air.
  function ballAt(clip, t) {
    let start = 0;
    for (const seg of clip.ball) {
      if (t < seg.to) {
        const k = (t - start) / (seg.to - start);
        if (seg.kind === "dribble") {
          const [x, y] = pos(clip, seg.who, t);
          return { x: x + 24, y: y + 16, r: 15 + Math.abs(Math.sin(t * 9)) * 4, o: 1 };
        }
        if (seg.kind === "hold") {
          const [x, y] = pos(clip, seg.who, t);
          return { x: x + 4, y: y - 26, r: 18, o: 1 };
        }
        if (seg.kind === "pass") {
          const [x0, y0] = pos(clip, seg.who, start);
          const [x1, y1] = pos(clip, seg.target, seg.to);
          return { x: lerp(x0, x1, k), y: lerp(y0, y1, k) - Math.sin(k * Math.PI) * 30, r: 17, o: 1 };
        }
        if (seg.kind === "shot") {
          const [x0, y0] = pos(clip, seg.who, start);
          const sx = x0 + 4, sy = y0 - 26;
          const dist = Math.hypot(HOOP.x - sx, HOOP.y - sy);
          const cx = (sx + HOOP.x) / 2, cy = (sy + HOOP.y) / 2 - dist * 0.45;
          const bx = (1 - k) ** 2 * sx + 2 * (1 - k) * k * cx + k * k * HOOP.x;
          const by = (1 - k) ** 2 * sy + 2 * (1 - k) * k * cy + k * k * HOOP.y;
          return { x: bx, y: by, r: 18 + Math.sin(k * Math.PI) * 10, o: 1, arc: `M${sx} ${sy} Q${cx} ${cy} ${HOOP.x} ${HOOP.y}` };
        }
        // drop: through the net, fading out
        return { x: HOOP.x, y: HOOP.y + k * 50, r: 18 - k * 4, o: 1 - k };
      }
      start = seg.to;
    }
    return { x: HOOP.x, y: HOOP.y, r: 14, o: 0 };
  }

  let lastArc = "";
  function frame(t) {
    const ci = Math.min(Math.floor(t / CLIP_LEN), clips.length - 1);
    const clip = clips[ci];
    const lt = t - ci * CLIP_LEN;

    for (const n of OFFENSE) {
      const [x, y] = pos(clip, n, lt);
      offEls[n].setAttribute("transform", `translate(${x} ${y})`);
      // Defenders trail their man slightly and sit between him and the rim.
      const [mx, my] = pos(clip, n, Math.max(0, lt - 0.3));
      const dx = lerp(mx, HOOP.x, 0.2) + Math.sin(lt * 3 + n) * 8;
      const dy = lerp(my, HOOP.y, 0.2) + Math.cos(lt * 2.6 + n) * 8;
      defEls[n].setAttribute("transform", `translate(${dx} ${dy})`);
      if (n === 7) {
        trackBox.setAttribute("x", x - 48);
        trackBox.setAttribute("y", y - 60);
        trackTag.setAttribute("transform", `translate(${x - 75} ${y - 62})`);
      }
    }

    const b = ballAt(clip, lt);
    ball.setAttribute("cx", b.x);
    ball.setAttribute("cy", b.y);
    ball.setAttribute("r", b.r);
    ball.setAttribute("opacity", b.o);
    if (b.arc) lastArc = b.arc;
    const sinceMade = lt - clip.made;
    arc.setAttribute("d", lastArc);
    arc.setAttribute("opacity", b.arc ? 1 : sinceMade >= 0 && sinceMade < 0.5 ? 1 - sinceMade * 2 : 0);

    const bk = sinceMade >= 0 && sinceMade < 1.2 ? sinceMade / 1.2 : -1;
    burst.setAttribute("opacity", bk < 0 ? 0 : 1 - bk);
    burst.querySelector("circle").setAttribute("r", bk < 0 ? 40 : 40 + bk * 90);
    burstText.textContent = `+${clip.points}`;

    court.classList.toggle("cut", lt > CLIP_LEN - 0.35);
    progress.style.width = `${(t / LOOP) * 100}%`;
    clock.textContent = fmtClock(clip.quarter, Math.max(0, clip.clock - Math.floor(lt)));
    return { ci, clip, lt };
  }

  let fired = new Set();
  let shownClip = -1;
  function showClip(ci, clip, made) {
    shownClip = ci;
    clipNum.textContent = `קליפ ${ci + 1}/${clips.length}`;
    clipName.textContent = clip.name;
    chips.forEach((c, i) => c.classList.toggle("is-on", i === ci));
    scoreA.textContent = clip.score[0] + (made ? clip.points : 0);
    scoreB.textContent = clip.score[1];
  }

  function eventsAt({ ci, clip, lt }) {
    if (ci !== shownClip) showClip(ci, clip, false);
    for (const [at, icon, text] of clip.events) {
      const key = `${ci}:${at}`;
      if (lt >= at && !fired.has(key)) {
        fired.add(key);
        toast(icon, text, fmtClock(clip.quarter, clip.clock - Math.floor(at)));
      }
    }
    const key = `${ci}:made`;
    if (lt >= clip.made && !fired.has(key)) {
      fired.add(key);
      scoreA.textContent = clip.score[0] + clip.points;
      scoreA.classList.remove("bump");
      void scoreA.offsetWidth;
      scoreA.classList.add("bump");
    }
  }

  if (reduceMotion) {
    const still = frame(CLIP_LEN + 3.7);
    showClip(still.ci, still.clip, true);
    toast("🔥", "שלשה! נוסף להיילייטס", "Q3 03:59");
  } else {
    let start = null, running = false, raf = 0, lastLoop = -1;
    const tick = (now) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      const loop = Math.floor(elapsed / LOOP);
      if (loop !== lastLoop) {
        lastLoop = loop;
        fired = new Set();
        shownClip = -1;
      }
      eventsAt(frame(elapsed % LOOP));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; start = null; lastLoop = -1; raf = requestAnimationFrame(tick); }
      if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.25 });
    io.observe(player);
    showClip(0, clips[0], false);
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
