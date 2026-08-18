import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = new Set(
  read('deploy/public-pages.txt')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

test('public artifact includes crawl controls and a canonical sitemap', () => {
  assert.ok(manifest.has('robots.txt'));
  assert.ok(manifest.has('sitemap.xml'));
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/homeandme\.sg\/sitemap\.xml$/m);
  for (const url of [
    'https://homeandme.sg/',
    'https://homeandme.sg/Home%20Direct.dc.html',
    'https://homeandme.sg/Renovation%20Enquiry.dc.html',
    'https://homeandme.sg/Legal.dc.html',
  ]) assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
});

test('content pages expose page-specific search metadata', () => {
  const home = read('Home%20Direct.dc.html');
  const enquiry = read('Renovation%20Enquiry.dc.html');
  assert.match(home, /<title>Home &amp; Me — Direct Contractor Renovation, Singapore<\/title>/);
  assert.match(home, /<meta name="description" content="[^"]+">/);
  assert.match(home, /<link rel="canonical" href="https:\/\/homeandme\.sg\/Home%20Direct\.dc\.html">/);
  assert.match(enquiry, /<title>Renovation Enquiry — Home &amp; Me<\/title>/);
  assert.match(enquiry, /<meta name="description" content="[^"]+">/);
  assert.match(enquiry, /<link rel="canonical" href="https:\/\/homeandme\.sg\/Renovation%20Enquiry\.dc\.html">/);
  assert.match(enquiry, /@media \(max-width: 560px\)[\s\S]*\[data-plan-fields\][\s\S]*grid-template-columns: 1fr !important/,
    'narrow screens must stack plan-reading fields instead of widening the viewport');
});

test('legal copy matches the enquiry-only service and current cookie behavior', () => {
  const legal = read('Legal.dc.html');
  assert.doesNotMatch(legal, /checkout|live, itemised estimates|payments released by milestone/i);
  assert.doesNotMatch(legal, /we use[^.]*analytics cookies/i);
  assert.match(legal, /why we collect/i);
  assert.match(legal, /retention/i);
  assert.match(legal, /withdraw consent/i);
  assert.match(legal, /data protection contact/i);
});

test('public copy describes the real WhatsApp handoff without claiming a group delivery', () => {
  const home = read('Home%20Direct.dc.html');
  const enquiry = read('Renovation%20Enquiry.dc.html');
  for (const page of [home, enquiry]) {
    assert.doesNotMatch(page, /lands in our team WhatsApp|picks it up in the group|posted to the team channel/i);
  }
  assert.match(enquiry, /opens WhatsApp with the enquiry written out/i);
  assert.match(enquiry, /you (?:review it and )?press send/i);
});

test('static enquiry never exposes or calls a private lead webhook from the browser', () => {
  const enquiry = read('Renovation%20Enquiry.dc.html');
  assert.doesNotMatch(enquiry, /webhookUrl|webhook-url|fetch\s*\(/);
});
