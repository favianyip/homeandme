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
  // Delivery claims must stay true: the response confirms storage, while alerts happen afterward.
  assert.match(enquiry, /Your enquiry was received and stored/);
  assert.match(enquiry, /goes to our secure enquiry line/);
  assert.doesNotMatch(enquiry, /lands with our team instantly|WhatsApp alert plus an email copy/);
  // The fallback path must account for popup blocking.
  assert.match(enquiry, /could not confirm it opened/);
  assert.match(enquiry, /fallbackOpened = !!window\.open/);
  // Consent covers storage, not just contact.
  assert.match(enquiry, /I agree Home &amp; Me may store this enquiry and contact me/);
  const legal = read('Legal.dc.html');
  assert.match(legal, /delivered to Home &amp; Me’s own lead system, which stores it — including any floor plan you upload — securely and alerts our team by WhatsApp and email/);
  assert.doesNotMatch(legal, /visible for you to review before you press send/i);
});

test('homepage describes the adaptive journey and keeps floor plans optional', () => {
  const home = read('Home%20Direct.dc.html');
  const index = read('index.html');
  assert.match(home, /Choose whole home or selected rooms, build the scope, and add a floor plan if you have one/);
  assert.match(home, /A floor plan is helpful, not required/);
  assert.match(home, /does not automatically read or price from the plan/);
  assert.match(home, /stored securely, then our team is alerted by WhatsApp and email/);
  assert.match(home, /class="skip-link" href="#top"/);
  assert.match(home, /aria-label="\{\{ menuLabel \}\}" aria-expanded="\{\{ menuOpen \}\}"/);
  assert.match(home, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(index, /add a floor plan if you have one/);
  assert.doesNotMatch(home, /UPLOAD FLOOR PLAN|we read the layout and size|lands with our team instantly|Floor plan to 3D|plan reading is tuned/i);
});

test('enquiry calls exactly the sanctioned lead endpoint and nothing else', () => {
  const enquiry = read('Renovation%20Enquiry.dc.html');
  // One endpoint constant, declared once, and the only fetch on the page.
  const endpoints = enquiry.match(/const LEAD_ENDPOINT = '([^']+)'/g) || [];
  assert.equal(endpoints.length, 1, 'LEAD_ENDPOINT must be declared exactly once');
  assert.match(enquiry, /const LEAD_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/leads'/);
  const fetches = enquiry.match(/fetch\s*\(/g) || [];
  assert.equal(fetches.length, 2, 'exactly two fetch calls (plan upload + lead POST)');
  assert.match(enquiry, /fetch\(LEAD_ENDPOINT/);
  assert.match(enquiry, /fetch\(PLAN_ENDPOINT/);
  assert.match(enquiry, /const PLAN_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/plans'/);
  assert.doesNotMatch(enquiry, /webhookUrl|webhook-url/);
  // Consent gate still guards the send, and the honeypot field is sent empty.
  assert.match(enquiry, /if \(!f\.consent\)/);
  assert.match(enquiry, /hp: ''/);
  assert.match(enquiry, /consentVersion: CONSENT_VERSION/);
});
