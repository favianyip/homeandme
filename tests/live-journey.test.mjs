// 20 Nov 2026, owner: "lets ship this live online take down the current other webpage. and make sure to link up
// everything ... we need a system connected to whatsapp and ping us whenever there is a requested submission so
// firstly we can review it. for the engine lets do at a later part".
// Live: the new home page, the journey (floor plan, design, theme, send, request received), Contact and Legal.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = read('deploy/public-pages.txt').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const publicPages = manifest.filter((p) => p.endsWith('.html')).sort();
const journeyPages = ['upload.html', 'style.html', 'themes.html', 'check.html', 'sent.html'];
const journeyText = ['flow.js', 'send.js', 'config.js', 'products.js', 'journey.css', ...journeyPages];

test('the public pages are exactly the new home, the journey, Contact and Legal', () => {
  assert.deepEqual(publicPages, [
    '404.html', 'ContactUs.dc.html', 'Legal.dc.html', 'index.html',
    'journey/check.html', 'journey/sent.html', 'journey/style.html', 'journey/themes.html', 'journey/upload.html',
  ]);
});

test('every older page is off the public list, and nothing public links to one', () => {
  const gone = ['AboutUs.dc.html', 'FaqAndHelp.dc.html', 'Home Direct.dc.html', 'Renovation Enquiry.dc.html',
    'Renovation Guides.dc.html', 'Home AI.dc.html', 'Home Redesign.dc.html', 'Login.dc.html', 'MyProject.dc.html',
    'ProjectJourney.html', 'ReviewedReferences.html', 'Design3D.html', 'Portfolio.html', 'PlanLookup.html',
    'HousingIdentity.html', 'editor.html'];
  for (const page of gone) assert.ok(!manifest.includes(page), `${page} must not be public`);
  // known-bad: the check below must catch a link to a removed page
  const linksTo = (html, page) => html.includes(`href="${encodeURI(page)}`) || html.includes(`href="${page}`);
  assert.ok(linksTo('<a href="Renovation%20Enquiry.dc.html">x</a>', 'Renovation Enquiry.dc.html'));
  for (const path of publicPages) {
    const html = read(path);
    for (const page of gone) assert.ok(!linksTo(html, page), `${path} links to ${page}`);
  }
});

test('the home page starts the journey from every Start button and design card', () => {
  const home = read('index.html');
  assert.ok((home.match(/href="journey\/upload\.html"/g) || []).length >= 4);
  assert.equal((home.match(/href="journey\/upload\.html#style=[a-z-]+"/g) || []).length, 7);
  // the journey is open; only the floor plan upload "opens soon" (see the upload-closed test below)
  assert.doesNotMatch(home, /coming soon/i);
  assert.equal((home.match(/opens soon/gi) || []).length, 2, 'only the two floor plan upload lines say "opens soon"');
});

test('the journey is live: four steps, then request received', () => {
  assert.match(read('journey/config.js'), /^window\.HNM_LIVE = true;$/m);
  for (const page of journeyPages) {
    const html = read(`journey/${page}`);
    assert.ok(manifest.includes(`journey/${page}`), page);
    assert.doesNotMatch(html, /Preview:/, `${page} still talks about a preview`);
    assert.match(html, /<script src="config\.js"><\/script>\s*<script src="flow\.js"><\/script>/, `${page} loads the switch first`);
    for (const later of ['preparing.html', 'result.html', 'payment.html', 'order.html', 'paid.html', 'sample.html', 'next.html']) {
      assert.ok(!html.includes(`"${later}`) && !html.includes(`'${later}`), `${page} points at ${later}, which is not live`);
      assert.ok(!manifest.includes(`journey/${later}`), `${later} must not be public before the engine is wired`);
    }
  }
  assert.match(read('journey/check.html'), /id="go" href="sent\.html"/);
});

