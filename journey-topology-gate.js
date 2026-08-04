// Deterministic topology gate for an editable hnm-project/1 revision.
// Human review resolves uncertainty; it does not waive structural validity.

import { validateProject } from './journey-project.js';

const EPS_MM = 1;
const REVIEW_CONFIDENCE = 0.85;
const CONFIRMED_SCALE = new Set(['customer_confirmed']);
const CONFIRMED_VERTICAL_DIMENSIONS = new Set(['customer_confirmed']);
const OPENING_KINDS = new Set(['door', 'window', 'opening', 'archway', 'sliding', 'entrance']);
const SOURCE_ISSUES_REQUIRING_REVIEW = new Set([
  'DOOR_PROPOSED',
  'NO_ENTRANCE',
  'NO_OPENING',
  'OPENING_UNHOSTED',
  'UNREACHABLE',
]);
const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function pointOnSegment(point, start, end, tolerance = EPS_MM) {
  const length = pointDistance(start, end);
  if (!length) return pointDistance(point, start) <= tolerance;
  const lineDistance = Math.abs(cross(start, end, point)) / length;
  return lineDistance <= tolerance
    && point[0] >= Math.min(start[0], end[0]) - tolerance
    && point[0] <= Math.max(start[0], end[0]) + tolerance
    && point[1] >= Math.min(start[1], end[1]) - tolerance
    && point[1] <= Math.max(start[1], end[1]) + tolerance;
}

function parameterOnSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  return lengthSquared ? ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared : 0;
}

function intersectionKind(left, right) {
  const a = left.path.start; const b = left.path.end;
  const c = right.path.start; const d = right.path.end;
  const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(denominator) <= 1e-9) {
    if (Math.abs(cross(a, b, c)) > EPS_MM * Math.max(1, pointDistance(a, b))) return 'none';
    const c0 = parameterOnSegment(c, a, b); const c1 = parameterOnSegment(d, a, b);
    const overlap = Math.min(1, Math.max(c0, c1)) - Math.max(0, Math.min(c0, c1));
    return overlap > 1e-6 ? 'collinear-overlap' : (
      pointOnSegment(a, c, d) || pointOnSegment(b, c, d)
      || pointOnSegment(c, a, b) || pointOnSegment(d, a, b) ? 'touch' : 'none'
    );
  }
  const ac = [c[0] - a[0], c[1] - a[1]];
  const t = (ac[0] * (d[1] - c[1]) - ac[1] * (d[0] - c[0])) / denominator;
  const u = (ac[0] * (b[1] - a[1]) - ac[1] * (b[0] - a[0])) / denominator;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return 'none';
  const leftInterior = t > 1e-6 && t < 1 - 1e-6;
  const rightInterior = u > 1e-6 && u < 1 - 1e-6;
  return leftInterior && rightInterior ? 'unsplit-crossing' : 'touch';
}

function issue(code, message, objectIds = []) { return { code, message, objectIds }; }

function projectContractIssue(message) {
  if (/duplicate geometry id/i.test(message)) return issue('DUPLICATE_GEOMETRY_ID', message);
  if (/opening .* references missing wall/i.test(message)) return issue('OPENING_HOST_MISSING', message);
  return issue('PROJECT_CONTRACT_INVALID', message);
}

function pointKey(point) {
  return `${Math.round(point[0] / EPS_MM)},${Math.round(point[1] / EPS_MM)}`;
}

function polygonTwiceArea(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
}

function orientation(a, b, c) {
  const value = cross(a, b, c);
  return Math.abs(value) <= EPS_MM ? 0 : Math.sign(value);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && pointOnSegment(c, a, b))
    || (o2 === 0 && pointOnSegment(d, a, b))
    || (o3 === 0 && pointOnSegment(a, c, d))
    || (o4 === 0 && pointOnSegment(b, c, d));
}

