const fs = require('fs');
const path = require('path');
const https = require('https');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const files = [
  'cv-talvin-ackbaraly-fr.pdf',
  'cv-talvin-ackbaraly-en.pdf'
];

const BASE_URL = 'https://github.com/talvinckb/cv/releases/latest/download/';

function downloadFile(file) {
  return new Promise((resolve, reject) => {
    const dest = path.join(assetsDir, file);
    const fileStream = fs.createWriteStream(dest);

    function get(url) {
      https.get(url, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          get(response.headers.location);
        } else if (response.statusCode === 200) {
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => {
              console.log(`[CV Fetch] Successfully downloaded ${file}`);
              resolve();
            });
          });
        } else {
          const err = new Error(`HTTP Status ${response.statusCode} for ${file}`);
          console.warn(`[CV Fetch] ${err.message}`);
          reject(err);
        }
      }).on('error', err => {
        console.error(`[CV Fetch] Error fetching ${file}:`, err.message);
        reject(err);
      });
    }

    get(BASE_URL + file);
  });
}

async function fetchAll() {
  console.log('[CV Fetch] Downloading latest CV PDFs from GitHub Releases...');
  try {
    await Promise.all(files.map(downloadFile));
    console.log('[CV Fetch] Done!');
  } catch (err) {
    console.error('[CV Fetch] Download failed:', err.message);
    // Don't crash if local files already exist
    const allExist = files.every(f => fs.existsSync(path.join(assetsDir, f)));
    if (!allExist) {
      throw err;
    }
  }
}

if (require.main === module) {
  fetchAll().catch(() => process.exit(1));
}

module.exports = fetchAll;
