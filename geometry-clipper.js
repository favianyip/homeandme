/**
 * geometry-clipper.js — polygon kernel for wall junction resolution and room slab geometry.
 *
 * All coordinates are in millimetres (hnm-project/1 native).
 * No runtime dependencies: Three.js shapes are built in journey-solid.js from the
 * plain polygon arrays returned here.
 *
 * Winding convention: polygonArea() returns positive for the same winding as an hnm-project
 * room boundary (e.g. [0,0]→[W,0]→[W,D]→[0,D]).  wallFootprint() always returns polygons
 * with positive area under that convention.  intersectPolygons() expects both polygons to
 * share the same winding.
 */

const EPS = 1e-6; // mm

// ─── footprints ─────────────────────────────────────────────────────────────

/**
 * Oriented-bounding-box rectangle for a wall centreline.
 * Returns four points in positive-area order (matching room boundary winding), or [] for
 * degenerate walls (length < 1 mm).
 *
 * wall may be an hnm-plan-contract wall ({a, b, thickness}) or an hnm-project wall
 * ({path:{kind:'line',start,end}, thickness}).
 */
export function wallFootprint(wall, thicknessOverride) {
  const a = wall.a ?? wall.path?.start;
  const b = wall.b ?? wall.path?.end;
  if (!a || !b) return [];
  const th = (thicknessOverride ?? wall.thickness ?? 150) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1) return [];
  // right-normal of direction a→b — gives positive-area winding matching room boundaries
  const rx = (dy / len) * th, ry = (-dx / len) * th;
  return [
    [a[0] + rx, a[1] + ry],
    [b[0] + rx, b[1] + ry],
    [b[0] - rx, b[1] - ry],
    [a[0] - rx, a[1] - ry],
  ];
}

/**
 * Rectangle void for an opening's span (t0..t1) on a wall, full wall thickness.
 * t0/t1 are the startRatio/endRatio on the wall centreline [0..1].
 * Returns [] for degenerate walls.
 */
export function openingCutout(wall, opening) {
  const a = wall.a ?? wall.path?.start;
  const b = wall.b ?? wall.path?.end;
  if (!a || !b) return [];
  const th = (wall.thickness ?? 150) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1) return [];
  const rx = (dy / len) * th, ry = (-dx / len) * th;
  const t0 = opening.t0 ?? opening.startRatio ?? 0;
  const t1 = opening.t1 ?? opening.endRatio ?? 1;
  const ax = a[0] + t0 * dx, ay = a[1] + t0 * dy;
  const bx = a[0] + t1 * dx, by = a[1] + t1 * dy;
  return [
    [ax + rx, ay + ry],
    [bx + rx, by + ry],
    [bx - rx, by - ry],
    [ax - rx, ay - ry],
  ];
}

// Keep host-opening interval semantics in this dependency-free geometry module so the
// readiness gate and the Three.js solid builder execute the exact same dry-run.
export const WALL_INTERVAL_RATIO_EPS = 1e-9;

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
 * This is also the authoritative CPU-only interval dry-run used before 3D approval.
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

    const trimStart = ratioAtPoint(wall, adjusted.a);
    const trimEnd = ratioAtPoint(wall, adjusted.b);
    if (trimStart < -WALL_INTERVAL_RATIO_EPS || trimEnd > 1 + WALL_INTERVAL_RATIO_EPS
      || trimStart >= trimEnd - WALL_INTERVAL_RATIO_EPS) {
      throw new Error(`Trimmed host wall ${wall.id} has an invalid usable interval.`);
    }

    if (!hosted.length) {
      segments.push({
        ...wall,
        a: [...adjusted.a], b: [...adjusted.b],
        hostWallId: wall.id,
        segmentKind: 'solid',
        t0: trimStart, t1: trimEnd,
        hostA: [...adjusted.a], hostB: [...adjusted.b],
      });
      continue;
    }
    let cursor = Math.max(0, trimStart);
    let solidIndex = 0;
    for (let openingIndex = 0; openingIndex < hosted.length; openingIndex += 1) {
      const opening = hosted[openingIndex];
      const start = opening.t0; const end = opening.t1;
      if (!Number.isFinite(start) || !Number.isFinite(end)
        || start < cursor - WALL_INTERVAL_RATIO_EPS
        || start < trimStart - WALL_INTERVAL_RATIO_EPS
        || end > trimEnd + WALL_INTERVAL_RATIO_EPS
        || start >= end - WALL_INTERVAL_RATIO_EPS) {
        throw new Error(`Opening ${opening.id} has an invalid or overlapping host interval.`);
      }
      if (start > cursor + WALL_INTERVAL_RATIO_EPS) {
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
    if (cursor < trimEnd - WALL_INTERVAL_RATIO_EPS) {
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

/** Return whether the current box builder will lower this uniquely owned balcony edge. */
export function polygonMinimumAxisSpan(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3
    || !polygon.every((point) => Array.isArray(point) && point.length === 2
      && point.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)))) {
    return 0;
  }
  const gaps = [0, 1].flatMap((axis) => {
    const coordinates = polygon.map((point) => point[axis]).sort((left, right) => left - right);
    const unique = coordinates.filter((value, index) => (
      index === 0 || value - coordinates[index - 1] > EPS
    ));
    return unique.slice(1).map((value, index) => value - unique[index]);
  }).filter((value) => value > EPS);
  return gaps.length ? Math.min(...gaps) : 0;
}

