// 12 Nov 2026, owner: "Do not let customer submit anything first. Just say it's coming soon on the live website."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const page = readFileSync(new URL('../Renovation%20Enquiry.dc.html', import.meta.url), 'utf8');   // the REAL file: closed
const home = readFileSync(new URL('../Home%20Direct.dc.html', import.meta.url), 'utf8');
const script = page.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

function setup(source, fetchLog) {
  class Logic { props = {}; setState(update, done) { const next = typeof update === 'function' ? update(this.state) : update; if (next) this.state = { ...this.state, ...next }; if (done) done(); } }
  const ctx = {
    DCLogic: Logic, AbortController, React: { createElement: (type, props, ...kids) => ({ type, props, kids }) },
    window: { scrollTo() {}, addEventListener() {}, removeEventListener() {}, crypto: webcrypto, open() { fetchLog.push('window.open'); return true; } },
    document: { hidden: false, addEventListener() {}, removeEventListener() {}, querySelector() { return null; } },
    location: { hash: '', href: 'https://homeandme.sg/Renovation%20Enquiry.dc.html', hostname: 'homeandme.sg' },
    localStorage: { setItem() {}, removeItem() {}, getItem() { return null; } },
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    fetch(url) { fetchLog.push(String(url)); return new Promise(() => {}); },
  };
  vm.runInNewContext(source + '\nthis.Component=Component;', ctx, { timeout: 1000 });
  return new ctx.Component();
}

test('the live file is closed: one switch, set to false', () => {
  assert.equal((script.match(/const ENQUIRY_OPEN = /g) || []).length, 1);
  assert.match(script, /const ENQUIRY_OPEN = false;/);
});

test('closed: the page says COMING SOON and draws neither the form nor its send bar', () => {
  const calls = [];
  const c = setup(script, calls);
  const v = c.renderVals();
  assert.equal(v.comingSoon, true);
  assert.equal(v.enquiryOpen, false);
  assert.equal(v.stepName, 'COMING SOON');
  // every step of the form and the send bar sit inside the enquiryOpen wrapper; the coming-soon panel does not
  const main = page.slice(page.indexOf('<main id="enquiry-main"'), page.indexOf('<nav data-tabbar="1"'));
  const open = main.indexOf('<sc-if value="{{ enquiryOpen }}"');
  const soon = main.indexOf('data-coming-soon="1"');
  assert.ok(soon > 0 && soon < open, 'the coming-soon panel is outside the wrapper');
  for (const mark of ['{{ onStep1 }}', '{{ onIdeasStep }}', '{{ onStep4 }}', '{{ onStep5 }}', 'type="file"', 'name="consent"']) {
    assert.ok(main.indexOf(mark) > open, mark + ' is only drawn while the enquiry is open');
  }
  const bar = page.indexOf('data-actionbar="1"');
  assert.ok(page.lastIndexOf('<sc-if value="{{ enquiryOpen }}"', bar) > page.indexOf('</main>'), 'the send bar has its own closed wrapper');
  assert.match(page, /<span class="soon-badge">COMING SOON<\/span>/);
  assert.match(page, /<h1 id="soon-title">See your own flat designed/);
});

test('closed, known-bad: a send forced past the screen sends nothing (no lead, no floor plan, no WhatsApp prefill)', async () => {
  const calls = [];
  const c = setup(script, calls);
  c.state = { ...c.state, route: 'whole', step: 5, f: { ...c.state.f, flatType: '4-room', name: 'Tan Wei Ling', phone: '91234567', email: 'a@b.sg', street: 'Blk 1', postal: '123456', consent: true } };
  c.planFile = { name: 'plan.pdf', size: 1000, type: 'application/pdf' };
  await c.send();
  assert.deepEqual(calls, []);
  assert.equal(c.state.sending, false);
  assert.notEqual(c.state.sent, true);
});

test('open again with the one switch: the form is back (the same code, kept for reopening)', () => {
  const c = setup(script.replace('const ENQUIRY_OPEN = false;', 'const ENQUIRY_OPEN = true;'), []);
  const v = c.renderVals();
  assert.equal(v.comingSoon, false);
  assert.equal(v.enquiryOpen, true);
  assert.equal(v.onStep1, true);
});

test('a come-back link of an enquiry already sent still shows its status, not the coming-soon panel', () => {
  const c = setup(script, []);
  c.state = { ...c.state, track: { ref: 'HNM-261101-0001', statusKey: '0'.repeat(32), step: 'received', link: '' } };
  const v = c.renderVals();
  assert.equal(v.tracking, true);
  assert.equal(v.comingSoon, false);
});

test('the showcase shows one whole flat as renders of a proposed design, honestly labelled, from the public list only', () => {
  const soon = page.slice(page.indexOf('data-coming-soon="1"'), page.indexOf('<sc-if value="{{ enquiryOpen }}"'));
  const imgs = [...soon.matchAll(/<img src="([^"]+)"[^>]*alt="([^"]+)"[^>]*width="1344" height="752"/g)];
  assert.equal(imgs.length, 6);   // the hero and one photo a room
  const list = readFileSync(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8');
  for (const [, src] of imgs) assert.ok(list.split('\n').includes(src), src + ' is in the public list');
  assert.match(soon, /Every image is a render of a proposed design for one HDB flat[^<]*They are not photos of completed work\./);
  assert.doesNotMatch(soon, /\$|S\$|\u2014|type="file"|<input|<form/);   // no price, no em dash, nothing to fill in
});

test('Home no longer invites an enquiry that cannot be sent', () => {
  assert.doesNotMatch(home, />START ENQUIRY<|>START THIS DESIGN|>ADD ONE TO MY ENQUIRY<|>Start enquiry</);
  assert.equal((home.match(/>START<\/a>/g) || []).length, 4, 'owner, 12 Nov: the enquiry button says START');
});

test('closed: START always lands on the coming-soon page, even in a browser that holds an earlier enquiry; a come-back link still works', () => {
  const mount = script.slice(script.indexOf('  componentDidMount() {'), script.indexOf('// FAV-50: after a send, the same page shows progress'));
  assert.match(mount, /if \(fromHash\) \{[\s\S]*?this\.startTracking\(fromHash\.ref, fromHash\.statusKey/);
  assert.match(mount, /\} else if \(saved && ENQUIRY_OPEN\) this\.startTracking\(saved\.ref, saved\.statusKey, saved\.at\);/);
  assert.doesNotMatch(mount, /else if \(saved\) this\.startTracking/);
  assert.doesNotMatch(mount, /ENQUIRY_OPEN[^\n]*removeItem\(TRACK_STORE\)/, 'the saved enquiry is left in the browser, not deleted');
});