test('an enquiry leaves the browser from one place only, to the Home & Me enquiry service, after consent', () => {
  for (const file of journeyText) {
    const text = read(`journey/${file}`);
    const calls = (text.match(/\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|<form[^>]*action=/g) || []).length;
    if (file === 'send.js') assert.equal(calls, 1, 'send.js makes its requests through one fetch call');
    else assert.equal(calls, 0, `${file} must not talk to a server`);
  }
  const send = read('journey/send.js');
  assert.match(send, /var LEAD_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/leads';/);
  assert.match(send, /var PLAN_ENDPOINT = 'https:\/\/spark-792d\.tail223b04\.ts\.net\/hnm\/v1\/plans';/);
  assert.equal((send.match(/https?:\/\/[^'"\s]+/g) || []).filter((u) => !u.startsWith('https://spark-792d.tail223b04.ts.net/hnm/v1/') && !u.startsWith('https://wa.me/')).length, 0);
  const check = read('journey/check.html');
  assert.match(check, /<input type="checkbox" id="consent">/);
  assert.match(check, /if \(sending \|\| !box\.checked\) return;/, 'Send does nothing until the consent box is ticked');
  assert.match(check, /consent: true|HNM_SEND\.send\(/);
  assert.match(send, /consent: true,\s*consentVersion: CONSENT_VERSION/);
});

test('what is sent: the checks on the floor plan step and the enquiry itself', async () => {
  const sent = [];
  const sandbox = {
    window: {}, Promise, setTimeout, clearTimeout, encodeURIComponent, JSON, Math, Date, String,
    AbortController,
    fetch: async (url, opts) => {
      sent.push({ url, headers: opts.headers, body: opts.body });
      const body = url.endsWith('/plans') ? { ok: true, planId: '0123456789abcdef' } : { ok: true, ref: JSON.parse(opts.body).ref };
      return { ok: true, json: async () => body };
    },
  };
  vm.runInNewContext(read('journey/send.js'), sandbox);
  const S = sandbox.window.HNM_SEND;
  // known-bad inputs are refused in words
  assert.ok(S.planProblem(null)); assert.ok(S.planProblem({ type: 'text/plain', size: 10 }));
  assert.ok(S.planProblem({ type: 'application/pdf', size: 11 * 1024 * 1024 }));
  assert.equal(S.planProblem({ type: 'application/pdf', size: 1024 }), '');
  assert.ok(S.nameProblem('  ')); assert.ok(S.phoneProblem('12345')); assert.equal(S.phoneProblem('9123 4567'), '');
  // the enquiry service answers 422 "email is required" (test enquiry, 20 Nov 2026), so the form asks for it
  assert.ok(S.emailProblem('not-an-email')); assert.ok(S.emailProblem('')); assert.equal(S.emailProblem('a@b.sg'), '');
  assert.match(read('journey/upload.html'), /<label for="email">Email<\/label>/);
  const file = { name: 'my flat.pdf', type: 'application/pdf', size: 2048 };
  const out = await S.send({ name: 'A', wa: '91234567', email: '', styleName: 'Muji', themeNo: 3, themeName: 'Dining room', planName: 'my flat.pdf' }, file);
  assert.equal(out.ok, true); assert.equal(out.planAttached, true); assert.match(out.ref, /^HNM-\d{6}-\d{4}$/);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].headers['X-Plan-Filename'], 'my%20flat.pdf');
  assert.equal(sent[0].headers['X-Lead-Ref'], out.ref);
  const lead = JSON.parse(sent[1].body);
  assert.deepEqual(Object.keys(lead).sort(), ['consent', 'consentVersion', 'email', 'hp', 'name', 'notes', 'page', 'phone', 'planFilename', 'planId', 'ref', 'styles']);
  assert.deepEqual(lead.styles, ['Muji']); assert.match(lead.notes, /^Theme 3: Dining room\./);
  assert.equal(lead.planId, '0123456789abcdef'); assert.equal(lead.consent, true); assert.equal(lead.page, 'journey');
  // the service being down never throws: the page gets ok:false and offers WhatsApp
  sandbox.fetch = async () => { throw new Error('down'); };
  const down = await S.send({ name: 'A', wa: '91234567', styleName: 'Muji', themeNo: 1, themeName: 'Open living' }, null);
  assert.equal(down.ok, false);
  assert.match(S.whatsappLink({ name: 'A', styleName: 'Muji', themeNo: 1, themeName: 'Open living' }, down.ref), /^https:\/\/wa\.me\/6588376196\?text=/);
});

// Owner, 20 Nov 2026: "go live but do not let people upload plans because engine not ready".
test('floor plan upload is closed behind one switch, and no page invites an upload', async () => {
  assert.match(read('journey/config.js'), /^window\.HNM_PLAN_UPLOAD = false;$/m);
  assert.match(read('journey/flow.js'), /var PLAN = LIVE \? window\.HNM_PLAN_UPLOAD === true : true;/);
  const upload = read('journey/upload.html');
  assert.match(upload, /if \(!PLAN\) \{[\s\S]*?\['dz', 'planErr', 'planHint'\]\.forEach\(function \(id\) \{ var el = document\.getElementById\(id\); if \(el\) el\.remove\(\); \}\);/,
    'the upload box is taken off the page while the switch is off');
  const check = read('journey/check.html');
  assert.match(check, /HNM_SEND\.send\(details, PLAN \? planFile : null\)/, 'no file is handed to Send while the switch is off');
  assert.match(check, /if \(PLAN\) HNM_FLOW\.loadPlan\(\)/);
  for (const page of ['index.html', 'ContactUs.dc.html']) {
    const html = read(page);
    assert.doesNotMatch(html, /Upload a floor plan|Upload your HDB floor plan|Start with your floor plan|Upload the plan/, `${page} still invites an upload`);
  }
  assert.match(read('index.html'), /Floor plan upload opens soon\./);
  // with no file, Send makes ONE request (the enquiry) and none to the floor plan address
  const urls = [];
  const sandbox = {
    window: {}, Promise, setTimeout, clearTimeout, encodeURIComponent, JSON, Math, Date, String, AbortController,
    fetch: async (url, opts) => { urls.push(url); return { ok: true, json: async () => ({ ok: true, ref: JSON.parse(opts.body).ref }) }; },
  };
  vm.runInNewContext(read('journey/send.js'), sandbox);
  const out = await sandbox.window.HNM_SEND.send({ name: 'A', wa: '91234567', email: 'a@b.sg', styleName: 'Muji', themeNo: 2, themeName: 'Feature wall', noPlan: true }, null);
  assert.equal(out.ok, true); assert.equal(out.planAttached, false);
  assert.deepEqual(urls, ['https://spark-792d.tail223b04.ts.net/hnm/v1/leads']);
});

test('no price on the public journey, and the theme pictures are disclosed as AI-visualised samples', () => {
  for (const file of journeyText) {
    const text = read(`journey/${file}`);
    assert.doesNotMatch(text, /S\$\s?\d|\$\s?\d+\b|priceText|\bprice:/, `${file} carries a price`);
  }
  assert.doesNotMatch(read('index.html'), /S\$\s?\d/);
  const themes = read('journey/themes.html');
  assert.match(themes, /AI-visualised samples of one sample 5-room flat, not photos of a finished home/);
  assert.match(themes, /an AI-visualised sample/);
});

test('every design has its four themes of four rooms, and the label is Main bedroom', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read('journey/products.js'), sandbox);
  const J = sandbox.window.HNM_JOURNEY;
  assert.equal(J.STYLES.length, 26);
  assert.deepEqual(Object.keys(J.PRODUCTS), []);
  let pictures = 0;
  for (const style of J.STYLES) {
    const set = J.themesFor(style.id);
    assert.equal(set.own, true, style.id);
    assert.deepEqual(Array.from(set.rooms, (r) => r[1]), ['Living room', 'Main bedroom', 'Kitchen', 'Toilet']);
    assert.equal(set.items.length, 4);
    for (const theme of set.items) {
      for (const shot of theme.shots) {
        const path = `journey/${shot.src}`;
        assert.ok(manifest.includes(path), `${path} is not public`);
        assert.ok(existsSync(new URL(path, root)), `${path} is missing`);
        pictures += 1;
      }
    }
    const card = style.rooms[0].src;
    assert.ok(manifest.includes(card) && existsSync(new URL(card, root)), `${card} (design card of ${style.id})`);
  }
  assert.equal(pictures, 416);
});
