// Deterministic topology gate for an editable hnm-project/1 revision.
// Human review resolves uncertainty; it does not waive structural validity.

import { validateProject } from './journey-project.js';
import {
  compileWallOpeningSegments,
  isParapetHostWall,
  polygonMinimumAxisSpan,
} from './geometry-clipper.js';

const EPS_MM = 1;
const REVIEW_CONFIDENCE = 0.85;
const CONFIRMED_SCALE = new Set(['customer_confirmed']);
const CONFIRMED_VERTICAL_DIMENSIONS = new Set(['customer_confirmed']);
const MIN_NAVIGABLE_PORTAL_WIDTH_MM = 750;
const MIN_PRIMARY_ENTRANCE_WIDTH_MM = 800;
const MIN_NAVIGABLE_PORTAL_HEIGHT_MM = 2000;
const OPENING_KINDS = new Set(['door', 'window', 'opening']);
const REVIEWED_OPENING_USAGES = new Set([
  'primary_entrance',
  'secondary_exterior_door',
  'interior_door',
  'exterior_window',
  'interior_borrowed_light',
  'interior_passage',
]);
const OPENING_KINDS_BY_REVIEWED_USAGE = Object.freeze({
  primary_entrance: new Set(['door']),
  secondary_exterior_door: new Set(['door']),
  interior_door: new Set(['door']),
  exterior_window: new Set(['window']),
  interior_borrowed_light: new Set(['window']),
  interior_passage: new Set(['opening']),
});
const OPENING_HANDINGS_BY_KIND = Object.freeze({
  door: new Set(['left', 'right', 'double', 'sliding']),
  window: new Set(['none']),
  opening: new Set(['none']),
});
const WALKABLE_OPENING_KINDS = new Set(['door', 'opening']);
const EXTERIOR_PORTAL_USAGES = new Set(['primary_entrance', 'secondary_exterior_door']);
const EXTERIOR_OPENING_USAGES = new Set([...EXTERIOR_PORTAL_USAGES, 'exterior_window']);
const OPENING_WIDTH_LIMITS_MM = Object.freeze({
  door: [500, 2400],
  opening: [300, 6000],
  window: [200, 6000],
});
const OPENING_HEIGHT_LIMITS_MM = Object.freeze({
  door: [1800, 3000],
  opening: [1800, 6000],
  window: [200, 3000],
});
const SOURCE_ISSUES_REQUIRING_REVIEW = new Set([
  'DOOR_PROPOSED',
  'NO_ENTRANCE',
  'NO_OPENING',
  'OPENING_UNHOSTED',
  'UNREACHABLE',
]);
const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const finiteCoordinatePoint = (point) => Array.isArray(point) && point.length === 2
  && point.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));
const validLineWall = (wall) => wall?.path?.kind === 'line'
  && finiteCoordinatePoint(wall.path.start) && finiteCoordinatePoint(wall.path.end);

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

function pointAtParameter(start, end, parameter) {
  return [
    start[0] + (end[0] - start[0]) * parameter,
    start[1] + (end[1] - start[1]) * parameter,
  ];
}

function boundaryTouchesPoint(boundary, point) {
  if (!Array.isArray(boundary) || boundary.length < 3) return false;
  return boundary.some((start, index) => pointOnSegment(
    point,
    start,
    boundary[(index + 1) % boundary.length],
  ));
}

