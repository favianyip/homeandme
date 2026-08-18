import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const page = readFileSync(new URL('Renovation%20Enquiry.dc.html', root), 'utf8');
const manifest = new Set(
  readFileSync(new URL('deploy/public-pages.txt', root), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);
const deniedMedia = new Set(
  readFileSync(new URL('deploy/quarantined-media-sha256.txt', root), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

function constantValue(name, nextName) {
  const pattern = new RegExp(`const ${name} = ([\\s\\S]*?);\\n(?:\\n|const ${nextName})`);
  const match = page.match(pattern);
  assert.ok(match, `${name} must remain a readable top-level constant`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 500 });
}

test('public enquiry exposes the ZIP style directions without weakening publication gates', () => {
  const categories = Array.from(constantValue('CATS', 'STYLES'));
  const styles = Array.from(constantValue('STYLES', 'AREAS'));

  assert.deepEqual(categories, ['ALL', 'POPULAR', 'WARM', 'BOLD', 'CLASSIC', 'CALM']);
  assert.equal(styles.length, 33, 'seven photographed styles plus twenty-six owner-approved concepts');

  const ids = styles.map((style) => style.id);
  assert.equal(new Set(ids).size, styles.length, 'style IDs must be unique');
  for (const required of [
    'minimalist', 'scandinavian', 'japandi', 'contemporary', 'muji',
    'contemporary-luxe', 'mid-century', 'rustic-wood', 'warm-concrete',
    'coastal', 'tropical', 'cottagecore', 'biophilic', 'mediterranean',
    'industrial', 'dark-moody', 'gothic', 'cyberpunk', 'gamer',
    'modern-classic', 'modern-oriental', 'marble-luxe', 'peranakan',
    'heritage-blue', 'art-deco', 'victorian', 'retro-terrazzo', 'study-wfh',
    'family-warm', 'hotel-suite', 'spa-stone', 'soft-neutral', 'bohemian',
  ]) assert.ok(ids.includes(required), `missing style: ${required}`);

  for (const style of styles) {
    assert.ok(style.name && style.note && style.cat, `${style.id} needs complete display copy`);
    if (style.img) {
      assert.match(style.img, /^portfolio\//, `${style.id} may use only reviewed portfolio photography`);
      const publicPath = `assets/${style.img}`;
      assert.ok(manifest.has(publicPath), `${publicPath} must be in the exact Pages manifest`);
      const bytes = readFileSync(new URL(publicPath, root));
      const digest = createHash('sha256').update(bytes).digest('hex');
      assert.ok(!deniedMedia.has(digest), `${publicPath} must not match quarantined media`);
    } else if (style.conceptImg) {
      assert.match(style.conceptImg, /^concepts\//, `${style.id} concept must stay in the disclosed concepts namespace`);
      assert.equal(style.conceptDisclosure, 'AI CONCEPT · NOT A COMPLETED PROJECT');
      const publicPath = `assets/${style.conceptImg}`;
      assert.ok(manifest.has(publicPath), `${publicPath} must be in the exact Pages manifest`);
      const bytes = readFileSync(new URL(publicPath, root));
      const digest = createHash('sha256').update(bytes).digest('hex');
      assert.ok(!deniedMedia.has(digest), `${publicPath} must not match quarantined media`);
    } else {
      assert.equal(Array.isArray(style.palette), true, `${style.id} needs an honest MOOD palette`);
      assert.equal(style.palette.length, 3, `${style.id} palette must have three colours`);
      for (const colour of style.palette) assert.match(colour, /^#[0-9a-f]{6}$/i);
    }
  }

  assert.ok(!ids.includes('monochrome'), 'owner-rejected Monochrome must be removed');
  assert.doesNotMatch(page, /monochrome-hdb-living/i);
  assert.ok(!manifest.has('assets/concepts/monochrome-hdb-living.webp'));

  const conceptIds = [
    'japandi', 'contemporary-luxe', 'mid-century', 'rustic-wood', 'warm-concrete',
    'coastal', 'tropical', 'cottagecore', 'biophilic', 'mediterranean', 'dark-moody',
    'gothic', 'cyberpunk', 'gamer', 'marble-luxe', 'peranakan', 'heritage-blue',
    'art-deco', 'victorian', 'retro-terrazzo', 'study-wfh', 'family-warm',
    'hotel-suite', 'spa-stone', 'soft-neutral', 'bohemian',
  ];
  for (const id of conceptIds) {
    const style = styles.find((entry) => entry.id === id);
    assert.equal(style.conceptImg, `concepts/${id}-hdb-design.webp`, `${id} needs its reviewed concept`);
    assert.equal(style.conceptDisclosure, 'AI CONCEPT · NOT A COMPLETED PROJECT');
  }
  assert.match(page, /alt: s\.name \+ ' AI design concept'/);
  assert.match(page, /s\.conceptDisclosure/);

  assert.doesNotMatch(page, /import\s*\(\s*['"]\.\/journey-(?:vision|archetype)\.js['"]\s*\)/);
  assert.match(page, /Automatic plan reading is off on the public site/);
  assert.match(page, /'modern-contemporary': 'contemporary'/);
  assert.match(page, /'wabi-sabi': 'muji'/);
});
