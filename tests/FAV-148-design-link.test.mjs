import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

// FAV-148 (FAV-50 page side): after sending, the Enquiry page shows progress and the design link.
const page = readFileSync(new URL('../Renovation%20Enquiry.dc.html', import.meta.url), 'utf8').replace('const ENQUIRY_OPEN = false;', 'const ENQUIRY_OPEN = true;');

function load() {
  const base = page.match(/const STATUS_BASE = '[^']+';/);
  const block = page.match(/\/\/ FAV-50 design-link helpers \(start\)([\s\S]*?)\/\/ FAV-50 design-link helpers \(end\)/);
  assert.ok(base && block, 'helpers must stay readable');
  const ctx = Object.create(null);
  vm.runInNewContext(`${base[0]}\n${block[1]}\nthis.h = { STATUS_BASE, DESIGN_LINK_PREFIX, POLL_MS, POLL_GIVE_UP_MS, makeStatusKey, parseTrack, trackFromHash, statusUrl, safeDesignLink, readStatus, keepPolling };`, ctx, { timeout: 500 });
  return ctx.h;
}
const h = load();
const KEY = '0123456789abcdef0123456789abcdef';

test('statusKey is 32 lowercase hex from getRandomValues and is in the lead body', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i += 1) {
    const k = h.makeStatusKey(webcrypto);
    assert.match(k, /^[0-9a-f]{32}$/);
    seen.add(k);
  }
  assert.equal(seen.size, 50);
  assert.match(page, /cryptoObj\.getRandomValues\(bytes\)/);
  assert.match(page, /const bytes = new Uint8Array\(16\);/);
  assert.doesNotMatch(page.match(/function makeStatusKey[\s\S]*?\n}/)[0], /Math\.random/);
  assert.match(page, /const statusKey = this\.statusKey\(\);/);
  assert.match(page, /\n      statusKey: statusKey,\n    \};/, 'statusKey is a field of the frozen lead payload');
  assert.match(page, /body: JSON\.stringify\(\{ \.\.\.leadPayload, planId \}\)/, 'payload still posted to LEAD_ENDPOINT');
  assert.match(page, /const LEAD_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/leads';\nconst PLAN_ENDPOINT = [^\n]+\nconst STATUS_BASE = 'https:\/\/spark-792d-old\.tail223b04\.ts\.net:10000\/hnm-status\/v1\/';/);
});

test('status URL follows the contract', () => {
  assert.equal(h.statusUrl('HNM-261101-1234', KEY), 'https://spark-792d-old.tail223b04.ts.net:10000/hnm-status/v1/HNM-261101-1234?k=' + KEY);
  assert.match(page, /credentials: 'omit'/);
});

test('only the allowed design link prefix is ever shown', () => {
  const good = 'https://spark-792d-old.tail223b04.ts.net:10000/design-HNM-261101-1234/index.html';
  assert.equal(h.safeDesignLink(good), good);
  for (const bad of [
    'http://spark-792d-old.tail223b04.ts.net:10000/design-x', 'https://spark-792d-old.tail223b04.ts.net.evil.com/design-x',
    'https://evil.com/https://spark-792d-old.tail223b04.ts.net:10000/design-x', 'javascript:alert(1)', 'https://spark-792d-old.tail223b04.ts.net:10000/other',
    'https://spark-792d.tail223b04.ts.net/design-x', 'https://spark-792d-old.tail223b04.ts.net:10000/design-x" onclick="x', '', null, 42, {},
    'https://spark-792d-old.tail223b04.ts.net:10000/design-' + 'a'.repeat(2000),
    'https://spark-792d-old.tail223b04.ts.net/design-x', 'https://spark-792d-old.tail223b04.ts.net:443/design-x', 'https://spark-792d-old.tail223b04.ts.net:8443/design-x', 'https://spark-792d-old.tail223b04.ts.net:100000/design-x',
  ]) assert.equal(h.safeDesignLink(bad), '', String(bad));
  assert.deepEqual({ ...h.readStatus(200, { step: 'ready', link: good }) }, { step: 'ready', link: good });
  assert.equal(h.readStatus(200, { step: 'ready', link: 'https://evil.com/design-x' }), null, 'bad link: keep last state, no link');
  assert.equal(h.readStatus(200, { step: 'ready' }), null);
  assert.match(page, /<a class="track-open" data-design-link="1" sc-camel-href="\{\{ trackLink \}\}" target="_blank" rel="noopener">Open your free design<\/a>/);
  assert.match(page, /const link = t\.step === 'ready' \? safeDesignLink\(t\.link\) : '';/);
});

