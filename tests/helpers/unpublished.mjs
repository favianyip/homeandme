// Pages the owner took off the public site on 20 Nov 2026 ("take down the current other webpage").
// A test that pins one of those pages as PUBLIC skips itself while the page is off the public list, and runs
// again the day the page returns to it. The files themselves stay in the repo.
import { readFileSync } from 'node:fs';

const list = new Set(
  readFileSync(new URL('../../deploy/public-pages.txt', import.meta.url), 'utf8')
    .split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')),
);

export const isPublic = (path) => list.has(path);

export function skipUnlessPublic(t, path) {
  if (list.has(path)) return false;
  t.skip(`${path} is off the public list (owner, 20 Nov 2026)`);
  return true;
}
