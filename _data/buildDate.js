// ISO date (YYYY-MM-DD) stamped into <lastmod> at build time.
module.exports = () => new Date().toISOString().slice(0, 10);
