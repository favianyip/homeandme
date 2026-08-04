import { junctionTrim } from './geometry-clipper.js';
import { validateProject3dReadiness } from './journey-topology-gate.js';

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
const RATIO_EPS = 1e-9;

const pointAtRatio = (wall, ratio) => [
  wall.a[0] + (wall.b[0] - wall.a[0]) * ratio,
  wall.a[1] + (wall.b[1] - wall.a[1]) * ratio,
];

function ratioAtPoint(wall, point) {
  const dx = wall.b[0] - wall.a[0];
  const dy = wall.b[1] - wall.a[1];
  const lengthSquared = dx * dx + dy * dy;
  return lengthSquared
    ? ((point[0] - wall.a[0]) * dx + (point[1] - wall.a[1]) * dy) / lengthSquared
    : 0;
}

/**
 * Compile continuous host walls into deterministic solid and typed-opening intervals.
 *
 * Authoritative hnm-project openings reference a non-void host wall by ratio. Legacy experimental
 * contracts may instead provide an already-split `void: true` wall with one opening keyed by the
 * same ID; that representation remains supported, but ambiguous multi-opening legacy voids fail.
 */
export function compileWallOpeningSegments(walls = [], openings = []) {
  const wallIds = new Set();
  for (const wall of walls) {
    if (!wall?.id || wallIds.has(wall.id)) throw new Error(`Wall IDs must be present and unique: ${wall?.id || 'missing'}.`);
    wallIds.add(wall.id);
  }
  const openingIds = new Set();
  const openingsByWall = new Map();
  for (const opening of openings) {
    if (!opening?.id || openingIds.has(opening.id)) {
      throw new Error(`Opening IDs must be present and unique: ${opening?.id || 'missing'}.`);
    }
    openingIds.add(opening.id);
    if (!wallIds.has(opening.wall)) throw new Error(`Opening ${opening.id} references missing wall ${opening.wall}.`);
    const hosted = openingsByWall.get(opening.wall) || [];
    hosted.push(opening);
    openingsByWall.set(opening.wall, hosted);
  }

  const trimmed = junctionTrim(walls.filter((wall) => !wall.void));
  const segments = [];
  for (const wall of walls) {
    const hosted = [...(openingsByWall.get(wall.id) || [])]
      .sort((left, right) => (left.t0 - right.t0) || (left.t1 - right.t1)
        || String(left.id).localeCompare(String(right.id)));
    const adjusted = trimmed.get(wall.id) || { a: wall.a, b: wall.b };

    if (wall.void) {
      if (hosted.length > 1) {
        throw new Error(`Experimental void wall ${wall.id} cannot represent multiple openings.`);
      }
      const opening = hosted[0] || null;
      segments.push({
        ...wall,
        id: `${wall.id}::legacy-opening:0:${opening?.id || 'untyped'}`,
        a: [...wall.a], b: [...wall.b],
        hostWallId: wall.id,
        segmentKind: 'opening',
        opening,
        t0: 0, t1: 1,
        legacyExperimental: true,
        hostA: [...wall.a], hostB: [...wall.b],
      });
      continue;
    }

    if (!hosted.length) {
      const startRatio = ratioAtPoint(wall, adjusted.a);
      const endRatio = ratioAtPoint(wall, adjusted.b);
      segments.push({
        ...wall,
        a: [...adjusted.a], b: [...adjusted.b],
        hostWallId: wall.id,
        segmentKind: 'solid',
        t0: startRatio, t1: endRatio,
        hostA: [...adjusted.a], hostB: [...adjusted.b],
      });
      continue;
    }

    const trimStart = ratioAtPoint(wall, adjusted.a);
    const trimEnd = ratioAtPoint(wall, adjusted.b);
    if (trimStart < -RATIO_EPS || trimEnd > 1 + RATIO_EPS || trimStart >= trimEnd - RATIO_EPS) {
      throw new Error(`Trimmed host wall ${wall.id} has an invalid usable interval.`);
    }
    let cursor = Math.max(0, trimStart);
    let solidIndex = 0;
    for (let openingIndex = 0; openingIndex < hosted.length; openingIndex += 1) {
      const opening = hosted[openingIndex];
      const start = opening.t0; const end = opening.t1;
      if (!Number.isFinite(start) || !Number.isFinite(end)
        || start < cursor - RATIO_EPS || start < trimStart - RATIO_EPS
        || end > trimEnd + RATIO_EPS || start >= end - RATIO_EPS) {
        throw new Error(`Opening ${opening.id} has an invalid or overlapping host interval.`);
      }
      if (start > cursor + RATIO_EPS) {
        segments.push({
          ...wall,
          id: `${wall.id}::solid:${solidIndex}`,
          a: pointAtRatio(wall, cursor), b: pointAtRatio(wall, start),
          hostWallId: wall.id,
          segmentKind: 'solid',
          t0: cursor, t1: start,
          hostA: [...adjusted.a], hostB: [...adjusted.b],
        });
        solidIndex += 1;
      }
      segments.push({
        ...wall,
        id: `${wall.id}::opening:${openingIndex}:${opening.id}`,
        a: pointAtRatio(wall, start), b: pointAtRatio(wall, end),
        void: true,
        hostWallId: wall.id,
        openingId: opening.id,
        segmentKind: 'opening',
        opening,
        t0: start, t1: end,
        hostA: [...adjusted.a], hostB: [...adjusted.b],
      });
      cursor = end;
    }
    if (cursor < trimEnd - RATIO_EPS) {
      segments.push({
        ...wall,
        id: `${wall.id}::solid:${solidIndex}`,
        a: pointAtRatio(wall, cursor), b: [...adjusted.b],
        hostWallId: wall.id,
        segmentKind: 'solid',
        t0: cursor, t1: trimEnd,
        hostA: [...adjusted.a], hostB: [...adjusted.b],
      });
    }
  }
  return segments;
}

