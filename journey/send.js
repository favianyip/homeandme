/* Home & Me journey: the ONE place an enquiry leaves the browser.
 * Two requests, both to the Home & Me enquiry service, both only after the customer ticks the
 * consent box and taps Send: (1) the floor plan file, (2) the enquiry itself. Nothing else on
 * the journey pages talks to a server. If the service cannot be reached the page offers
 * WhatsApp instead, so no enquiry is lost.
 */
window.HNM_SEND = (function () {
  'use strict';
  var LEAD_ENDPOINT = 'https://spark-792d.tail223b04.ts.net/hnm/v1/leads';
  var PLAN_ENDPOINT = 'https://spark-792d.tail223b04.ts.net/hnm/v1/plans';
  var CONSENT_VERSION = '2026-08-22';
  var WHATSAPP = '6588376196';
  var PLAN_TYPES = ['application/pdf'];        // the PDF floor plan from HDB (the service checks the file itself)
  var PLAN_MAX_BYTES = 10 * 1024 * 1024;

  function two(n) { return (n < 10 ? '0' : '') + n; }
  // HNM-YYMMDD- and 8 random capitals or digits: one floor plan is kept per reference, so two customers on one day
  // must never share one (4 digits gave 9000 a day).
  function newRef() {
    var d = new Date(), ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', tail = '', b = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (var k = 0; k < 8; k++) b[k] = Math.floor(Math.random() * 256);
    for (var j = 0; j < 8; j++) tail += ALPHA.charAt(b[j] % ALPHA.length);
    return 'HNM-' + String(d.getFullYear()).slice(2) + two(d.getMonth() + 1) + two(d.getDate()) + '-' + tail;
  }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  // Words for the checks on the floor plan step. Empty string = fine.
  function planProblem(file) {
    if (!file) return 'Add your floor plan to continue.';
    var named = /\.pdf$/i.test(String(file.name || ''));
    if (PLAN_TYPES.indexOf(file.type) === -1 && !(named && (!file.type || file.type === 'application/octet-stream'))) {
      return 'That file cannot be read. Use the PDF floor plan of your flat from HDB.';
    }
    if (file.size > PLAN_MAX_BYTES) return 'That file is over 10 MB. Use the PDF floor plan from HDB.';
    return '';
  }
  function nameProblem(v) { return String(v || '').trim() ? '' : 'Tell us your name.'; }
  function phoneProblem(v) {
    var n = digits(v).length;
    if (!n) return 'Add your WhatsApp number.';
    return (n < 8 || n > 15) ? 'That number looks incomplete. Use 8 digits, or include the country code.' : '';
  }
  function emailProblem(v) {
    v = String(v || '').trim();
    // The enquiry service refuses an enquiry without an email (proven with a test enquiry, 20 Nov 2026).
    if (!v) return 'Add your email address.';
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'That email address looks incomplete.';
  }

  function timed(url, opts, ms) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, ms);
    opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }

  // A tester key, when the upload is open to testers only: it arrives in the link (#tester=...), flow.js keeps it
  // on this device for the visit, and it goes with the floor plan only.
  function testerKey() {
    try { var k = sessionStorage.getItem('hnm_tester') || ''; return /^[A-Za-z0-9_-]{16,128}$/.test(k) ? k : ''; }
    catch (e) { return ''; }
  }

  // d = { ref, name, wa, email, styleId, styleName, themeNo, themeName, planName }, file = the floor plan File or null.
  // Resolves { ok, ref, planAttached, planId }. Never throws.
  function send(d, file) {
    var ref = d.ref || newRef();
    var planStep = Promise.resolve('');
    if (file) {
      var headers = {
        'Content-Type': file.type || 'application/pdf',
        'X-Plan-Filename': encodeURIComponent(file.name || 'floor-plan.pdf').slice(0, 120),
        'X-Lead-Ref': ref
      };
      if (testerKey()) headers['X-Tester-Key'] = testerKey();
      planStep = timed(PLAN_ENDPOINT, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: headers,
        body: file
      }, 45000).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return (j && j.planId) || ''; })
        .catch(function () { return ''; });
    }
    return planStep.then(function (planId) {
      var lead = {
        ref: ref,
        name: String(d.name || '').trim(),
        phone: String(d.wa || '').trim(),
        email: String(d.email || '').trim(),
        // the design's id, then the theme number as "theme:N" (the enquiry service keeps only its own fields)
        styles: [d.styleId || d.styleName].concat(d.themeNo >= 1 && d.themeNo <= 4 ? ['theme:' + d.themeNo] : []),
        theme: d.themeNo,
        notes: 'Design: ' + d.styleName + '. Theme ' + d.themeNo + ': ' + d.themeName + '. Sent from the website journey; a person reviews it first.' +
          (d.noPlan ? ' Floor plan upload is closed on the website for now, so no plan comes with this request.' : ''),
        consent: true,
        consentVersion: CONSENT_VERSION,
        planFilename: d.planName || '',
        planId: planId,
        hp: d.hp || '',
        page: 'journey'
      };
      return timed(LEAD_ENDPOINT, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      }, 20000).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return { ok: !!(j && j.ok), ref: (j && j.ref) || ref, planAttached: !!planId, planId: planId }; })
        .catch(function () { return { ok: false, ref: ref, planAttached: !!planId, planId: planId }; });
    });
  }

  // The same enquiry as a WhatsApp message the customer sends themselves.
  function whatsappLink(d, ref) {
    var text = 'Hello Home & Me, I would like my free design.' +
      '\nReference: ' + ref +
      '\nName: ' + String(d.name || '').trim() +
      '\nDesign: ' + d.styleName +
      '\nTheme ' + d.themeNo + ': ' + d.themeName +
      (d.noPlan ? '' : '\nI will send my floor plan in this chat.');
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
  }

  return {
    send: send, newRef: newRef, whatsappLink: whatsappLink, WHATSAPP: WHATSAPP,
    planProblem: planProblem, nameProblem: nameProblem, phoneProblem: phoneProblem, emailProblem: emailProblem,
    LEAD_ENDPOINT: LEAD_ENDPOINT, PLAN_ENDPOINT: PLAN_ENDPOINT, CONSENT_VERSION: CONSENT_VERSION
  };
})();
