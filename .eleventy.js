const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const implicitFigures = require("markdown-it-implicit-figures");

module.exports = function (eleventyConfig) {
  // ─── Passthrough copies ───
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("cv");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

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

  md.block.ruler.before("paragraph", "math_block", (state, startLine, endLine, silent) => {
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
  });

  eleventyConfig.setLibrary("md", md);

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
