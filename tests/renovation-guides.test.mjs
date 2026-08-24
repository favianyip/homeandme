import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const guidePaths = [
  'Renovation Guides.dc.html',
  'guides/how-to-read-hdb-floor-plan.html',
  'guides/floor-plan-concept-visualisation.html',
  'guides/hdb-bto-layout-planning.html',
  'guides/hdb-resale-layout-planning.html',
  'guides/concept-visualisation-limitations.html',
];

const read = (path) => readFile(new URL(path, root), 'utf8');

test('renovation guides are discoverable and publication-ready', async () => {
  const [home, manifest, sitemap, ...pages] = await Promise.all([
    read('Home Direct.dc.html'),
    read('deploy/public-pages.txt'),
    read('sitemap.xml'),
    ...guidePaths.map(read),
  ]);

  assert.match(home, /href="Renovation%20Guides\.dc\.html"[^>]*>GUIDES<\/a>/);
  assert.match(home, /href="Renovation%20Guides\.dc\.html"[^>]*>Renovation guides<\/a>/);

  for (let index = 0; index < guidePaths.length; index += 1) {
    const path = guidePaths[index];
    const page = pages[index];
    assert.match(manifest, new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), path);
    assert.match(sitemap, new RegExp(`https://homeandme\\.sg/${path.replace(/ /g, '%20').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), path);
    assert.match(page, /<html lang="en">/i, path);
    assert.match(page, /<title>[^<]+<\/title>/i, path);
    assert.match(page, /<meta name="description" content="[^"]+">/i, path);
    assert.match(page, /<link rel="canonical" href="https:\/\/homeandme\.sg\/[^"]+">/i, path);
    assert.match(page, /<h1\b/i, path);
    assert.doesNotMatch(page, /\[[^\]]+\]\([^)]+\)/, `${path} contains visible Markdown instead of a link`);
    assert.doesNotMatch(page, /<p>\s*---\s*<\/p>/i, `${path} contains a draft separator`);
    assert.doesNotMatch(page, /SERVICE STATUS · LIVE|exactly how our journey works|The five-station order we work in/i, `${path} overstates the live service`);
  }
});

test('guide hub links to every detailed guide', async () => {
  const hub = await read(guidePaths[0]);
  for (const path of guidePaths.slice(1)) {
    assert.match(hub, new RegExp(`href="${path.replace(/^guides\//, 'guides/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), path);
  }
});

test('concept guides keep the in-development 3D boundary explicit', async () => {
  const pages = await Promise.all([
    read('guides/floor-plan-concept-visualisation.html'),
    read('guides/concept-visualisation-limitations.html'),
  ]);
  for (const page of pages) {
    assert.match(page, /floor-plan-to-3D[^<]*still in development/i);
    assert.match(page, /not part of the live enquiry journey|not a claim that 3D is live today/i);
  }
});
