/* Home & Me journey preview — client-side state only. No network calls of any kind:
 * the floor plan is previewed locally, nothing is uploaded, no engine is triggered, no
 * payment is taken. State is carried between the step pages in sessionStorage so the
 * browser back button works and nothing leaves the device. PHASE 1, website only.
 */
(function () {
  'use strict';
  var KEY = 'hnm_journey_v1';
  // live site: four steps, then "request received". Preview: the later sample screens too.
  var LIVE = window.HNM_LIVE === true;
  // floor plan upload: always part of the preview; on the live site only when the switch is on
  var PLAN = LIVE ? window.HNM_PLAN_UPLOAD === true : true;

  // A tester link (#tester=<key>): the key is kept on this device for the visit and taken out of the address bar.
  (function () {
    var m = /(?:^#|&)tester=([A-Za-z0-9_-]{16,128})(?:&|$)/.exec(location.hash || '');
    if (!m) return;
    try { sessionStorage.setItem('hnm_tester', m[1]); } catch (e) { /* private mode: no key kept */ }
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  })();

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(s) {
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: carry on */ }
  }
  function patch(obj) { var s = load(); for (var k in obj) { s[k] = obj[k]; } save(s); return s; }

  // Build the step rail. steps = [{label, id}], currentId marks the active step.
  var ALL_STEPS = [
    { id: 'upload', label: PLAN ? 'Floor plan' : 'Your details' },
    { id: 'style', label: 'Design' },
    { id: 'themes', label: 'Theme' },
    { id: 'check', label: 'Send' },
    { id: 'preparing', label: 'Designing' },
    { id: 'result', label: 'Your design' },
    { id: 'payment', label: 'Extras' },
    { id: 'ready', label: 'Ready' }
  ];
  var STEPS = LIVE ? ALL_STEPS.slice(0, 4) : ALL_STEPS;
  function rail(currentId) {
    var i, cur = -1;
    for (i = 0; i < STEPS.length; i++) { if (STEPS[i].id === currentId) cur = i; }
    if (currentId === 'sent') cur = STEPS.length;   // every step done
    var html = '<ol class="rail" aria-label="Where you are">';
    for (i = 0; i < STEPS.length; i++) {
      var cls = i < cur ? 'done' : (i === cur ? 'now' : '');
      var aria = i === cur ? ' aria-current="step"' : '';
      html += '<li class="' + cls + '"' + aria + '><span class="rail__t">' + STEPS[i].label + '</span></li>';
    }
    return html + '</ol>';
  }
  function mountRail(currentId) {
    var el = document.querySelector('[data-rail]');
    if (el) el.innerHTML = rail(currentId);
  }

  // Convenience: redirect to upload if the journey has no plan yet (keeps the walk honest).
  function requirePlan() {
    var s = load();
    if (!s.planName && !s.style) { /* allow a deep link in the preview; do not hard-block */ }
    return s;
  }

  // The floor plan file is kept on this device between the steps (the browser's own store).
  // It leaves the device only when the customer taps Send on the last step.
  function openDb() {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('hnm_journey', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  }
  function savePlan(file) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(file, 'plan');
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).catch(function () { return false; });
  }
  function loadPlan() {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction('files').objectStore('files').get('plan');
        rq.onsuccess = function () { res(rq.result || null); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function clearPlan() {
    return openDb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete('plan');
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  window.HNM_FLOW = {
    load: load, save: save, patch: patch, mountRail: mountRail, requirePlan: requirePlan,
    savePlan: savePlan, loadPlan: loadPlan, clearPlan: clearPlan,
    STEPS: STEPS, LIVE: LIVE, PLAN: PLAN
  };
})();
