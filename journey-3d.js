// Journey 3D core — realistic SG floor-plan model builder.
// Plans traced from typical layouts: HDB BTO 3/4/5-room (bedroom wing + corridor + service core,
// service yard off kitchen, household shelter, master ensuite), condo (balcony slider, open kitchen,
// AC ledge, ensuite + common bath), landed 2-4 storeys (porch, stair hall spine, roof terrace).
export function createModel(ctx) {
  const { THREE, stage, state, tween, THEMES, ROOMS, themeFor, layout } = ctx;
  const M = (c, r, name, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra || {})); m.name = name; return m; };
  const matWall = M(0xf4f1ea, 0.92, 'wall_white');
  const matBase = M(0xd9d3c5, 0.95, 'floor_extra');
  const matPlan = M(0xfdfcf9, 1, 'plan_paper');
  const matSlab = M(0xe9e5da, 0.9, 'storey_slab');
  const matGlass = M(0xa9c4cc, 0.15, 'glass', { transparent: true, opacity: 0.35, metalness: 0.1 });
  const matWood = M(0x9c7a55, 0.8, 'wood');
  const matDark = M(0x3a4043, 0.6, 'dark_panel');
  const matFix = M(0xfafaf7, 0.35, 'fixture_white');
  const matGreen = M(0x8aa17c, 0.9, 'planting');
  const themeMats = {}, floorMats = {};
  THEMES.forEach((t) => {
    themeMats[t.id] = M(t.color, 0.75, 'fabric_' + t.id);
    floorMats[t.id] = M(new THREE.Color(t.color).lerp(new THREE.Color(0xffffff), 0.45).getHex(), 0.9, 'floor_' + t.id);
  });

  // rect: [key, x, z, w, d, opts] — z=0 is the window facade (south).
  // opts: pid (pricing id), lbl, x (non-priced extra), pass (circulation: neighbours get door gaps),
  //       dw (explicit door wall), open (walls omitted)
  const X = { x: 1 }, PASS = { x: 1, pass: 1 };
  const P = {
    hdb3: [{ W: 8.4, D: 8.6, rects: [
      ['living', 0, 0, 4.0, 5.4, {}],
      ['common', 4.0, 0, 4.4, 3.6, { dw: 'N' }],
      ['corr', 4.0, 3.6, 4.4, 1.3, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 4.0, 4.9, 2.9, 3.7, { dw: 'S' }],
      ['bath_m', 6.9, 4.9, 1.5, 1.9, { pid: 'bath', lbl: 'MASTER BATH', dw: 'W' }],
      ['bath_c', 6.9, 6.8, 1.5, 1.8, { pid: 'bath', lbl: 'BATH 2', dw: 'W' }],
      ['kitchen', 0, 5.4, 2.6, 2.2, { dw: 'S' }],
      ['yard', 0, 7.6, 2.6, 1.0, X],
      ['hs', 2.6, 5.4, 1.4, 1.6, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 2.6, 7.0, 1.4, 1.6, Object.assign({ lbl: 'FOYER' }, PASS)],
    ] }],
    hdb4: [{ W: 10.0, D: 9.2, rects: [
      ['living', 0, 0, 4.2, 5.6, {}],
      ['common', 4.2, 0, 2.9, 4.0, { dw: 'N' }],
      ['common2', 7.1, 0, 2.9, 4.0, { dw: 'N' }],
      ['corr', 4.2, 4.0, 5.8, 1.4, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 4.2, 5.4, 3.2, 3.8, { dw: 'S' }],
      ['bath_m', 7.4, 5.4, 1.4, 2.6, { pid: 'bath', lbl: 'MASTER BATH', dw: 'W' }],
      ['bath_c', 8.8, 5.4, 1.2, 2.6, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['ac', 7.4, 8.0, 2.6, 1.2, { x: 1, lbl: 'AC LEDGE' }],
      ['kitchen', 0, 5.6, 2.7, 2.4, { dw: 'S' }],
      ['yard', 0, 8.0, 2.7, 1.2, X],
      ['hs', 2.7, 5.6, 1.5, 1.8, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 2.7, 7.4, 1.5, 1.8, Object.assign({ lbl: 'FOYER' }, PASS)],
    ] }],
    hdb5: [{ W: 11.4, D: 9.4, rects: [
      ['living', 0, 0, 4.6, 5.8, {}],
      ['common', 4.6, 0, 2.8, 4.0, { dw: 'N' }],
      ['common2', 7.4, 0, 2.4, 4.0, { dw: 'N' }],
      ['study', 9.8, 0, 1.6, 4.0, { dw: 'N' }],
      ['corr', 4.6, 4.0, 6.8, 1.4, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 4.6, 5.4, 3.4, 4.0, { dw: 'S' }],
      ['bath_m', 8.0, 5.4, 1.6, 2.6, { pid: 'bath', lbl: 'MASTER BATH', dw: 'W' }],
      ['bath_c', 9.6, 5.4, 1.8, 2.6, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['ac', 8.0, 8.0, 3.4, 1.4, { x: 1, lbl: 'AC LEDGE' }],
      ['kitchen', 0, 5.8, 2.8, 2.4, { dw: 'S' }],
      ['yard', 0, 8.2, 2.8, 1.2, X],
      ['hs', 2.8, 5.8, 1.8, 1.8, { x: 1, lbl: 'SHELTER' }],
      ['foyer', 2.8, 7.6, 1.8, 1.8, Object.assign({ lbl: 'FOYER' }, PASS)],
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
      ['family', 0, 6.2, 3.4, 3.0, { dw: 'S' }],
      ['kitchen', 3.4, 6.2, 2.6, 3.0, { open: ['S'] }],
      ['common', 6.4, 0, 2.6, 3.4, { dw: 'N' }],
      ['common2', 9.0, 0, 2.2, 3.4, { dw: 'N' }],
      ['study', 11.2, 0, 1.4, 3.4, { dw: 'N' }],
      ['corr', 6.4, 3.4, 6.2, 1.4, Object.assign({ lbl: 'CORRIDOR' }, PASS)],
      ['master', 6.4, 4.8, 3.2, 4.4, { dw: 'S' }],
      ['bath_m', 9.6, 4.8, 1.6, 2.6, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
      ['bath_c', 11.2, 4.8, 1.4, 2.6, { pid: 'bath', lbl: 'BATH 2', dw: 'S' }],
      ['hs', 9.6, 7.4, 1.6, 1.8, { x: 1, lbl: 'SHELTER' }],
      ['ac', 11.2, 7.4, 1.4, 1.8, { x: 1, lbl: 'AC LEDGE' }],
    ] }],
    l1: [ // 2-storey terrace
      { W: 7.2, D: 10.2, rects: [
        ['garden', 0, 0, 7.2, 2.0, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.0, 4.6, 4.6, {}],
        ['kitchen', 4.6, 2.0, 2.6, 4.6, { dw: 'W' }],
        ['family', 0, 6.6, 4.0, 3.6, { dw: 'N' }],
        ['bath_c', 4.0, 6.6, 1.4, 3.6, { pid: 'bath', lbl: 'GUEST BATH', dw: 'E' }],
        ['hall', 5.4, 6.6, 1.8, 3.6, Object.assign({ lbl: 'STAIRS' }, PASS)],
      ] },
      { W: 7.2, D: 8.2, rects: [
        ['master', 0, 0, 3.2, 4.6, { dw: 'E' }],
        ['common', 0, 4.6, 3.2, 3.6, { dw: 'E' }],
        ['hall', 3.2, 0, 1.4, 8.2, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['bath_m', 4.6, 0, 2.6, 2.2, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
        ['common2', 4.6, 2.2, 2.6, 3.0, { dw: 'W' }],
        ['study', 4.6, 5.2, 2.6, 3.0, { dw: 'W' }],
      ] },
    ],
    l2: [ // 3-storey semi-detached
      { W: 8.4, D: 10.4, rects: [
        ['garden', 0, 0, 8.4, 2.2, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.2, 5.2, 4.6, {}],
        ['kitchen', 5.2, 2.2, 3.2, 4.6, { dw: 'W' }],
        ['family', 0, 6.8, 4.6, 3.6, { dw: 'N' }],
        ['bath_c', 4.6, 6.8, 1.6, 3.6, { pid: 'bath', lbl: 'GUEST BATH', dw: 'E' }],
        ['hall', 6.2, 6.8, 2.2, 3.6, Object.assign({ lbl: 'STAIRS' }, PASS)],
      ] },
      { W: 8.4, D: 8.4, rects: [
        ['master', 0, 0, 3.6, 4.8, { dw: 'E' }],
        ['bath_m', 0, 4.8, 3.6, 3.6, { pid: 'bath', lbl: 'ENSUITE', dw: 'N' }],
        ['hall', 3.6, 0, 1.6, 8.4, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['common', 5.2, 0, 3.2, 4.2, { dw: 'W' }],
        ['common2', 5.2, 4.2, 3.2, 4.2, { dw: 'W' }],
      ] },
      { W: 8.4, D: 8.4, rects: [
        ['study', 0, 0, 3.6, 8.4, { dw: 'E' }],
        ['hall', 3.6, 0, 1.6, 8.4, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['terrace', 5.2, 0, 3.2, 8.4, { x: 1, lbl: 'ROOF TERRACE' }],
      ] },
    ],
    l3: [ // 4-storey bungalow
      { W: 9.6, D: 11.0, rects: [
        ['garden', 0, 0, 9.6, 2.4, Object.assign({ lbl: 'PORCH & GARDEN' }, PASS)],
        ['living', 0, 2.4, 5.8, 5.0, {}],
        ['kitchen', 5.8, 2.4, 3.8, 5.0, { dw: 'W' }],
        ['foyer', 0, 7.4, 3.0, 3.6, Object.assign({ lbl: 'ENTRANCE FOYER' }, PASS)],
        ['bath_c', 3.0, 7.4, 1.6, 3.6, { pid: 'bath', lbl: 'GUEST BATH' }],
        ['hall', 4.6, 7.4, 2.4, 3.6, Object.assign({ lbl: 'STAIRS' }, PASS)],
        ['store', 7.0, 7.4, 2.6, 3.6, { x: 1, lbl: 'STORE' }],
      ] },
      { W: 9.6, D: 9.0, rects: [
        ['master', 0, 0, 4.8, 5.0, { dw: 'E' }],
        ['hall', 4.8, 0, 1.8, 9.0, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['bath_m', 6.6, 0, 3.0, 3.0, { pid: 'bath', lbl: 'ENSUITE', dw: 'W' }],
        ['wic', 6.6, 3.0, 3.0, 2.6, { x: 1, lbl: 'WALK-IN WARDROBE', pass: 0 }],
        ['store', 6.6, 5.6, 3.0, 3.4, { x: 1, lbl: 'STORE' }],
        ['sit', 0, 5.0, 4.8, 4.0, { x: 1, lbl: 'SITTING AREA' }],
      ] },
      { W: 9.6, D: 9.0, rects: [
        ['common', 0, 0, 4.8, 4.4, { dw: 'E' }],
        ['common2', 0, 4.4, 4.8, 4.6, { dw: 'E' }],
        ['hall', 4.8, 0, 1.8, 9.0, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['study', 6.6, 0, 3.0, 4.4, { dw: 'W' }],
        ['store', 6.6, 4.4, 3.0, 4.6, { x: 1, lbl: 'STORE' }],
      ] },
      { W: 9.6, D: 9.0, rects: [
        ['family', 0, 0, 4.8, 9.0, { dw: 'E' }],
        ['hall', 4.8, 0, 1.8, 9.0, Object.assign({ lbl: 'STAIRS & HALL' }, PASS)],
        ['terrace', 6.6, 0, 3.0, 9.0, { x: 1, lbl: 'ROOF TERRACE' }],
      ] },
    ],
  };
  const WH = 1.15, WT = 0.06, SH = 1.45;

  function storeyRects(st) {
    return { W: st.W, D: st.D, rects: st.rects.map(([key, x, z, w, d, o]) => ({ key, id: (o && o.pid) || key, x, z, w, d, o: o || {} })) };
  }
  const nearly = (a, b) => Math.abs(a - b) < 0.05;
  function neighborType(rects, r, side) {
    for (const n of rects) {
      if (n === r) continue;
      const overX = n.x < r.x + r.w - 0.1 && n.x + n.w > r.x + 0.1;
      const overZ = n.z < r.z + r.d - 0.1 && n.z + n.d > r.z + 0.1;
      let hit = false;
      if (side === 'S' && nearly(n.z + n.d, r.z) && overX) hit = true;
      if (side === 'N' && nearly(n.z, r.z + r.d) && overX) hit = true;
      if (side === 'W' && nearly(n.x + n.w, r.x) && overZ) hit = true;
      if (side === 'E' && nearly(n.x, r.x + r.w) && overZ) hit = true;
      if (hit) return n.o.pass ? 'pass' : n.o.x ? 'x' : 'room';
    }
    return 'edge';
  }

  let group = null, outline = null, riseI = 0;
  const parts = {};
  function mkBox(g, w, h, d, mat, x, y, z, name, rise) {
    const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z);
    if (rise) { m.scale.y = 0.001; tween(m.scale, 'y', 1, 700, 250 + (riseI % 46) * 24); riseI++; }
    g.add(m); return m;
  }
  function mkCyl(g, r1, h, mat, x, y, z, name) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, h, 24), mat); m.name = name; m.position.set(x, y + h / 2, z); g.add(m); return m;
  }
  function makeLabel(g, text, x, yb, z, grey) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx2 = c.getContext('2d'); ctx2.font = '600 44px Oswald, Arial, sans-serif'; ctx2.textAlign = 'center';
    ctx2.fillStyle = grey ? 'rgba(105,115,108,0.9)' : 'rgba(26,32,35,0.92)'; ctx2.fillText(text, 256, 82);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0 }));
    sp.name = 'label'; sp.scale.set(1.9, 0.48, 1); sp.position.set(x, yb + (grey ? 0.85 : 1.42), z);
    tween(sp.material, 'opacity', 1, 600, 1100); g.add(sp);
  }
  function wallRun(g, r, side, kind, cx, cz, yb) {
    const horiz = side === 'S' || side === 'N';
    const len = horiz ? r.w : r.d;
    const wx = horiz ? r.x + r.w / 2 : (side === 'W' ? r.x + WT / 2 : r.x + r.w - WT / 2);
    const wz = horiz ? (side === 'S' ? r.z + WT / 2 : r.z + r.d - WT / 2) : r.z + r.d / 2;
    const px = wx - cx, pz = wz - cz;
    const seg = (off, l, h, y, mat, nm) => {
      if (l < 0.03) return;
      const sx = horiz ? px - len / 2 + off + l / 2 : px, sz = horiz ? pz : pz - len / 2 + off + l / 2;
      mkBox(g, horiz ? l - 0.015 : WT, h, horiz ? WT : l - 0.015, mat, sx, y, sz, nm, true);
    };
    if (kind === 'door' || kind === 'entry') {
      const gl = Math.min(0.9, len - 0.5), off = (len - gl) / 2;
      seg(0, off, WH, yb, matWall, `wall_${r.key}_${side}`);
      seg(off + gl, len - off - gl, WH, yb, matWall, `wall_${r.key}_${side}`);
      if (kind === 'entry') {
        const hx = horiz ? px - len / 2 + off : px, hz = horiz ? pz : pz - len / 2 + off;
        const leaf = mkBox(g, 0.85, 1.05, 0.05, matWood, 0, yb, 0, 'entry_door', true);
        leaf.geometry.translate(0.425, 0, 0); leaf.position.set(hx, yb, hz);
        leaf.rotation.y = horiz ? -0.55 : (Math.PI / 2 - 0.55);
      }
    } else if (kind === 'window') {
      seg(0, len, 0.55, yb, matWall, `wall_${r.key}_${side}`);
      seg(0, len, WH - 0.57, yb + 0.57, matGlass, `window_${r.key}_${side}`);
    } else if (kind === 'slider') {
      seg(0, len, WH, yb, matGlass, `slider_${r.key}_${side}`);
    } else if (kind === 'low') {
      seg(0, len, 0.45, yb, side === 'S' ? matGlass : matWall, `rail_${r.key}_${side}`);
    } else {
      seg(0, len, WH, yb, matWall, `wall_${r.key}_${side}`);
    }
  }
  function furnish(g, r, cx, cz, yb, accent) {
    const x = r.x + r.w / 2 - cx, z = r.z + r.d / 2 - cz;
    const fab = [];
    const bedW = { master: 1.7, common: 1.15, common2: 1.15 }[r.id];
    if (bedW) {
      const bw = Math.min(bedW, r.w - 1.2);
      const bz = z - (r.d / 2 - 1.18);
      mkBox(g, bw, 0.28, 1.9, matWood, x, yb + 0.07, bz, `bedbase_${r.key}`, true);
      fab.push(mkBox(g, bw - 0.06, 0.16, 1.72, accent, x, yb + 0.36, bz, `mattress_${r.key}`, true));
      fab.push(mkBox(g, Math.min(bw - 0.3, 1.1), 0.1, 0.5, matFix, x, yb + 0.53, bz - 0.5, `pillow_${r.key}`, true));
      mkBox(g, bw + 0.24, 0.78, 0.08, matWood, x, yb + 0.07, z - (r.d / 2 - 0.16), `headboard_${r.key}`, true);
      if (r.w - bw > 1.5) {
        mkBox(g, 0.38, 0.4, 0.38, matWood, x - bw / 2 - 0.32, yb + 0.07, bz - 0.55, `sidetable_a_${r.key}`, true);
        mkBox(g, 0.38, 0.4, 0.38, matWood, x + bw / 2 + 0.32, yb + 0.07, bz - 0.55, `sidetable_b_${r.key}`, true);
      }
      mkBox(g, 0.56, 1.1, Math.min(1.9, r.d - 1.5), matWood, x - r.w / 2 + 0.36, yb + 0.07, z + r.d / 2 - Math.min(1.9, r.d - 1.5) / 2 - 0.12, `wardrobe_${r.key}`, true);
      if (r.id !== 'master' && r.w > 2.7) mkBox(g, 0.9, 0.44, 0.5, matWood, x + r.w / 2 - 0.6, yb + 0.07, z + r.d / 2 - 0.4, `desk_${r.key}`, true);
    }
    if (r.id === 'living' || r.id === 'family') {
      const sd = Math.min(2.3, r.d - 2);
      fab.push(mkBox(g, 0.85, 0.4, sd, accent, x - r.w / 2 + 0.62, yb + 0.07, z, `sofa_${r.key}`, true));
      fab.push(mkBox(g, 0.18, 0.7, sd, accent, x - r.w / 2 + 0.26, yb + 0.07, z, `sofaback_${r.key}`, true));
      mkCyl(g, 0.35, 0.3, matWood, x - 0.2, yb + 0.07, z, `coffee_${r.key}`);
      mkBox(g, 0.42, 0.3, Math.min(1.7, r.d - 1.6), matWood, x + r.w / 2 - 0.4, yb + 0.07, z, `console_${r.key}`, true);
      mkBox(g, 0.05, 0.74, Math.min(1.4, r.d - 2), matDark, x + r.w / 2 - 0.13, yb + 0.46, z, `tv_${r.key}`, true);
      mkBox(g, 0.42, 0.09, 0.9, matWood, x + r.w / 2 - 0.4, yb + 1.0, z, `shelf_${r.key}`, true);
      if (r.id === 'living' && r.d > 4.4) {
        mkBox(g, 1.35, 0.4, 0.8, matWood, x + 0.4, yb + 0.07, z + r.d / 2 - 1.05, `dining_${r.key}`, true);
        [[-0.45, -0.62], [0.45, -0.62], [-0.45, 0.62], [0.45, 0.62]].forEach(([dx, dz], i) => mkCyl(g, 0.16, 0.4, matWood, x + 0.4 + dx, yb + 0.07, z + r.d / 2 - 1.05 + dz, `stool_${i}_${r.key}`));
      }
    }
    if (r.id === 'kitchen') {
      mkBox(g, r.w - 0.5, 0.56, 0.6, matDark, x, yb + 0.07, z + r.d / 2 - 0.42, `counter_${r.key}`, true);
      mkBox(g, r.w - 0.5, 0.3, 0.36, matWood, x, yb + 0.84, z + r.d / 2 - 0.3, `uppercab_${r.key}`, true);
      mkBox(g, 0.62, 0.56, Math.min(2.0, r.d - 1.6), matDark, x + r.w / 2 - 0.43, yb + 0.07, z - 0.2, `counterL_${r.key}`, true);
      mkBox(g, 0.5, 0.02, 0.34, matFix, x - r.w / 4, yb + 0.64, z + r.d / 2 - 0.42, `sink_${r.key}`, true);
      mkBox(g, 0.55, 0.02, 0.36, matDark, x + r.w / 6, yb + 0.65, z + r.d / 2 - 0.42, `hob_${r.key}`, true);
      mkBox(g, 0.72, 1.12, 0.66, matFix, x - r.w / 2 + 0.46, yb + 0.07, z - r.d / 2 + 0.5, `fridge_${r.key}`, true);
    }
    if (r.id === 'bath') {
      mkBox(g, 0.4, 0.42, 0.56, matFix, x - r.w / 2 + 0.34, yb + 0.07, z + r.d / 2 - 0.44, `wc_${r.key}`, true);
      mkBox(g, Math.min(0.9, r.w - 0.5), 0.52, 0.44, matFix, x + 0.05, yb + 0.07, z - r.d / 2 + 0.32, `vanity_${r.key}`, true);
      mkBox(g, Math.min(0.7, r.w - 0.7), 0.5, 0.03, matGlass, x + 0.05, yb + 0.68, z - r.d / 2 + 0.08, `mirror_${r.key}`, true);
      mkBox(g, 0.04, WH - 0.08, Math.min(0.95, r.d - 0.9), matGlass, x + r.w / 2 - 0.72, yb + 0.05, z + r.d / 2 - Math.min(0.95, r.d - 0.9) / 2 - 0.1, `shower_${r.key}`, true);
      mkCyl(g, 0.06, 0.02, matDark, x + r.w / 2 - 0.35, yb + 1.08, z + r.d / 2 - 0.35, `rainshower_${r.key}`);
    }
    if (r.id === 'study') {
      mkBox(g, Math.min(1.4, r.w - 0.5), 0.46, 0.6, matWood, x, yb + 0.07, z - r.d / 2 + 0.44, `desk_${r.key}`, true);
      fab.push(mkCyl(g, 0.21, 0.42, accent, x, yb + 0.07, z + 0.3, `chair_${r.key}`));
      mkBox(g, Math.min(1.2, r.w - 0.6), 0.8, 0.28, matWood, x, yb + 0.07, z + r.d / 2 - 0.24, `bookshelf_${r.key}`, true);
    }
    return fab;
  }
  function extrasDetail(g, r, x, z, yb) {
    if (r.key === 'yard') {
      mkBox(g, 0.62, 0.85, 0.62, matFix, x, yb + 0.07, z, `washer_${r.key}`, true);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), matDark);
      drum.name = 'washer_door'; drum.rotation.x = Math.PI / 2; drum.position.set(x, yb + 0.52, z - 0.32); g.add(drum);
    }
    if (r.key === 'ac') { mkBox(g, 0.7, 0.5, 0.3, matFix, x - 0.4, yb + 0.06, z, `ac_condenser_a`, true); mkBox(g, 0.7, 0.5, 0.3, matFix, x + 0.4, yb + 0.06, z, `ac_condenser_b`, true); }
    if (r.key === 'balcony' || r.key === 'terrace' || r.key === 'garden') {
      mkBox(g, 0.5, 0.34, 0.5, matGreen, x - r.w / 2 + 0.5, yb + 0.05, z, `planter_a_${r.key}`, true);
      mkBox(g, 0.5, 0.34, 0.5, matGreen, x + r.w / 2 - 0.5, yb + 0.05, z, `planter_b_${r.key}`, true);
      if (r.key === 'garden') mkCyl(g, 0.35, 0.5, matGreen, x, yb + 0.05, z + r.d / 4, `shrub_${r.key}`);
      if (r.key === 'terrace') mkBox(g, 1.2, 0.38, 0.7, matWood, x, yb + 0.05, z, `outdoor_seat_${r.key}`, true);
    }
    if (r.key === 'hall') {
      const steps = Math.min(5, Math.floor(r.d / 0.4));
      for (let i = 0; i < steps; i++) mkBox(g, Math.min(0.9, r.w - 0.3), 0.12 + i * 0.14, 0.3, matWood, x, yb + 0.05, z - r.d / 2 + 0.35 + i * 0.34, `stair_${i}_${r.key}`, true);
    }
    if (r.key === 'foyer') mkBox(g, Math.min(0.9, r.w - 0.4), 0.95, 0.32, matWood, x, yb + 0.07, z - r.d / 2 + 0.26, `shoecab_${r.key}`, true);
    if (r.key === 'wic') { mkBox(g, 0.55, 1.1, r.d - 0.5, matWood, x - r.w / 2 + 0.34, yb + 0.07, z, `wic_a`, true); mkBox(g, 0.55, 1.1, r.d - 0.5, matWood, x + r.w / 2 - 0.34, yb + 0.07, z, `wic_b`, true); }
    if (r.key === 'store') mkBox(g, Math.min(1.4, r.w - 0.5), 0.9, 0.4, matWood, x, yb + 0.07, z + r.d / 2 - 0.32, `shelving_${r.key}`, true);
    if (r.key === 'sit') { mkBox(g, 0.8, 0.4, 1.6, matWood, x - 0.6, yb + 0.07, z, `bench_${r.key}`, true); mkCyl(g, 0.3, 0.3, matWood, x + 0.5, yb + 0.07, z, `sidetbl_${r.key}`); }
  }

  function buildModel() {
    const l = layout(); group = new THREE.Group(); group.name = 'flat';
    Object.keys(parts).forEach((k) => delete parts[k]); outline = null; riseI = 0;
    const storeys = l ? P[l.id] : null;
    const dims = storeys ? storeys.map(storeyRects) : [{ W: 9.6, D: 8, rects: [] }];
    const W = Math.max(...dims.map((d) => d.W)), D = Math.max(...dims.map((d) => d.D));
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.8, D + 1.8), matPlan);
    sheet.name = 'floorplan_sheet'; sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.001; group.add(sheet);
    if (state.planUrl && state.planUrl.startsWith('data:')) {
      new THREE.TextureLoader().load(state.planUrl, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; sheet.material = M(0xffffff, 1, 'plan_paper', { map: tx }); });
    }
    dims.forEach((dim, si) => {
      const yb = si * SH, cx = dim.W / 2, cz = dim.D / 2;
      if (si > 0) mkBox(group, dim.W + 0.24, 0.08, dim.D + 0.24, matSlab, 0, yb - 0.1, 0, `slab_storey_${si}`, true);
      dim.rects.forEach((r) => {
        const x = r.x + r.w / 2 - cx, z = r.z + r.d / 2 - cz;
        if (r.o.x) {
          mkBox(group, r.w - 0.08, 0.045, r.d - 0.08, matBase, x, yb + 0.004, z, `floor_${r.key}_${si}`, false);
          ['S', 'N', 'E', 'W'].forEach((s) => {
            if (neighborType(dim.rects, r, s) !== 'edge') return;
            if (r.o.pass && r.key === 'foyer' && s === 'N') { wallRun(group, r, s, 'entry', cx, cz, yb); return; }
            wallRun(group, r, s, 'low', cx, cz, yb);
          });
          extrasDetail(group, r, x, z, yb);
          makeLabel(group, r.o.lbl || r.key.toUpperCase(), x, yb, z, true);
          return;
        }
        const themed = !!state.themes[r.id];
        const floor = mkBox(group, r.w - 0.08, 0.07, r.d - 0.08, themed ? floorMats[themeFor(r.id)] : matBase, x, yb + 0.004, z, `floor_${r.key}`, false);
        if (!parts[r.id]) parts[r.id] = { floors: [], fabrics: [] };
        parts[r.id].floors.push(floor);
        const dw = r.o.dw || null, open = r.o.open || [];
        ['S', 'N', 'E', 'W'].forEach((s) => {
          if (open.includes(s)) return;
          const nb = neighborType(dim.rects, r, s);
          let kind = 'solid';
          if (s === dw) kind = 'door';
          else if (nb === 'pass') kind = 'door';
          else if (nb === 'edge') kind = 'window';
          else if (nb === 'x') kind = 'slider';
          wallRun(group, r, s, kind, cx, cz, yb);
        });
        const fabs = furnish(group, r, cx, cz, yb, themeMats[themeFor(r.id)]);
        parts[r.id].fabrics.push(...fabs);
        makeLabel(group, r.o.lbl || ROOMS[r.id].label, x, yb, z, false);
      });
    });
    stage.setObject(group);
    markActive();
  }
  function markActive() {
    if (outline && outline.parent) outline.parent.remove(outline);
    const p = state.room && parts[state.room]; if (!p || !p.floors[0]) return;
    const f = p.floors[0];
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(f.geometry), new THREE.LineBasicMaterial({ color: 0x5a7e8a }));
    outline.name = 'active_outline'; outline.position.copy(f.position); outline.scale.set(1.01, 2.2, 1.01); group.add(outline);
  }
  function tintRoom(rid) {
    const p = parts[rid]; if (!p) return;
    p.floors.forEach((f) => { f.material = floorMats[themeFor(rid)]; });
    p.fabrics.forEach((m) => { m.material = themeMats[themeFor(rid)]; });
  }
  return { buildModel, markActive, tintRoom };
}
