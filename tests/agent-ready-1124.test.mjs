// 24 Nov 2026: the site is readable by AI assistants. Tier 1: robots.txt, sitemap.xml, JSON-LD on the home
// page, llms.txt. Nothing here changes how a page looks. Every fact must match the visible pages.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const SITE = 'https://homeandme.sg/';
const manifest = read('deploy/public-pages.txt').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&rsquo;/g, '’');
const pathOf = (url) => {
  assert.ok(url.startsWith(SITE), `${url} is not on ${SITE}`);
  const p = url.slice(SITE.length).split('#')[0];
  return p === '' ? 'index.html' : decodeURI(p);
};

test('the new files are on the public list and exist', () => {
  for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'CNAME']) {
    assert.ok(manifest.includes(f), `${f} must be on deploy/public-pages.txt`);
    assert.ok(existsSync(new URL(f, root)), `${f} must exist`);
  }
  assert.ok(existsSync(new URL('.nojekyll', root)));
});

test('robots.txt: the Sitemap line, the named search and user fetchers, and nothing is blocked', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^Sitemap: https:\/\/homeandme\.sg\/sitemap\.xml$/m);
  const groups = robots.split(/\r?\n\r?\n/).map((g) => g.split(/\r?\n/).filter((l) => l && !l.startsWith('#')));
  const rulesFor = (agent) => groups.filter((g) => g.includes(`User-agent: ${agent}`)).flat().filter((l) => !l.startsWith('User-agent'));
  for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot',
    'Perplexity-User', 'Googlebot', 'Bingbot', '*']) {
    assert.deepEqual(rulesFor(agent), ['Allow: /'], `${agent} must be allowed`);
  }
  // training crawlers are the owner's call: they must be named, with a single explicit rule
  for (const agent of ['GPTBot', 'ClaudeBot', 'Google-Extended']) {
    const r = rulesFor(agent);
    assert.equal(r.length, 1, `${agent} is named with one rule`);
    assert.match(r[0], /^(Allow|Disallow): \/$/);
  }
  // noindex pages must stay crawlable, or the crawler never sees the noindex
  assert.doesNotMatch(robots, /Disallow:\s*\/journey/);
});

test('sitemap.xml lists only real, indexable pages that are on the public list', () => {
  const xml = read('sitemap.xml');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(urls.length >= 4);
  assert.equal(new Set(urls).size, urls.length, 'no duplicates');
  for (const url of urls) {
    const path = pathOf(url);
    assert.ok(manifest.includes(path), `${url} is not on the public list`);
    assert.ok(path.endsWith('.html'), `${url} is not a page`);
    assert.notEqual(path, '404.html');
    const html = read(path);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i, `${url} is noindex`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (canonical) assert.equal(canonical[1], url, `${url} is not its own canonical`);
  }
  for (const must of [SITE, `${SITE}journey/upload.html`, `${SITE}ContactUs.dc.html`, `${SITE}Legal.dc.html`]) {
    assert.ok(urls.includes(must), `${must} must be listed`);
  }
  // known-bad: an asset or a removed page in the list would be caught by the checks above
  assert.ok(!manifest.includes('AboutUs.dc.html'));
});

