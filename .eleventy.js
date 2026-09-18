const markdownIt = require("markdown-it");
const implicitFigures = require("markdown-it-implicit-figures");
const fetchCv = require("./scripts/fetch-cv");
const crypto = require("crypto");
const fs = require("fs");

/** ASCII slug: "Contexte & Problématique" → "contexte-problematique". */
const slug = (text) =>
  String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

module.exports = function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await fetchCv();
  });

  // ─── Passthrough copies ───
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy({ "assets/favicon.ico": "favicon.ico" });

  eleventyConfig.ignores.add("README.md");

  // ─── Markdown configuration ───
  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  md.use(implicitFigures, {
    figcaption: true,
    keepAlt: true,
    copyAttrs: "class",
  });

  // Preserve inline $...$ and block $$...$$ without markdown-it emphasis (_) interference
  md.inline.ruler.before("emphasis", "math_inline", (state, silent) => {
    if (state.src[state.pos] !== "$") return false;
    if (state.src[state.pos + 1] === "$") return false;

    let start = state.pos + 1;
    let match = start;

    while ((match = state.src.indexOf("$", match)) !== -1) {
      if (state.src[match - 1] !== "\\") break;
      match++;
    }

    if (match === -1) return false;

    if (!silent) {
      const token = state.push("html_inline", "", 0);
      token.content = state.src.slice(state.pos, match + 1);
    }

    state.pos = match + 1;
    return true;
  });

  md.block.ruler.before(
    "paragraph",
    "math_block",
    (state, startLine, endLine, silent) => {
      let pos = state.bMarks[startLine] + state.tShift[startLine];
      let max = state.eMarks[startLine];

      if (pos + 2 > max) return false;
      if (state.src.slice(pos, pos + 2) !== "$$") return false;

      let nextLine = startLine;
      let found = false;

      const lineText = state.src.slice(pos, max).trim();
      if (lineText.length >= 4 && lineText.endsWith("$$")) {
        if (!silent) {
          const token = state.push("html_block", "", 0);
          token.content = state.src.slice(pos, max) + "\n";
        }
        state.line = startLine + 1;
        return true;
      }

      while (++nextLine < endLine) {
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        if (state.src.slice(pos, max).trim() === "$$") {
          found = true;
          break;
        }
      }

      if (!found) return false;

      if (!silent) {
        const token = state.push("html_block", "", 0);
        const startPos = state.bMarks[startLine] + state.tShift[startLine];
        const endPos = state.eMarks[nextLine];
        token.content = state.src.slice(startPos, endPos) + "\n";
      }

      state.line = nextLine + 1;
      return true;
    },
  );

  // Every h2 of a case study gets a stable id, so the table of contents and
  // the scroll spy can point at it. Ids are unique within one document.
  md.core.ruler.push("heading_ids", (state) => {
    const seen = new Map();
    state.tokens.forEach((token, i) => {
      if (token.type !== "heading_open" || token.tag !== "h2") return;
      const base = slug(state.tokens[i + 1].content) || "section";
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      token.attrSet("id", n ? `${base}-${n + 1}` : base);
    });
  });

  eleventyConfig.setLibrary("md", md);

  // ─── Filters ───

  /** Table of contents of a rendered case study: its h2, in order. */
  eleventyConfig.addFilter("toc", (html) =>
    [...String(html).matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(
      ([, id, inner]) => ({ id, text: inner.replace(/<[^>]+>/g, "").trim() }),
    ),
  );

  /** The featured projects before and after `id`, for the case-study pager. */
  eleventyConfig.addFilter("neighbours", (items, id) => {
    const featured = items.filter((p) => p.featured);
    const i = featured.findIndex((p) => p.id === id);
    return { prev: featured[i - 1] || null, next: featured[i + 1] || null };
  });

  /** `/css/style.css` → `/css/style.css?v=<content hash>`: a changed file gets
      a new URL, so no browser keeps the old one next to the new HTML. */
  eleventyConfig.addFilter("versioned", (url) => {
    const file = fs.readFileSync(`.${url}`);
    const hash = crypto.createHash("md5").update(file).digest("hex").slice(0, 8);
    return `${url}?v=${hash}`;
  });

  /** Escaped `text` with the first occurrence of each of `words` wrapped in
      `<span class="hl">`, numbered for the stagger. A word missing from the
      text fails the build rather than silently losing its highlight. */
  eleventyConfig.addFilter("highlight", (text, words = []) => {
    const escape = (s) =>
      String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const hits = words
      .map((word) => {
        const at = String(text).indexOf(word);
        if (at === -1) throw new Error(`highlight: "${word}" not in "${text}"`);
        return { at, word };
      })
      .sort((a, b) => a.at - b.at);
    let out = "";
    let pos = 0;
    hits.forEach(({ at, word }, i) => {
      out += escape(text.slice(pos, at));
      out += `<span class="hl" style="--i: ${i}">${escape(word)}</span>`;
      pos = at + word.length;
    });
    return out + escape(text.slice(pos));
  });

  /** First entry of `items` whose id is `id`, or null. */
  eleventyConfig.addFilter("byId", (items, id) =>
    items.find((item) => item.id === id) || null,
  );

  // ─── Projects collection ───
  eleventyConfig.addCollection("projects", function (collectionApi) {
    return collectionApi.getFilteredByTag("project");
  });

  return {
    markdownTemplateEngine: false,
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
