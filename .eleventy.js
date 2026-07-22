const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

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
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.headerLink(),
  });

  eleventyConfig.setLibrary("md", md);

  // ─── Projects collection ───
  eleventyConfig.addCollection("projects", function (collectionApi) {
    return collectionApi.getFilteredByTag("project");
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
