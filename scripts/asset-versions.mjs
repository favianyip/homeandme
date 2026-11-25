// Versioned asset URLs (26 Nov 2026). GitHub Pages lets a browser keep every file for 10 minutes (max-age=600), so
// twice the owner saw the old site after a publish and thought the fix had failed. The build stamps ?v=<short content
// hash> on every local script and stylesheet a built page loads, on local @import / url() in stylesheets, and fills
// journey/products.js ASSET_V with one hash of the pictures it names. A changed file gets a new URL, so a publish
// shows on a normal refresh; the HTML pages themselves keep the 10-minute cache.
import { createHash } from 'node:crypto';

export const shortHash = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 10);

const notLocal = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** url with its query replaced by ?v=<v>, its #fragment kept */
export function withVersion(url, v) {
  const [beforeFragment, ...fragment] = url.split('#');
  return `${beforeFragment.split('?')[0]}?v=${v}${fragment.length ? `#${fragment.join('#')}` : ''}`;
}

function stampAttribute(tag, name, hashOf) {
  return tag.replace(new RegExp(`(\\s${name}\\s*=\\s*)(["'])([^"']+)\\2`, 'i'), (match, lead, quote, url) => {
    if (notLocal.test(url.trim())) return match;
    const v = hashOf(url);
    return v ? `${lead}${quote}${withVersion(url, v)}${quote}` : match;
  });
}

/** local <script src> and <link rel="stylesheet" href>; hashOf(url) gives the target's short hash, or null */
export function stampHtml(html, hashOf) {
  return html
    .replace(/<script\b[^>]*>/gi, (tag) => stampAttribute(tag, 'src', hashOf))
    .replace(/<link\b[^>]*>/gi, (tag) => (/\brel\s*=\s*["']?stylesheet\b/i.test(tag) ? stampAttribute(tag, 'href', hashOf) : tag));
}

/** local url(...) in a stylesheet, @import url(...) included */
export function stampCss(css, hashOf) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (match, quote, url) => {
    if (notLocal.test(url.trim())) return match;
    const v = hashOf(url);
    return v ? `url(${quote}${withVersion(url, v)}${quote})` : match;
  });
}

/** journey/products.js with its ASSET_V filled in */
export function fillAssetVersion(js, v) {
  const empty = "var ASSET_V = '';";
  if (!js.includes(empty)) throw new Error('journey/products.js has no empty ASSET_V to fill');
  return js.replace(empty, `var ASSET_V = '${v}';`);
}
