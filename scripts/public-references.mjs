// Where a local link inside a published file must exist in the built site.
//
// A link that names a folder ("./", "../", "start/", "/") means that folder's index.html,
// exactly as the web server answers it. The target still has to be a file in the artifact:
// this adds a way to write a link, it does not relax the check.
import { posix } from 'node:path';

/**
 * @param {string} file  path of the published file that holds the link, relative to the site root
 * @param {string} ref   the link, already stripped of "#..." and "?..." and URL-decoded
 * @returns {string|null} the artifact path the link points at, or null when it leaves the site
 */
export function resolveLocalTarget(file, ref) {
  const fromRoot = ref.startsWith('/');
  const joined = fromRoot ? ref.slice(1) : posix.join(posix.dirname(file), ref);
  let target = posix.normalize(joined || '.').replace(/\/+$/, '');
  if (target === '..' || target.startsWith('../')) return null;
  if (target === '.') target = '';
  const namesFolder = ref === '.' || ref === '..' || ref.endsWith('/') || ref.endsWith('/.') || ref.endsWith('/..');
  if (namesFolder || target === '') return target ? `${target}/index.html` : 'index.html';
  return target;
}
