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