test('#track parsing is strict', () => {
  assert.deepEqual({ ...h.trackFromHash('#track=HNM-261101-1234.' + KEY) }, { ref: 'HNM-261101-1234', statusKey: KEY });
  for (const bad of [
    '', '#', '#track=', '#track=HNM-261101-1234', '#track=HNM-261101-1234.' + KEY.toUpperCase(), '#track=HNM-261101-1234.' + KEY.slice(1),
    '#track=HNM-261101-1234.' + KEY + 'a', '#track=HNM-26110-1234.' + KEY, '#track=hnm-261101-1234.' + KEY, '#track=HNM-261101-12345.' + KEY,
    '#track=HNM-261101-1234.' + KEY + '&x=1', '#track= HNM-261101-1234.' + KEY, '#style=minimal', '#track=HNM-261101-1234.' + KEY.slice(0, 31) + 'g',
    '#track=HNM-261101-1234.' + KEY + '\n', null, undefined, 7,
  ]) assert.equal(h.trackFromHash(bad), null, JSON.stringify(bad));
  assert.equal(h.parseTrack('<script>.' + KEY), null);
  assert.match(page, /const t = parseTrack\(saved\.ref \+ '\.' \+ saved\.statusKey\);/, 'saved entry validated the same way');
});

test('404 reads as received; other replies map to the 4 steps or keep the last state', () => {
  assert.deepEqual({ ...h.readStatus(404, { step: 'unknown' }) }, { step: 'received', link: '' });
  assert.deepEqual({ ...h.readStatus(404, null) }, { step: 'received', link: '' });
  for (const step of ['received', 'designing', 'checking', 'stopped']) assert.equal(h.readStatus(200, { step }).step, step);
  assert.equal(h.readStatus(200, { step: 'weird' }), null);
  assert.equal(h.readStatus(500, { step: 'ready', link: 'https://spark-792d-old.tail223b04.ts.net:10000/design-x' }), null);
  assert.equal(h.readStatus(200, null), null);
  assert.match(page, /catch \(e\) \{ next = null; \} \/\/ network error: keep the last shown state/);
});

test('polling every 30 s stops at ready or stopped and gives up after 3 hours', () => {
  assert.equal(h.POLL_MS, 30000);
  assert.equal(h.POLL_GIVE_UP_MS, 3 * 60 * 60 * 1000);
  const t0 = 1000;
  for (const step of ['received', 'designing', 'checking']) assert.equal(h.keepPolling(step, t0, t0 + 60000), true);
  assert.equal(h.keepPolling('ready', t0, t0 + 1), false);
  assert.equal(h.keepPolling('stopped', t0, t0 + 1), false);
  assert.equal(h.keepPolling('designing', t0, t0 + 3 * 60 * 60 * 1000), false);
  assert.match(page, /if \(document\.hidden\) return; \/\/ resumes on visibilitychange \/ focus/);
  assert.match(page, /document\.addEventListener\('visibilitychange', this\.onVisibility\);/);
  assert.match(page, /if \(!document\.hidden\) this\._pollTimer = setTimeout\(this\.poll, POLL_MS\);/);
});

test('customer copy: plain, no instant, no quote; come-back link and new enquiry', () => {
  for (const text of ['Our designer checks every design before it is ready. Usually within 30 minutes in the daytime. You can keep this page open.', "'Our designer is checking it'",
    'We need a closer look at your floor plan. We will contact you.', 'Closing this page? Save this link to check your design later.',
    "'COPY LINK'", 'START A NEW ENQUIRY', "'#track=' + t.ref + '.' + t.statusKey"]) assert.ok(page.includes(text), text);
  const view = page.match(/  trackView\(\) \{[\s\S]*?\n  \}\n/)[0] + page.match(/<sc-if value="\{\{ tracking \}\}"[\s\S]*?\n    <\/sc-if>/)[0];
  assert.doesNotMatch(view, /instant|quote/i);
  assert.match(page, /localStorage\.setItem\(TRACK_STORE, JSON\.stringify\(\{ ref, statusKey, at: Date\.now\(\) \}\)\)/);
});
