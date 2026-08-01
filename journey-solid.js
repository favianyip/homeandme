// The contract extruder — Stage 3.
//
// Reads ONLY the plan contract: one box per wall segment, a lintel over each door, a sill and
// head around each window, one floor per room. Nothing here inspects pixels, so nothing here
// can invent a fin outside the flat or extrude a kitchen sink. If the contract passed its gates
// the model is watertight and walkable; this file's only job is to not spoil that.
//
// Everything is millimetres in, metres out, centred on the envelope so it orbits sensibly.

const WET = /BATH|WC|TOILET|SHOWER/i;
const TILE = /KITCHEN|YARD|UTILITY|SERVICE|STORE|SHELTER/i;

export function buildSolid(c, THREE, opts) {
  const O = Object.assign({
    wallH: 2.6, doorH: 2.1, sillH: 1.0, headH: 2.1, slab: 0.02, parapetH: 1.1, diagnostic: false, labels: true,
  }, opts || {});
  const g = new THREE.Group();
  const stats = { walls: 0, floors: 0, doors: 0, windows: 0, lintels: 0, thresholds: 0, labels: 0, entrance: 0 };
  if (!c || !c.ok || !c.walls.length) return { group: g, stats };

  const M = (mm) => mm / 1000;
  const H = O.wallH;
  const [EW, ED] = (c.envelope || [0, 0]).map(M);
  const ox = -EW / 2, oz = -ED / 2;

  const mat = (hex, extra) => new THREE.MeshStandardMaterial(Object.assign({
    color: new THREE.Color(hex), roughness: 0.82, metalness: 0,
  }, extra || {}));
  const MATS = {
    structural: mat(O.diagnostic ? '#b3392e' : '#efece6'),
    partition: mat(O.diagnostic ? '#2f6bb0' : '#f4f2ed'),
    parapet: mat(O.diagnostic ? '#2f8f6b' : '#e6e2d9'),
    trim: mat('#e9e5dd'),
    glass: mat('#a8c4cc', { transparent: true, opacity: 0.34, roughness: 0.1 }),
    threshold: mat('#cbc3b4'),
    entrance: mat('#8a6a44', { roughness: 0.6 }),
    leaf: mat('#ded8cc', { roughness: 0.72 }),
    wet: mat('#c6ccca', { side: THREE.DoubleSide }),
    tile: mat('#cfc7b6', { side: THREE.DoubleSide }),
    timber: mat('#b8895a', { side: THREE.DoubleSide }),
  };

  const box = (w, h, d, x, y, z, material, name) => {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  const openBy = new Map();
  for (const o of (c.openings || [])) openBy.set(o.wall, o);

  // A balcony is not a sealed box: its outer edges are a parapet with open air above. HDB requires
  // at least 1.20 m at access corridors and common areas and window cills of at least 1.0 m; the
  // 1.10 m default here is for a private balcony and is a tweak, not a code figure.
  // Guarded deliberately: opening a wall on a guess puts a hole in a walkthrough, so a wall only
  // becomes a parapet when it bounds exactly ONE room, that room is named as a balcony, and the
  // room is big enough to stand on. Anything short of that stays full height.
  const owners = new Map();
  for (const r of (c.rooms || [])) {
    for (const id of (r.cycle || [])) {
      if (!owners.has(id)) owners.set(id, []);
      owners.get(id).push(r);
    }
  }
  const parapetOf = (w) => {
    const own = owners.get(w.id) || [];
    if (own.length !== 1) return 0;
    const r = own[0];
    if (!/BALCON|TERRACE|PATIO/i.test(r.label || '')) return 0;
    if (!(r.areaM2 >= 1.5) || (r.minDim && r.minDim < 800)) return 0;
    return Math.min(O.parapetH, H);
  };

  for (const w of c.walls) {
    const horiz = w.a[1] === w.b[1];
    const len = M(Math.abs(horiz ? w.b[0] - w.a[0] : w.b[1] - w.a[1]));
    if (len < 0.02) continue;
    const th = Math.max(0.05, M(w.thickness));
    const cx = M((w.a[0] + w.b[0]) / 2) + ox;
    const cz = M((w.a[1] + w.b[1]) / 2) + oz;
    const dims = (h) => (horiz ? [len, h, th] : [th, h, len]);

    // Decided BEFORE the solid/void branch: a balustrade has no window in it, so a balcony's whole
    // outer edge becomes parapet with open air above — otherwise an opening on that edge builds
    // full-height glazing and the balcony reads sealed along its longest side.
    const pH = parapetOf(w);
    if (pH) {
      box(...dims(pH), cx, pH / 2, cz, MATS.parapet, 'Parapet_' + w.id);
      stats.parapets = (stats.parapets || 0) + 1;
      stats.topH = Math.max(stats.topH || 0, H);
      continue;
    }

    if (!w.void) {
      box(...dims(H), cx, H / 2, cz, MATS[w.type] || MATS.partition, 'Wall_' + w.type + '_' + w.id);
      stats.walls++;
      stats.topH = Math.max(stats.topH || 0, H);
      continue;
    }
    const kind = (openBy.get(w.id) || {}).kind || 'door';
    if (kind === 'window') {
      // clamp to the wall height we were actually given: the dollhouse cut passes 1.15 m, and an
      // unclamped 1.0 m sill with a 2.1 m head leaves the glazing hovering above the cut wall
      const sill = Math.min(O.sillH, H);
      const head = Math.min(O.headH, H);
      box(...dims(sill), cx, sill / 2, cz, MATS.trim, 'Sill_' + w.id);
      if (H > O.headH) box(...dims(H - O.headH), cx, (H + O.headH) / 2, cz, MATS.trim, 'Head_' + w.id);
      if (head - sill > 0.01) {
        const paneT = Math.min(0.03, th * 0.5);
        box(...(horiz ? [len, head - sill, paneT] : [paneT, head - sill, len]),
          cx, (sill + head) / 2, cz, MATS.glass, 'Glazing_' + w.id);
      }
      stats.windows++;
      continue;
    }
    // door or wide opening: head over it, and a threshold so the floor runs through
    if (H > O.doorH) {
      box(...dims(H - O.doorH), cx, (H + O.doorH) / 2, cz, MATS.trim, 'Lintel_' + w.id);
      stats.lintels++;
    }
    box(...(horiz ? [len, O.slab, th] : [th, O.slab, len]), cx, O.slab / 2, cz, MATS.threshold, 'Threshold_' + w.id);
    stats.thresholds++;
    if (kind === 'door') {
      stats.doors++;
      // a leaf on every interior door too — a bare gap reads as a missing wall, not a doorway.
      // Height clamps to the wall exactly as the glazing and the entrance leaf do, or the leaf
      // hangs above the walls in the dollhouse cut.
      const lh = Math.min(O.doorH, H);
      const lf = new THREE.Mesh(new THREE.BoxGeometry(len * 0.93, Math.max(0.05, lh - O.slab), 0.042), MATS.leaf);
      lf.geometry.translate(len * 0.465, 0, 0);
      lf.position.set(cx - (horiz ? len / 2 : 0), (lh + O.slab) / 2, cz - (horiz ? 0 : len / 2));
      // the hinge sits at the opening's low end and the leaf runs toward +X or +Z from there:
      // rotation.y maps local +X to (cos θ, 0, −sin θ), so a vertical wall needs −π/2, not +π/2
      lf.rotation.y = horiz ? -0.6 : -Math.PI / 2 + 0.6;
      lf.castShadow = true;
      lf.name = 'DoorLeaf_' + w.id;
      g.add(lf);
      stats.topH = Math.max(stats.topH || 0, H);
    }
    if (kind === 'entrance') {
      // a real leaf, ajar, so the front door is unmistakable in the model
      const leafH = Math.min(O.doorH, H);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(len * 0.94, leafH, 0.045), MATS.entrance);
      leaf.position.set(cx, leafH / 2, cz);
      leaf.rotation.y = (horiz ? 0 : Math.PI / 2) - (horiz ? 0.55 : -0.55);
      leaf.geometry.translate(len * 0.47, 0, 0);
      leaf.castShadow = true;
      leaf.name = 'EntranceLeaf_' + w.id;
      g.add(leaf);
      stats.doors++;
      stats.entrance++;
    }
  }

  for (const r of (c.rooms || [])) {
    const poly = r.poly || [];
    if (poly.length < 3) continue;
    const shape = new THREE.Shape();
    poly.forEach((p, i) => {
      const x = M(p[0]) + ox, z = M(p[1]) + oz;
      if (i) shape.lineTo(x, z); else shape.moveTo(x, z);
    });
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.006, 0);
    const label = r.label || '';
    // a suspect label must not drag a wet-room finish across an 11 m² face
    const key = WET.test(label) && !r.labelSuspect ? 'wet' : TILE.test(label) ? 'tile' : 'timber';
    const m = new THREE.Mesh(geo, MATS[key]);
    m.name = 'Floor_' + (label || r.id).replace(/[^A-Za-z0-9]+/g, '_') + '_' + r.id;
    m.receiveShadow = true;
    g.add(m);
    stats.floors++;
    if (!O.labels) continue;
    // Floor lettering: real geometry, so it survives export and reads in the dollhouse view.
    // An unnamed room says so rather than rendering blank — blank looks like a bug, "UNNAMED
    // · 6.1 m²" looks like a thing to fix. A suggested name never appears as a bare fact.
    const xs = poly.map((p) => M(p[0])), zs = poly.map((p) => M(p[1]));
    const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zs) - Math.min(...zs);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2 + ox;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2 + oz;
    const name = label || 'UNNAMED';
    const sub = (r.areaM2 ? r.areaM2.toFixed(1) + ' m²' : '') + (r.labelSuspect ? '  · SUGGESTED' : '');
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 160;
    const cx2 = cv.getContext('2d');
    cx2.clearRect(0, 0, 512, 160);
    cx2.fillStyle = r.labelSuspect ? '#a8761f' : '#3a4145';
    cx2.textAlign = 'center';
    cx2.font = '600 52px ui-monospace, Menlo, monospace';
    cx2.fillText(name.slice(0, 22), 256, 62);
    cx2.font = '400 34px ui-monospace, Menlo, monospace';
    cx2.fillStyle = r.labelSuspect ? '#a8761f' : '#7b878c';
    cx2.fillText(sub, 256, 112);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    const lw = Math.min(w * 0.82, d * 0.82 * 3.2, 2.6);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw * (160 / 512)),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    lp.rotation.x = -Math.PI / 2;
    // long rooms read better with the text running along the room's own axis
    if (d > w * 1.35) lp.rotation.z = Math.PI / 2;
    lp.position.set(cx, 0.012, cz);
    lp.name = 'Label_' + name.replace(/[^A-Za-z0-9]+/g, '_') + '_' + r.id;
    lp.userData.omitFromExport = true;
    g.add(lp);
    // Floating tag: the floor lettering is edge-on at the default 19° camera. A billboard fixes
    // orientation but NOT distance — an attenuated sprite shrinks exactly as the plane does (3 px
    // of cap height when measured). sizeAttenuation:false pins it to a constant share of the
    // viewport, so the name stays readable wherever the camera sits.
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: true, sizeAttenuation: false,
    }));
    sp.scale.set(0.32, 0.10, 1); // viewport-relative; 512×160 canvas aspect preserved
    // constant screen size means neighbouring tags collide in a compact flat — stagger the
    // heights so they separate vertically, but never above the walls (the dollhouse cut is 1.15 m)
    const top = (stats.topH || 2.6) - 0.18;
    sp.position.set(cx, Math.min(1.35 + (stats.labels % 3) * 0.52, Math.max(0.3, top)), cz);
    sp.renderOrder = 10;
    sp.name = 'Tag_' + name.replace(/[^A-Za-z0-9]+/g, '_') + '_' + r.id;
    sp.userData.omitFromExport = true;
    g.add(sp);
    stats.labels++;
  }
  return { group: g, stats };
}
