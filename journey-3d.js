// Journey 3D core — realistic SG floor-plan model builder.
// Geometry rules traced from real HDB drawings (uploads/): single shared walls between rooms,
// door leaves with quarter-circle swing arcs at room corners, windows only on facades,
// household shelter with thick walls, bath = WC + basin + glazed shower on a dropped tiled floor.
export function createModel(ctx) {
  const { THREE, stage, state, tween, THEMES, ROOMS, themeFor, layout } = ctx;
  const M = (c, r, name, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra || {})); m.name = name; return m; };
  const matWall = M(0xf4f1ea, 0.92, 'wall_white');
  const matBase = M(0xd9d3c5, 0.95, 'floor_extra');
  const matTile = M(0xe2e6e3, 0.9, 'floor_bath_tile');
  const matPlan = M(0xfdfcf9, 1, 'plan_paper');
  const matSlab = M(0xe9e5da, 0.9, 'storey_slab');
  const matGlass = M(0xa9c4cc, 0.15, 'glass', { transparent: true, opacity: 0.35, metalness: 0.1 });
  const matWood = M(0x9c7a55, 0.8, 'wood');
  const matDark = M(0x3a4043, 0.6, 'dark_panel');
  const matSteel = M(0x6e7880, 0.5, 'steel_door', { metalness: 0.3 });
  const matFix = M(0xfafaf7, 0.35, 'fixture_white');
  const matGreen = M(0x8aa17c, 0.9, 'planting');
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x69736c, transparent: true, opacity: 0.4, side: THREE.DoubleSide }); arcMat.name = 'swing_arc';
  const themeMats = {}, floorMats = {};
  THEMES.forEach((t) => {
    themeMats[t.id] = M(t.color, 0.75, 'fabric_' + t.id);
    floorMats[t.id] = M(new THREE.Color(t.color).lerp(new THREE.Color(0xffffff), 0.45).getHex(), 0.9, 'floor_' + t.id);
  });

  // rect: [key, x, z, w, d, opts] — z=0 is the window facade (south).
  // opts: pid (pricing id), lbl, x (non-priced extra), pass (circulation), dw (door wall), open (walls omitted)
  const X = { x: 1 }, PASS = { x: 1, pass: 1 };
  const P = {
    hdb2: [{ W: 6.4, D: 7.4, rects: [ // traced from uploaded 2-room studio plan
      ['master', 0, 0, 3.2, 3.4, { dw: 'E' }],
      ['living', 3.2, 0, 3.2, 3.4, {}],
      ['ac', 0, 3.4, 1.3, 2.0, { x: 1, lbl: 'AC LEDGE' }],
      ['bath', 1.3, 3.4, 1.9, 2.0, { pid: 'bath', lbl: 'BATH / WC', dw: 'E' }],
      ['corr', 3.2, 3.4, 1.5, 2.0, Object.assign({ lbl: 'HALL' }, PASS)],
      ['hs', 4.7, 3.4, 1.7, 2.0, { x: 1, lbl: 'SHELTER' }],
      ['kitchen', 0, 5.4, 3.4, 2.0, { dw: 'E' }],
      ['foyer', 3.4, 5.4, 3.0, 2.0, Object.assign({ lbl: 'FOYER' }, PASS)],
    ] }],
    hdb3: [{ W: 9.4, D: 8.85, rects: [ // traced from uploaded '3 ROOM (POINT BLOCK) TYPE 2(H)' — 9400 × 8800
      ['master', 0, 0, 3.15, 4.0, { lbl: 'MAIN BEDROOM', dw: 'E' }],
      ['common', 3.15, 0, 2.95, 2.9, { lbl: 'BEDROOM 2', dw: 'N' }],
      ['corr', 3.15, 2.9, 2.95, 1.1, Object.assign({ lbl: 'HALL' }, PASS)],
      ['living', 6.1, 0, 3.3, 6.05, {}],
      ['bath_m', 0, 4.0, 2.2, 2.05, { pid: 'bath', lbl: 'BATH / WC 1', dw: 'S' }],
      ['bath_c', 2.2, 4.0, 1.95, 2.05, { pid: 'bath', lbl: 'BATH / WC 2', dw: 'E' }],
      ['corr2', 4.15, 4.0, 1.95, 2.05, Object.assign({ lbl: 'DINING' }, PASS)],
      ['ac', 0, 6.05, 1.55, 0.95, { x: 1, lbl: 'AC LEDGE' }],
      ['yard', 1.55, 6.05, 1.2, 2.8, { x: 1, lbl: 'SERVICE YARD' }],
      ['kitchen', 2.75, 6.05, 2.8, 2.8, { dw: 'E' }],
      ['foyer', 5.55, 6.05, 1.6, 2.8, Object.assign({ lbl: 'ENTRY' }, PASS)],
      ['hs', 7.15, 6.05, 1.5, 1.6, { x: 1, lbl: 'SHELTER' }],
    ] }],
    hdb4: [{ W: 11.7, D: 9.7, rects: [ // traced from uploaded '4-ROOM (CORRIDOR)' — 11700 wide, access balcony at rear
      ['common', 0, 0, 2.85, 4.1, { lbl: 'BEDROOM 2', dw: 'N' }],
      ['master', 2.85, 0, 3.3, 4.1, { lbl: 'MAIN BEDROOM', dw: 'N' }],
      ['ac', 6.15, 0, 1.7, 1.5, { x: 1, lbl: 'AC LEDGE' }],
      ['bath_m', 6.15, 1.5, 1.7, 2.6, { pid: 'bath', lbl: 'BATH / WC 1', dw: 'N' }],
      ['yard', 7.85, 0, 1.6, 1.5, { x: 1, lbl: 'SERVICE YARD' }],
      ['bath_c', 7.85, 1.5, 1.6, 2.6, { pid: 'bath', lbl: 'BATH / WC 2', dw: 'N' }],
      ['kitchen', 9.45, 0, 2.25, 6.0, { dw: 'W' }],
      ['corr', 0, 4.1, 2.85, 0.8, Object.assign({ lbl: 'HALL' }, PASS)],
      ['common2', 0, 4.9, 2.85, 3.6, { lbl: 'BEDROOM 3', dw: 'S' }],
      ['living', 2.85, 4.1, 6.6, 4.4, {}],
      ['store', 9.45, 6.0, 2.25, 2.5, { x: 1, lbl: 'STORE / PANTRY' }],
      ['foyer', 7.5, 8.5, 1.95, 1.2, Object.assign({ lbl: 'ENTRY' }, PASS)],
    ] }],
    d4: [{ W: 13.9, D: 9.5, rects: [ // traced from uploaded 'Unit Layout Plan' (Private Condo Type D4)
      ['kitchen', 0.8, 2.4, 2.1, 2.5, { dw: 'N' }],
      ['living', 2.9, 2.4, 3.1, 4.7, {}],
      ['foyer', 0.8, 4.9, 2.1, 2.2, Object.assign({ lbl: 'FOYER' }, PASS)],
      ['hs', 1.6, 7.1, 1.3, 1.6, { x: 1, lbl: 'SHELTER' }],
      ['yard', 2.9, 7.1, 1.6, 1.6, { x: 1, lbl: 'SERVICE YARD & WC' }],
      ['ac', 4.5, 7.1, 1.5, 1.4, { x: 1, lbl: 'AC LEDGE' }],
      ['common2', 6.0, 0, 2.6, 4.4, { lbl: 'BEDROOM 3', dw: 'N' }],
      ['common', 8.6, 0, 2.55, 4.4, { lbl: 'BEDROOM 2', dw: 'N' }],
      ['master', 11.15, 0, 2.7, 5.6, { lbl: 'MASTER BEDROOM' }],
      ['corr', 6.0, 4.4, 5.15, 1.2, Object.assign({ lbl: 'HALL' }, PASS)],
      ['bath_c', 6.0, 5.6, 1.5, 2.4, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['study', 7.5, 5.6, 3.2, 2.4, { lbl: 'BEDROOM 4 / STUDY', dw: 'S' }],
      ['bath_m', 10.7, 5.6, 1.7, 2.4, { pid: 'bath', lbl: 'MASTER BATH', dw: 'S' }],
    ] }],
    hdbEA: [{ W: 16.1, D: 9.8, rects: [ // traced from uploaded Executive Apartment (point block, 146sqm)
      ['study', 0, 0, 4.3, 3.0, { lbl: 'STUDY / BEDROOM', dw: 'E' }],
      ['common2', 0, 3.0, 4.3, 3.3, { lbl: 'BEDROOM 3', dw: 'E' }],
      ['master', 0, 6.3, 5.5, 3.5, { lbl: 'MAIN BEDROOM', dw: 'S' }],
      ['bath_m', 5.5, 6.3, 1.5, 3.5, { pid: 'bath', lbl: 'BATH / WC 1', dw: 'S' }],
      ['common', 7.0, 6.3, 3.0, 3.5, { lbl: 'BEDROOM 2', dw: 'S' }],
      ['kitchen', 10.0, 6.3, 2.6, 3.5, { dw: 'S', nol: 1 }],
      ['bath_c', 12.6, 7.0, 1.6, 2.8, { pid: 'bath', lbl: 'BATH / WC 2', dw: 'W' }],
      ['store', 12.6, 4.6, 1.6, 2.4, { x: 1, lbl: 'STORE' }],
      ['ac', 14.2, 6.3, 1.9, 3.5, { x: 1, lbl: 'AC LEDGE' }],
      ['corr', 4.3, 4.6, 8.3, 1.7, Object.assign({ lbl: 'HALLWAY' }, PASS)],
      ['living', 4.3, 0, 11.8, 4.6, {}],
      ['foyer', 14.2, 4.6, 1.9, 1.7, Object.assign({ lbl: 'ENTRY' }, PASS)],
    ] }],
    c2: [{ W: 9.0, D: 8.6, rects: [
      ['balcony', 0, 0, 4.6, 1.5, X],
      ['living', 0, 1.5, 4.6, 4.3, {}],
      ['kitchen', 0, 5.8, 2.7, 2.8, { open: ['S'] }],
      ['hs', 2.7, 5.8, 1.9, 1.6, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 2.7, 7.4, 1.9, 1.2, Object.assign({ lbl: 'FOYER' }, PASS)],
      ['common', 4.6, 0, 2.6, 3.4, { dw: 'N' }],
      ['bath_c', 7.2, 0, 1.8, 3.4, { pid: 'bath', lbl: 'BATH 2', dw: 'N' }],
      ['corr', 4.6, 3.4, 4.4, 1.6, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 4.6, 5.0, 2.8, 3.6, { dw: 'S' }],
      ['bath_m', 7.4, 5.0, 1.6, 2.4, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
      ['ac', 7.4, 7.4, 1.6, 1.2, { x: 1, lbl: 'AC LEDGE' }],
    ] }],
    c3: [{ W: 10.6, D: 8.8, rects: [
      ['balcony', 0, 0, 5.0, 1.5, X],
      ['living', 0, 1.5, 5.0, 4.5, {}],
      ['kitchen', 0, 6.0, 2.9, 2.8, { open: ['S'] }],
      ['hs', 2.9, 6.0, 2.1, 1.5, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 2.9, 7.5, 2.1, 1.3, Object.assign({ lbl: 'FOYER' }, PASS)],
      ['common', 5.0, 0, 2.9, 3.3, { dw: 'N' }],
      ['common2', 7.9, 0, 2.7, 3.3, { dw: 'N' }],
      ['corr', 5.0, 3.3, 5.6, 1.5, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 5.0, 4.8, 3.1, 4.0, { dw: 'S' }],
      ['bath_m', 8.1, 4.8, 1.4, 2.4, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
      ['bath_c', 9.5, 4.8, 1.1, 2.4, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['ac', 8.1, 7.2, 2.5, 1.6, { x: 1, lbl: 'AC LEDGE' }],
    ] }],
    cp: [{ W: 12.6, D: 9.2, rects: [
      ['balcony', 0, 0, 6.4, 1.6, X],
      ['living', 0, 1.6, 6.4, 4.6, {}],
      ['family', 0, 6.2, 3.0, 3.0, { dw: 'S' }],
      ['kitchen', 3.0, 6.2, 2.4, 1.8, { open: ['S'] }],
      ['hs', 3.0, 8.0, 2.4, 1.2, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 5.4, 6.2, 1.0, 3.0, Object.assign({ lbl: 'ENTRY FOYER' }, PASS)],
      ['common', 6.4, 0, 2.4, 3.4, { dw: 'N' }],
      ['common2', 8.8, 0, 2.0, 3.4, { dw: 'N' }],
      ['study', 10.8, 0, 1.8, 3.4, { dw: 'N' }],
      ['corr', 6.4, 3.4, 6.2, 1.4, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 6.4, 4.8, 3.2, 4.4, { dw: 'S' }],
      ['bath_m', 9.6, 4.8, 1.6, 2.6, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
      ['bath_c', 11.2, 4.8, 1.4, 2.6, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['ac', 9.6, 7.4, 3.0, 1.8, { x: 1, lbl: 'AC LEDGE' }],
    ] }],
    l1: [
      { W: 7.2, D: 10.2, rects: [
        ['garden', 0, 0, 7.2, 2.0, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.0, 4.6, 4.6, {}],
        ['kitchen', 4.6, 2.0, 2.6, 4.6, { dw: 'W' }],
        ['family', 0, 6.6, 3.6, 3.6, { dw: 'S' }],
        ['hall', 3.6, 6.6, 1.4, 3.6, Object.assign({ lbl: 'STAIRS', rise: 'S' }, PASS)],
        ['bath_c', 5.0, 6.6, 2.2, 3.6, { pid: 'bath', lbl: 'GUEST BATH', dw: 'W' }],
      ] },
      { W: 7.2, D: 10.2, rects: [
        ['balcony', 0, 0, 7.2, 2.0, { x: 1, lbl: 'BALCONY' }],
        ['master', 0, 2.0, 3.6, 4.6, { dw: 'E' }],
        ['landing', 3.6, 2.0, 1.4, 4.6, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['common2', 5.0, 2.0, 2.2, 3.2, { dw: 'W' }],
        ['bath_m', 5.0, 5.2, 2.2, 1.4, { pid: 'bath', lbl: 'BATH 2', dw: 'W' }],
        ['common', 0, 6.6, 3.6, 3.6, { dw: 'E' }],
        ['hall', 3.6, 6.6, 1.4, 3.6, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['study', 5.0, 6.6, 2.2, 3.6, { dw: 'W' }],
      ] },
    ],
    l2: [
      { W: 8.4, D: 10.4, rects: [
        ['garden', 0, 0, 8.4, 2.2, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.2, 5.2, 4.6, {}],
        ['kitchen', 5.2, 2.2, 3.2, 4.6, { dw: 'W' }],
        ['family', 0, 6.8, 4.2, 3.6, { dw: 'S' }],
        ['hall', 4.2, 6.8, 2.0, 3.6, Object.assign({ lbl: 'STAIRS', rise: 'S' }, PASS)],
        ['bath_c', 6.2, 6.8, 2.2, 3.6, { pid: 'bath', lbl: 'GUEST BATH', dw: 'W' }],
      ] },
      { W: 8.4, D: 10.4, rects: [
        ['balcony', 0, 0, 8.4, 2.2, { x: 1, lbl: 'BALCONY' }],
        ['master', 0, 2.2, 4.2, 4.6, { dw: 'E' }],
        ['landing', 4.2, 2.2, 2.0, 4.6, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['bath_m', 6.2, 2.2, 2.2, 2.2, { pid: 'bath', lbl: 'BATH 2', dw: 'W' }],
        ['store', 6.2, 4.4, 2.2, 2.4, { x: 1, lbl: 'STORE' }],
        ['common', 0, 6.8, 4.2, 3.6, { dw: 'E' }],
        ['hall', 4.2, 6.8, 2.0, 3.6, Object.assign({ lbl: 'STAIRS & HALL', rise: 'S' }, PASS)],
        ['common2', 6.2, 6.8, 2.2, 3.6, { dw: 'W' }],
      ] },
      { W: 8.4, D: 10.4, rects: [
        ['terrace', 0, 0, 8.4, 2.2, { x: 1, lbl: 'ROOF TERRACE' }],
        ['study', 0, 2.2, 4.2, 4.6, { dw: 'E' }],
        ['landing', 4.2, 2.2, 2.0, 4.6, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['sit', 6.2, 2.2, 2.2, 4.6, { x: 1, lbl: 'LOUNGE NOOK' }],
        ['store', 0, 6.8, 4.2, 3.6, { x: 1, lbl: 'STORE & UTILITY' }],
        ['hall', 4.2, 6.8, 2.0, 3.6, Object.assign({ lbl: 'HALL' }, PASS)],
        ['ac', 6.2, 6.8, 2.2, 3.6, { x: 1, lbl: 'AC LEDGE' }],
      ] },
    ],
    l3: [
      { W: 9.6, D: 11.0, rects: [
        ['garden', 0, 0, 9.6, 2.4, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.4, 5.8, 5.0, {}],
        ['kitchen', 5.8, 2.4, 3.8, 5.0, { dw: 'W' }],
        ['foyer', 0, 7.4, 3.0, 3.6, Object.assign({ lbl: 'ENTRANCE FOYER' }, PASS)],
        ['bath_c', 3.0, 7.4, 1.6, 3.6, { pid: 'bath', lbl: 'GUEST BATH', dw: 'E' }],
        ['hall', 4.6, 7.4, 2.4, 3.6, Object.assign({ lbl: 'STAIRS', rise: 'S' }, PASS)],
        ['store', 7.0, 7.4, 2.6, 3.6, { x: 1, lbl: 'STORE' }],
      ] },
      { W: 9.6, D: 11.0, rects: [
        ['balcony', 0, 0, 5.8, 2.4, { x: 1, lbl: 'BALCONY' }],
        ['ac', 5.8, 0, 3.8, 2.4, { x: 1, lbl: 'AC LEDGE' }],
        ['master', 0, 2.4, 4.6, 5.0, { dw: 'E' }],
        ['landing', 4.6, 2.4, 2.4, 5.0, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['wic', 7.0, 2.4, 2.6, 2.4, { x: 1, lbl: 'WALK-IN WARDROBE' }],
        ['bath_m', 7.0, 4.8, 2.6, 2.6, { pid: 'bath', lbl: 'MASTER BATH', dw: 'W' }],
        ['sit', 0, 7.4, 4.6, 3.6, { x: 1, lbl: 'SITTING AREA' }],
        ['hall', 4.6, 7.4, 2.4, 3.6, Object.assign({ lbl: 'STAIRS & HALL', rise: 'S' }, PASS)],
        ['store', 7.0, 7.4, 2.6, 3.6, { x: 1, lbl: 'STORE' }],
      ] },
      { W: 9.6, D: 11.0, rects: [
        ['terrace', 0, 0, 5.8, 2.4, { x: 1, lbl: 'ROOF TERRACE' }],
        ['ac', 5.8, 0, 3.8, 2.4, { x: 1, lbl: 'AC LEDGE' }],
        ['common', 0, 2.4, 4.6, 5.0, { dw: 'E' }],
        ['landing', 4.6, 2.4, 2.4, 5.0, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['study', 7.0, 2.4, 2.6, 5.0, { dw: 'W' }],
        ['common2', 0, 7.4, 4.6, 3.6, { dw: 'E' }],
        ['hall', 4.6, 7.4, 2.4, 3.6, Object.assign({ lbl: 'STAIRS & HALL', rise: 'S' }, PASS)],
        ['store', 7.0, 7.4, 2.6, 3.6, { x: 1, lbl: 'STORE' }],
      ] },
      { W: 9.6, D: 11.0, rects: [
        ['family', 0, 2.4, 4.6, 5.0, { dw: 'E' }],
        ['sit', 0, 7.4, 4.6, 3.6, { x: 1, lbl: 'READING NOOK' }],
        ['landing', 4.6, 2.4, 2.4, 5.0, Object.assign({ lbl: 'LANDING' }, PASS)],
        ['hall', 4.6, 7.4, 2.4, 3.6, Object.assign({ lbl: 'HALL' }, PASS)],
        ['terrace', 7.0, 2.4, 2.6, 8.6, { x: 1, lbl: 'ROOF TERRACE' }],
      ] },
    ],
  };
  // Canonical plan documents (plans/*.json) override / extend the inline catalog — the same
  // doc drives 2D trace, 3D walls and validation. Inline entries remain as offline fallbacks.
  const PLAN_DOCS = {};
  (ctx.planDocs || []).forEach((doc) => {
    if (!doc || !doc.layout_key || !doc.floors) return;
    PLAN_DOCS[doc.layout_key] = doc;
    P[doc.layout_key] = doc.floors.map((f) => ({ W: f.width_m, D: f.depth_m, rects: f.spaces.map((s) => {
      const o = {};
      if (s.aux !== undefined) o.x = s.aux; // aux = non-habitable flag (kept distinct from the x coordinate)
      ['pid', 'lbl', 'pass', 'dw', 'open', 'rise', 'nol', 'shop', 'solid', 'entry', 'swout'].forEach((k) => { if (s[k] !== undefined) o[k] = s[k]; });
      return [s.key, s.x, s.z, s.w, s.d, o];
    }) }));
  });
  const OPP = { S: 'N', N: 'S', E: 'W', W: 'E' };

  function heights() {
    const full = state.view && state.view.walls === 'full';
    return full
      ? { full: true, wall: 2.5, door: 2.05, leaf: 1.98, win0: 0.85, win1: 2.2, wideSill: 0.45, small0: 1.45, small1: 2.05, glassTop: 2.32, rail: 0.45, balc: 1.05, sh: 2.85 }
      : { full: false, wall: 1.2, door: 1.2, leaf: 1.06, win0: 0.5, win1: 1.14, wideSill: 0.32, small0: 0.68, small1: 1.08, glassTop: 1.2, rail: 0.45, balc: 0.9, sh: 1.5 };
  }

  function storeyRects(st) {
    return { W: st.W, D: st.D, rects: st.rects.map(([key, x, z, w, d, o]) => ({ key, id: (o && o.pid) || key, x, z, w, d, o: o || {} })) };
  }

  /* ---- boundary extraction: every wall line exists exactly once ---- */
  function boundaries(rects) {
    const EPS = 0.055, out = [];
    rects.forEach((r, i) => {
      ['S', 'N', 'W', 'E'].forEach((side) => {
        const horiz = side === 'S' || side === 'N';
        const lo = horiz ? r.x : r.z, hi = horiz ? r.x + r.w : r.z + r.d;
        const coord = side === 'S' ? r.z : side === 'N' ? r.z + r.d : side === 'W' ? r.x : r.x + r.w;
        const spans = [];
        rects.forEach((n, j) => {
          if (i === j) return;
          const nCoord = side === 'S' ? n.z + n.d : side === 'N' ? n.z : side === 'W' ? n.x + n.w : n.x;
          if (Math.abs(nCoord - coord) > EPS) return;
          const nlo = horiz ? n.x : n.z, nhi = horiz ? n.x + n.w : n.z + n.d;
          const a = Math.max(lo, nlo), b = Math.min(hi, nhi);
          if (b - a > 0.12) spans.push({ a, b, n, j });
        });
        spans.sort((p, q) => p.a - q.a);
        spans.forEach((sp) => { if (i < sp.j) out.push({ type: 'int', r, n: sp.n, side, coord, a: sp.a, b: sp.b, horiz }); });
        let cur = lo;
        spans.forEach((sp) => { if (sp.a - cur > 0.12) out.push({ type: 'ext', r, n: null, side, coord, a: cur, b: sp.a, horiz }); cur = Math.max(cur, sp.b); });
        if (hi - cur > 0.12) out.push({ type: 'ext', r, n: null, side, coord, a: cur, b: hi, horiz });
      });
    });
    return out;
  }

  function decide(b) {
    const r = b.r, n = b.n, rO = r.o, nO = n.o, opp = OPP[b.side];
    if ((rO.open || []).includes(b.side) || (nO.open || []).includes(opp)) return { kind: 'open' };
    if (rO.dw === b.side && !(nO.dw && n.id === 'bath')) return { kind: 'door', into: r, other: n, dwMatch: true, viaPass: !!nO.pass };
    if (nO.dw === opp && !(rO.dw && r.id === 'bath')) return { kind: 'door', into: n, other: r, dwMatch: true, viaPass: !!rO.pass };
    const rP = rO.pass, nP = nO.pass;
    if (rP && nP) return { kind: 'open' };
    if (rP || nP) {
      const room = rP ? n : r, pass = rP ? r : n;
      if (pass.key === 'garden') {
        if (room.id === 'living' || room.id === 'family') return { kind: 'frontdoor', into: room, other: pass };
        if (room.id === 'kitchen') return { kind: 'window' };
        if (room.id === 'bath') return { kind: 'winsmall' };
        if (room.o.x) return { kind: 'solid' };
        return { kind: 'door', into: room, other: pass, viaPass: true };
      }
      if (room.o.x) {
        if (room.key === 'hs') return { kind: 'hsdoor', into: room, other: pass };
        if (room.key === 'ac') return { kind: 'solid' };
        if (room.key === 'sit') return { kind: 'open' };
        return { kind: 'door', into: room, other: pass, viaPass: true }; // terrace, yard, store, wic
      }
      if (room.id === 'living' || room.id === 'family') return { kind: 'open' };
      return { kind: 'door', into: room, other: pass, viaPass: true };
    }
    if (rO.x || nO.x) {
      const xr = rO.x ? r : n, other = rO.x ? n : r;
      if (xr.key === 'balcony') return (other.id === 'living' || other.id === 'family' || other.id === 'master') ? { kind: 'slider' } : { kind: 'window' };
      if (xr.key === 'terrace') return { kind: 'slider' };
      if (xr.key === 'yard') return { kind: 'door', into: xr, other };
      if (xr.key === 'wic') return { kind: 'door', into: xr, other };
      if (xr.key === 'store') return { kind: 'door', into: xr, other };
      if (xr.key === 'sit') return { kind: 'solid' };
      return { kind: 'solid' };
    }
    return { kind: 'solid' };
  }

  // one door per room: bedrooms keep only their circulation dw door; service (aux) rooms keep
  // their best single door (kitchen > circulation > room > bath).
  function dedupeDoors(bs) {
    const rooms = {};
    bs.forEach((b) => {
      const d = b.dec; if (d.kind !== 'door' || !d.into) return;
      if (d.into.o.x) return;
      const rec = rooms[d.into.key] || (rooms[d.into.key] = { dw: [], pass: [], id: d.into.id });
      (d.dwMatch ? rec.dw : rec.pass).push(b);
    });
    Object.values(rooms).forEach((rec) => {
      if (rec.dw.length > 1 && /^(master|common|common2|study)$/.test(rec.id)) {
        const score = (b) => { const o = b.dec.other; return o && o.o.pass ? 2 : o && o.id === 'kitchen' ? 1 : 0; };
        rec.dw.sort((a, c) => score(c) - score(a) || ((c.b - c.a) - (a.b - a.a)));
        rec.dw.slice(1).forEach((b) => { b.dec = { kind: 'solid' }; });
        rec.dw = rec.dw.slice(0, 1);
      }
      rec.pass.sort((a, c) => (c.b - c.a) - (a.b - a.a));
      const dwViaPass = rec.dw.some((b) => b.dec.viaPass);
      const keepPass = rec.dw.length === 0 ? 1 : dwViaPass ? 0 : 1;
      rec.pass.slice(keepPass).forEach((b) => { b.dec = { kind: 'solid' }; });
    });
    const xdoors = {};
    bs.forEach((b) => {
      const d = b.dec; if (d.kind !== 'door') return;
      const xr = [d.into, d.other].find((r) => r && r.o && r.o.x && !r.o.pass);
      if (xr) (xdoors[xr.key] = xdoors[xr.key] || []).push(b);
    });
    Object.entries(xdoors).forEach(([xk, list]) => {
      const sc = (b) => { const o = b.dec.into.key === xk ? b.dec.other : b.dec.into; return !o ? 0 : o.id === 'kitchen' ? 3 : o.o.pass ? 2 : o.id !== 'bath' ? 1 : 0; };
      // a service door must fit a real leaf FIRST (≥0.95m boundary), then prefer kitchen > circulation
      list.sort((a, c) => (((c.b - c.a) >= 0.95) - ((a.b - a.a) >= 0.95)) || (sc(c) - sc(a)) || ((c.b - c.a) - (a.b - a.a)));
      list.slice(1).forEach((b) => { b.dec = { kind: 'solid' }; });
    });
  }

  function extKind(r, side, first) {
    const k = r.key, id = r.id;
    if (r.o.solid && r.o.solid.includes(side)) return 'solid'; // declared party / blind wall
    if (k === 'foyer') return (r.o.entry ? side === r.o.entry : side === first) ? 'entry' : 'solid';
    if (k === 'garden') return side === 'S' ? 'gate' : 'rail';
    if (k === 'balcony') return 'railglass';
    if (k === 'terrace' || k === 'ac') return 'rail';
    if (k === 'yard') return 'louvre';
    if (r.o.pass || r.o.x) return 'solid';
    if (id === 'living' || id === 'family') return side === 'S' ? 'winwide' : 'window';
    if (id === 'master' || id === 'common' || id === 'common2' || id === 'study' || id === 'kitchen') return side === first ? 'window' : 'solid';
    if (id === 'bath') return side === first ? 'winsmall' : 'solid';
    return 'solid';
  }

  const WT_INT = 0.09, WT_EXT = 0.14;
  let group = null, outline = null, riseI = 0, storeyGroups = [], dimNodes = [], SHcur = 1.5, Wcur = 10;
  let furnNodes = [], doorNodes = [], labelNodes = [], bucket = null;
  let sceneData = null, sceneCur = null, overlayGroup = null;
  const decor = { furn: true, swings: true, labels: true, wall: '#f4f1ea' };
  const parts = {};
  const raycaster = new THREE.Raycaster();

  function mkBox(g, w, h, d, mat, x, y, z, name, rise) {
    const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z);
    if (bucket) bucket.push(m);
    if (rise) { m.scale.y = 0.001; tween(m.scale, 'y', 1, 700, 250 + (riseI % 46) * 24); riseI++; }
    g.add(m); return m;
  }
  function mkCyl(g, r1, h, mat, x, y, z, name) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, h, 24), mat); m.name = name; m.position.set(x, y + h / 2, z); if (bucket) bucket.push(m); g.add(m); return m;
  }
  function makeSprite(g, text, x, y, z, o) {
    o = o || {};
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const q = c.getContext('2d'); q.font = `600 ${o.px || 44}px Oswald, Arial, sans-serif`; q.textAlign = 'center';
    q.fillStyle = o.color || 'rgba(26,32,35,0.92)'; q.fillText(text, 256, 82);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: o.fade ? 0 : 1 }));
    sp.name = o.name || 'label'; sp.scale.set(o.sx || 1.9, o.sy || 0.48, 1); sp.position.set(x, y, z);
    if (o.fade) tween(sp.material, 'opacity', 1, 600, 1100);
    g.add(sp); return sp;
  }

  /* ---- one boundary → wall segments, openings, leaves, arcs ---- */
  function drawBoundary(g, b, cx, cz, H) {
    const kind = b.dec.kind; if (kind === 'open') return;
    let portal = null; // walkable gap along the boundary axis (centered coords)
    let t = b.type === 'ext' ? WT_EXT : WT_INT;
    if (b.r.key === 'hs' || (b.n && b.n.key === 'hs')) t = 0.16; // blast wall
    let off = 0;
    if (b.type === 'ext') off = (b.side === 'S' || b.side === 'W') ? t / 2 : -t / 2;
    const horiz = b.horiz, base = (horiz ? b.coord - cz : b.coord - cx) + off;
    const a = b.a, bb = b.b, len = bb - a;
    const nm = (p) => `${p}_${b.r.key}_${b.side}`;
    const seg = (p, q, y0, h, mat, name, jA, jB) => {
      if (q - p < 0.02 || h < 0.015) return;
      const e0 = jA ? 0 : 0.05, e1 = jB ? 0 : 0.05;
      const L = (q - p) + e0 + e1, mid = (p - e0 + q + e1) / 2 - (horiz ? cx : cz);
      if (horiz) mkBox(g, L, h, t, mat, mid, y0, base, name, true);
      else mkBox(g, t, h, L, mat, base, y0, mid, name, true);
    };
    const frameRail = (p, q, y) => {
      const L = q - p, mid = (p + q) / 2 - (horiz ? cx : cz);
      if (horiz) mkBox(g, L, 0.035, t + 0.02, matDark, mid, y, base, nm('frame'), true);
      else mkBox(g, t + 0.02, 0.035, L, matDark, base, y, mid, nm('frame'), true);
    };
    const windowAt = (sill, top, ws, we) => {
      seg(a, bb, 0, sill, matWall, nm('sill'));
      seg(a, ws, sill, H.wall - sill, matWall, nm('wall'), false, true);
      seg(we, bb, sill, H.wall - sill, matWall, nm('wall'), true, false);
      seg(ws, we, sill, top - sill, matGlass, nm('glass'), true, true);
      if (H.wall - top > 0.02) seg(ws, we, top, H.wall - top, matWall, nm('header'), true, true);
      frameRail(ws, we, sill - 0.018); frameRail(ws, we, top - 0.017);
    };
    const doorAt = (gw, leafMat, arc, openF) => {
      gw = Math.min(gw, len - 0.24);
      if (gw < 0.45) { seg(a, bb, 0, H.wall, matWall, nm('wall')); return; } // too tight for a leaf — keep the wall
      const gs = a + Math.min(0.16, len - gw - 0.02), ge = gs + gw;
      portal = [gs - (horiz ? cx : cz), ge - (horiz ? cx : cz)];
      if (sceneCur) sceneCur.doors.push({ kind, horiz, base, p0: portal[0], p1: portal[1], w: gw, into: (b.dec.into || b.r).key, other: b.dec.other ? b.dec.other.key : (b.type === 'ext' ? 'EXTERIOR' : (b.n ? b.n.key : 'EXTERIOR')), sw: ((b.dec.into || b.r).o && (b.dec.into || b.r).o.swout && b.dec.other) ? b.dec.other.key : (b.dec.into || b.r).key });
      seg(a, gs, 0, H.wall, matWall, nm('wall'), false, true);
      seg(ge, bb, 0, H.wall, matWall, nm('wall'), true, false);
      if (H.full) seg(gs, ge, H.door, H.wall - H.door, matWall, nm('lintel'), true, true);
      const into = b.dec.into || b.r;
      const swingRm = (into.o && into.o.swout && b.dec.other) ? b.dec.other : into; // outward-opening leaf (tiny WCs)
      const intoPos = (horiz ? (swingRm.z + swingRm.d / 2) : (swingRm.x + swingRm.w / 2)) > b.coord;
      const hx = horiz ? gs - cx : base, hz = horiz ? base : gs - cz;
      const A = horiz ? 0 : -Math.PI / 2;
      const s = horiz ? (intoPos ? -1 : 1) : (intoPos ? 1 : -1);
      const delta = 1.35 * s;
      const hg = new THREE.Group(); hg.position.set(hx, 0, hz); hg.rotation.y = A + delta * (openF == null ? 0.85 : openF); g.add(hg);
      doorNodes.push(mkBox(hg, gw - 0.05, H.leaf, 0.045, leafMat, (gw - 0.05) / 2, 0.012, 0, nm('door'), true));
      if (arc) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.05, gw - 0.045), gw, 24, 1, Math.min(A, A + delta), Math.abs(delta)), arcMat);
        ring.rotation.x = -Math.PI / 2; ring.position.set(hx, 0.022, hz); ring.name = nm('swing'); g.add(ring);
        doorNodes.push(ring);
      }
    };
    if (kind === 'solid') seg(a, bb, 0, H.wall, matWall, nm('wall'));
    else if (kind === 'door') doorAt(b.dec.into && b.dec.into.id === 'bath' ? 0.72 : 0.85, matWood, true);
    else if (kind === 'frontdoor') doorAt(0.95, matWood, true, 0.55);
    else if (kind === 'entry') doorAt(0.95, matWood, true, 0.5);
    else if (kind === 'hsdoor') doorAt(0.72, matSteel, false, 0.12);
    else if (kind === 'window') {
      const cw = Math.max(Math.min(len * 0.62, 2.6), Math.min(0.8, len - 0.3));
      windowAt(H.win0, H.win1, a + (len - cw) / 2, a + (len + cw) / 2);
    } else if (kind === 'winsmall') {
      const cw = Math.min(0.7, len - 0.3);
      windowAt(H.small0, H.small1, a + (len - cw) / 2, a + (len + cw) / 2);
    } else if (kind === 'winwide') {
      const ws = a + 0.15, we = bb - 0.15;
      windowAt(H.wideSill, H.win1, ws, we);
      const nMull = Math.max(0, Math.round((we - ws) / 1.4) - 1);
      for (let i = 1; i <= nMull; i++) {
        const p = ws + (we - ws) * (i / (nMull + 1));
        if (horiz) mkBox(g, 0.04, H.win1 - H.wideSill, t + 0.02, matDark, p - cx, H.wideSill, base, nm('mullion'), true);
        else mkBox(g, t + 0.02, H.win1 - H.wideSill, 0.04, matDark, base, H.wideSill, p - cz, nm('mullion'), true);
      }
    } else if (kind === 'slider') {
      portal = [a + 0.05 - (horiz ? cx : cz), bb - 0.05 - (horiz ? cx : cz)];
      seg(a, bb, 0, 0.035, matDark, nm('track'), true, true);
      const mid = (a + bb) / 2;
      seg(a + 0.05, mid - 0.02, 0.035, H.glassTop - 0.035, matGlass, nm('slider'), true, true);
      seg(mid + 0.02, bb - 0.05, 0.035, H.glassTop - 0.035, matGlass, nm('slider'), true, true);
      [a + 0.03, mid, bb - 0.03].forEach((p) => {
        if (horiz) mkBox(g, 0.05, H.glassTop, t, matDark, p - cx, 0, base, nm('post'), true);
        else mkBox(g, t, H.glassTop, 0.05, matDark, base, 0, p - cz, nm('post'), true);
      });
      if (H.wall - H.glassTop > 0.02) seg(a, bb, H.glassTop, H.wall - H.glassTop, matWall, nm('header'), true, true);
    } else if (kind === 'rail') seg(a, bb, 0, H.rail, matWall, nm('rail'));
    else if (kind === 'gate') {
      const mid = (a + bb) / 2;
      portal = [mid - 0.5 - (horiz ? cx : cz), mid + 0.5 - (horiz ? cx : cz)];
      seg(a, mid - 0.5, 0, H.rail, matWall, nm('rail'), false, true);
      seg(mid + 0.5, bb, 0, H.rail, matWall, nm('rail'), true, false);
    } else if (kind === 'railglass') {
      seg(a, bb, 0, 0.12, matWall, nm('railbase'));
      seg(a + 0.03, bb - 0.03, 0.12, H.balc - 0.12, matGlass, nm('railglass'), true, true);
      frameRail(a, bb, H.balc);
    } else if (kind === 'louvre') {
      seg(a, bb, 0, 0.55, matWall, nm('wall'));
      seg(a + 0.05, bb - 0.05, 0.55, Math.min(1.1, H.wall) - 0.55, matGlass, nm('louvre'), true, true);
    }
    if (sceneCur) {
      const c0 = horiz ? cx : cz;
      sceneCur.bounds.push({ horiz, base, a: a - c0, b: bb - c0, kind, thick: t, portal });
    }
  }

  /* ---- bathroom: fixtures laid out from the door, like the real plans ---- */
  function bathFit(g, r, cx, cz, H, ds, accent) {
    ds = ds || 'S';
    const k = { S: 0, E: 1, N: 2, W: 3 }[ds], odd = k % 2 === 1;
    const du = odd ? r.d : r.w, dv = odd ? r.w : r.d; // du along door wall, dv inward
    const mir = k >= 2; // door gaps sit at the low-coordinate end of their wall in world space
    const Pt = (u, v) => {
      const uu = mir ? du - u : u; // u=0 is always the door-gap end of the wall
      let lx, lz;
      if (k === 0) { lx = uu; lz = v; } else if (k === 2) { lx = r.w - uu; lz = r.d - v; }
      else if (k === 1) { lx = r.w - v; lz = uu; } else { lx = v; lz = r.d - uu; }
      return [r.x + lx - cx, r.z + lz - cz];
    };
    const B = (uS, vS, uC, vC, h, y0, mat, name, rise) => {
      const [px, pz] = Pt(uC, vC);
      return mkBox(g, odd ? vS : uS, h, odd ? uS : vS, mat, px, y0, pz, name, rise !== false);
    };
    const glassH = Math.min(H.wall - 0.12, 1.9);
    const fab = [];
    if (du < 1.35) { // narrow bath — linear run from the door
      const sd = Math.min(0.95, dv * 0.34);
      B(du - 0.12, sd, du / 2, dv - sd / 2, 0.045, 0.004, matFix, `shower_tray_${r.key}`);
      B(du - 0.16, 0.035, du / 2, dv - sd, glassH, 0.05, matGlass, `shower_screen_${r.key}`);
      const [hx, hz] = Pt(du / 2, dv - 0.16); mkCyl(g, 0.06, 0.02, matDark, hx, Math.min(H.wall - 0.1, 1.85), hz, `rainshower_${r.key}`);
      const [tx, tz] = Pt(du / 2, dv - sd / 2); mkCyl(g, 0.045, 0.008, matDark, tx, 0.05, tz, `floortrap_${r.key}`);
      B(0.4, 0.14, 0.31, dv - sd - 0.28, 0.4, 0.05, matFix, `wc_tank_${r.key}`);
      B(0.37, 0.42, 0.31, dv - sd - 0.52, 0.3, 0.05, matFix, `wc_${r.key}`);
      B(0.44, 0.4, du - 0.3, 0.55, 0.52, 0.05, matFix, `vanity_${r.key}`);
      B(0.4, 0.03, du - 0.3, 0.35, 0.5, glassH * 0.52, matGlass, `mirror_${r.key}`);
    } else {
      const sw = Math.min(0.95, Math.max(0.75, du - 1.1)), sd = Math.min(0.95, dv * 0.42);
      B(sw, sd, du - sw / 2, dv - sd / 2, 0.045, 0.004, matFix, `shower_tray_${r.key}`);
      B(0.035, sd, du - sw, dv - sd / 2, glassH, 0.05, matGlass, `shower_screen_${r.key}`);
      if (sd < dv - 0.5) B(sw * 0.55, 0.035, du - sw * 0.72, dv - sd, glassH, 0.05, matGlass, `shower_return_${r.key}`);
      const [hx, hz] = Pt(du - sw / 2, dv - 0.16); mkCyl(g, 0.06, 0.02, matDark, hx, Math.min(H.wall - 0.1, 1.85), hz, `rainshower_${r.key}`);
      const [tx, tz] = Pt(du - sw / 2, dv - sd / 2); mkCyl(g, 0.045, 0.008, matDark, tx, 0.05, tz, `floortrap_${r.key}`);
      B(0.4, 0.14, 0.32, dv - 0.09, 0.4, 0.05, matFix, `wc_tank_${r.key}`);
      B(0.37, 0.44, 0.32, dv - 0.42, 0.3, 0.05, matFix, `wc_${r.key}`);
      const vw = Math.min(0.9, dv - sd - 0.6);
      if (vw > 0.35) {
        B(0.46, vw, du - 0.27, 0.32 + vw / 2, 0.52, 0.05, matFix, `vanity_${r.key}`); // side wall, clear of any mid-wall gap
        B(0.03, Math.max(0.3, vw - 0.12), du - 0.05, 0.32 + vw / 2, 0.5, glassH * 0.52, matGlass, `mirror_${r.key}`);
      }
    }
    fab.push(B(0.06, 0.5, 0.06, dv * 0.55, 0.05, glassH * 0.5, accent, `towel_${r.key}`));
    return fab;
  }

  function furnish(g, r, cx, cz, H, dss, accent) {
    const x = r.x + r.w / 2 - cx, z = r.z + r.d / 2 - cz;
    const has = (s) => dss.includes(s); // dss = ALL door walls of this room (hall door, ensuite, …)
    const fab = [];
    if (r.o.shop) { // shop fit-out: gondola + wall shelving + cashier, entrance kept clear
      const gl = Math.min(3.0, r.d - 3.2);
      fab.push(mkBox(g, 0.9, 1.35, gl, accent, x, 0.07, z + 0.2, `gondola_${r.key}`, true));
      mkBox(g, 0.4, 1.6, Math.min(3.2, r.d - 2.8), matWood, x - r.w / 2 + 0.26, 0.07, z + 0.3, `shelf_w_${r.key}`, true);
      mkBox(g, 0.4, 1.6, Math.min(3.2, r.d - 2.8), matWood, x + r.w / 2 - 0.26, 0.07, z + 0.3, `shelf_e_${r.key}`, true);
      mkBox(g, 1.6, 0.95, 0.6, matDark, x + r.w / 2 - 1.3, 0.07, z - r.d / 2 + 0.9, `cashier_${r.key}`, true);
      return fab;
    }
    const bedW = { master: 1.7, common: 1.15, common2: 1.15 }[r.id];
    if (bedW) {
      // Walking space: headboard away from the door wall, bed shifted off the wardrobe wall so
      // both bedside lanes stay ~55cm, wardrobe hugs the headboard half, door-swing corner free.
      const hz = has('N') ? -1 : 1;
      const wSide = has('E') ? -1 : 1;
      const bw = Math.min(bedW, r.w - 1.2);
      const bx = x - wSide * 0.29, bz = z + hz * (r.d / 2 - 1.18);
      mkBox(g, bw, 0.28, 1.9, matWood, bx, 0.07, bz, `bedbase_${r.key}`, true);
      fab.push(mkBox(g, bw - 0.06, 0.16, 1.72, accent, bx, 0.36, bz, `mattress_${r.key}`, true));
      fab.push(mkBox(g, Math.min(bw - 0.3, 1.1), 0.1, 0.5, matFix, bx, 0.53, bz + hz * 0.5, `pillow_${r.key}`, true));
      mkBox(g, bw + 0.24, 0.78, 0.08, matWood, bx, 0.07, z + hz * (r.d / 2 - 0.16), `headboard_${r.key}`, true);
      if (r.w - bw > 1.75) {
        mkBox(g, 0.38, 0.4, 0.38, matWood, bx - bw / 2 - 0.3, 0.07, bz + hz * 0.55, `sidetable_a_${r.key}`, true);
        mkBox(g, 0.38, 0.4, 0.38, matWood, bx + bw / 2 + 0.3, 0.07, bz + hz * 0.55, `sidetable_b_${r.key}`, true);
      }
      const wl = Math.min(1.8, r.d / 2 - 0.3);
      mkBox(g, 0.56, Math.min(1.1, H.wall - 0.1), wl, matWood, x + wSide * (r.w / 2 - 0.36), 0.07, z + hz * (r.d / 2 - wl / 2 - 0.14), `wardrobe_${r.key}`, true);
      if (r.id !== 'master' && r.w > 2.7) mkBox(g, 0.9, 0.44, 0.5, matWood, x + (has('E') ? -1 : 1) * (r.w / 2 - 0.62), 0.07, z - hz * (r.d / 2 - 0.42), `desk_${r.key}`, true);
    }
    if (r.id === 'living' || r.id === 'family') {
      // Zoning: lounge in the window half, dining in the kitchen/entry half, and the lane to
      // the corridor / foyer openings left furniture-free.
      const big = r.w > 6.5;
      const sd = Math.max(1.2, Math.min(2.3, r.d - 2.4));
      const zone = z - Math.max(0, r.d / 2 - 1.9);
      const sofaX = big ? x - r.w / 2 + 3.25 : x - r.w / 2 + 0.62;
      fab.push(mkBox(g, 0.85, 0.4, sd, accent, sofaX, 0.07, zone, `sofa_${r.key}`, true));
      fab.push(mkBox(g, 0.18, 0.7, sd, accent, sofaX + (big ? 0.34 : -0.36), 0.07, zone, `sofaback_${r.key}`, true));
      mkCyl(g, 0.35, 0.3, matWood, big ? x - r.w / 2 + 2.0 : x + 0.22, 0.07, zone, `coffee_${r.key}`);
      const tvX = big ? x - r.w / 2 : x + r.w / 2, tvs = big ? 1 : -1;
      const tvZ = big ? zone : z - Math.max(0, r.d / 2 - 1.35); // TV strip hugs the facade half, clear of mid-wall openings
      mkBox(g, 0.42, 0.3, Math.min(1.4, r.d - 1.8), matWood, tvX + tvs * 0.4, 0.07, tvZ, `console_${r.key}`, true);
      mkBox(g, 0.05, 0.74, Math.min(1.2, r.d - 2), matDark, tvX + tvs * 0.13, 0.46, tvZ, `tv_${r.key}`, true);
      if (!big) mkBox(g, 0.42, 0.09, 0.9, matWood, x + r.w / 2 - 0.4, 1.0, tvZ, `shelf_${r.key}`, true);
      if (r.id === 'living' && r.d > 4.4) {
        const dX = big ? x + r.w / 2 - 4.4 : x - r.w / 2 + 1.7, dZ = z + r.d / 2 - 1.15;
        mkBox(g, 1.35, 0.4, 0.8, matWood, dX, 0.07, dZ, `dining_${r.key}`, true);
        [[-0.45, -0.62], [0.45, -0.62], [-0.45, 0.62], [0.45, 0.62]].forEach(([ddx, ddz], i) => mkCyl(g, 0.16, 0.4, matWood, dX + ddx, 0.07, dZ + ddz, `stool_${i}_${r.key}`));
      }
    }
    if (r.id === 'kitchen') {
      // Run/appliance placement driven by ALL door walls: main run sits on a doorless wall,
      // is shortened clear of the fridge and of any swing on its own wall; the tall (L/fridge)
      // side only uses a wall without doors.
      const galley = r.d < 2.2;
      const runOnS = galley || has('N');
      const runZ = runOnS ? z - r.d / 2 + 0.42 : z + r.d / 2 - 0.42;
      const cabZ = runOnS ? z - r.d / 2 + 0.3 : z + r.d / 2 - 0.3;
      const lSide = r.o.nol ? 0 : !has('E') ? 1 : !has('W') ? -1 : 0;
      const fSide = lSide || (has('W') ? 1 : -1);
      let lo = x - r.w / 2 + 0.25, hi = x + r.w / 2 - 0.25;
      if (has('W')) lo += 0.72;
      if (has('E')) hi -= 0.72;
      if ((runOnS && has('S')) || (!runOnS && has('N'))) lo += 0.7; // door gaps sit at the low end of their wall
      if (lSide === 1) hi -= 0.68; else if (lSide === -1) lo += 0.68;
      const cw2 = Math.max(0.5, hi - lo);
      const cx2 = Math.min(Math.max((lo + hi) / 2, x - r.w / 2 + 0.27 + cw2 / 2), x + r.w / 2 - 0.27 - cw2 / 2);
      mkBox(g, cw2, 0.56, 0.6, matDark, cx2, 0.07, runZ, `counter_${r.key}`, true);
      mkBox(g, cw2, 0.3, 0.36, matWood, cx2, Math.min(0.84, H.wall - 0.36), cabZ, `uppercab_${r.key}`, true);
      mkBox(g, Math.min(0.5, cw2 * 0.4), 0.02, 0.34, matFix, cx2 - cw2 / 4, 0.64, runZ, `sink_${r.key}`, true);
      mkBox(g, Math.min(0.55, cw2 * 0.4), 0.02, 0.36, matDark, cx2 + cw2 / 4, 0.65, runZ, `hob_${r.key}`, true);
      if (!galley && lSide) mkBox(g, 0.62, 0.56, Math.min(1.8, r.d - 1.7), matDark, x + lSide * (r.w / 2 - 0.43), 0.07, z - (runOnS ? -0.1 : 0.2), `counterL_${r.key}`, true);
      const fz = runOnS ? z + r.d / 2 - 0.44 : z - r.d / 2 + 0.44;
      mkBox(g, 0.68, Math.min(1.12, H.wall - 0.08), 0.62, matFix, lSide ? x + fSide * (r.w / 2 - 0.42) : x, 0.07, fz, `fridge_${r.key}`, true);
    }
    if (r.id === 'bath') fab.push(...bathFit(g, r, cx, cz, H, dss.own || dss[0], accent));
    if (r.id === 'study') {
      mkBox(g, Math.min(1.4, r.w - 0.5), 0.46, 0.6, matWood, x, 0.07, z - r.d / 2 + 0.44, `desk_${r.key}`, true);
      fab.push(mkCyl(g, 0.21, 0.42, accent, x, 0.07, z - r.d / 2 + 1.06, `chair_${r.key}`));
      const bsd = has('E') ? -1 : 1; // bookshelf on the side wall away from the door
      mkBox(g, 0.3, 0.8, Math.min(1.6, r.d - 1.6), matWood, x + bsd * (r.w / 2 - 0.26), 0.07, z + r.d * 0.1, `bookshelf_${r.key}`, true);
    }
    return fab;
  }

  function extrasDetail(g, r, x, z, H, ds, hasUp) {
    const hasD = (s) => Array.isArray(ds) && ds.includes(s);
    if (r.key === 'yard') {
      // washer against the wall opposite the yard door
      const wx = hasD('E') ? x - r.w / 2 + 0.36 : hasD('W') ? x + r.w / 2 - 0.36 : x;
      const wz = hasD('E') || hasD('W') ? z : hasD('N') ? z - r.d / 2 + 0.38 : z + r.d / 2 - 0.38;
      mkBox(g, 0.62, 0.85, 0.62, matFix, wx, 0.07, wz, `washer_${r.key}`, true);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), matDark);
      drum.name = 'washer_door'; drum.rotation.x = Math.PI / 2; drum.position.set(wx, 0.52, wz - 0.32); g.add(drum);
    }
    if (r.key === 'ac') { mkBox(g, 0.66, 0.5, 0.3, matFix, x, 0.06, z - Math.max(0, r.d / 2 - 0.4), `ac_condenser_a`, true); if (r.w > 1.6 || r.d > 1.9) mkBox(g, 0.66, 0.5, 0.3, matFix, x, 0.06, z + Math.max(0.45, r.d / 2 - 1.1), `ac_condenser_b`, true); }
    if (r.key === 'balcony' || r.key === 'terrace' || r.key === 'garden') {
      mkBox(g, 0.5, 0.34, 0.5, matGreen, x - r.w / 2 + 0.5, 0.05, z, `planter_a_${r.key}`, true);
      mkBox(g, 0.5, 0.34, 0.5, matGreen, x + r.w / 2 - 0.5, 0.05, z, `planter_b_${r.key}`, true);
      if (r.key === 'garden') mkCyl(g, 0.35, 0.5, matGreen, x, 0.05, z + r.d / 4, `shrub_${r.key}`);
      if (r.key === 'terrace') mkBox(g, 1.2, 0.38, 0.7, matWood, x, 0.05, z, `outdoor_seat_${r.key}`, true);
    }
    if (r.key === 'hall' && hasUp) {
      // full-height flight rising onto the stacked hall / landing of the storey above
      const dir = r.o.rise === 'S' ? -1 : 1;
      const tw = Math.min(1.0, r.w - 0.35), n = 9, tread = Math.min(0.3, (r.d - 0.9) / n);
      for (let i = 0; i < n; i++) mkBox(g, tw, 0.085, tread + 0.02, matWood, x, ((i + 1) / n) * (H.sh - 0.16), z - dir * (r.d / 2 - 0.5) + dir * i * tread, `stair_${i}_${r.key}`, true);
      mkBox(g, 0.06, H.sh - 0.16, 0.06, matDark, x + tw / 2 - 0.03, 0.05, z - dir * (r.d / 2 - 0.5), `newel_${r.key}`, true);
    }
    if (r.key === 'wic') { mkBox(g, 0.55, 1.1, r.d - 0.6, matWood, x + r.w / 2 - 0.34, 0.07, z, `wic_a`, true); mkBox(g, r.w - 1.2, 1.1, 0.55, matWood, x - 0.03, 0.07, z + r.d / 2 - 0.34, `wic_b`, true); }
    if (r.key === 'store') mkBox(g, Math.min(1.4, r.w - 0.5), 0.9, 0.4, matWood, x, 0.07, z + r.d / 2 - 0.32, `shelving_${r.key}`, true);
    if (r.key === 'sit') { mkBox(g, 0.8, 0.4, 1.6, matWood, x - 0.6, 0.07, z, `bench_${r.key}`, true); mkCyl(g, 0.3, 0.3, matWood, x + 0.5, 0.07, z, `sidetbl_${r.key}`); }
  }

  function overallDims(g, W, D) {
    const grp = new THREE.Group(); grp.name = 'dims_overall'; grp.visible = false; g.add(grp); dimNodes.push(grp);
    const mk = (w, d, x, z, nmx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), matDark); m.position.set(x, 0.02, z); m.name = nmx; grp.add(m); };
    const zf = D / 2 + 0.55, xs = -W / 2 - 0.55;
    mk(W, 0.02, 0, zf, 'dim_w'); mk(0.02, 0.18, -W / 2, zf, 'dim_tick'); mk(0.02, 0.18, W / 2, zf, 'dim_tick');
    mk(0.02, D, xs, 0, 'dim_d'); mk(0.18, 0.02, xs, -D / 2, 'dim_tick'); mk(0.18, 0.02, xs, D / 2, 'dim_tick');
    makeSprite(grp, W.toFixed(1) + ' m', 0, 0.16, zf + 0.1, { px: 40, color: 'rgba(58,64,67,0.95)', sx: 1.5, sy: 0.38, name: 'dim_label' });
    makeSprite(grp, D.toFixed(1) + ' m', xs - 0.1, 0.16, 0, { px: 40, color: 'rgba(58,64,67,0.95)', sx: 1.5, sy: 0.38, name: 'dim_label' });
  }

  function buildModel() {
    const l = layout(); const H = heights(); SHcur = H.sh;
    group = new THREE.Group(); group.name = 'flat';
    Object.keys(parts).forEach((k) => delete parts[k]); outline = null; riseI = 0;
    storeyGroups = []; dimNodes = []; furnNodes = []; doorNodes = []; labelNodes = []; bucket = null;
    sceneData = { storeys: [] }; sceneCur = null; overlayGroup = null;
    const storeys = l ? P[l.id] : null;
    const dims = storeys ? storeys.map(storeyRects) : [{ W: 9.6, D: 8, rects: [] }];
    const W = Math.max(...dims.map((d) => d.W)), D = Math.max(...dims.map((d) => d.D));
    Wcur = W;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.8, D + 1.8), matPlan);
    sheet.name = 'floorplan_sheet'; sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.001; group.add(sheet);
    if (state.planUrl && state.planUrl.startsWith('data:')) {
      new THREE.TextureLoader().load(state.planUrl, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; sheet.material = M(0xffffff, 1, 'plan_paper', { map: tx }); });
    }
    const labY = dims.length > 1 ? H.wall + 0.12 : H.wall + 0.5;
    dims.forEach((dim, si) => {
      const sg = new THREE.Group(); sg.name = 'storey_' + si; sg.position.y = si * H.sh; group.add(sg); storeyGroups.push(sg);
      const cx = W / 2, cz = D / 2; // shared grid: storeys stack on one origin so stairs align
      sceneCur = { si, W: dim.W, D: dim.D, cx, cz, rects: dim.rects, doors: [], bounds: [] };
      sceneData.storeys.push(sceneCur);
      if (si > 0) {
        const bx0 = Math.min(...dim.rects.map((r) => r.x)), bx1 = Math.max(...dim.rects.map((r) => r.x + r.w));
        const bz0 = Math.min(...dim.rects.map((r) => r.z)), bz1 = Math.max(...dim.rects.map((r) => r.z + r.d));
        mkBox(sg, bx1 - bx0 + 0.3, 0.09, bz1 - bz0 + 0.3, matSlab, (bx0 + bx1) / 2 - cx, -0.12, (bz0 + bz1) / 2 - cz, `slab_storey_${si}`, true);
      }
      const bs = boundaries(dim.rects);
      const extMap = new Map();
      bs.forEach((b) => { if (b.type === 'ext') { const s = extMap.get(b.r) || []; if (!s.includes(b.side)) s.push(b.side); extMap.set(b.r, s); } });
      const firstExt = (r) => { const s = extMap.get(r) || []; return ['S', 'N', 'W', 'E'].find((k) => s.includes(k)) || null; };
      bs.forEach((b) => { b.dec = b.type === 'ext' ? { kind: extKind(b.r, b.side, firstExt(b.r)), into: b.r } : decide(b); });
      dedupeDoors(bs);
      const doorSides = {}, ownDoor = {};
      const addDoor = (rm, side, isOwn) => {
        if (!rm) return;
        (doorSides[rm.key] = doorSides[rm.key] || []).push(side);
        if (isOwn && !ownDoor[rm.key]) ownDoor[rm.key] = side;
      };
      bs.forEach((b) => {
        const d = b.dec;
        if (!['door', 'hsdoor', 'entry', 'frontdoor'].includes(d.kind)) return;
        addDoor(d.into, d.into === b.r ? b.side : OPP[b.side], true);
        if (d.other) addDoor(d.other, d.other === b.r ? b.side : OPP[b.side], false);
      });
      dim.rects.forEach((r) => {
        const x = r.x + r.w / 2 - cx, z = r.z + r.d / 2 - cz;
        const dss = doorSides[r.key] || [];
        dss.own = ownDoor[r.key] || null;
        if (r.o.x) {
          mkBox(sg, r.w - 0.06, 0.045, r.d - 0.06, matBase, x, 0.004, z, `floor_${r.key}_${si}`, false);
          bucket = furnNodes; extrasDetail(sg, r, x, z, H, dss, si < dims.length - 1); bucket = null;
          labelNodes.push(makeSprite(sg, r.o.lbl || r.key.toUpperCase(), x, labY - 0.34, z, { color: 'rgba(105,115,108,0.9)', fade: true }));
          return;
        }
        const themed = !!state.themes[r.id];
        const baseMat = r.id === 'bath' ? matTile : matBase;
        const floor = mkBox(sg, r.w - 0.06, r.id === 'bath' ? 0.05 : 0.07, r.d - 0.06, themed ? floorMats[themeFor(r.id)] : baseMat, x, 0.004, z, `floor_${r.key}`, false);
        floor.userData.rid = r.id;
        if (!parts[r.id]) parts[r.id] = { floors: [], fabrics: [] };
        parts[r.id].floors.push(floor);
        const fabs = (() => { bucket = furnNodes; const f = furnish(sg, r, cx, cz, H, dss, themeMats[themeFor(r.id)]); bucket = null; return f; })();
        parts[r.id].fabrics.push(...fabs);
        labelNodes.push(makeSprite(sg, r.o.lbl || ROOMS[r.id].label, x, labY, z, { fade: true }));
        const dsp = makeSprite(sg, `${r.w.toFixed(1)} × ${r.d.toFixed(1)} m`, x, Math.max(0.5, labY - 0.32), z, { px: 36, color: 'rgba(90,126,138,0.95)', sx: 1.45, sy: 0.36, name: 'dim_room' });
        dsp.visible = false; dimNodes.push(dsp);
      });
      bs.forEach((b) => drawBoundary(sg, b, cx, cz, H));
    });
    if (storeys) {
      overallDims(group, W, D);
      makeSprite(group, 'N', W / 2 + 0.62, 0.3, D / 2 + 0.62, { px: 52, color: 'rgba(105,115,108,0.9)', sx: 0.5, sy: 0.5, name: 'compass' });
    }
    const v = state.view || {};
    dimNodes.forEach((n) => { n.visible = !!v.dims; });
    setDecor();
    applyUnderlay();
    stage.setObject(group);
    if (v.storey >= storeyGroups.length) v.storey = -1;
    applyStoreyLayout(true);
    markActive();
  }

  function markActive() {
    if (outline && outline.parent) outline.parent.remove(outline);
    const p = state.room && parts[state.room]; if (!p || !p.floors[0]) return;
    const f = p.floors[0];
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(f.geometry), new THREE.LineBasicMaterial({ color: 0x5a7e8a }));
    outline.name = 'active_outline'; outline.position.copy(f.position); outline.scale.set(1.01, 2.2, 1.01);
    f.parent.add(outline);
  }
  function tintRoom(rid) {
    const p = parts[rid]; if (!p) return;
    p.floors.forEach((f) => { f.material = floorMats[themeFor(rid)]; });
    p.fabrics.forEach((m) => { m.material = themeMats[themeFor(rid)]; });
  }
  function setDims(v) { dimNodes.forEach((n) => { n.visible = !!v; }); }
  function furnFor(si) {
    const sg = storeyGroups[si]; if (!sg) return [];
    const out = [];
    furnNodes.forEach((n) => {
      let p = n; while (p && p !== sg) p = p.parent;
      if (p !== sg) return;
      const bx = new THREE.Box3().setFromObject(n);
      if (isFinite(bx.min.x)) out.push({ name: n.name, x0: bx.min.x - sg.position.x, z0: bx.min.z - sg.position.z, x1: bx.max.x - sg.position.x, z1: bx.max.z - sg.position.z });
    });
    return out;
  }
  function getScene() {
    if (!sceneData) return null;
    return { storeys: sceneData.storeys.map((s) => ({
      si: s.si, W: s.W, D: s.D, cx: s.cx, cz: s.cz,
      rects: s.rects.map((r) => ({ key: r.key, id: r.id, x: r.x, z: r.z, w: r.w, d: r.d, pass: !!r.o.pass, xtra: !!r.o.x, lbl: r.o.lbl || null })),
      doors: s.doors, bounds: s.bounds, furniture: furnFor(s.si),
    })) };
  }
  function setOverlay(data) {
    clearOverlay();
    if (!data || !group) return;
    overlayGroup = new THREE.Group(); overlayGroup.name = 'walk_overlay'; overlayGroup.userData.holders = [];
    data.storeys.forEach((st) => {
      const sg = storeyGroups[st.si]; if (!sg) return;
      const c = document.createElement('canvas'); c.width = st.cols; c.height = st.rows;
      const q = c.getContext('2d'); const img = q.createImageData(st.cols, st.rows);
      for (let i = 0; i < st.walk.length; i++) {
        const v = st.walk[i], o = i * 4;
        if (v === 1) { img.data[o] = 96; img.data[o + 1] = 158; img.data[o + 2] = 122; img.data[o + 3] = 120; }
        else if (v === 2) { img.data[o] = 186; img.data[o + 1] = 92; img.data[o + 2] = 62; img.data[o + 3] = 150; }
        else { img.data[o + 3] = 0; }
      }
      q.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.flipY = false;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(st.cols * st.cell, st.rows * st.cell), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      pl.name = 'walk_cells'; pl.rotation.x = -Math.PI / 2;
      pl.position.set(st.origin[0] + (st.cols * st.cell) / 2, 0.1, st.origin[1] + (st.rows * st.cell) / 2);
      const holder = new THREE.Group(); holder.name = 'walk_overlay_storey'; holder.add(pl);
      (st.routes || []).forEach((rt, ri) => {
        const pts = (rt.pts || []).map(([px, pz]) => new THREE.Vector3(px, 0.14, pz));
        if (pts.length < 2) return;
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: rt.ok ? 0x2e7d54 : 0xc0392b }));
        line.name = 'walk_route_' + ri; holder.add(line);
      });
      (st.portals || []).forEach(([px, pz], pi) => {
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), new THREE.MeshBasicMaterial({ color: 0x3d6f7d }));
        dot.position.set(px, 0.12, pz); dot.name = 'walk_portal_' + pi; holder.add(dot);
      });
      sg.add(holder);
      overlayGroup.userData.holders.push(holder);
    });
  }
  function clearOverlay() {
    if (overlayGroup && overlayGroup.userData.holders) overlayGroup.userData.holders.forEach((h) => { if (h.parent) h.parent.remove(h); });
    overlayGroup = null;
  }
  function applyUnderlay() {
    if (!group) return;
    const sheet = group.children.find((ch) => ch.name === 'floorplan_sheet'); if (!sheet) return;
    const u = state.underlay;
    if (u && u.url) {
      new THREE.TextureLoader().load(u.url, (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace;
        sheet.material = M(0xffffff, 1, 'plan_underlay', { map: tx, transparent: true, opacity: u.opacity == null ? 0.9 : u.opacity });
      });
    }
  }
  function setUnderlay(cfg) {
    state.underlay = cfg || null;
    if (!cfg) { const sheet = group && group.children.find((ch) => ch.name === 'floorplan_sheet'); if (sheet) sheet.material = matPlan; return; }
    applyUnderlay();
  }
  function setDecor(patch) {
    Object.assign(decor, patch || {});
    matWall.color.set(decor.wall);
    furnNodes.forEach((n) => { n.visible = decor.furn; });
    doorNodes.forEach((n) => { n.visible = decor.swings; });
    labelNodes.forEach((n) => { n.visible = decor.labels; });
  }
  // Storey presentation: stacked (default), solo (L1/L2 chips), or split — levels side by side
  // on the ground so a 2-storey house shows both plans at once.
  function applyStoreyLayout(instant) {
    const v = state.view || {};
    const solo = v.storey != null && v.storey >= 0 && storeyGroups.length > 1 ? v.storey : -1;
    const split = !!v.split && solo < 0 && storeyGroups.length > 1;
    storeyGroups.forEach((sg, si) => {
      sg.visible = solo < 0 || si === solo;
      const tx = split ? si * (Wcur + 1.7) : 0;
      const ty = solo >= 0 ? (si === solo ? 0 : si * SHcur) : split ? 0 : si * SHcur;
      if (instant) { sg.position.x = tx; sg.position.y = ty; }
      else { tween(sg.position, 'x', tx, 550); tween(sg.position, 'y', ty, 550); }
    });
  }
  function setStorey(i, instant) {
    if (state.view) state.view.storey = i;
    applyStoreyLayout(instant);
  }
  function setSplit(vv, instant) {
    if (state.view) { state.view.split = !!vv; if (vv) state.view.storey = -1; }
    applyStoreyLayout(instant);
  }
  function storeyCount() { return storeyGroups.length; }
  function pick(nx, ny, camera) {
    if (!group) return null;
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const floors = [];
    storeyGroups.forEach((sg) => { if (sg.visible) sg.children.forEach((c) => { if (c.userData && c.userData.rid) floors.push(c); }); });
    const hit = raycaster.intersectObjects(floors, false)[0];
    return hit ? hit.object.userData.rid : null;
  }
  function getBounds() {
    if (!group) return null;
    return new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());
  }
  return { buildModel, markActive, tintRoom, setDims, setDecor, setStorey, setSplit, storeyCount, pick, getBounds, getScene, setOverlay, clearOverlay, setUnderlay, planDoc: (k) => PLAN_DOCS[k] || null };
}
