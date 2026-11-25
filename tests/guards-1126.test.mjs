// 26 Nov 2026, owner: "these issue i mention earlier must not repeat including the last page". Guards for the night's
// issues that no other test already holds (the rest: live-journey four themes and 416 pictures, progress-bar,
// agents-section and its no-owner-name check).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = read('deploy/public-pages.txt').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const journey = () => { const sandbox = { window: {} }; vm.runInNewContext(read('journey/products.js'), sandbox); return sandbox.window.HNM_JOURNEY; };

test('no public page or script says a design has one theme (every design offers four)', () => {
  const text = manifest.filter((p) => /\.(html|js|txt|css|json|xml|md)$/.test(p));
  const carriers = text.filter((p) => /\bone theme\b|only one theme|single theme/i.test(read(p)));
  assert.deepEqual(carriers, []);
  const J = journey();
  assert.equal(J.STYLES.length, 26);
  for (const s of J.STYLES) assert.equal(J.themesFor(s.id).items.length, 4, s.id);
});

test('every design card shows its own main photo: never a theme picture, never another design\'s picture', () => {
  const J = journey();
  const cards = J.STYLES.map((s) => [s.id, s.rooms[0].src]);
  for (const [id, src] of cards) {
    assert.doesNotMatch(src, /(^|\/)assets\/themes\//, `${id}: the card is a theme picture (${src})`);
    assert.ok(manifest.includes(src), `${id}: ${src} is not public`);
  }
  const seen = new Map();
  for (const [id, src] of cards) {
    assert.ok(!seen.has(src), `${id} and ${seen.get(src)} use the same picture ${src}`);
    seen.set(src, id);
  }
});