/** Convert one hnm-project storey to the proven contract-shaped input used by buildSolid.
 *  Curved paths fail visibly until the production curve mesher lands; silently chord-cutting them
 *  would make an approved project dimensionally dishonest. */
export function projectToSolidContract(project, storeyId) {
  if (!project || project.schema !== 'hnm-project/1') {
    throw new TypeError('projectToSolidContract expects hnm-project/1');
  }
  const storey = storeyId
    ? (project.storeys || []).find((item) => item.id === storeyId)
    : (project.storeys || [])[0];
  if (!storey) throw new Error('The requested project storey does not exist.');
  const belongs = (item) => !item.storeyId || item.storeyId === storey.id;
  const projectWalls = (project.geometry?.walls || []).filter(belongs);
  const curved = projectWalls.filter((wall) => wall.path?.kind !== 'line');
  if (curved.length) throw new Error(`${curved.length} curved wall(s) require the curve mesh compiler.`);
  const readiness = validateProject3dReadiness(project);
  if (!readiness.ok) {
    const issues = [...readiness.blocking, ...readiness.warnings]
      .map((item) => `${item.code}: ${item.message}`);
    throw new Error(`Corrected 3D concept is blocked: ${issues.join(' ')}`);
  }

  const walls = projectWalls.map((wall) => ({
    id: wall.id,
    a: wall.path.start,
    b: wall.path.end,
    thickness: wall.thickness,
    height: wall.height,
    type: wall.structuralClass,
    void: !!wall.isVoid,
    confidence: wall.confidence,
  }));
  const openings = (project.geometry?.openings || []).filter(belongs).map((opening) => ({
    id: opening.id,
    wall: opening.wallId,
    t0: opening.span?.startRatio,
    t1: opening.span?.endRatio,
    width: opening.span?.width,
    kind: opening.kind,
    height: opening.height,
    sill: opening.sill,
    between: opening.between || [],
    confidence: opening.confidence,
  }));
  const rooms = (project.geometry?.spaces || []).filter(belongs).map((space) => ({
    id: space.id,
    cycle: space.wallIds || [],
    poly: space.boundary || [],
    areaM2: space.areaM2,
    cls: space.type,
    label: space.name,
    confidence: space.confidence,
  }));

  return {
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm',
    source: project.provenance?.source || null,
    envelope: storey.envelope,
    walls, openings, rooms,
    adjacency: project.relationships?.adjacency || [],
    issues: project.issues || [],
  };
}

export function buildProjectSolid(project, THREE, opts = {}) {
  return buildSolid(projectToSolidContract(project, opts.storeyId), THREE, opts);
}