export function isParapetHostWall(wall, rooms = []) {
  const owners = rooms.filter((room) => {
    const wallIds = room.cycle || room.wallIds || [];
    return wallIds.includes(wall.id);
  });
  if (owners.length !== 1) return false;
  const room = owners[0];
  const label = room.label ?? room.name ?? '';
  const polygon = room.poly ?? room.boundary;
  const derivedAreaM2 = Array.isArray(polygon) && polygon.length >= 3
    && polygon.every((point) => Array.isArray(point) && point.length === 2
      && point.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)))
    ? Math.abs(polygonArea(polygon)) / 1_000_000
    : 0;
  if (room.minDim != null
    && (typeof room.minDim !== 'number' || !Number.isFinite(room.minDim)
      || room.minDim <= 0)) return false;
  if (room.labelSuspect != null && typeof room.labelSuspect !== 'boolean') return false;
  const derivedMinDim = polygonMinimumAxisSpan(polygon);
  const effectiveMinDim = room.minDim == null
    ? derivedMinDim : Math.min(room.minDim, derivedMinDim);
  return /BALCON|TERRACE|PATIO/i.test(label)
    && room.labelSuspect !== true
    && derivedAreaM2 >= 1.5
    && effectiveMinDim >= 800;
}

// ─── polygon math ────────────────────────────────────────────────────────────

/**
 * Signed area via the trapezoid form.
 * Returns positive for the same winding as an hnm-project room boundary.
 */
export function polygonArea(poly) {
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const j = (i + 1) % n;
    s += (poly[i][0] + poly[j][0]) * (poly[j][1] - poly[i][1]);
  }
  return s / 2;
}

/**
 * Point-in-polygon test (ray casting).
 */
export function pointInPolygon(poly, px, py) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * ((py - yi) / (yj - yi)) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Sutherland-Hodgman clipping: returns the intersection of `subject` clipped against the
 * convex `clip` polygon.  Both polygons must use the positive-area winding convention.
 * Returns [] when the intersection is empty.
 */
export function intersectPolygons(subject, clip) {
  let out = subject.slice();
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length];
      const sP = _side(A, B, P) >= -EPS;
      const sQ = _side(A, B, Q) >= -EPS;
      if (sP) out.push(P);
      if (sP !== sQ) out.push(_xsect(A, B, P, Q));
    }
  }
  return out;
}

// Positive cross product → inside (positive-area winding convention)
function _side(A, B, P) {
  return (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]);
}

function _xsect(A, B, P, Q) {
  const dax = B[0] - A[0], day = B[1] - A[1];
  const dpx = Q[0] - P[0], dpy = Q[1] - P[1];
  const d = dpx * day - dpy * dax;
  if (Math.abs(d) < EPS) return [...P];
  const t = ((A[0] - P[0]) * day - (A[1] - P[1]) * dax) / d;
  return [P[0] + t * dpx, P[1] + t * dpy];
}

// ─── junction trim ────────────────────────────────────────────────────────────

/**
 * Returns a Map<wallId, {a:[x,y], b:[x,y]}> with adjusted wall endpoints so that no two
 * axis-aligned wall footprints have overlapping interiors.
 *
 * Algorithm for each H-wall × V-wall pair whose footprints overlap:
 *   - If only V has an endpoint inside H → V terminates at H → trim V's endpoint to H's face.
 *   - If only H has an endpoint inside V → H terminates at V → trim H's endpoint to V's face.
 *   - If both have endpoints inside each other (L-junction) → trim the lower-priority
 *     (partition < structural) or shorter wall.
 *
 * Diagonal walls and walls with no axis-aligned counterpart are passed through unchanged.
 */
