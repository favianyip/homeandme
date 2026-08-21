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

test('public copy matches the server-delivered enquiry with WhatsApp fallback', () => {
  const enquiry = read('Renovation%20Enquiry.dc.html');
  // Delivery claims must stay true: server send + email copy, same-day reply tone.
  assert.match(enquiry, /Sends your enquiry straight to the Home & Me team/);
  assert.match(enquiry, /WhatsApp alert plus an email copy/);
  // The fallback path (endpoint down -> customer presses send in WhatsApp) keeps its honest copy.
  assert.match(enquiry, /did not respond, so this opened in WhatsApp for you to review and press send/);
  // Consent covers storage, not just contact.
  assert.match(enquiry, /I agree Home &amp; Me may store this enquiry and contact me/);
  const legal = read('Legal.dc.html');
  assert.match(legal, /delivered to Home &amp; Me’s own lead system, which stores it securely and alerts our team by WhatsApp and email/);
  assert.doesNotMatch(legal, /visible for you to review before you press send/i);
});

test('enquiry calls exactly the sanctioned lead endpoint and nothing else', () => {
  const enquiry = read('Renovation%20Enquiry.dc.html');
  // One endpoint constant, declared once, and the only fetch on the page.
  const endpoints = enquiry.match(/const LEAD_ENDPOINT = '([^']+)'/g) || [];
  assert.equal(endpoints.length, 1, 'LEAD_ENDPOINT must be declared exactly once');
  assert.match(enquiry, /const LEAD_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/leads'/);
  const fetches = enquiry.match(/fetch\s*\(/g) || [];
  assert.equal(fetches.length, 1, 'exactly one fetch call (the lead POST)');
  assert.match(enquiry, /fetch\(LEAD_ENDPOINT/);
  assert.doesNotMatch(enquiry, /webhookUrl|webhook-url/);
  // Consent gate still guards the send, and the honeypot field is sent empty.
  assert.match(enquiry, /if \(!f\.consent\)/);
  assert.match(enquiry, /hp: ''/);
  assert.match(enquiry, /consentVersion: CONSENT_VERSION/);
});