function polygonProblem(boundary) {
  if (!Array.isArray(boundary) || boundary.length < 3) return 'has fewer than three boundary vertices';
  if (!boundary.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) {
    return 'contains a non-finite boundary vertex';
  }
  const vertices = boundary.map(pointKey);
  if (new Set(vertices).size !== vertices.length) return 'repeats a boundary vertex';
  if (Math.abs(polygonTwiceArea(boundary)) <= EPS_MM) return 'has no enclosed boundary area';
  for (let leftIndex = 0; leftIndex < boundary.length; leftIndex += 1) {
    const a = boundary[leftIndex]; const b = boundary[(leftIndex + 1) % boundary.length];
    for (let rightIndex = leftIndex + 1; rightIndex < boundary.length; rightIndex += 1) {
      const adjacent = rightIndex === leftIndex + 1
        || (leftIndex === 0 && rightIndex === boundary.length - 1);
      if (adjacent) continue;
      const c = boundary[rightIndex]; const d = boundary[(rightIndex + 1) % boundary.length];
      if (segmentsIntersect(a, b, c, d)) return 'has a self-intersecting boundary';
    }
  }
  return null;
}

function canonicalPolygonKey(boundary) {
  const points = boundary.map(pointKey);
  const variants = [];
  for (const sequence of [points, [...points].reverse()]) {
    for (let index = 0; index < sequence.length; index += 1) {
      variants.push([...sequence.slice(index), ...sequence.slice(0, index)].join('|'));
    }
  }
  return variants.sort()[0];
}