function completeOpeningSpanSamples(project, wall, spaces, start, end, storeyId) {
  const length = pointDistance(wall.path.start, wall.path.end);
  const toleranceRatio = length > 0 ? EPS_MM / length : 0;
  const breakpoints = [start, end];
  for (const space of spaces) {
    const roomStoreyId = storeyFor(project, space)?.id ?? space.storeyId ?? null;
    if (roomStoreyId !== storeyId) continue;
    for (const point of space.boundary || []) {
      if (!pointOnSegment(point, wall.path.start, wall.path.end)) continue;
      const parameter = parameterOnSegment(point, wall.path.start, wall.path.end);
      if (parameter > start + toleranceRatio && parameter < end - toleranceRatio) {
        breakpoints.push(parameter);
      }
    }
  }
  breakpoints.sort((left, right) => left - right);
  const unique = breakpoints.filter((value, index) => (
    index === 0 || value - breakpoints[index - 1] > toleranceRatio
  ));
  return unique.slice(0, -1).flatMap((left, index) => {
    const right = unique[index + 1];
    return right - left > toleranceRatio ? [(left + right) / 2] : [];
  });
}

function clusteredCoordinates(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const groups = [];
  for (const value of sorted) {
    const group = groups.at(-1);
    if (!group || value - group.at(-1) > EPS_MM) groups.push([value]);
    else group.push(value);
  }
  return groups.map((group) => group.reduce((sum, value) => sum + value, 0) / group.length);
}

function enclosedFloorCells(project, walls, spaces, storey) {
  const storeyWalls = walls.filter((wall) => storeyFor(project, wall)?.id === storey.id);
  const storeySpaces = spaces.filter((space) => (
    storeyFor(project, space)?.id === storey.id && !polygonProblem(space.boundary)
  ));
  const horizontal = [];
  const vertical = [];
  for (const wall of storeyWalls) {
    const [start, end] = [wall.path.start, wall.path.end];
    const dx = Math.abs(end[0] - start[0]);
    const dy = Math.abs(end[1] - start[1]);
    if (dy < EPS_MM && dx >= EPS_MM) {
      horizontal.push({
        axis: (start[1] + end[1]) / 2,
        minimum: Math.min(start[0], end[0]),
        maximum: Math.max(start[0], end[0]),
      });
    } else if (dx < EPS_MM && dy >= EPS_MM) {
      vertical.push({
        axis: (start[0] + end[0]) / 2,
        minimum: Math.min(start[1], end[1]),
        maximum: Math.max(start[1], end[1]),
      });
    }
  }
  const wallPoints = storeyWalls.flatMap((wall) => [wall.path.start, wall.path.end]);
  if (!wallPoints.length) return { enclosed: [], missing: [] };
  const rawX = wallPoints.map((point) => point[0]);
  const rawY = wallPoints.map((point) => point[1]);
  const minimumX = Math.min(...rawX); const maximumX = Math.max(...rawX);
  const minimumY = Math.min(...rawY); const maximumY = Math.max(...rawY);
  const padding = Math.max(1000, (maximumX - minimumX + maximumY - minimumY) * .05);
  const xs = clusteredCoordinates([minimumX - padding, ...rawX, maximumX + padding]);
  const ys = clusteredCoordinates([minimumY - padding, ...rawY, maximumY + padding]);
  const columnCount = xs.length - 1;
  const rowCount = ys.length - 1;
  if (columnCount < 1 || rowCount < 1) return { enclosed: [], missing: [] };

  const indexOf = (column, row) => row * columnCount + column;
  const cellOf = (index) => ({ column: index % columnCount, row: Math.floor(index / columnCount) });
  const verticalBarrier = (x, y) => vertical.some((wall) => (
    Math.abs(wall.axis - x) <= EPS_MM
      && y >= wall.minimum - EPS_MM && y <= wall.maximum + EPS_MM
  ));
  const horizontalBarrier = (y, x) => horizontal.some((wall) => (
    Math.abs(wall.axis - y) <= EPS_MM
      && x >= wall.minimum - EPS_MM && x <= wall.maximum + EPS_MM
  ));
  const outside = new Set();
  const queue = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      if (row !== 0 && row !== rowCount - 1 && column !== 0 && column !== columnCount - 1) continue;
      const index = indexOf(column, row);
      outside.add(index);
      queue.push(index);
    }
  }
  while (queue.length) {
    const { column, row } = cellOf(queue.shift());
    const xMid = (xs[column] + xs[column + 1]) / 2;
    const yMid = (ys[row] + ys[row + 1]) / 2;
    const neighbors = [
      { column: column - 1, row, blocked: () => verticalBarrier(xs[column], yMid) },
      { column: column + 1, row, blocked: () => verticalBarrier(xs[column + 1], yMid) },
      { column, row: row - 1, blocked: () => horizontalBarrier(ys[row], xMid) },
      { column, row: row + 1, blocked: () => horizontalBarrier(ys[row + 1], xMid) },
    ];
    for (const neighbor of neighbors) {
      if (neighbor.column < 0 || neighbor.column >= columnCount
        || neighbor.row < 0 || neighbor.row >= rowCount || neighbor.blocked()) continue;
      const neighborIndex = indexOf(neighbor.column, neighbor.row);
      if (!outside.has(neighborIndex)) {
        outside.add(neighborIndex);
        queue.push(neighborIndex);
      }
    }
  }

  const enclosed = [];
  const missing = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const index = indexOf(column, row);
      if (outside.has(index)) continue;
      const point = [(xs[column] + xs[column + 1]) / 2, (ys[row] + ys[row + 1]) / 2];
      const owners = storeySpaces.filter((space) => pointStrictlyInsidePolygon(point, space.boundary));
      const cell = { point, ownerIds: owners.map((space) => space.id) };
      enclosed.push(cell);
      if (owners.length !== 1) missing.push(cell);
    }
  }
  return { enclosed, missing };
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
  if (/item has invalid id/i.test(message)) return issue('GEOMETRY_IDENTIFIER_INVALID', message);
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

