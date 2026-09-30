// POST /api/contact — the freelance page's brief form (Vercel function).
//
// Sends two emails through Resend in one batch: the request to me, with the
// client as reply-to, and an acknowledgement to the client, with me as
// reply-to. Answers JSON to fetch() and a 303 redirect to a plain form post,
// so the form also works without JavaScript.
//
// Environment:
//   RESEND_API_KEY  required
//   CONTACT_TO      where requests land (default: site.email)
//   CONTACT_FROM    verified sender (default: contact@<site domain>)

const site = require("../_data/site.json");
const { contact } = require("../_data/freelance.json");

const PAGE = "/freelance/";
const LIMITS = { name: 100, company: 120, email: 200, message: 5000 };
const MIN_FILL_MS = 3000; // a human does not fill the form faster
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Best effort: an instance forgets on cold start, which is fine against a
// script hammering one endpoint.
const RATE = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map();

const domain = new URL(site.baseUrl).hostname.replace(/^www\./, "");
const TO = process.env.CONTACT_TO || site.email;
const FROM = process.env.CONTACT_FROM || `${site.name} <contact@${domain}>`;

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const clean = (value, max) =>
  String(Array.isArray(value) ? value[0] ?? "" : value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function parseBody(req) {
  const { body } = req;
  if (body && typeof body === "object") return body;
  if (typeof body !== "string" || !body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const params = new URLSearchParams(body);
    const out = {};
    for (const key of new Set(params.keys())) {
      const all = params.getAll(key);
      out[key] = all.length > 1 ? all : all[0];
    }
    return out;
  }
}

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE.max;
}

/** The form's fields, checked against the page's own lists. */
function validate(data) {
  const types = list(data.type).filter((t) => contact.form.types.includes(t));
  const timing = contact.form.timings.includes(data.timing)
    ? data.timing
    : contact.form.timings[0];
  const brief = {
    types,
    timing,
    name: clean(data.name, LIMITS.name),
    company: clean(data.company, LIMITS.company),
    email: clean(data.email, LIMITS.email).toLowerCase(),
    message: clean(data.message, LIMITS.message),
  };
  const errors = [];
  if (!EMAIL.test(brief.email)) errors.push("email");
  if (!brief.message) errors.push("message");
  return { brief, errors };
}

/* ─── Emails ─── */

const INK = "#0e0d16";
const YELLOW = "#ffdd33";
const VIOLET = "#6c4bff";

