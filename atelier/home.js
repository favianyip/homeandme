/* Home & Me, the Atelier home page: the scene fades in once the type is ready, and the seven
   style samples on the rail are tabs, and each style's small room pictures change the large one.
   Without script every style shows in order, the small pictures open their file, and nothing moves. */
(() => {
  const root = document.documentElement;

  /* fade the hero in once, when the fonts have settled */
  let shown = false;
  const show = () => { if (shown) return; shown = true; requestAnimationFrame(() => root.classList.add('is-ready')); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(show);
  setTimeout(show, 1400);

  /* the chosen style */
  const tabs = [...document.querySelectorAll('.rack [role="tab"]')];
  const panel = (t) => document.getElementById(t.getAttribute('aria-controls'));
  const choose = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = panel(t);
      if (on && p.hidden) { p.hidden = false; p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); }
      else if (!on) p.hidden = true;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => choose(t, false));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); choose(tabs[(i + step + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); choose(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); choose(tabs[tabs.length - 1], true); }
    });
  });
  if (tabs.length) choose(tabs[0], false);

  /* each style's rooms: a small picture puts its room in the frame above it */
  document.querySelectorAll('.style').forEach((style) => {
    const lead = style.querySelector('.style__photo img');
    const note = style.querySelector('.style__text p');
    const rooms = [...style.querySelectorAll('.room')];
    if (!lead || !note) return;
    rooms.forEach((room) => room.addEventListener('click', (e) => {
      e.preventDefault();
      if (room.getAttribute('aria-current') === 'true') return;
      rooms.forEach((r) => (r === room ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current')));
      lead.classList.remove('is-in');
      lead.src = room.getAttribute('href');
      lead.alt = room.dataset.alt;
      note.textContent = room.dataset.note;
      void lead.offsetWidth;
      lead.classList.add('is-in');
    }));
  });
})();
