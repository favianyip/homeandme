// 25 Nov 2026: the theme step offers the themes the design engine makes today: four for Minimalist and Industrial,
// one (theme 1) for every other design. No design shows four options of which three cannot be made.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function journey() {
  const sandbox = { window: {} };
  vm.runInNewContext(read('journey/products.js'), sandbox);
  return sandbox.window.HNM_JOURNEY;
}

test('four themes only where the engine makes them, one everywhere else', () => {
  const J = journey();
  assert.deepEqual(Array.from(J.ENGINE_THEMES), ['minimalist', 'industrial']);
  for (const id of ['minimalist', 'industrial']) assert.equal(J.themesFor(id).items.length, 4, id);
  for (const id of ['modern-classic', 'muji', 'scandinavian', 'contemporary', 'modern-oriental']) {
    const set = J.themesFor(id);
    assert.equal(set.items.length, 1, id);
    assert.equal(set.count, 1, id);
    assert.match(set.items[0].shots[0].src, new RegExp(`${id}-1-living\.jpg$`));
  }
  for (const s of J.STYLES.slice(0, 7)) {
    assert.equal(s.note, J.themeCount(s.id) === 4 ? 'Four themes ready' : 'One theme for now', s.id);
  }
});

test('the theme step says one theme plainly, hides the switch, and the check step never reads a theme that is gone', () => {
  const themes = read('journey/themes.html');
  assert.match(themes, /if \(items\.length === 1\) \{/);
  assert.match(themes, /This design comes in one theme for now\./);
  assert.match(themes, /document\.getElementById\('themeSeg'\)\.hidden = true;/);
  assert.match(read('journey/check.html'), /i = \(typeof s\.theme === 'number' && set\.items\[s\.theme\]\) \? s\.theme : 0;/);
});