test('the home page JSON-LD parses and matches the visible pages', () => {
  const home = read('index.html');
  const blocks = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  assert.ok(home.indexOf('application/ld+json') < home.indexOf('</head>'), 'JSON-LD is in the head');
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  const biz = data['@graph'].find((n) => n['@type'] === 'HomeAndConstructionBusiness');
  const svc = data['@graph'].find((n) => n['@type'] === 'Service');
  assert.ok(biz && svc);
  const canonical = home.match(/<link rel="canonical" href="([^"]+)"/)[1];
  assert.equal(biz.url, canonical);
  assert.ok(decode(home).includes(biz.name), 'the business name is on the page');
  assert.equal(biz.description, decode(home.match(/<meta name="description" content="([^"]+)"/)[1]));
  assert.equal(biz.areaServed.name, 'Singapore');
  // every contact fact is on the Contact page as shown
  const contact = decode(read('ContactUs.dc.html'));
  assert.ok(contact.includes(biz.telephone), 'telephone is on the Contact page');
  assert.ok(contact.includes(biz.email), 'email is on the Contact page');
  assert.ok(contact.includes(biz.address.streetAddress), 'street address is on the Contact page');
  assert.ok(contact.includes(`Singapore ${biz.address.postalCode}`), 'postal code is on the Contact page');
  assert.equal(biz.contactPoint.telephone, biz.telephone);
  assert.equal(biz.contactPoint.email, biz.email);
  // social profiles are links the home page already shows
  for (const link of biz.sameAs) assert.ok(home.includes(`href="${link}`), `${link} is linked on the home page`);
  // the service is the free design request, and no paid extra is offered yet
  assert.equal(svc.url, `${SITE}journey/upload.html`);
  assert.equal(svc.provider['@id'], biz['@id']);
  assert.equal(svc.offers.price, '0');
  assert.equal(svc.offers.priceCurrency, 'SGD');
  assert.doesNotMatch(blocks[0][1], /"price": "(?!0")/);
  assert.doesNotMatch(blocks[0][1], /S\$|drawing pack|video/i);
  // 25 Nov 2026 release: the floor plan upload stays closed, and the description says so (the upload-open copy is
  // the follow-up branch site/upload-open-1125)
  assert.match(home, /opens soon/);
  assert.match(svc.description, /upload is not open yet/);  // not the words "opens soon": an older test counts those on the page
  assert.equal(pathOf(svc.url), 'journey/upload.html');
});

test('llms.txt: plain, no price, contact matches the Contact page, every link is a public page', () => {
  const txt = read('llms.txt');
  assert.match(txt, /^# Home & Me$/m);
  assert.doesNotMatch(txt, /S\$|\$\d/, 'no price is stated');
  assert.match(txt, /opens soon/);
  assert.match(txt, /Floor plan upload is closed\./);
  const contact = decode(read('ContactUs.dc.html'));
  for (const fact of ['+65 8837 6196', 'homeandme2017@gmail.com', '21 Toh Guan Road East, #03-02 Toh Guan Centre, Singapore 608609']) {
    assert.ok(contact.includes(fact), `${fact} is on the Contact page`);
    assert.ok(txt.includes(fact), `${fact} is in llms.txt`);
  }
  const links = [...txt.matchAll(/https:\/\/homeandme\.sg\/[^\s)]*/g)].map((m) => m[0].replace(/[.,]$/, ''));
  assert.ok(links.length >= 4);
  for (const url of links) assert.ok(manifest.includes(pathOf(url)), `${url} is not a public page`);
  for (const must of [`${SITE}ContactUs.dc.html`, `${SITE}Legal.dc.html`]) assert.ok(links.includes(must));
  // the seven designs named are the ones the home page names
  const home = decode(read('index.html'));
  for (const name of ['Modern Classic', 'Muji', 'Scandinavian', 'Minimalist', 'Contemporary', 'Industrial', 'Modern Oriental']) {
    assert.ok(home.includes(`>${name}<`), `${name} is on the home page`);
    assert.ok(txt.includes(name));
  }
});

test('journey pages: one h1, every field has a programmatic label, every button has text', () => {
  for (const page of ['upload', 'style', 'themes', 'check', 'sent', 'preparing', 'result']) {
    const html = read(`journey/${page}.html`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${page}: exactly one h1`);
    for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
      const attrs = m[2];
      if (/type="hidden"|\bhidden\b/.test(attrs)) continue;
      const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
      const labelled = /aria-label="[^"]+"|aria-labelledby="[^"]+"/.test(attrs)
        || (id && new RegExp(`<label[^>]*for="${id}"`).test(html))
        || new RegExp(`<label\\b[^>]*>(?:(?!</label>)[\\s\\S])*<(?:input|select|textarea)\\b[^>]*id="${id}"`).test(html);
      assert.ok(labelled, `${page}: field ${id || attrs} has no label`);
    }
    for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = m[2].replace(/<[^>]*>/g, '').trim();
      assert.ok(text || /aria-label="[^"]+"/.test(m[1]), `${page}: a button has no text`);
    }
  }
});
