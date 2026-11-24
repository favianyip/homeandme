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
// 24 Nov 2026: the waiting page and the result page are public, both noindex (floor plan upload open)
const waitingPages = ['preparing.html', 'result.html'];
const journeyText = ['flow.js', 'send.js', 'config.js', 'products.js', 'journey.css', ...journeyPages];
const FRONT = 'https://spark-792d.tail223b04.ts.net/hnm';

test('the public pages are exactly the new home, the journey, Contact and Legal', () => {
  assert.deepEqual(publicPages, [
    '404.html', 'ContactUs.dc.html', 'Legal.dc.html', 'index.html',
    'journey/check.html', 'journey/preparing.html', 'journey/result.html', 'journey/sent.html', 'journey/style.html',
    'journey/themes.html', 'journey/upload.html',
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
  // the journey and the floor plan upload are open (24 Nov 2026): nothing on the home page says "opens soon"
  assert.doesNotMatch(home, /coming soon/i);
  assert.doesNotMatch(home, /opens soon/i);
});

test('the journey is live: four steps, then request received', () => {
  assert.match(read('journey/config.js'), /^window\.HNM_LIVE = true;$/m);
  for (const page of journeyPages) {
    const html = read(`journey/${page}`);
    assert.ok(manifest.includes(`journey/${page}`), page);
    assert.doesNotMatch(html, /Preview:/, `${page} still talks about a preview`);
    assert.match(html, /<script src="config\.js"><\/script>\s*<script src="flow\.js"><\/script>/, `${page} loads the switch first`);
    for (const later of ['payment.html', 'order.html', 'paid.html', 'sample.html', 'next.html']) {
      assert.ok(!html.includes(`"${later}`) && !html.includes(`'${later}`), `${page} points at ${later}, which is not live`);
      assert.ok(!manifest.includes(`journey/${later}`), `${later} must not be public while payment is off`);
    }
  }
  assert.match(read('journey/check.html'), /id="go" href="sent\.html"/);
  // after Send: the waiting page when a floor plan came through, "request received" without one
  assert.match(read('journey/check.html'), /location\.href = r\.planId \? 'preparing\.html\?plan=' \+ encodeURIComponent\(r\.planId\) : 'sent\.html';/);
});

test('the waiting page and the result page: public, noindex, the journey styling, nothing to buy', () => {
  for (const page of waitingPages) {
    const html = read(`journey/${page}`);
    assert.ok(manifest.includes(`journey/${page}`), `${page} is not public`);
    assert.match(html, /<meta name="robots" content="noindex">/, `${page} must be noindex`);
    assert.doesNotMatch(html, /Preview:|wire-test|wire-stage|spark-792d-old|127\.0\.0\.1|localhost/, `${page} carries test or private words`);
    assert.match(html, /<link rel="stylesheet" href="journey\.css">/, `${page} uses the journey stylesheet`);
    assert.doesNotMatch(html, /<style[\s>]/, `${page} brings no stylesheet of its own`);
    assert.match(html, /<body class="white">/, `${page} uses the journey's step-4 paper tone`);
    assert.match(html, /<script src="config\.js"><\/script>\s*<script src="flow\.js"><\/script>/, `${page} loads the switch first`);
    assert.doesNotMatch(html, /S\$\s?\d|priceText|payment\.html|order\.html|Review and pay/, `${page} offers something to buy`);
    for (const later of ['payment.html', 'order.html', 'paid.html', 'sample.html', 'next.html']) {
      assert.ok(!html.includes(`"${later}`) && !html.includes(`'${later}`), `${page} points at ${later}, which is not live`);
    }
  }
  const waiting = read('journey/preparing.html');
  assert.match(waiting, /var POLL_MS = 60000;/, 'status.json is read once a minute (the contract asks for 60 s or slower)');
  assert.doesNotMatch(waiting, /minutesLeft/, 'no minutes are shown: the promise is "usually within 1 working day"');
  assert.match(waiting, /usually within 1 working day/);
  assert.match(waiting, /Coming soon\./, 'the extras say coming soon');
  assert.match(waiting, /btn\.href = 'result\.html\?plan=' \+ planId;/, 'ready leads to the site\'s own result page');
  const result = read('journey/result.html');
  assert.match(result, /soon\.textContent = 'Coming soon';/);
  assert.match(result, /doc\.link !== MINE/, 'the full page link must be the customer\'s own page on the enquiry service');
});

test('an enquiry leaves the browser from one place only, to the Home & Me enquiry service, after consent', () => {
  for (const file of journeyText) {
    const text = read(`journey/${file}`);
    const calls = (text.match(/\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|<form[^>]*action=/g) || []).length;
    if (file === 'send.js') assert.equal(calls, 1, 'send.js makes its requests through one fetch call');
    else assert.equal(calls, 0, `${file} must not talk to a server`);
  }
  // the waiting and result pages read the customer's own status and photos, and the waiting page can send the
  // theme pick; every call goes to the customer's own page on the enquiry service (MINE = HNM_PAGES + planId + '/')
  assert.match(read('journey/config.js'), new RegExp(`^window\\.HNM_PAGES = '${FRONT.replace(/[.]/g, '\\.')}/p/';$`, 'm'));
  for (const [page, n] of [['preparing.html', 2], ['result.html', 1]]) {
    const text = read(`journey/${page}`);
    const calls = text.match(/\bfetch\(([^,]*),/g) || [];
    assert.equal(calls.length, n, `${page} makes ${n} kinds of request`);
    for (const call of calls) assert.match(call, /^fetch\(MINE \+ /, `${page}: ${call} does not go to the customer's own page`);
    assert.match(text, /var MINE = PAGES \+ planId \+ '\/';/);
    assert.match(text, /var PAGES = String\(window\.HNM_PAGES \|\| ''\);/);
    assert.match(text, /\[\?&\]plan=\(\[0-9a-f\]\{16\}\)/, `${page} takes only a 16-hex plan id from its address`);
    assert.doesNotMatch(text, /XMLHttpRequest|sendBeacon|new WebSocket|<form[^>]*action=/);
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
  // 24 Nov 2026: the PDF floor plan only (the service checks the file's own bytes too)
  assert.ok(S.planProblem({ name: 'plan.png', type: 'image/png', size: 1024 }), 'a picture is refused');
  assert.ok(S.planProblem({ name: 'plan.jpg', type: 'image/jpeg', size: 1024 }), 'a photo is refused');
  assert.ok(S.planProblem({ name: 'plan', type: '', size: 1024 }), 'an untyped file without .pdf is refused');
  assert.equal(S.planProblem({ name: 'Plan.PDF', type: '', size: 1024 }), '', 'a .pdf the browser did not type is fine');
  assert.ok(S.nameProblem('  ')); assert.ok(S.phoneProblem('12345')); assert.equal(S.phoneProblem('9123 4567'), '');
  // the enquiry service answers 422 "email is required" (test enquiry, 20 Nov 2026), so the form asks for it
  assert.ok(S.emailProblem('not-an-email')); assert.ok(S.emailProblem('')); assert.equal(S.emailProblem('a@b.sg'), '');
  assert.match(read('journey/upload.html'), /<label for="email">Email<\/label>/);
  const file = { name: 'my flat.pdf', type: 'application/pdf', size: 2048 };
  const out = await S.send({ name: 'A', wa: '91234567', email: '', styleId: 'muji', styleName: 'Muji', themeNo: 3, themeName: 'Dining room', planName: 'my flat.pdf' }, file);
  assert.equal(out.ok, true); assert.equal(out.planAttached, true); assert.match(out.ref, /^HNM-\d{6}-[A-Z2-9]{8}$/);
  assert.equal(out.planId, '0123456789abcdef');
  // the reference passes the enquiry service's rule, and many in one day do not repeat (one plan per reference)
  const refs = new Set(Array.from({ length: 2000 }, () => S.newRef()));
  assert.equal(refs.size, 2000);
  for (const r of refs) assert.match(r, /^[A-Z0-9][A-Z0-9-]{3,39}$/);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].headers['X-Plan-Filename'], 'my%20flat.pdf');
  assert.equal(sent[0].headers['X-Lead-Ref'], out.ref);
  const lead = JSON.parse(sent[1].body);
  assert.equal(sent[0].headers['X-Tester-Key'], undefined, 'no tester key unless the visit came with one');
  assert.deepEqual(Object.keys(lead).sort(), ['consent', 'consentVersion', 'email', 'hp', 'name', 'notes', 'page', 'phone', 'planFilename', 'planId', 'ref', 'styles', 'theme']);
  assert.deepEqual(Array.from(lead.styles), ['muji', 'theme:3']); assert.equal(lead.theme, 3);
  assert.match(lead.notes, /^Design: Muji\. Theme 3: Dining room\./);
  assert.equal(lead.planId, '0123456789abcdef'); assert.equal(lead.consent, true); assert.equal(lead.page, 'journey');
  // the service being down never throws: the page gets ok:false and offers WhatsApp
  sandbox.fetch = async () => { throw new Error('down'); };
  const down = await S.send({ name: 'A', wa: '91234567', styleName: 'Muji', themeNo: 1, themeName: 'Open living' }, null);
  assert.equal(down.ok, false);
  assert.match(S.whatsappLink({ name: 'A', styleName: 'Muji', themeNo: 1, themeName: 'Open living' }, down.ref), /^https:\/\/wa\.me\/6588376196\?text=/);
});

// Owner, 24 Nov 2026: the floor plan upload opens with the engine. The switch stays one line, and switched
// off the pages still work without a plan (the 20 Nov behaviour), so the off path is pinned too.
test('floor plan upload is open behind one switch, and switched off the request still goes', async () => {
  assert.match(read('journey/config.js'), /^window\.HNM_PLAN_UPLOAD = true;$/m);
  assert.match(read('journey/flow.js'), /var PLAN = LIVE \? \(window\.HNM_PLAN_UPLOAD === true \|\| \(window\.HNM_PLAN_UPLOAD === 'testers' && hasTesterKey\(\)\)\) : true;/);
  // the three switch values, run for real: open, closed, testers (with and without a key from the link)
  const planFor = (value, stored, hash) => {
    const store = stored ? { hnm_tester: stored } : {};
    const sandbox = {
      window: { HNM_LIVE: true, HNM_PLAN_UPLOAD: value }, location: { hash: hash || '', pathname: '/journey/upload.html', search: '' },
      history: { replaceState: () => {} },
      sessionStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    };
    vm.runInNewContext(read('journey/flow.js'), sandbox);
    return sandbox.window.HNM_FLOW.PLAN;
  };
  assert.equal(planFor(true), true);
  assert.equal(planFor(false), false);
  assert.equal(planFor('true'), false, 'only the value true opens it');
  assert.equal(planFor('testers'), false, 'testers mode without a key: no upload box');
  assert.equal(planFor('testers', '', '#tester=TEST_ONLY_KEY_000001'), true, 'a tester link opens the box');
  assert.equal(planFor('testers', 'short'), false, 'a malformed stored key does not');
  const upload = read('journey/upload.html');
  assert.match(upload, /if \(!PLAN\) \{[\s\S]*?\['dz', 'planErr', 'planHint', 'unitField'\]\.forEach\(function \(id\) \{ var el = document\.getElementById\(id\); if \(el\) el\.remove\(\); \}\);/,
    'the upload box is taken off the page while the switch is off');
  const check = read('journey/check.html');
  assert.match(check, /HNM_SEND\.send\(details, PLAN \? planFile : null\)/, 'no file is handed to Send while the switch is off');
  assert.match(check, /if \(PLAN\) HNM_FLOW\.loadPlan\(\)/);
  assert.match(read('index.html'), /Upload a floor plan/);
  assert.match(read('index.html'), /Upload your HDB floor plan/);
  assert.match(read('ContactUs.dc.html'), /Start with your floor plan/);
  assert.doesNotMatch(read('index.html'), /Floor plan upload opens soon|upload opens soon/);
  assert.match(read('journey/upload.html'), /accept="application\/pdf,\.pdf"/);
  assert.match(read('journey/upload.html'), /Use the PDF floor plan of your flat from HDB\./);
  assert.doesNotMatch(read('journey/upload.html'), /a JPG|a PNG|photo or scan/);
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
  for (const file of [...journeyText, ...waitingPages]) {
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

test('tester mode: a key from the link goes with the floor plan, and only with it', async () => {
  const sent = [];
  const store = { hnm_tester: 'TEST_ONLY_TESTER_KEY_0001' };
  const sandbox = {
    window: {}, Promise, setTimeout, clearTimeout, encodeURIComponent, JSON, Math, Date, String, AbortController,
    sessionStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    fetch: async (url, opts) => {
      sent.push({ url, headers: opts.headers });
      const body = url.endsWith('/plans') ? { ok: true, planId: 'fedcba9876543210' } : { ok: true, ref: JSON.parse(opts.body).ref };
      return { ok: true, json: async () => body };
    },
  };
  vm.runInNewContext(read('journey/send.js'), sandbox);
  await sandbox.window.HNM_SEND.send({ name: 'A', wa: '91234567', email: 'a@b.sg', styleId: 'muji', styleName: 'Muji', themeNo: 1, themeName: 'Open living' },
    { name: 'plan.pdf', type: 'application/pdf', size: 2048 });
  assert.equal(sent[0].headers['X-Tester-Key'], 'TEST_ONLY_TESTER_KEY_0001');
  assert.equal(sent[1].headers['X-Tester-Key'], undefined, 'the enquiry itself never carries the key');
  // known-bad: a key with other characters is not sent
  store.hnm_tester = 'bad key <script>';
  sent.length = 0;
  await sandbox.window.HNM_SEND.send({ name: 'A', wa: '91234567', email: 'a@b.sg', styleId: 'muji', styleName: 'Muji', themeNo: 1, themeName: 'Open living' },
    { name: 'plan.pdf', type: 'application/pdf', size: 2048 });
  assert.equal(sent[0].headers['X-Tester-Key'], undefined);
  // flow.js takes the key out of the address bar
  assert.match(read('journey/flow.js'), /tester=\(\[A-Za-z0-9_-\]\{16,128\}\)/);
  assert.match(read('journey/flow.js'), /history\.replaceState\(null, '', location\.pathname \+ location\.search\)/);
});
