/**
 * The year of GitHub contributions shown on the home page, read at build
 * time from the public calendar of the profile (no token needed). A failed
 * or slow fetch gives null: the page simply leaves the graph out, so a
 * build never depends on GitHub answering.
 */
const site = require("./site.json");

const user = new URL(site.github).pathname.replace(/\//g, "");

module.exports = async function () {
  let html;
  try {
    const res = await fetch(`https://github.com/users/${user}/contributions`, {
      headers: { "User-Agent": "portfolio-build" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // Each day is a cell with its date and level (0–4); its count only lives
  // in the tooltip that names the cell.
  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    const n = /^(\d[\d,]*) contribution/.exec(m[2].trim());
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }

  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="([\d-]+)"/.exec(tag)?.[1];
    const level = /data-level="(\d)"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!date || level === undefined) continue;
    days.push({ date, level: Number(level), count: counts.get(id) ?? 0 });
  }
  if (days.length < 300) return null;

  days.sort((a, b) => a.date.localeCompare(b.date));

  // Weeks run Sunday to Saturday, as on GitHub: the first one may start
  // mid-week, so its missing days stay empty.
  const weeks = [];
  let week = [];
  days.forEach((day) => {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 && week.length) {
      weeks.push(week);
      week = [];
    }
    week[weekday] = day;
  });
  if (week.length) weeks.push(week);

  // A month is named above the first week that starts in it.
  const months = [];
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    const month = Number(first.date.slice(5, 7)) - 1;
    if (!months.length || months.at(-1).month !== month) months.push({ month, week: i });
  });
  // A label squeezed against the next one at the very start is dropped.
  if (months.length > 1 && months[1].week - months[0].week < 3) months.shift();

  return {
    user,
    url: site.github,
    total: days.reduce((sum, d) => sum + d.count, 0),
    from: days[0].date,
    to: days.at(-1).date,
    weeks,
    months,
  };
};
