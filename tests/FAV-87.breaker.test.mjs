import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const manifest = read('deploy/public-pages.txt').split(/\r?\n/).map((l) => l.trim());
const html = read('Home Direct.dc.html');
const fpStart = html.indexOf('id="floorplan-to-render"');
const section = html.slice(fpStart, html.indexOf('</section>', fpStart));

test('FAV-87: every image in #floorplan-to-render ships in the Pages manifest', () => {
  const srcs = [...section.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
  assert.ok(srcs.length === 3);
  const missing = srcs.filter((s) => !manifest.includes(s));
  assert.deepEqual(missing, []);
});

test('FAV-87: no internal vendor/approval notes in public HTML comments', () => {
  const comments = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]);
  assert.deepEqual(comments.filter((c) => /Higgsfield|owner approv/i.test(c)), []);
});
