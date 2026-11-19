// The public build checks that every local link in a published file points at a file that is
// really in the built site. Folder links ("./", "../", "start/") mean that folder's index.html.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLocalTarget } from '../scripts/public-references.mjs';

const site = new Set(['index.html', 'AboutUs.dc.html', 'guides/a.html', 'start/index.html', 'assets/site/home.css']);
const ok = (file, ref) => {
  const target = resolveLocalTarget(file, ref);
  return target !== null && site.has(target);
};

test('a folder link means that folder index.html', () => {
  assert.equal(resolveLocalTarget('AboutUs.dc.html', './'), 'index.html');
  assert.equal(resolveLocalTarget('AboutUs.dc.html', '.'), 'index.html');
  assert.equal(resolveLocalTarget('guides/a.html', '../'), 'index.html');
  assert.equal(resolveLocalTarget('guides/a.html', '..'), 'index.html');
  assert.equal(resolveLocalTarget('guides/a.html', '/'), 'index.html');
  assert.equal(resolveLocalTarget('index.html', 'start/'), 'start/index.html');
  assert.equal(resolveLocalTarget('guides/a.html', '../start/'), 'start/index.html');
  assert.equal(resolveLocalTarget('start/index.html', './'), 'start/index.html');
});

test('ordinary file links resolve as before', () => {
  assert.equal(resolveLocalTarget('index.html', 'assets/site/home.css'), 'assets/site/home.css');
  assert.equal(resolveLocalTarget('guides/a.html', '../AboutUs.dc.html'), 'AboutUs.dc.html');
  assert.equal(resolveLocalTarget('guides/a.html', '/AboutUs.dc.html'), 'AboutUs.dc.html');
  assert.equal(resolveLocalTarget('assets/site/home.css', './tokens.css'), 'assets/site/tokens.css');
  assert.ok(ok('index.html', './'));
  assert.ok(ok('guides/a.html', '../'));
  assert.ok(ok('index.html', 'start/'));
});

test('known-bad: a folder with no index.html is still a missing file', () => {
  assert.equal(resolveLocalTarget('index.html', 'guides/'), 'guides/index.html');
  assert.equal(ok('index.html', 'guides/'), false);
  assert.equal(ok('index.html', 'nowhere/'), false);
});

test('known-bad: a folder named without its slash is not treated as a page', () => {
  assert.equal(resolveLocalTarget('index.html', 'start'), 'start');
  assert.equal(ok('index.html', 'start'), false);
  assert.equal(ok('index.html', '/start'), false);
});

test('known-bad: a link that leaves the site is refused', () => {
  assert.equal(resolveLocalTarget('index.html', '../'), null);
  assert.equal(resolveLocalTarget('index.html', '..'), null);
  assert.equal(resolveLocalTarget('index.html', '../secret.html'), null);
  assert.equal(resolveLocalTarget('guides/a.html', '../../'), null);
  assert.equal(resolveLocalTarget('guides/a.html', '/../x.html'), null);
});
