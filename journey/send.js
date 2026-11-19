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
  var PLAN_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
  var PLAN_MAX_BYTES = 10 * 1024 * 1024;

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function newRef() {
    var d = new Date();
    return 'HNM-' + String(d.getFullYear()).slice(2) + two(d.getMonth() + 1) + two(d.getDate()) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  // Words for the checks on the floor plan step. Empty string = fine.
  function planProblem(file) {
    if (!file) return 'Add your floor plan to continue.';
    if (PLAN_TYPES.indexOf(file.type) === -1) return 'That file type cannot be read. Use a JPG, a PNG or a PDF.';
    if (file.size > PLAN_MAX_BYTES) return 'That file is over 10 MB. Use a smaller scan or photo.';
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

  // d = { ref, name, wa, email, styleName, themeNo, themeName, planName }, file = the floor plan File or null.
  // Resolves { ok, ref, planAttached }. Never throws.
  function send(d, file) {
    var ref = d.ref || newRef();
    var planStep = Promise.resolve('');
    if (file) {
      planStep = timed(PLAN_ENDPOINT, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Plan-Filename': encodeURIComponent(file.name || 'floor-plan').slice(0, 120),
          'X-Lead-Ref': ref
        },
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
        styles: [d.styleName],
        notes: 'Theme ' + d.themeNo + ': ' + d.themeName + '. Sent from the website journey; a person reviews it first.' +
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
        .then(function (j) { return { ok: !!(j && j.ok), ref: (j && j.ref) || ref, planAttached: !!planId }; })
        .catch(function () { return { ok: false, ref: ref, planAttached: !!planId }; });
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