function pointStrictlyInsidePolygon(point, boundary) {
  for (let index = 0; index < boundary.length; index += 1) {
    if (pointOnSegment(point, boundary[index], boundary[(index + 1) % boundary.length])) return false;
  }
  let inside = false;
  for (let index = 0, prior = boundary.length - 1; index < boundary.length; prior = index, index += 1) {
    const current = boundary[index]; const previous = boundary[prior];
    if ((current[1] > point[1]) !== (previous[1] > point[1])
      && point[0] < (previous[0] - current[0]) * ((point[1] - current[1]) / (previous[1] - current[1])) + current[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function edgesCrossProperly(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

function collinearOverlapHasSharedInterior(a, b, c, d, leftArea, rightArea) {
  const leftLength = pointDistance(a, b);
  const rightLength = pointDistance(c, d);
  if (!leftLength || !rightLength) return false;
  if (Math.abs(cross(a, b, c)) / leftLength > EPS_MM
    || Math.abs(cross(a, b, d)) / leftLength > EPS_MM) return false;
  const c0 = parameterOnSegment(c, a, b); const c1 = parameterOnSegment(d, a, b);
  const overlapRatio = Math.min(1, Math.max(c0, c1)) - Math.max(0, Math.min(c0, c1));
  if (overlapRatio * leftLength <= EPS_MM) return false;
  const leftWinding = Math.sign(leftArea);
  const rightWinding = Math.sign(rightArea);
  const leftNormal = [leftWinding * (a[1] - b[1]) / leftLength, leftWinding * (b[0] - a[0]) / leftLength];
  const rightNormal = [rightWinding * (c[1] - d[1]) / rightLength, rightWinding * (d[0] - c[0]) / rightLength];
  return leftNormal[0] * rightNormal[0] + leftNormal[1] * rightNormal[1] > 0;
}

function polygonsHavePositiveAreaOverlap(left, right) {
  if (left.some((point) => pointStrictlyInsidePolygon(point, right))
    || right.some((point) => pointStrictlyInsidePolygon(point, left))) return true;
  const leftArea = polygonTwiceArea(left);
  const rightArea = polygonTwiceArea(right);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const a = left[leftIndex]; const b = left[(leftIndex + 1) % left.length];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const c = right[rightIndex]; const d = right[(rightIndex + 1) % right.length];
      if (edgesCrossProperly(a, b, c, d)
        || collinearOverlapHasSharedInterior(a, b, c, d, leftArea, rightArea)) return true;
    }
  }
  return false;
}

function wallCycleProblem(space, wallById) {
  const wallIds = space?.wallIds;
  if (!Array.isArray(wallIds) || wallIds.length < 3) return 'has fewer than three boundary walls';
  if (new Set(wallIds).size !== wallIds.length) return 'repeats a boundary wall';
  const cycleWalls = wallIds.map((id) => wallById.get(id));
  if (cycleWalls.some((wall) => !wall)) return 'references a missing boundary wall';
  const boundary = space?.boundary;
  if (!Array.isArray(boundary) || boundary.length < 3) return 'has no valid polygon boundary to bind to walls';
  const usedWalls = new Set();
  for (let edgeIndex = 0; edgeIndex < boundary.length; edgeIndex += 1) {
    const start = boundary[edgeIndex];
    const end = boundary[(edgeIndex + 1) % boundary.length];
    const edgeLength = pointDistance(start, end);
    if (!(edgeLength > EPS_MM)) return `contains a zero-length polygon edge at index ${edgeIndex}`;
    const toleranceRatio = EPS_MM / edgeLength;
    const intervals = [];
    for (const wall of cycleWalls) {
      const wallStart = wall.path.start; const wallEnd = wall.path.end;
      const startDistance = Math.abs(cross(start, end, wallStart)) / edgeLength;
      const endDistance = Math.abs(cross(start, end, wallEnd)) / edgeLength;
      if (startDistance > EPS_MM || endDistance > EPS_MM) continue;
      const left = Math.max(0, Math.min(
        parameterOnSegment(wallStart, start, end),
        parameterOnSegment(wallEnd, start, end),
      ));
      const right = Math.min(1, Math.max(
        parameterOnSegment(wallStart, start, end),
        parameterOnSegment(wallEnd, start, end),
      ));
      if (right - left > toleranceRatio) intervals.push({ left, right, wallId: wall.id });
    }
    intervals.sort((left, right) => left.left - right.left || right.right - left.right);
    let coveredUntil = 0;
    for (const interval of intervals) {
      if (interval.left > coveredUntil + toleranceRatio) break;
      if (interval.right > coveredUntil) {
        coveredUntil = interval.right;
        usedWalls.add(interval.wallId);
      }
      if (coveredUntil >= 1 - toleranceRatio) break;
    }
    if (coveredUntil < 1 - toleranceRatio) return `has an unsupported or gapped polygon edge at index ${edgeIndex}`;
  }
  const unusedWalls = wallIds.filter((wallId) => !usedWalls.has(wallId));
  return unusedWalls.length ? `lists non-boundary wall ${unusedWalls[0]}` : null;
}

function storeyFor(project, item) {
  const storeys = project?.storeys || [];
  return storeys.find((storey) => storey.id === item?.storeyId) || (storeys.length === 1 ? storeys[0] : null);
}

function scaleStatus(project) {
  return project?.calibration?.status || project?.provenance?.scaleStatus || project?.scale?.status || null;
}

export function validateProjectTopology(project) {
  const basic = validateProject(project);
  const blocking = basic.errors.map(projectContractIssue);
  const warnings = [];
  const walls = (project?.geometry?.walls || []).filter((wall) => wall.path?.kind === 'line');
  const wallIds = new Set(walls.map((wall) => wall.id));
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  if (!walls.length) blocking.push(issue('WALL_NETWORK_EMPTY', 'No line-wall geometry is available.'));

  if (!CONFIRMED_SCALE.has(scaleStatus(project))) {
    blocking.push(issue(
      'SCALE_UNVERIFIED',
      'Metric scale is not customer-confirmed; dimensions and 3D must remain blocked.',
    ));
  }

  const adjacency = new Map(walls.map((wall) => [wall.id, new Set()]));
  for (let leftIndex = 0; leftIndex < walls.length; leftIndex += 1) {
    const left = walls[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < walls.length; rightIndex += 1) {
      const right = walls[rightIndex];
      const kind = intersectionKind(left, right);
      if (kind !== 'none' && kind !== 'collinear-overlap') {
        adjacency.get(left.id).add(right.id);
        adjacency.get(right.id).add(left.id);
      }
      if (kind === 'unsplit-crossing') {
        blocking.push(issue(
          'UNSPLIT_WALL_CROSSING',
          `Walls ${left.id} and ${right.id} cross without a junction split.`,
          [left.id, right.id],
        ));
      } else if (kind === 'collinear-overlap') {
        blocking.push(issue(
          'OVERLAPPING_WALL_SEGMENTS',
          `Walls ${left.id} and ${right.id} overlap on the same axis.`,
          [left.id, right.id],
        ));
      }
    }
  }

  const dangling = [];
  for (const wall of walls) {
    for (const [endpoint, point] of [['start', wall.path.start], ['end', wall.path.end]]) {
      const attached = walls.some((other) => other.id !== wall.id
        && pointOnSegment(point, other.path.start, other.path.end));
      if (!attached) dangling.push(`${wall.id}:${endpoint}`);
    }
  }
  if (dangling.length) {
    blocking.push(issue(
      'DANGLING_WALL_ENDPOINTS',
      `${dangling.length} wall endpoint(s) do not meet another wall.`,
      dangling,
    ));
  }

  if (walls.length) {
    const visited = new Set([walls[0].id]);
    const queue = [walls[0].id];
    while (queue.length) {
      for (const neighbor of adjacency.get(queue.shift()) || []) {
        if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
      }
    }
    const disconnected = walls.filter((wall) => !visited.has(wall.id)).map((wall) => wall.id);
    if (disconnected.length) {
      blocking.push(issue(
        'DISCONNECTED_WALL_NETWORK',
        `${disconnected.length} wall segment(s) are disconnected from the main unit.`,
        disconnected,
      ));
    }
  }

  const openingsByWall = new Map();
  for (const opening of project?.geometry?.openings || []) {
    if (!opening.wallId || !wallIds.has(opening.wallId)) {
      if (!blocking.some((item) => item.code === 'OPENING_HOST_MISSING'
        && item.message.includes(opening.id))) {
        blocking.push(issue(
          'OPENING_HOST_MISSING',
          `Opening ${opening.id} is not assigned to a current wall.`,
          [opening.id, ...(opening.wallId ? [opening.wallId] : [])],
        ));
      }
      continue;
    }
    if (!OPENING_KINDS.has(opening.kind)) {
      blocking.push(issue(
        'OPENING_KIND_UNVERIFIED',
        `Opening ${opening.id} is not confirmed as a door, window or supported opening type.`,
        [opening.id],
      ));
    }
    const start = opening.span?.startRatio; const end = opening.span?.endRatio;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end) {
      blocking.push(issue('OPENING_SPAN_INVALID', `Opening ${opening.id} has an invalid host span.`, [opening.id]));
      continue;
    }
    const hosted = openingsByWall.get(opening.wallId) || [];
    for (const prior of hosted) {
      if (Math.max(start, prior.start) < Math.min(end, prior.end)) {
        blocking.push(issue(
          'OPENING_SPANS_OVERLAP',
          `Openings ${prior.id} and ${opening.id} overlap on wall ${opening.wallId}.`,
          [prior.id, opening.id, opening.wallId],
        ));
      }
    }
    hosted.push({ id: opening.id, start, end });
    openingsByWall.set(opening.wallId, hosted);
    if ((opening.confidence ?? 1) < REVIEW_CONFIDENCE && !opening.accepted) {
      warnings.push(issue(
        'OPENING_REVIEW_REQUIRED',
        `Opening ${opening.id} requires door/window and host-wall review.`,
        [opening.id, opening.wallId],
      ));
    }
  }

  const spaces = project?.geometry?.spaces || [];
  const validSpaces = [];
  if (!spaces.length) {
    blocking.push(issue('ROOM_SET_EMPTY', 'No closed room geometry is available.'));
  }
  for (const space of spaces) {
    const boundaryProblem = polygonProblem(space.boundary);
    if (boundaryProblem) {
      blocking.push(issue(
        'ROOM_BOUNDARY_UNVERIFIED',
        `Room ${space.id} ${boundaryProblem}.`,
        [space.id],
      ));
    } else {
      validSpaces.push(space);
    }
    const cycleProblem = wallCycleProblem(space, wallById);
    if (cycleProblem) {
      blocking.push(issue(
        'ROOM_WALL_CYCLE_UNVERIFIED',
        `Room ${space.id} ${cycleProblem}.`,
        [space.id, ...(space.wallIds || [])],
      ));
    }
  }

  for (let leftIndex = 0; leftIndex < validSpaces.length; leftIndex += 1) {
    const left = validSpaces[leftIndex];
    const leftStorey = storeyFor(project, left)?.id ?? left.storeyId ?? null;
    for (let rightIndex = leftIndex + 1; rightIndex < validSpaces.length; rightIndex += 1) {
      const right = validSpaces[rightIndex];
      const rightStorey = storeyFor(project, right)?.id ?? right.storeyId ?? null;
      if (leftStorey !== rightStorey) continue;
      const duplicate = canonicalPolygonKey(left.boundary) === canonicalPolygonKey(right.boundary);
      if (!duplicate && !polygonsHavePositiveAreaOverlap(left.boundary, right.boundary)) continue;
      blocking.push(issue(
        'ROOMS_OVERLAP',
        duplicate
          ? `Rooms ${left.id} and ${right.id} duplicate the same slab boundary.`
          : `Rooms ${left.id} and ${right.id} overlap with positive floor area.`,
        [left.id, right.id],
      ));
    }
  }

  for (const wall of walls) {
    if ((wall.confidence ?? 1) < REVIEW_CONFIDENCE && !wall.accepted) {
      warnings.push(issue('WALL_REVIEW_REQUIRED', `Wall ${wall.id} requires review.`, [wall.id]));
    }
  }

  for (const sourceIssue of project?.issues || []) {
    const code = String(sourceIssue?.code || 'SOURCE_GEOMETRY_ISSUE');
    const message = sourceIssue?.note || sourceIssue?.message || code;
    const target = sourceIssue?.severity === 'blocking' || SOURCE_ISSUES_REQUIRING_REVIEW.has(code)
      ? blocking : warnings;
    target.push(issue(
      code === 'OPENING_UNHOSTED' ? 'UNASSIGNED_OPENING_CANDIDATES' : `SOURCE_${code}`,
      message,
      sourceIssue?.objectIds || sourceIssue?.object_ids || [],
    ));
  }
  return { ok: blocking.length === 0, blocking, warnings };
}

/** Strict local 2D→3D gate. Service-side hash-bound approvals remain authoritative. */
export function validateProject3dReadiness(project) {
  const topology = validateProjectTopology(project);
  const blocking = [...topology.blocking];
  const warnings = [...topology.warnings];

  if (project?.provenance?.requiresConfirmation !== false) {
    blocking.push(issue(
      'GEOMETRY_CONFIRMATION_REQUIRED',
      'Walls, rooms, doors and windows are not recorded as reviewed for this exact revision.',
    ));
  }
  if (!CONFIRMED_VERTICAL_DIMENSIONS.has(project?.verticalDimensions?.status)) {
    blocking.push(issue(
      'VERTICAL_DIMENSIONS_UNVERIFIED',
      'Ceiling, wall, door and window heights are not customer-confirmed.',
    ));
  }

  const walls = (project?.geometry?.walls || []).filter((wall) => wall.path?.kind === 'line');
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  const openings = project?.geometry?.openings || [];
  if (!openings.some((opening) => ['door', 'entrance', 'sliding'].includes(opening.kind))) {
    blocking.push(issue('DOOR_SET_EMPTY', 'No reviewed door or entrance opening is available for the 3D revision.'));
  }
  if (!openings.some((opening) => opening.kind === 'window')) {
    blocking.push(issue('WINDOW_SET_EMPTY', 'No reviewed window opening is available for the 3D revision.'));
  }
  for (const storey of project?.storeys || []) {
    if (!Number.isInteger(storey.height) || storey.height < 2000 || storey.height > 6000) {
      blocking.push(issue(
        'CEILING_HEIGHT_INVALID',
        `Storey ${storey.id} needs a confirmed ceiling height from 2000 to 6000 mm.`,
        [storey.id],
      ));
    }
  }
  for (const wall of walls) {
    const storey = storeyFor(project, wall);
    if (!Number.isFinite(wall.thickness) || wall.thickness <= 0) {
      blocking.push(issue('WALL_THICKNESS_INVALID', `Wall ${wall.id} has no valid thickness.`, [wall.id]));
    }
    if (!Number.isInteger(wall.height) || !storey || wall.height !== storey.height) {
      blocking.push(issue(
        'WALL_HEIGHT_UNVERIFIED',
        `Wall ${wall.id} height does not match a confirmed storey ceiling height.`,
        [wall.id, ...(storey ? [storey.id] : [])],
      ));
    }
  }
  for (const opening of openings) {
    const wall = wallById.get(opening.wallId);
    const head = Number(opening.sill) + Number(opening.height);
    if (!Number.isInteger(opening.height) || opening.height < 100
      || !Number.isInteger(opening.sill) || opening.sill < 0
      || !wall || !Number.isInteger(wall.height) || head > wall.height
      || (['door', 'entrance'].includes(opening.kind) && opening.sill !== 0)) {
      blocking.push(issue(
        'OPENING_VERTICAL_DIMENSIONS_INVALID',
        `Opening ${opening.id} needs valid sill, height and head below its host-wall ceiling.`,
        [opening.id, ...(opening.wallId ? [opening.wallId] : [])],
      ));
    }
  }
  return { ok: blocking.length === 0 && warnings.length === 0, blocking, warnings };
}
