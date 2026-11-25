/* Home & Me journey data: the designs and the four themes. No prices live on these pages. */
window.HNM_JOURNEY = (function () {
  'use strict';

  // Paid extras and their prices are not part of the public journey.
  var PRODUCTS = {};
  var PRODUCT_ORDER = [];
  var CURRENCY = '';
  var money = function (n) { return String(n); };

  // --- the 7 real style families (same set as the home page) ---
  var P = 'assets/portfolio/';
  var STYLES = [
    { id: 'minimalist', name: 'Minimalist', line: 'Flat fronts, hidden handles, one material.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'minimalist-5-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'minimalist-5-room-hdb-design-01-dining.jpg', name: 'Dining' },
        { src: P + 'minimalist-5-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'minimalist-5-room-hdb-design-01-master-bedroom-view-i.jpg', name: 'Bedroom' }
      ] },
    { id: 'industrial', name: 'Industrial', line: 'Raw screed, black metal, exposed services.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'industrial-4-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'industrial-4-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'industrial-4-room-hdb-design-01-master-bedroom-view-i.jpg', name: 'Bedroom' },
        { src: P + 'industrial-4-room-hdb-design-01-master-bathroom.jpg', name: 'Bathroom' }
      ] },
    { id: 'modern-classic', name: 'Modern Classic', line: 'Panelling, cornice, brass and marble accents.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'modern-classic-4-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'modern-classic-4-room-hdb-design-01-dining.jpg', name: 'Dining' },
        { src: P + 'modern-classic-4-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'modern-classic-4-room-hdb-design-01-master-bedroom.jpg', name: 'Bedroom' }
      ] },
    { id: 'muji', name: 'Muji', line: 'Weathered timber, clay and plaster, imperfect by design.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'muji-5-room-hdb-design-02-living-hall.jpg', name: 'Living' },
        { src: P + 'muji-3-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'muji-5-room-hdb-design-01-master-bedroom.jpg', name: 'Bedroom' },
        { src: P + 'muji-5-room-hdb-design-01-master-bathroom.jpg', name: 'Bathroom' }
      ] },
    { id: 'scandinavian', name: 'Scandinavian', line: 'Pale oak, white walls, daylight kept open.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'scandinavian-4-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'scandinavian-4-room-hdb-design-01-dining.jpg', name: 'Dining' },
        { src: P + 'scandinavian-4-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'scandinavian-4-room-hdb-design-01-master-bedroom.jpg', name: 'Bedroom' }
      ] },
    { id: 'contemporary', name: 'Contemporary', line: 'Clean lines, neutral tones, bright and open.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'contemporary-3-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'contemporary-3-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'contemporary-3-room-hdb-design-01-master-bedroom.jpg', name: 'Bedroom' },
        { src: P + 'contemporary-3-room-hdb-design-01-master-bathroom.jpg', name: 'Bathroom' }
      ] },
    { id: 'modern-oriental', name: 'Modern Oriental', line: 'Dark timber, lattice screens, restrained colour.', note: 'Four themes ready', ready: true,
      rooms: [
        { src: P + 'modern-oriental-5-room-hdb-design-01-living-hall.jpg', name: 'Living' },
        { src: P + 'modern-oriental-3-room-hdb-design-01-kitchen.jpg', name: 'Kitchen' },
        { src: P + 'modern-oriental-3-room-hdb-design-01-master-bedroom.jpg', name: 'Bedroom' },
        { src: P + 'modern-oriental-5-room-hdb-design-01-master-bathroom.jpg', name: 'Bathroom' }
      ] }
  ];
  // --- 23 more designs: AI-visualised design directions (disclosed in the note above their grid
  // and in each picture's description, never as a mark on the picture). Picture audit, 19 Nov 2026:
  // no card may show a room that another card or a design's own room photos already show. Seven
  // cards use their second picture for that reason (4th value); Soft Neutral is held back until it
  // has a picture of its own (both of its pictures show another design's bedroom).
  // Owner, 19 Nov 2026: a card shows a living room or a bedroom only, never a kitchen, and the picture must
  // look real. Held back until each has such a picture of its own: Japandi (kitchen, or another design's
  // room), Spa Stone and Bohemian (he rejected both pictures), Home Study (same plain grade as Spa Stone). ---
  var CONCEPT_LOOKS = [
    ['contemporary-luxe', 'Contemporary Luxe', 'Full-height stone, dark joinery, layered light.'],
    ['mid-century', 'Mid-century Modern', 'Walnut, tapered legs, organic shapes, retro colour.', 'refs/mid-century-2.webp'],
    ['rustic-wood', 'Rustic Wood', 'Solid timber, visible grain, earthy tones.', 'refs/rustic-wood-2.webp'],
    ['warm-concrete', 'Warm Concrete', 'Greige plaster, concrete-look stone, oak table.', 'refs/warm-concrete-2.webp'],
    ['coastal', 'Coastal', 'Chalk white, lightened wood, linen and rope.'],
    ['tropical', 'Tropical Resort', 'Rattan and teak, deep green, planting indoors.', 'refs/tropical-3.webp'],
    ['cottagecore', 'Cottagecore', 'Cream cabinets, soft florals, vintage brass.'],
    ['biophilic', 'Biophilic Green', 'Planting, daylight, raw stone and wood.'],
    ['mediterranean', 'Mediterranean', 'Lime plaster, arches, hand-painted tile, wrought iron.'],
    ['dark-moody', 'Dark Moody', 'Deep walls, matte black, pooled lighting.'],
    ['gothic', 'Gothic Revival', 'Ink walls, arches, carved dark timber.'],
    ['marble-luxe', 'Marble Luxe', 'Book-matched slabs, gold trim, polished finish.'],
    ['peranakan', 'Peranakan Straits', 'Encaustic patterned tile, turquoise and crimson, carved teak.'],
    ['heritage-blue', 'Heritage Blue', 'Deep blue fronts, brass pulls, speckled stone tile.'],
    ['art-deco', 'Art Deco', 'Geometry and symmetry, lacquer, brass, velvet.', 'refs/art-deco-2.webp'],
    ['victorian', 'Victorian Heritage', 'Wainscot panelling, deep green, ornate cornice.'],
    ['retro-terrazzo', 'Retro Terrazzo', 'Speckled stone, mint and clay, resale charm kept.'],
    ['family-warm', 'Family Warm', 'Soft seating, durable finishes, warm light.'],
    ['hotel-suite', 'Hotel Suite', 'Marble, vanity lighting, strict symmetry.'],
  ];
  CONCEPT_LOOKS.forEach(function (c) {
    STYLES.push({ id: c[0], name: c[1], line: c[2], note: 'Four themes ready', ready: true, concept: true,
      rooms: [{ src: 'assets/concepts/' + (c[3] || (c[0] + '-hdb-design.webp')), name: 'Living' }] });
  });
  var styleById = function (id) { for (var i = 0; i < STYLES.length; i++) { if (STYLES[i].id === id) return STYLES[i]; } return STYLES[0]; };

  // --- the 4 themes of a design. Owner, 19 Nov 2026: a theme is the SAME floor plan and the SAME
  // design with different furniture placement, different carpentry and a different set-up, so the
  // customer sees which one they prefer. The four themes are one fixed set, 1 to 4, and each theme
  // is shown as four pictures side by side: living room, main bedroom, kitchen, toilet (owner, 19 Nov
  // 2026). Every design has its own set, from the same four cameras of one sample 5-room flat.
  // No top view (owner, 19 Nov 2026). ---
  var TM = 'assets/themes/';
  var THEME_ROOMS = [['living', 'Living room'], ['bedroom', 'Main bedroom'], ['kitchen', 'Kitchen'], ['toilet', 'Toilet']];
  var THEMES = [
    { n: 'Open living',
      placement: 'Sofa faces the TV wall with open floor between. Bed centred on the back wall.',
      carpentry: 'Long floating TV console. Simple headboard wall and a full-height wardrobe. Kitchen with wall cabinets. Wall-hung vanity with a mirror.',
      setup: 'Easy and open, with a coffee table and a bench at the foot of the bed.' },
    { n: 'Feature wall',
      placement: 'TV moves to the opposite wall, with a curved sofa and armchairs in a circle. Bed turned, with its head on the window side.',
      carpentry: 'Bold full-height TV feature wall with a lit niche, in the richest material of the design. Full wardrobe wall. Kitchen with open shelves beside the cooker hood and a feature backsplash. Feature shower wall and a round lit mirror.',
      setup: 'A statement pendant light, deep-coloured curtains, a film-night mood.' },
    { n: 'Dining room',
      placement: 'Dining for six up front behind a screen, lounge by the window. Bed on a raised platform with a window seat.',
      carpentry: 'Built-in bench seat with lit shelves. Platform with drawers and a study desk. Kitchen island with stools. Full-width vanity with a ledge.',
      setup: 'Eat, lounge and study at home, with blinds instead of curtains in the bedroom.' },
    { n: 'Library wall',
      placement: 'Sofa in the middle of the room, facing a full library and desk wall. Bed set into a wardrobe alcove.',
      carpentry: 'Bookshelf wall with a desk for two and glass-fronted cabinets. Wardrobe towers around the bed and a dressing table by the window. Kitchen storage wall with a built-in oven. Bathroom storage tower and a fluted glass shower screen.',
      setup: 'Work from home, everything put away.' }
  ];
  // A design without its own set shows the Minimalist set, said plainly on the page.
  var themesFor = function (styleId) {
    var own = false;
    for (var k = 0; k < STYLES.length; k++) { if (STYLES[k].id === styleId) own = true; }
    var id = own ? styleId : 'minimalist';
    return { own: own, rooms: THEME_ROOMS, items: THEMES.map(function (t, i) {
      return { n: t.n, d: t.placement, placement: t.placement, carpentry: t.carpentry, setup: t.setup,
        shots: THEME_ROOMS.map(function (r) { return { key: r[0], name: r[1], src: TM + id + '-' + (i + 1) + '-' + r[0] + '.jpg' }; }) };
    }) };
  };

  return {
    PRODUCTS: PRODUCTS, PRODUCT_ORDER: PRODUCT_ORDER, CURRENCY: CURRENCY, money: money,
    STYLES: STYLES, styleById: styleById, THEMES: THEMES, themesFor: themesFor
  };
})();