export function junctionTrim(walls, defaultTh = 150) {
  const PRIO = { structural: 2, partition: 1, void: 0 };
  const AXIS_EPS = 1; // mm tolerance to classify axis-aligned

  const adj = new Map(
    walls.map((w) => [w.id, { a: [w.a[0], w.a[1]], b: [w.b[0], w.b[1]] }])
  );

  const wallLen = (w) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);

  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const wi = walls[i], wj = walls[j];
      const iH = Math.abs(wi.a[1] - wi.b[1]) < AXIS_EPS;
      const iV = Math.abs(wi.a[0] - wi.b[0]) < AXIS_EPS;
      const jH = Math.abs(wj.a[1] - wj.b[1]) < AXIS_EPS;
      const jV = Math.abs(wj.a[0] - wj.b[0]) < AXIS_EPS;

      let H, V;
      if (iH && jV) { H = wi; V = wj; }
      else if (iV && jH) { H = wj; V = wi; }
      else continue; // parallel or diagonal

      const hth = (H.thickness ?? defaultTh) / 2;
      const vth = (V.thickness ?? defaultTh) / 2;

      const adjH = adj.get(H.id), adjV = adj.get(V.id);

      // Current bounds using already-adjusted endpoints
      const hy   = adjH.a[1]; // H stays at same y
      const hx0  = Math.min(adjH.a[0], adjH.b[0]);
      const hx1  = Math.max(adjH.a[0], adjH.b[0]);
      const vx   = adjV.a[0]; // V stays at same x
      const vy0  = Math.min(adjV.a[1], adjV.b[1]);
      const vy1  = Math.max(adjV.a[1], adjV.b[1]);

      // Quick footprint overlap test
      if (hx0 >= vx + vth - EPS || hx1 <= vx - vth + EPS) continue;
      if (hy - hth >= vy1 - EPS || hy + hth <= vy0 + EPS) continue;

      // Which endpoints are strictly inside the other wall's footprint?
      const vaInH = _ptInFootprint(adjV.a, hx0, hx1, hy, hth);
      const vbInH = _ptInFootprint(adjV.b, hx0, hx1, hy, hth);
      const haInV = _ptInFootprintV(adjH.a, vx, vth, vy0, vy1);
      const hbInV = _ptInFootprintV(adjH.b, vx, vth, vy0, vy1);

      const vTerminates = vaInH || vbInH;
      const hTerminates = haInV || hbInV;

      let trimV;
      if (vTerminates && !hTerminates) {
        trimV = true;
      } else if (hTerminates && !vTerminates) {
        trimV = false;
      } else {
        // L-junction or body crossing: lower-priority / shorter wall is trimmed
        const hp = PRIO[H.type] ?? 1, vp = PRIO[V.type] ?? 1;
        trimV = hp > vp || (hp === vp && wallLen(H) >= wallLen(V));
      }

      if (trimV) {
        // Move V's terminating endpoint to the face of H it exits toward
        if (vaInH) _snapToFace(adjV.a, adjV.b, 1, hy, hth);
        if (vbInH) _snapToFace(adjV.b, adjV.a, 1, hy, hth);
      } else {
        // Move H's terminating endpoint to the face of V it exits toward
        if (haInV) _snapToFace(adjH.a, adjH.b, 0, vx, vth);
        if (hbInV) _snapToFace(adjH.b, adjH.a, 0, vx, vth);
      }
    }
  }

  return adj;
}

// pt[axis] is strictly inside [center-halfTh, center+halfTh] (H footprint on the axis dimension)
function _ptInFootprint(pt, x0, x1, center, half) {
  return pt[0] >= x0 - EPS && pt[0] <= x1 + EPS
    && pt[1] > center - half + EPS && pt[1] < center + half - EPS;
}

// Same for V footprint
function _ptInFootprintV(pt, cx, half, y0, y1) {
  return pt[1] >= y0 - EPS && pt[1] <= y1 + EPS
    && pt[0] > cx - half + EPS && pt[0] < cx + half - EPS;
}

/**
 * Move pt[axis] to the face of the crossing wall that pt exits toward.
 * "other" is the opposite endpoint of the same wall, indicating the exit direction.
 */
function _snapToFace(pt, other, axis, center, halfTh) {
  if (other[axis] >= center) {
    pt[axis] = center + halfTh; // wall exits toward + → snap to + face
  } else {
    pt[axis] = center - halfTh; // wall exits toward − → snap to − face
  }
}
