// 26 Nov 2026: a publish must show on a normal refresh. The build stamps ?v=<content hash> on local scripts and
// stylesheets and fills journey/products.js ASSET_V (scripts/asset-versions.mjs).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fillAssetVersion, shortHash, stampCss, stampHtml, withVersion } from '../scripts/asset-versions.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('local scripts and stylesheets get the hash of their content; outside links, paths and fragments stay', () => {
  const hashOf = (url) => ({ 'products.js': 'aaaaaaaaaa', 'journey.css': 'bbbbbbbbbb', '../assets/site/home.js': 'cccccccccc' })[url.split('?')[0]] || null;
  const html = '<link rel="stylesheet" href="journey.css"><link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet">'
    + '<link rel="icon" href="../favicon.svg"><script src="products.js"></script><script src="../assets/site/home.js?old=1"></script>'
    + '<script src="https://cdn.example/x.js"></script><script>var a = 1;</script><a href="themes.html">next</a>';
  const out = stampHtml(html, hashOf);
  assert.match(out, /<link rel="stylesheet" href="journey\.css\?v=bbbbbbbbbb">/);
  assert.match(out, /<script src="products\.js\?v=aaaaaaaaaa"><\/script>/);
  assert.match(out, /<script src="\.\.\/assets\/site\/home\.js\?v=cccccccccc"><\/script>/, 'relative path kept, old query replaced');
  assert.match(out, /href="https:\/\/fonts\.googleapis\.com\/css2\?family=X"/, 'outside links untouched');
  assert.match(out, /<link rel="icon" href="\.\.\/favicon\.svg">/, 'only stylesheets among links');
  assert.match(out, /<a href="themes\.html">/, 'page links untouched (the HTML keeps its own cache)');
  assert.equal(withVersion('a.css#x', 'v1'), 'a.css?v=v1#x');
  assert.equal(stampCss('@import url("./tokens.css"); .a { background: url(data:image/png;base64,AA) }', () => 'dddddddddd'),
    '@import url("./tokens.css?v=dddddddddd"); .a { background: url(data:image/png;base64,AA) }');
  // the hash follows the content: a changed file gets a new URL
  assert.notEqual(shortHash(Buffer.from('var a = 1;')), shortHash(Buffer.from('var a = 2;')));
  assert.match(shortHash(Buffer.from('x')), /^[0-9a-f]{10}$/);
  assert.throws(() => fillAssetVersion('var other = 1;', 'x'), /ASSET_V/);
});

test('the built Designing-journey pages load products.js by its content hash, and products.js versions its pictures', () => {
  const run = spawnSync(process.execPath, ['scripts/build-public-pages.mjs'], { cwd: new URL('.', root), encoding: 'utf8', timeout: 180000 });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const built = (path) => readFileSync(new URL(`_site/${path}`, root));
  const products = built('journey/products.js');
  for (const page of ['journey/style.html', 'journey/themes.html']) {
    const html = built(page).toString('utf8');
    assert.match(html, new RegExp(`<script src="products\\.js\\?v=${shortHash(products)}"></script>`), `${page} loads this products.js`);
    assert.match(html, /<link rel="stylesheet" href="journey\.css\?v=[0-9a-f]{10}">/);
  }
  assert.match(products.toString('utf8'), /var ASSET_V = '[0-9a-f]{10}';/);
  assert.match(read('journey/products.js'), /var ASSET_V = '';/, 'the source keeps plain paths');
  assert.match(built('index.html').toString('utf8'), /<link rel="stylesheet" href="assets\/site\/home\.css\?v=[0-9a-f]{10}">/);
  assert.match(built('assets/site/home.css').toString('utf8'), /@import url\("\.\/tokens\.css\?v=[0-9a-f]{10}"\);/);
});
