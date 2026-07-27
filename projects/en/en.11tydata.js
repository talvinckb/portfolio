module.exports = {
  lang: "en",
  eleventyComputed: {
    permalink: (data) => `/en/projects/${data.page.fileSlug}/index.html`,
  },
};