export function buildSolid(c, THREE, opts) {
  const O = Object.assign({
    wallH: null, doorH: 2.1, sillH: 1.0, headH: 2.1, slab: 0.02,
    parapetH: 1.1, diagnostic: false, labels: true,
  }, opts || {});
  const g = new THREE.Group();
  const stats = {
    hostWalls: 0, walls: 0, solidSegments: 0, openingVoids: 0, legacyExperimentalVoids: 0,
    floors: 0, doors: 0, windows: 0, lintels: 0, sills: 0, heads: 0,
    glazings: 0, thresholds: 0, doorLeaves: 0, labels: 0, entrance: 0,
    parapets: 0, topH: 0,
  };
  if (!c || !c.ok || !c.walls.length) return { group: g, stats };

  const M = (mm) => mm / 1000;
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

  const box = (w, h, d, x, y, z, material, name, userData = null) => {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.name = name;
    if (userData) m.userData = { ...(m.userData || {}), ...userData };
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

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
  const wallHeight = (wall) => Number.isFinite(O.wallH)
    ? O.wallH : (Number.isFinite(wall?.height) ? M(wall.height) : 2.6);
  const parapetOf = (hostWall) => {
    const own = owners.get(hostWall.id) || [];
    if (own.length !== 1) return 0;
    const r = own[0];
    if (!/BALCON|TERRACE|PATIO/i.test(r.label || '')) return 0;
    if (!(r.areaM2 >= 1.5) || (r.minDim && r.minDim < 800)) return 0;
    return Math.min(O.parapetH, wallHeight(hostWall));
  };

  const hostById = new Map(c.walls.map((wall) => [wall.id, wall]));
  const compiledWalls = compileWallOpeningSegments(c.walls, c.openings || []);
  const renderedParapets = new Set();
  const countedWallHosts = new Set();
  stats.hostWalls = c.walls.filter((wall) => !wall.void).length;

  for (const segment of compiledWalls) {
    const hostWall = hostById.get(segment.hostWallId) || segment;
    const pH = parapetOf(hostWall);
    if (pH && segment.segmentKind === 'opening') {
      throw new Error(`Parapet wall ${segment.hostWallId} cannot silently discard opening ${segment.opening?.id || segment.id}.`);
    }
    if (pH) {
      if (renderedParapets.has(segment.hostWallId)) continue;
      renderedParapets.add(segment.hostWallId);
    }
    const a = pH ? segment.hostA : segment.a;
    const b = pH ? segment.hostB : segment.b;
    const horiz = Math.abs(a[1] - b[1]) < 1;
    const vert = Math.abs(a[0] - b[0]) < 1;
    if (!horiz && !vert) {
      throw new Error(`Diagonal wall ${segment.hostWallId} requires the oriented wall mesher.`);
    }
    const len = M(Math.abs(horiz ? b[0] - a[0] : b[1] - a[1]));
    if (len < 0.02) continue;
    const th = Math.max(0.05, M(segment.thickness));
    const cx = M((a[0] + b[0]) / 2) + ox;
    const cz = M((a[1] + b[1]) / 2) + oz;
    const H = wallHeight(hostWall);
    const dims = (h) => (horiz ? [len, h, th] : [th, h, len]);

    // Decided BEFORE the solid/void branch: a balustrade has no window in it, so a balcony's whole
    // outer edge becomes parapet with open air above — otherwise an opening on that edge builds
    // full-height glazing and the balcony reads sealed along its longest side.
    if (pH) {
      box(...dims(pH), cx, pH / 2, cz, MATS.parapet, 'Parapet_' + segment.hostWallId, {
        wallId: segment.hostWallId, component: 'parapet',
      });
      stats.parapets++;
      stats.topH = Math.max(stats.topH, H);
      continue;
    }

    if (!hostWall.void && !countedWallHosts.has(segment.hostWallId)) {
      countedWallHosts.add(segment.hostWallId);
      stats.walls++;
    }

    if (!segment.void) {
      box(...dims(H), cx, H / 2, cz, MATS[segment.type] || MATS.partition,
        `Wall_${segment.type || 'partition'}_${segment.id}`, {
          wallId: segment.hostWallId, segmentId: segment.id,
          component: 'wall-solid', t0: segment.t0, t1: segment.t1,
        });
      stats.solidSegments++;
      stats.topH = Math.max(stats.topH, H);
      continue;
    }
    const opening = segment.opening || {};
    const kind = opening.kind || 'door';
    const openingMeta = {
      wallId: segment.hostWallId,
      segmentId: segment.id,
      openingId: opening.id || null,
      openingKind: kind,
      legacyExperimental: segment.legacyExperimental === true,
      t0: segment.t0,
      t1: segment.t1,
    };
    const sill = Math.min(H, Math.max(0,
      Number.isFinite(opening.sill) ? M(opening.sill) : (kind === 'window' ? O.sillH : 0)));
    const fallbackHeight = kind === 'window' ? Math.max(0, O.headH - O.sillH) : O.doorH;
    const openingHeight = Number.isFinite(opening.height) ? M(opening.height) : fallbackHeight;
    const head = Math.min(H, sill + Math.max(0, openingHeight));
    if (head <= sill + 0.001) throw new Error(`Opening ${opening.id || segment.id} has no usable vertical span.`);
    stats.openingVoids++;
    if (segment.legacyExperimental) stats.legacyExperimentalVoids++;
    stats.topH = Math.max(stats.topH, H);

    if (kind === 'window') {
      if (sill > 0.001) {
        box(...dims(sill), cx, sill / 2, cz, MATS.trim, 'Sill_' + segment.id,
          { ...openingMeta, component: 'window-sill' });
        stats.sills++;
      }
      if (H > head + 0.001) {
        box(...dims(H - head), cx, (H + head) / 2, cz, MATS.trim, 'Head_' + segment.id,
          { ...openingMeta, component: 'window-head' });
        stats.heads++;
      }
      if (head - sill > 0.01) {
        const paneT = Math.min(0.03, th * 0.5);
        box(...(horiz ? [len, head - sill, paneT] : [paneT, head - sill, len]),
          cx, (sill + head) / 2, cz, MATS.glass, 'Glazing_' + segment.id,
          { ...openingMeta, component: 'window-glazing' });
        stats.glazings++;
      }
      stats.windows++;
      continue;
    }
    // door or wide opening: head over it, and a threshold so the floor runs through
    if (H > head + 0.001) {
      box(...dims(H - head), cx, (H + head) / 2, cz, MATS.trim, 'Lintel_' + segment.id,
        { ...openingMeta, component: 'opening-lintel' });
      stats.lintels++;
    }
    box(...(horiz ? [len, O.slab, th] : [th, O.slab, len]),
      cx, O.slab / 2, cz, MATS.threshold, 'Threshold_' + segment.id,
      { ...openingMeta, component: 'opening-threshold' });
    stats.thresholds++;
    if (kind === 'door') {
      stats.doors++;
      // a leaf on every interior door too — a bare gap reads as a missing wall, not a doorway.
      // Height clamps to the wall exactly as the glazing and the entrance leaf do, or the leaf
      // hangs above the walls in the dollhouse cut.
      const leafHeight = Math.max(0.05, head - sill - O.slab);
      const lf = new THREE.Mesh(new THREE.BoxGeometry(len * 0.93, leafHeight, 0.042), MATS.leaf);
      lf.geometry.translate(len * 0.465, 0, 0);
      lf.position.set(cx - (horiz ? len / 2 : 0), sill + O.slab + leafHeight / 2,
        cz - (horiz ? 0 : len / 2));
      // the hinge sits at the opening's low end and the leaf runs toward +X or +Z from there:
      // rotation.y maps local +X to (cos θ, 0, −sin θ), so a vertical wall needs −π/2, not +π/2
      lf.rotation.y = horiz ? -0.6 : -Math.PI / 2 + 0.6;
      lf.castShadow = true;
      lf.name = 'DoorLeaf_' + segment.id;
      lf.userData = { ...(lf.userData || {}), ...openingMeta, component: 'door-leaf' };
      g.add(lf);
      stats.doorLeaves++;
    }
    if (kind === 'entrance') {
      // a real leaf, ajar, so the front door is unmistakable in the model
      const leafHeight = head - sill;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(len * 0.94, leafHeight, 0.045), MATS.entrance);
      leaf.position.set(cx, sill + leafHeight / 2, cz);
      leaf.rotation.y = (horiz ? 0 : Math.PI / 2) - (horiz ? 0.55 : -0.55);
      leaf.geometry.translate(len * 0.47, 0, 0);
      leaf.castShadow = true;
      leaf.name = 'EntranceLeaf_' + segment.id;
      leaf.userData = { ...(leaf.userData || {}), ...openingMeta, component: 'entrance-leaf' };
      g.add(leaf);
      stats.doors++;
      stats.entrance++;
      stats.doorLeaves++;
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