const paragraphs = (text) =>
  escape(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

const rows = (pairs) =>
  pairs
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 16px 8px 0;color:#6b6780;font-size:14px;white-space:nowrap;vertical-align:top">${escape(label)}</td>
          <td style="padding:8px 0;color:${INK};font-size:15px;font-weight:600">${escape(value)}</td>
        </tr>`,
    )
    .join("");

/** One email frame: ink header with the yellow mark, white card. */
const layout = (preheader, inner) => `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f1eff8">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1eff8;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
        <tr><td style="background:${INK};border-radius:20px 20px 0 0;padding:22px 28px">
          <span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:9px;background:${YELLOW};color:${INK};font-weight:800;text-align:center;font-size:16px">T</span>
          <span style="color:#fff;font-weight:800;font-size:18px;vertical-align:middle;margin-left:8px">Talvin<span style="color:${YELLOW}">.</span></span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:0 0 20px 20px;padding:32px 28px;color:${INK};font-size:16px;line-height:1.6">
          ${inner}
        </td></tr>
        <tr><td style="padding:18px 8px;color:#8a86a0;font-size:12px;text-align:center">
          ${escape(site.name)} · Développeur full-stack freelance · <a href="${site.baseUrl}${PAGE}" style="color:#8a86a0">${escape(domain)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

function requestEmail(b) {
  const who = b.name || b.email;
  const subject = `Nouvelle demande${b.types.length ? ` — ${b.types.join(", ")}` : ""} — ${who}`;
  const details = [
    ["Nom", b.name],
    ["E-mail", b.email],
    ["Entreprise", b.company],
    ["Projet", b.types.join(", ")],
    ["Échéance", b.timing],
  ];
  const html = layout(
    b.message.slice(0, 120),
    `<p style="margin:0 0 6px;color:${VIOLET};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Nouvelle demande</p>
     <h1 style="margin:0 0 20px;font-size:26px;line-height:1.2">${escape(who)}</h1>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${rows(details)}</table>
     <div style="padding:18px 20px;border-radius:14px;background:#f5f3fb">${paragraphs(b.message)}</div>
     <p style="margin:22px 0 0;color:#6b6780;font-size:14px">Répondez directement à cet e-mail pour écrire à ${escape(who)}.</p>`,
  );
  const text = [
    ...details.filter(([, v]) => v).map(([l, v]) => `${l} : ${v}`),
    "",
    b.message,
  ].join("\n");
  return { from: FROM, to: [TO], reply_to: b.email, subject, html, text };
}

function acknowledgementEmail(b) {
  const first = b.name.split(/\s+/)[0];
  const hello = first ? `Merci ${first} !` : "Merci !";
  const subject = "J'ai bien reçu votre demande";
  const recap = [
    ["Projet", b.types.join(", ")],
    ["Échéance", b.timing],
  ];
  const html = layout(
    "Je reviens vers vous personnellement pour en parler.",
    `<h1 style="margin:0 0 14px;font-size:28px;line-height:1.15">${escape(hello)}<br>
       <span style="display:inline-block;margin-top:8px;padding:2px 12px 4px;border-radius:8px;background:${YELLOW};box-shadow:4px 4px 0 ${VIOLET}">Votre demande est bien arrivée.</span>
     </h1>
     <p style="margin:18px 0">Je lis chaque message moi-même et je reviens vers vous personnellement pour en parler. Si vous pensez à un détail entre-temps, répondez simplement à cet e-mail.</p>
     <p style="margin:24px 0 8px;color:#6b6780;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Votre message</p>
     ${recap.some(([, v]) => v) ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${rows(recap)}</table>` : ""}
     <div style="padding:18px 20px;border-radius:14px;background:#f5f3fb;color:#3a3650">${paragraphs(b.message)}</div>
     <p style="margin:26px 0 0">À très vite,<br><strong>${escape(site.name)}</strong><br><span style="color:#6b6780;font-size:14px">Développeur full-stack freelance</span></p>`,
  );
  const text = [
    hello,
    "",
    "Votre demande est bien arrivée. Je lis chaque message moi-même et je reviens vers vous personnellement pour en parler. Si vous pensez à un détail entre-temps, répondez simplement à cet e-mail.",
    "",
    "Votre message :",
    b.message,
    "",
    "À très vite,",
    site.name,
  ].join("\n");
  return { from: FROM, to: [b.email], reply_to: TO, subject, html, text };
}

async function send(brief) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([requestEmail(brief), acknowledgementEmail(brief)]),
  });
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
}

/* ─── Handler ─── */

module.exports = async (req, res) => {
  const wantsJson = String(req.headers.accept || "").includes("application/json");
  const reply = (status, outcome, extra = {}) => {
    if (wantsJson) return res.status(status).json({ ok: outcome === "ok", ...extra });
    res.writeHead(303, { Location: `${PAGE}#${outcome === "ok" ? "merci" : "oups"}` });
    return res.end();
  };

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  // A browser always sends Origin on a cross-site POST: refuse other sites.
  const origin = req.headers.origin;
  if (origin) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== req.headers.host) return reply(403, "error");
  }

  const data = parseBody(req);

  // Bots: the honeypot is filled, or the form was sent too fast. They get a
  // success so they learn nothing, and no email leaves.
  const started = Number(data.t);
  if (data.website || (started && Date.now() - started < MIN_FILL_MS)) return reply(200, "ok");

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply(429, "error", { error: "rate" });

  const { brief, errors } = validate(data);
  if (errors.length) return reply(422, "error", { errors });

  if (!process.env.RESEND_API_KEY) {
    console.error("contact: RESEND_API_KEY is not set");
    return reply(500, "error");
  }

  try {
    await send(brief);
    return reply(200, "ok");
  } catch (error) {
    console.error("contact:", error);
    return reply(502, "error");
  }
};
