(() => {
  let previousOverflow = '';

  const elements = () => ({
    toggle: document.querySelector('[data-menu-toggle]'),
    menu: document.querySelector('[data-mobile-menu]'),
    closeButton: document.querySelector('[data-menu-close]'),
  });

  const isOpen = (menu) => menu?.getAttribute('data-menu-state') === 'open';

  const focusable = (menu) => [...menu.querySelectorAll('a[href], button:not([disabled])')]
    .filter((element) => element.getClientRects().length);

  const closeMenu = (returnFocus = true) => {
    const { toggle, menu } = elements();
    if (!toggle || !menu) return;
    menu.setAttribute('data-menu-state', 'closed');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    document.body.style.overflow = previousOverflow;
    if (returnFocus) toggle.focus();
  };

  const openMenu = () => {
    const { toggle, menu, closeButton } = elements();
    if (!toggle || !menu || !closeButton) return;
    previousOverflow = document.body.style.overflow;
    menu.setAttribute('data-menu-state', 'open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-menu-toggle]');
    if (toggle) {
      const { menu } = elements();
      if (isOpen(menu)) closeMenu();
      else openMenu();
      return;
    }
    if (event.target.closest('[data-menu-close]')) {
      closeMenu();
      return;
    }
    if (event.target.closest('[data-mobile-menu] a[href]')) closeMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    const { menu } = elements();
    if (!menu || !isOpen(menu)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable(menu);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const desktop = window.matchMedia('(min-width: 1121px)');
  const closeAboveBreakpoint = (event) => {
    const { menu } = elements();
    if (event.matches && isOpen(menu)) closeMenu(false);
  };
  if (desktop.addEventListener) desktop.addEventListener('change', closeAboveBreakpoint);
  else desktop.addListener(closeAboveBreakpoint);
})();