function polygonAreaM2(points) {
  return Math.abs(polygonTwiceArea(points)) / 2_000_000;
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
  if (item?.storeyId != null && item.storeyId !== '') {
    return storeys.find((storey) => storey.id === item.storeyId) || null;
  }
  return storeys.length === 1 ? storeys[0] : null;
}

function scaleStatus(project) {
  return project?.calibration?.status || project?.provenance?.scaleStatus || project?.scale?.status || null;
}

export function validateProjectTopology(project) {
  const basic = validateProject(project);
  const blocking = basic.errors.map(projectContractIssue);
  const warnings = [];
  const projectWalls = project?.geometry?.walls || [];
  const malformedLineWalls = projectWalls.filter((wall) => (
    wall.path?.kind === 'line' && !validLineWall(wall)
  ));
  if (malformedLineWalls.length) {
    blocking.push(issue(
      'WALL_PATH_COORDINATES_INVALID',
      `${malformedLineWalls.length} line wall(s) contain missing, non-numeric or non-finite coordinates.`,
      malformedLineWalls.map((wall) => wall.id),
    ));
  }
  const walls = projectWalls.filter(validLineWall);
  const wallIds = new Set(walls.map((wall) => wall.id));
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  if (!walls.length) blocking.push(issue('WALL_NETWORK_EMPTY', 'No line-wall geometry is available.'));

  const storeyIds = new Set((project?.storeys || []).map((storey) => storey.id));
  const invalidStoreyItems = ['walls', 'openings', 'spaces', 'columns', 'shafts', 'beams']
    .flatMap((group) => (project?.geometry?.[group] || []).filter((item) => (
      item.storeyId != null && item.storeyId !== '' && !storeyIds.has(item.storeyId)
    )).map((item) => item.id));
  if (invalidStoreyItems.length) {
    blocking.push(issue(
      'STOREY_REFERENCE_INVALID',
      `${invalidStoreyItems.length} geometry item(s) reference a missing storey.`,
      invalidStoreyItems,
    ));
  }

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
    if (space.name != null && typeof space.name !== 'string') {
      blocking.push(issue(
        'ROOM_NAME_INVALID',
        `Room ${String(space.id)} name must be text or null.`,
        [space.id],
      ));
    }
    const boundaryProblem = polygonProblem(space.boundary);
    if (boundaryProblem) {
      blocking.push(issue(
        'ROOM_BOUNDARY_UNVERIFIED',
        `Room ${space.id} ${boundaryProblem}.`,
        [space.id],
      ));
    } else {
      validSpaces.push(space);
      if (space.areaM2 != null) {
        if (typeof space.areaM2 !== 'number' || !Number.isFinite(space.areaM2)
          || space.areaM2 <= 0) {
          blocking.push(issue(
            'ROOM_AREA_INVALID',
            `Room ${space.id} stored area must be a finite positive number when supplied.`,
            [space.id],
          ));
        } else {
          const derivedAreaM2 = polygonAreaM2(space.boundary);
          const toleranceM2 = Math.max(0.01, derivedAreaM2 * 0.005);
          if (Math.abs(space.areaM2 - derivedAreaM2) > toleranceM2) {
            blocking.push(issue(
              'ROOM_AREA_INCONSISTENT',
              `Room ${space.id} stored area disagrees with its reviewed polygon.`,
              [space.id],
            ));
          }
        }
      }
      if (space.minDim != null
        && (typeof space.minDim !== 'number' || !Number.isFinite(space.minDim)
          || space.minDim <= 0)) {
        blocking.push(issue(
          'ROOM_MIN_DIMENSION_INVALID',
          `Room ${space.id} minimum dimension must be a finite positive number when supplied.`,
          [space.id],
        ));
      }
      if (space.labelSuspect != null && typeof space.labelSuspect !== 'boolean') {
        blocking.push(issue(
          'ROOM_LABEL_REVIEW_STATE_INVALID',
          `Room ${space.id} label-review state must be boolean when supplied.`,
          [space.id],
        ));
      }
      if (/BALCON|TERRACE|PATIO/i.test(space.name || '')) {
        const derivedMinDim = polygonMinimumAxisSpan(space.boundary);
        const effectiveMinDim = Number.isFinite(space.minDim)
          ? Math.min(space.minDim, derivedMinDim) : derivedMinDim;
        if (space.labelSuspect === true) {
          blocking.push(issue(
            'PARAPET_LABEL_UNVERIFIED',
            `Room ${space.id} has a structurally significant balcony label that remains suspect.`,
            [space.id],
          ));
        } else if (effectiveMinDim < 800) {
          blocking.push(issue(
            'PARAPET_GEOMETRY_UNVERIFIED',
            `Room ${space.id} is too narrow or insufficiently resolved for automatic parapet conversion.`,
            [space.id],
          ));
        }
      }
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

  const roomBoundaryWallIds = new Set(spaces.flatMap((space) => (
    Array.isArray(space?.wallIds) ? space.wallIds : []
  )));
  const wallsWithoutRoomBoundary = walls
    .filter((wall) => !roomBoundaryWallIds.has(wall.id))
    .map((wall) => wall.id);
  if (wallsWithoutRoomBoundary.length) {
    blocking.push(issue(
      'ROOM_WALL_COVERAGE_INCOMPLETE',
      `${wallsWithoutRoomBoundary.length} wall segment(s) are not assigned to any closed room boundary.`,
      wallsWithoutRoomBoundary,
    ));
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

  const projectWalls = project?.geometry?.walls || [];
  const walls = projectWalls.filter(validLineWall);
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  const openings = project?.geometry?.openings || [];
  const spaces = project?.geometry?.spaces || [];
  if ((project?.storeys || []).length !== 1) {
    blocking.push(issue(
      'MULTI_STOREY_SOLID_UNSUPPORTED',
      'The current corrected-3D solid compiler supports exactly one reviewed storey.',
      (project?.storeys || []).map((storey) => storey.id),
    ));
  }
  const unsupportedSolidItems = ['columns', 'shafts', 'beams']
    .flatMap((group) => (project?.geometry?.[group] || []).map((item) => item.id));
  if (unsupportedSolidItems.length) {
    blocking.push(issue(
      'UNSUPPORTED_SOLID_GEOMETRY',
      `${unsupportedSolidItems.length} column, shaft or beam item(s) require a dedicated solid compiler.`,
      unsupportedSolidItems,
    ));
  }
  const unsupportedPathWalls = projectWalls
    .filter((wall) => wall.path?.kind !== 'line')
    .map((wall) => wall.id);
  if (unsupportedPathWalls.length) {
    blocking.push(issue(
      'UNSUPPORTED_WALL_PATH',
      `${unsupportedPathWalls.length} wall path(s) require a non-linear solid compiler.`,
      unsupportedPathWalls,
    ));
  }
  const legacyVoidWalls = walls.filter((wall) => wall.isVoid).map((wall) => wall.id);
  if (legacyVoidWalls.length) {
    blocking.push(issue(
      'LEGACY_VOID_WALL_UNSUPPORTED',
      `${legacyVoidWalls.length} legacy void wall(s) would remove an entire host wall without an authoritative opening interval.`,
      legacyVoidWalls,
    ));
  }
  const diagonalWalls = walls.filter((wall) => {
    const dx = Math.abs(wall.path.end[0] - wall.path.start[0]);
    const dy = Math.abs(wall.path.end[1] - wall.path.start[1]);
    return dx >= EPS_MM && dy >= EPS_MM;
  }).map((wall) => wall.id);
  if (diagonalWalls.length) {
    blocking.push(issue(
      'UNSUPPORTED_WALL_ORIENTATION',
      `${diagonalWalls.length} diagonal wall(s) require the oriented solid mesher.`,
      diagonalWalls,
    ));
  }

  const compilerWalls = walls.map((wall) => ({
    id: wall.id,
    a: wall.path.start,
    b: wall.path.end,
    thickness: wall.thickness,
    type: wall.structuralClass,
    void: !!wall.isVoid,
  }));
  if (!openings.some((opening) => opening.kind === 'door')) {
    blocking.push(issue('DOOR_SET_EMPTY', 'No reviewed canonical door opening is available for the 3D revision.'));
  }
  if (!openings.some((opening) => opening.kind === 'window')) {
    blocking.push(issue('WINDOW_SET_EMPTY', 'No reviewed window opening is available for the 3D revision.'));
  }
  const unsupportedOpeningIds = openings
    .filter((opening) => opening.kind === 'sliding')
    .map((opening) => opening.id);
  if (unsupportedOpeningIds.length) {
    blocking.push(issue(
      'UNSUPPORTED_OPENING_SOLID',
      `${unsupportedOpeningIds.length} sliding opening(s) require the sliding-panel solid builder.`,
      unsupportedOpeningIds,
    ));
  }
  const parapetOpeningIds = openings.filter((opening) => {
    const wall = wallById.get(opening.wallId);
    return wall && isParapetHostWall(wall, spaces);
  }).map((opening) => opening.id);
  if (parapetOpeningIds.length) {
    blocking.push(issue(
      'PARAPET_OPENING_CONFLICT',
      `${parapetOpeningIds.length} opening(s) are hosted by a wall that the current builder lowers to a parapet.`,
      parapetOpeningIds,
    ));
  }
  for (const storey of project?.storeys || []) {
    const storeyWalls = walls.filter((wall) => storeyFor(project, wall)?.id === storey.id);
    const coordinates = storeyWalls.flatMap((wall) => [wall.path.start, wall.path.end]);
    const derivedEnvelope = coordinates.length ? [
      Math.max(...coordinates.map((point) => point[0])) - Math.min(...coordinates.map((point) => point[0])),
      Math.max(...coordinates.map((point) => point[1])) - Math.min(...coordinates.map((point) => point[1])),
    ] : null;
    if (storey.envelope != null) {
      if (!Array.isArray(storey.envelope) || storey.envelope.length !== 2
        || !storey.envelope.every((value) => typeof value === 'number'
          && Number.isFinite(value) && value > 0)) {
        blocking.push(issue(
          'STOREY_ENVELOPE_INVALID',
          `Storey ${String(storey.id)} envelope must contain exactly two finite positive millimetre dimensions.`,
          [storey.id],
        ));
      } else if (derivedEnvelope && storey.envelope.some((value, index) => (
        Math.abs(value - derivedEnvelope[index]) > EPS_MM
      ))) {
        blocking.push(issue(
          'STOREY_ENVELOPE_INCONSISTENT',
          `Storey ${String(storey.id)} envelope disagrees with its reviewed wall bounds.`,
          [storey.id],
        ));
      }
    }
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
    if (!Number.isFinite(wall.thickness) || wall.thickness < 50 || wall.thickness > 1000) {
      blocking.push(issue(
        'WALL_THICKNESS_INVALID',
        `Wall ${wall.id} thickness must remain within the compiler's unmodified 50–1000 mm range.`,
        [wall.id],
      ));
    }
    if (pointDistance(wall.path.start, wall.path.end) < 20) {
      blocking.push(issue(
        'WALL_LENGTH_UNBUILDABLE',
        `Wall ${wall.id} is shorter than the solid compiler's 20 mm render threshold.`,
        [wall.id],
      ));
    }
    if (!Number.isInteger(wall.height) || !storey || wall.height !== storey.height) {
      blocking.push(issue(
        'WALL_HEIGHT_UNVERIFIED',
        `Wall ${wall.id} height does not match a confirmed storey ceiling height.`,
        [wall.id, ...(storey ? [storey.id] : [])],
      ));
    }
  }
  for (const storey of project?.storeys || []) {
    const domain = enclosedFloorCells(project, walls, spaces, storey);
    if (!domain.enclosed.length || domain.missing.length) {
      blocking.push(issue(
        'ROOM_FLOOR_DOMAIN_INCOMPLETE',
        domain.enclosed.length
          ? `${domain.missing.length} enclosed floor cell(s) are not owned by exactly one reviewed room.`
          : `Storey ${storey.id} has no completely enclosed floor domain.`,
        [storey.id, ...domain.missing.map((cell) => (
          `cell:${Math.round(cell.point[0])},${Math.round(cell.point[1])}`
        ))],
      ));
    }
  }
  for (const opening of openings) {
    const wall = wallById.get(opening.wallId);
    const head = Number(opening.sill) + Number(opening.height);
    const [kindMinimumHeight, maximumHeight] = OPENING_HEIGHT_LIMITS_MM[opening.kind] || [100, 6000];
    const minimumHeight = WALKABLE_OPENING_KINDS.has(opening.kind)
      ? Math.max(kindMinimumHeight, MIN_NAVIGABLE_PORTAL_HEIGHT_MM)
      : kindMinimumHeight;
    if (!Number.isInteger(opening.height) || opening.height < minimumHeight
      || opening.height > maximumHeight
      || !Number.isInteger(opening.sill) || opening.sill < 0
      || !wall || !Number.isInteger(wall.height) || head > wall.height
      || (WALKABLE_OPENING_KINDS.has(opening.kind) && opening.sill !== 0)) {
      blocking.push(issue(
        'OPENING_VERTICAL_DIMENSIONS_INVALID',
        `Opening ${opening.id} needs a buildable ${minimumHeight}–${maximumHeight} mm height, valid sill and head below its host-wall ceiling.`,
        [opening.id, ...(opening.wallId ? [opening.wallId] : [])],
      ));
    }

    const reviewedUsage = opening.reviewedUsage || 'unspecified';
    if (!REVIEWED_OPENING_USAGES.has(reviewedUsage)) {
      blocking.push(issue(
        'OPENING_USAGE_UNREVIEWED',
        `Opening ${opening.id} has no supported reviewed portal/window role.`,
        [opening.id],
      ));
    } else {
      const compatibleKinds = OPENING_KINDS_BY_REVIEWED_USAGE[reviewedUsage];
      if (!compatibleKinds?.has(opening.kind)) {
        blocking.push(issue(
          'OPENING_USAGE_KIND_MISMATCH',
          `Opening ${opening.id} kind ${String(opening.kind)} cannot represent reviewed role ${reviewedUsage}.`,
          [opening.id],
        ));
      }
    }
    const compatibleHandings = OPENING_HANDINGS_BY_KIND[opening.kind];
    if (compatibleHandings && !compatibleHandings.has(opening.handing)) {
      blocking.push(issue(
        'OPENING_HANDING_INVALID',
        `Opening ${opening.id} requires a reviewed operation compatible with kind ${String(opening.kind)}.`,
        [opening.id],
      ));
    }

    const start = opening.span?.startRatio;
    const end = opening.span?.endRatio;
    if (wall && Number.isFinite(start) && Number.isFinite(end) && start < end) {
      const wallLength = pointDistance(wall.path.start, wall.path.end);
      const derivedWidth = wallLength * (end - start);
      const [kindMinimumWidth, maximumWidth] = OPENING_WIDTH_LIMITS_MM[opening.kind] || [300, 6000];
      const functionalMinimumWidth = reviewedUsage === 'primary_entrance'
        ? MIN_PRIMARY_ENTRANCE_WIDTH_MM
        : (WALKABLE_OPENING_KINDS.has(opening.kind) ? MIN_NAVIGABLE_PORTAL_WIDTH_MM : 0);
      const minimumWidth = Math.max(kindMinimumWidth, functionalMinimumWidth);
      if (derivedWidth < minimumWidth - EPS_MM || derivedWidth > maximumWidth + EPS_MM) {
        blocking.push(issue(
          'OPENING_WIDTH_UNBUILDABLE',
          `Opening ${opening.id} is ${Math.round(derivedWidth)} mm wide; ${opening.kind} requires ${minimumWidth}–${maximumWidth} mm.`,
          [opening.id, wall.id],
        ));
      }
      if (opening.span?.width != null && !Number.isFinite(opening.span.width)) {
        blocking.push(issue(
          'OPENING_WIDTH_INVALID',
          `Opening ${opening.id} stored width must be a finite number when supplied.`,
          [opening.id, wall.id],
        ));
      } else if (Number.isFinite(opening.span?.width)
        && Math.abs(opening.span.width - derivedWidth) > EPS_MM) {
        blocking.push(issue(
          'OPENING_WIDTH_INCONSISTENT',
          `Opening ${opening.id} stored width disagrees with its host-wall interval.`,
          [opening.id, wall.id],
        ));
      }

    }
  }

  try {
    const compiledSegments = compileWallOpeningSegments(compilerWalls, openings.map((opening) => ({
      id: opening.id,
      wall: opening.wallId,
      t0: opening.span?.startRatio,
      t1: opening.span?.endRatio,
      kind: opening.kind,
      height: opening.height,
      sill: opening.sill,
    })));
    const subThresholdSegments = compiledSegments.filter((segment) => (
      segment.segmentKind === 'solid'
        && pointDistance(segment.a, segment.b) < 20
    ));
    if (subThresholdSegments.length) {
      blocking.push(issue(
        'SOLID_SEGMENT_BELOW_RENDER_THRESHOLD',
        `${subThresholdSegments.length} positive wall remainder(s) would be silently skipped below 20 mm.`,
        subThresholdSegments.map((segment) => segment.id),
      ));
    }
  } catch (error) {
    blocking.push(issue(
      'SOLID_INTERVAL_DRY_RUN_FAILED',
      `The exact wall-opening compiler rejected this revision: ${error instanceof Error ? error.message : 'unknown interval failure'}`,
      [...walls.map((wall) => wall.id), ...openings.map((opening) => opening.id)],
    ));
  }

  const primaryEntrances = openings.filter((opening) => (
    opening.reviewedUsage === 'primary_entrance'
  ));
  if (primaryEntrances.length !== 1) {
    blocking.push(issue(
      'PRIMARY_ENTRANCE_NOT_UNIQUE',
      `Exactly one reviewed primary entrance is required; found ${primaryEntrances.length}.`,
      primaryEntrances.map((opening) => opening.id),
    ));
  }

  const roomIds = new Set(spaces.map((space) => space.id));
  const roomAdjacency = new Map([...roomIds].map((roomId) => [roomId, new Set()]));
  let entranceRoomId = null;
  for (const opening of openings) {
    const wall = wallById.get(opening.wallId);
    const start = opening.span?.startRatio;
    const end = opening.span?.endRatio;
    if (!wall || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;
    const storeyId = storeyFor(project, opening)?.id ?? opening.storeyId ?? null;
    const roomIdsAtParameter = (parameter) => spaces.filter((space) => {
      const roomStoreyId = storeyFor(project, space)?.id ?? space.storeyId ?? null;
      const point = pointAtParameter(wall.path.start, wall.path.end, parameter);
      return roomStoreyId === storeyId && boundaryTouchesPoint(space.boundary, point);
    }).map((space) => space.id).sort();
    const sampleParameters = completeOpeningSpanSamples(
      project, wall, spaces, start, end, storeyId,
    );
    const sampledRoomIds = sampleParameters.map(roomIdsAtParameter);
    const touchingRoomIds = sampledRoomIds[0] || [];
    const stableSides = sampledRoomIds.every((ids) => (
      JSON.stringify(ids) === JSON.stringify(touchingRoomIds)
    ));
    const exteriorOpening = EXTERIOR_OPENING_USAGES.has(opening.reviewedUsage);
    const expectedSides = exteriorOpening ? 1 : 2;
    if (!stableSides || touchingRoomIds.length !== expectedSides) {
      blocking.push(issue(
        'OPENING_ROOM_SIDES_INVALID',
        `Opening ${opening.id} does not stay on exactly ${expectedSides} reviewed room boundary side(s) across its full host span.`,
        [opening.id, ...new Set(sampledRoomIds.flat())],
      ));
      continue;
    }
    if (!WALKABLE_OPENING_KINDS.has(opening.kind)) continue;
    if (opening.reviewedUsage === 'primary_entrance') entranceRoomId = touchingRoomIds[0];
    if (!EXTERIOR_PORTAL_USAGES.has(opening.reviewedUsage)) {
      roomAdjacency.get(touchingRoomIds[0])?.add(touchingRoomIds[1]);
      roomAdjacency.get(touchingRoomIds[1])?.add(touchingRoomIds[0]);
    }
  }
  const reachableRooms = new Set(entranceRoomId ? [entranceRoomId] : []);
  const roomQueue = entranceRoomId ? [entranceRoomId] : [];
  while (roomQueue.length) {
    for (const neighbor of roomAdjacency.get(roomQueue.shift()) || []) {
      if (!reachableRooms.has(neighbor)) {
        reachableRooms.add(neighbor);
        roomQueue.push(neighbor);
      }
    }
  }
  const unreachableRooms = spaces
    .filter((space) => !reachableRooms.has(space.id))
    .map((space) => space.id);
  if (unreachableRooms.length) {
    blocking.push(issue(
      'ROOMS_UNREACHABLE_FROM_ENTRANCE',
      `${unreachableRooms.length} room(s) are not reachable through reviewed portals from the primary entrance.`,
      unreachableRooms,
    ));
  }
  return { ok: blocking.length === 0 && warnings.length === 0, blocking, warnings };
}
