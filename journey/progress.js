/* Home & Me Designing page: what the progress bar shows, from status.json alone (owner, 25 Nov 2026: "show how
 * much percentage is the progress ... so customer can see how much time estimated to wait").
 * The service sends progress {stage 1-5, percent 1-99, minutesLeft}: the percent follows the measured time of each
 * stage and never goes back; minutesLeft is a number only when it is an estimate of work left (it is null while the
 * customer picks a theme, while a person checks, and when others are ahead). This file never invents a number. */
window.HNM_PROGRESS = (function () {
  'use strict';
  function step(doc) {
    var state = String(doc.state || ''), p = doc.progress || {}, th = doc.theme || null;
    var stage = parseInt(p.stage, 10) || 1;
    if (state === 'checking' && stage >= 4) return 'A person is checking your design';
    if (th && th.canPick && !th.chosen) return 'Waiting for your theme choice';
    if (th && !th.chosen && th.state === 'generating') return 'Laying out your themes';
    if (stage <= 1) return (doc.queue && parseInt(doc.queue.ahead, 10) > 0) ? 'Waiting for your turn' : 'Plan received';
    if (stage === 2) return 'Reading your plan';
    if (stage === 3) return th && th.chosen ? 'Placing cameras in your rooms' : 'Designing your rooms';
    if (stage === 4) return 'Making your pictures';
    return 'A person is checking your design';
  }
  // {hidden, percent, step, left}: hidden when there is no progress to show (a designer prepares it, a final answer)
  function view(doc) {
    doc = doc || {};
    var state = String(doc.state || '');
    if (state === 'ready') return { hidden: false, percent: 100, step: 'Your design is ready', left: '' };
    var p = doc.progress;
    if (!p || ['received', 'preparing', 'checking'].indexOf(state) < 0) return { hidden: true, percent: 0, step: '', left: '' };
    var pct = parseInt(p.percent, 10);
    pct = isFinite(pct) ? Math.max(1, Math.min(99, pct)) : 1;
    var mins = p.minutesLeft;
    var left = (typeof mins === 'number' && isFinite(mins) && mins >= 1)
      ? 'About ' + Math.round(mins) + (Math.round(mins) === 1 ? ' minute' : ' minutes') + ' left' : '';
    var s = step(doc);
    if (s === 'Waiting for your theme choice') left = 'It goes on as soon as you pick.';
    if (s === 'A person is checking your design') left = 'The work is done. A person checks it before it reaches you.';
    return { hidden: false, percent: pct, step: s, left: left };
  }
  // keep the highest percent this page has shown: a late or repeated answer never moves the bar back
  var shown = 0;
  function render(doc, els) {
    var v = view(doc);
    els.box.hidden = v.hidden;
    if (v.hidden) return v;
    if (v.percent < shown && v.percent !== 100) v.percent = shown;
    shown = v.percent;
    els.fill.style.width = v.percent + '%';
    els.pct.textContent = v.percent + '%';
    els.step.textContent = v.step;
    els.track.setAttribute('aria-valuenow', String(v.percent));
    els.track.setAttribute('aria-valuetext', v.step + ', ' + v.percent + ' percent');
    els.left.textContent = v.left;
    els.left.hidden = !v.left;
    return v;
  }
  return { view: view, render: render, step: step };
})();
