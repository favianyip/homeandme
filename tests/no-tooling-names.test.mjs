// Owner, 19 Nov 2026: the home page shows only homeandme.sg, and the published site carries no
// name of the design tools or of the design theme used to build it (not in file names, comments,
// attributes or scripts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const manifest = read('deploy/public-pages.txt')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.svg', '.txt', '.xml']);

// Never allowed in any published file or published file name.
const banned = [
  ['the design skill', /hallmark/i],
  ['its checker', /sloplint/i],
  ['the old home page file', /home(?:%20| |-|_)?atelier/i],
  ['the old stylesheet folder', /atelier\//i],
  ['a checker stamp file', /\.stamp\.css/i],
];
// The bare word is the design theme's name. It is also part of "Project Atelier", the name of an
// older online service that these older pages still describe. Those pages are owner decisions for
// a later round (unpublish, rename or keep), so the word is allowed there and nowhere else.
const themeWord = /atelier/i;
// 20 Nov 2026: every page that used the older product name is off the public list, and Contact was reworded.
const olderProductPages = new Set([]);

function findings(path, text) {
  const found = [];
  for (const [what, pattern] of banned) {
    if (pattern.test(path)) found.push(`${path}: file name carries ${what}`);
    if (pattern.test(text)) found.push(`${path}: text carries ${what}`);
  }
  if (!olderProductPages.has(path)) {
    if (themeWord.test(path)) found.push(`${path}: file name carries the theme name`);
    if (themeWord.test(text)) found.push(`${path}: text carries the theme name`);
  }
  return found;
}

test('known-bad: the scanner catches each name it is meant to catch', () => {
  assert.equal(findings('index.html', '<p>Renovation without the middlemen.</p>').length, 0);
  assert.equal(findings('index.html', '/* Hallmark · shape */').length, 1);
  assert.equal(findings('assets/site/home.css', 'checked with sloplint').length, 1);
  assert.equal(findings('index.html', '<script>window.hallmarkSlots = 1</script>').length, 1);
  assert.ok(findings('AboutUs.dc.html', '<a href="Home%20Atelier.html">HOME</a>').length >= 1);
  assert.ok(findings('AboutUs.dc.html', "location.href = 'Home Atelier.html'").length >= 1);
  assert.ok(findings('index.html', '<link rel="stylesheet" href="atelier/home.css">').length >= 1);
  assert.ok(findings('atelier/home.css', 'body{}').length >= 1);
  assert.ok(findings('Home Atelier.html', '<p></p>').length >= 1);
  assert.ok(findings('index.stamp.css', 'body{}').length >= 1);
  assert.equal(findings('index.html', 'the atelier home page').length, 1);
  // the older product name is tolerated only on the listed older pages
  // no page is exempt any more
  assert.equal(findings('ContactUs.dc.html', 'Project Atelier shows the current status.').length, 1);
  assert.equal(findings('AboutUs.dc.html', 'Project Atelier shows the current status.').length, 1);
  assert.ok(findings('ContactUs.dc.html', '<a href="Home%20Atelier.html">').length >= 1);
});

test('no published file carries a design tool or theme name', () => {
  const problems = [];
  let scanned = 0;
  for (const path of manifest) {
    const isText = textExtensions.has(extname(path).toLowerCase());
    problems.push(...findings(path, isText ? read(path) : ''));
    if (isText) scanned += 1;
  }
  assert.ok(scanned >= 20, `only ${scanned} text files were scanned`);
  assert.deepEqual(problems, []);
});

test('the older product pages are exactly the ones that still use that name', () => {
  for (const path of olderProductPages) {
    assert.ok(manifest.includes(path), `${path} is no longer published: remove it from the list`);
    assert.match(read(path), themeWord, `${path} no longer uses the name: remove it from the list`);
  }
});

test('the checker notes can never be published', () => {
  for (const path of manifest) {
    assert.ok(!path.startsWith('design/'), path);
    assert.ok(!path.endsWith('.stamp.css'), path);
  }
  assert.match(read('scripts/build-public-pages.mjs'), /'design\/',/);
});

test('the front door is the home page and every way back leads to it', () => {
  assert.ok(manifest.includes('index.html'));
  assert.ok(manifest.includes('404.html'));
  assert.ok(!manifest.includes('Home Atelier.html'));
  const index = read('index.html');
  assert.doesNotMatch(index, /http-equiv="refresh"|location\.replace/);
  assert.match(index, /<link rel="stylesheet" href="assets\/site\/home\.css">/);
  // the enquiry page's back button is a script line the build's link check cannot see
  assert.match(read('Renovation Enquiry.dc.html'), /window\.location\.href = '\.\/';/);
  assert.doesNotMatch(read('sitemap.xml'), themeWord);
});
