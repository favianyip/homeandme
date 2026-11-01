import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('Home Direct.dc.html', root), 'utf8');

test('R2-1: no internal ticket notes (FAV-nnn) in public HTML comments', () => {
  const comments = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]);
  assert.deepEqual(comments.filter((c) => /FAV-\d+/.test(c)), []);
});

test('R2-2: script comments do not call the gallery completed work or describe the removed coordinator photo', () => {
  assert.ok(!/Completed-work/i.test(html), 'found "Completed-work" in page source');
  assert.ok(!/coordinator section holds\s*\/\/?\s*contemporary-4-room/i.test(html.replace(/\n\s*\/\/\s*/g, ' ')), 'stale comment: coordinator photo no longer contemporary-4-room');
});

test('R2-3: no picture alt text calls an image "a Home & Me project"', () => {
  const alts = [...html.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(alts.filter((a) => /Home &amp; Me project/i.test(a)), []);
});

test('R2-4: step 3 picture is not repeated in the gallery', () => {
  const s = html.indexOf('id="floorplan-to-render"');
  const sec = html.slice(s, html.indexOf('</section>', s));
  const step = [...sec.matchAll(/<img[^>]*src="assets\/([^"]+)"/g)].map((m) => m[1]);
  const work = [...html.matchAll(/file: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(step.filter((f) => work.includes(f)), []);
});

test('R2-5: coordinator kitchen photo is not forced to a tall 4:5 crop on single-column (<=980px) screens', () => {
  const img = html.match(/<img[^>]*home-finished-kitchen\.jpg[^>]*>/)[0];
  const tall = /aspect-ratio:\s*4\s*\/\s*5/.test(img);
  const override = /@media \(max-width: 980px\)[^}]*\{[^@]*\[data-imgfirst\][^{]*img[^}]*aspect-ratio/.test(html);
  assert.ok(!tall || override, 'kitchen img is 4/5 with no <=980px override: ~736x920 px at 800 wide');
});
