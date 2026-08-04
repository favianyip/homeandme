import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('active public pages describe service-gated review, not browser-authored measured geometry', async () => {
  const [index, home, projectJourney, projectJourneyUi, config] = await Promise.all([
    read('index.html'),
    read('Home AI.dc.html'),
    read('ProjectJourney.html'),
    read('project-journey.js'),
    read('config.js'),
  ]);
  const published = `${home}\n${projectJourney}\n${projectJourneyUi}`;

  for (const forbidden of [
    'The current service renderer',
    'fully refundable within 7 days',
    '5% PayNow deposit reserves your renovation slot',
    'exact rooms take shape',
    'built with real walls, doors and windows',
    'TRACED 1:1',
    'pixel-exact',
    'floors are the exact room regions',
    'no site visit needed to get real numbers',
    '3D SKETCH — 1:1 EXTRUSION',
    'Walls extruded 1:1',
    'RAW 1:1 TRACE',
    'Every wall is extruded 1:1',
    'drafts the 3D by itself',
    'no drawing skills needed',
    'Recognition runs Claude vision',
    'QUEUE PHOTOREAL RENDER',
    'PLAN → 3D DRAFTED AUTOMATICALLY',
    'identical to the 3D journey’s live price book',
    'paid the deposit by Friday',
  ]) {
    assert.equal(published.toLowerCase().includes(forbidden.toLowerCase()), false, `unsafe capability claim: ${forbidden}`);
  }

  assert.match(home, /Public upload and 3D generation are unavailable unless Project Atelier explicitly reports them enabled/i);
  assert.match(home, /This page has no enquiry form and does not collect your name, phone number, message or floor plan/i);
  assert.match(index, /Review-First Renovation Service Status/i);
  assert.doesNotMatch(index, /Upload a floor plan|AI-First Renovation Platform/i);
  assert.doesNotMatch(home, /The public tool can build|The public journey can make|Plan received|>Online|<input|<textarea|<iframe|cName|cPhone|cMsg|reply within one working day/i);
  assert.match(config, /DEMO_FALLBACK_ENABLED:\s*false/);
  assert.match(home, /ProjectJourney\.html/);
  assert.match(projectJourney, /Accuracy promise/i);
  assert.match(projectJourneyUi, /PDF native-vector review cannot yet be approved here/i);
  assert.doesNotMatch(projectJourneyUi, /accept:\s*['"][^'"]*pdf/i);
  assert.match(projectJourneyUi, /workflow\.calibrateGeometry/);
  assert.match(projectJourneyUi, /Choose measured swing/);
  assert.match(projectJourneyUi, /optionSetSha256/);
  assert.match(projectJourneyUi, /layoutSha256/);
  assert.match(projectJourneyUi, /image\.decode/);
  assert.match(projectJourneyUi, /Private model preview unavailable/);
  assert.match(projectJourneyUi, /canonicalGeometryChanges/);
  assert.match(projectJourneyUi, /sourceArtifactSha256/);
  assert.match(projectJourneyUi, /artifact\.bytes\.byteLength !== source\.byteSize/);
  assert.match(projectJourneyUi, /downloadedSha256 !== source\.sourceArtifactSha256/);
  assert.match(projectJourneyUi, /decoded\.width !== source\.intrinsicPixels\.width/);
  assert.match(projectJourneyUi, /decoded\.height !== source\.intrinsicPixels\.height/);
  assert.match(projectJourneyUi, /setPointerCapture/);
  assert.match(projectJourneyUi, /validateCorrectionWitnesses/);
});

test('retired prototype routes cannot expose query bypasses, transaction UI or local success state', async () => {
  const legacyNames = [
    'Journey.html',
    'Checkout.dc.html',
    'Home AI Refined.dc.html',
    'Home Redesign v2.dc.html',
    'Customize.dc.html',
    'Login.dc.html',
    'MyProject.dc.html',
    'Assistant.dc.html',
    'PlanLookup.html',
    'PlanIntake.html',
    'PlanDetect.html',
    'SketchMyFlat.html',
    'Studio.html',
    'HousingIdentity.html',
    'Home.dc.html',
    'Floorplan Detection Recommendation.dc.html',
    'Furnishing Plan.dc.html',
    'One-Time Fix.dc.html',
    'Space Grammar Plan.dc.html',
    'Pipeline Plan-to-Render.dc.html',
  ];
  const pages = await Promise.all(legacyNames.map(read));
  for (const [index, page] of pages.entries()) {
    assert.match(page, /name="robots" content="noindex,nofollow,noarchive"/i, legacyNames[index]);
    assert.match(page, /http-equiv="refresh" content="0; url=ProjectJourney\.html"/i, legacyNames[index]);
    assert.match(page, /data-retired-route="true"/i, legacyNames[index]);
    assert.doesNotMatch(page, /paynow|qr-img|deposit|payment successful|paidAt|verified=1|verified\s*[:=]|URLSearchParams|layout=hdb4|10%|skipVerification|localStorage|type=["']password|logged in as/i, legacyNames[index]);
    assert.doesNotMatch(page, /<script|<iframe|window\.claude|three-d-stage|data-dc-script|hnm_studio|hnm_journey/i, legacyNames[index]);
  }
});

test('tracked browser benchmark pages are retired and publish no local accuracy evidence', async () => {
  for (const name of ['tests/accuracy.html', 'tests/validate.html']) {
    const page = await read(name);
    assert.match(page, /name="robots" content="noindex,nofollow,noarchive"/i, name);
    assert.match(page, /http-equiv="refresh" content="0; url=\.\.\/ProjectJourney\.html"/i, name);
    assert.match(page, /data-retired-route="true"/i, name);
    assert.match(page, /Local benchmark and demo results do not describe a released customer service/i, name);
    assert.doesNotMatch(page, /<script|<iframe|LIVE pipeline|verified on all|fidelity check|localStorage/i, name);
  }
});

test('retired assistant has no browser BYOK or credential-persistence path', async () => {
  const [adapter, soul] = await Promise.all([read('assistant-llm.js'), read('assistant-soul.js')]);
  assert.match(adapter, /const PROXY_PATH = '\/api\/chat'/);
  assert.match(adapter, /credentials: 'same-origin'/);
  assert.doesNotMatch(adapter, /localStorage|sessionStorage|api\.openai\.com|Authorization|Bearer|window\.claude|openaiChat|hnm-openai-key/i);
  assert.doesNotMatch(adapter, /fetch\((?!PROXY_PATH)/);
  assert.match(soul, /public browser assistant and attachment analysis are retired/i);
  assert.doesNotMatch(soul, /automatic detection|live 3D model|attach your floor plan|Plan Intake|measured, not guessed/i);
  const journeyUi = await read('project-journey.js');
  assert.doesNotMatch(journeyUi, /window\.claude|Studio\.html|experimental manual concept/i);
});

test('surviving public copy marks commercial and render capabilities as unreleased or illustrative', async () => {
  const [home, about, faq, redesign, legal, projectJourney] = await Promise.all([
    read('Home AI.dc.html'),
    read('AboutUs.dc.html'),
    read('FaqAndHelp.dc.html'),
    read('Home Redesign.dc.html'),
    read('Legal.dc.html'),
    read('ProjectJourney.html'),
  ]);

  assert.match(home, /hardcoded amounts are legacy interface examples only/i);
  assert.match(home, /illustrative legacy amount · not a current quote/i);
  assert.doesNotMatch(home, /identical to the .*live price book|paid the deposit by Friday|PRICE MY PLAN|priced line by line/i);
  assert.match(about, /live checkout pricing and contractor fulfilment are planned and not released/i);
  assert.match(about, /Customer photoreal rendering is not released/i);
  assert.match(faq, /does not accept deposits or other online payments/i);
  assert.match(faq, /Contractor due diligence and assignment through this site are planned and not released/i);
  assert.match(redesign, /Live pricing, online checkout, contractor assignment and milestone tracking are planned and not released/i);
  assert.doesNotMatch(redesign, /Design, visualise and price|Check out with|priced to the last detail|18 line items · 1 price|complete, buildable specification/i);
  assert.match(about, /Project Atelier is designed for authorised plan intake/i);
  assert.match(projectJourney, /current service status/i);
  assert.match(projectJourney, /Public capabilities remain off unless explicitly enabled/i);
  assert.match(legal, /name="robots" content="noindex,nofollow,noarchive"/i);
  assert.match(legal, /DRAFT POLICY NOTE · NOT TERMS OF SERVICE/i);
  assert.match(legal, /Live pricing, binding quotes, checkout and online payment are not released/i);
  assert.doesNotMatch(legal, /contact form/i);
  assert.doesNotMatch(legal, /Prices shown while designing are live|By checking out you appoint|shared with our vetted contractors|Partners receive scoped, itemised job orders/i);
});

test('contact page publishes direct details without collecting PII or inventing a sent state', async () => {
  const contact = await read('ContactUs.dc.html');
  assert.match(contact, /href="tel:\+6594235227"/i);
  assert.match(contact, /href="mailto:homeandme25@gmail\.com"/i);
  assert.match(contact, /This page has no form, account, chat widget or synthetic submission confirmation/i);
  assert.doesNotMatch(contact, /<form|<input|<textarea|<script|MESSAGE SENT|localStorage|sessionStorage|onClick=/i);
});

test('geometry editor is noindex and available only to a same-origin Project Atelier iframe', async () => {
  const [editorPage, editorRuntime] = await Promise.all([read('editor.html'), read('editor.js')]);
  assert.match(editorPage, /name="robots" content="noindex,nofollow,noarchive"/i);
  assert.match(editorPage, /parent !== window/);
  assert.match(editorPage, /new URL\(document\.referrer\)\.origin === location\.origin/);
  assert.match(editorPage, /location\.replace\('ProjectJourney\.html'\)/);
  assert.match(editorPage, /data-service-embed="pending"/);
  assert.match(editorPage, /document\.documentElement\.dataset\.serviceEmbed = 'ready'/);
  assert.match(editorPage, /await import\('\.\/editor\.js'\)/);
  assert.doesNotMatch(editorPage, /if \(!serviceEmbed\)[\s\S]{0,80}init\(\)/);
  assert.match(editorRuntime, /requires geometry supplied by its authenticated parent journey/i);
  assert.doesNotMatch(editorRuntime, /options\.project\s*\?\?\s*demoProject/);
  assert.doesNotMatch(editorRuntime, /demoProject/);
  assert.doesNotMatch(editorRuntime, /submitted for hash-bound approval/i);
});

test('README states the public proof boundary without demo, checkout or complete-detection claims', async () => {
  const readme = await read('README.md');
  assert.match(readme, /keeps analysis, geometry review, 3D, rendering, quotation, payment and demo fallback disabled/i);
  assert.match(readme, /No end-to-end held-out real HDB floor plan has yet passed/i);
  assert.doesNotMatch(readme, /DEMO_FALLBACK_ENABLED.*preserves|sandbox checkout|verified webhook|paid dashboard|Browser auto-detection is an unverified concept preview/i);
});

test('the retired transaction QR binary is absent from the public Pages tree', async () => {
  await assert.rejects(
    () => access(new URL('../assets/images/qr-img.png', import.meta.url)),
    (error) => error?.code === 'ENOENT',
  );
});

test('published release entrypoints no longer link into retired routes', async () => {
  const names = [
    'index.html',
    'Home AI.dc.html',
    'AboutUs.dc.html',
    'ContactUs.dc.html',
    'FaqAndHelp.dc.html',
    'Home Redesign.dc.html',
    'Legal.dc.html',
    'ProjectJourney.html',
    'project-journey.js',
    'project-journey-model.js',
    'journey-service-workflow.js',
    'journey-api.js',
    'assistant-llm.js',
    'assistant-soul.js',
  ];
  const sources = await Promise.all(names.map(read));
  const inbound = sources.join('\n');
  assert.doesNotMatch(inbound, /(?<!Project)Journey\.html/);
  assert.doesNotMatch(inbound, /Checkout\.dc\.html/);
  assert.doesNotMatch(inbound, /Customize\.dc\.html|Login\.dc\.html|MyProject\.dc\.html|Assistant\.dc\.html/);
  assert.doesNotMatch(inbound, /PlanLookup\.html|PlanIntake\.html|PlanDetect\.html|SketchMyFlat\.html|Studio\.html|HousingIdentity\.html/);
  assert.doesNotMatch(inbound, /Home\.dc\.html|Floorplan Detection Recommendation\.dc\.html|Furnishing Plan\.dc\.html|One-Time Fix\.dc\.html|Space Grammar Plan\.dc\.html/);
  assert.doesNotMatch(inbound, /Pipeline Plan-to-Render\.dc\.html/);
  assert.doesNotMatch(inbound, /ProjectJourney\.html\?/);
});

test('public pages do not expose unhydrated URL templates or implicit favicon requests', async () => {
  const names = [
    'index.html',
    'Home AI.dc.html',
    'AboutUs.dc.html',
    'FaqAndHelp.dc.html',
    'Home Redesign.dc.html',
    'Legal.dc.html',
    'ContactUs.dc.html',
    'ProjectJourney.html',
    'editor.html',
  ];
  const pages = await Promise.all(names.map(read));
  for (const [index, page] of pages.entries()) {
    assert.match(page, /<link\s+rel="icon"\s+href="favicon\.svg"\s+type="image\/svg\+xml">/i, names[index]);
    assert.doesNotMatch(
      page,
      /(?:^|\s)(?:src|srcset|poster|href|action|formaction)\s*=\s*["'][^"']*\{\{/im,
      names[index],
    );
  }
  const home = pages[1];
  assert.match(home, /sc-camel-src="\{\{ p\.src \}\}"/);
  assert.match(home, /sc-camel-href="\{\{ st\.href \}\}"/);
});

test('public manifest excludes interior photos without verified publication rights by path and SHA-256', async () => {
  const blockedPaths = [
    'assets/renders/living-luxe-dark.jpg',
    'assets/renders/bedroom-scandinavian.jpg',
    'assets/renders/kitchen-mono.jpg',
    'assets/renders/dining-classic-wood.jpg',
    'assets/renders/bedroom-luxe-marble.jpg',
    'assets/renders/bathroom-stone.jpg',
    'assets/renders/bedroom-wood-master.jpg',
    'assets/images/design-config-img-1.jpg',
    'assets/images/design-config-img-2.jpg',
    'assets/images/design-config-img-3.jpg',
    'assets/images/login-bg.jpg',
    'assets/images/master-bathroom.jpg',
  ];
  const denylistEntries = (await read('deploy/quarantined-media-sha256.txt'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const blockedSha256 = new Set(denylistEntries);
  assert.equal(denylistEntries.length, 40);
  assert.equal(blockedSha256.size, 40);
  assert.equal(denylistEntries.every((hash) => /^[a-f0-9]{64}$/.test(hash)), true);
  const manifest = (await read('deploy/public-pages.txt'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  for (const path of blockedPaths) assert.equal(manifest.includes(path), false, path);
  for (const path of manifest) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(blockedSha256.has(sha256), false, `${path} has a blocked provenance hash`);
  }
  const selectedPages = await Promise.all(['Home AI.dc.html', 'AboutUs.dc.html', 'Home Redesign.dc.html'].map(read));
  const selectedCopy = selectedPages.join('\n');
  for (const path of blockedPaths) assert.equal(selectedCopy.includes(path), false, path);
  assert.match(selectedCopy, /assets\/images\/publication-rights-placeholder\.svg/);
  assert.match(selectedPages[0], /SHOWROOM ON HOLD/);
  assert.match(selectedPages[0], /Interior imagery pending rights verification/);
  assert.doesNotMatch(selectedPages[0], /Rooms we've already made real|>PORTFOLIO</i);
  const placeholder = await read('assets/images/publication-rights-placeholder.svg');
  assert.match(placeholder, /<desc id="description">Publication rights are under verification\.<\/desc>/);
  assert.doesNotMatch(placeholder, /<text\b/i);
  assert.doesNotMatch(selectedPages[0], /MEET THE AI ASSISTANT|VERIFIED PROJECT JOURNEY/);
});
