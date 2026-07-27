module.exports = {
  lang: "fr",
  eleventyComputed: {
    permalink: (data) => `/projects/${data.page.fileSlug}/index.html`
  }
};
