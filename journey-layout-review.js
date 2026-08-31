// Exact, geometry-bound furnishing review projection.
//
// This module deliberately returns only measured primitives that the browser can draw itself.
// It never copies source-upload URLs, signed artifact URLs, customer notes or asset media into
// the preview model. The service remains authoritative; this is a review aid, not a new layout.

export const LAYOUT_REVIEW_PREVIEW_SCHEMA = 'hnm-layout-review-preview/1';

const HASH = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL = /[\u0000-\u001f\u007f]/;
const MAX_COORDINATE_MM = 10_000_000;
const OPENING_OPERATIONS = Object.freeze({
  door: new Set(['left', 'right', 'double', 'sliding']),
  window: new Set(['none']),
  opening: new Set(['none']),
});
const OPENING_USAGES = Object.freeze({
  door: new Set(['primary_entrance', 'secondary_exterior_door', 'interior_door']),
  window: new Set(['exterior_window', 'interior_borrowed_light']),
  opening: new Set(['interior_passage']),
});

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message) {
  throw new TypeError(`Furnishing preview unavailable: ${message}`);
}

function exactId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} is invalid.`);
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${label} is not a SHA-256 digest.`);
  return value;
}

function version(value, label) {
  if (!Number.isInteger(value) || value < 1) fail(`${label} is not a positive version.`);
  return value;
}

function coordinate(value, label) {
  if (!Number.isInteger(value) || Math.abs(value) > MAX_COORDINATE_MM) {
    fail(`${label} is outside the supported millimetre range.`);
  }
  return value;
}

function positiveMeasure(value, label, maximum = MAX_COORDINATE_MM) {
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    fail(`${label} is outside the supported millimetre range.`);
  }
  return value;
}

function displayText(value, fallback, label) {
  const text = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  if (typeof text !== 'string' || text.length > 120 || CONTROL.test(text)) {
    fail(`${label} is not safe display text.`);
  }
  return text;
}

function point(value, label) {
  if (!record(value)) fail(`${label} is missing.`);
  return Object.freeze({
    x: coordinate(value.x, `${label}.x`),
    y: coordinate(value.y, `${label}.y`),
  });
}

function polygonArea(boundary) {
  return boundary.reduce((sum, current, index) => {
    const next = boundary[(index + 1) % boundary.length];
    return sum + current.x * next.y - next.x * current.y;
  }, 0) / 2;
}

function pointOnSegment(candidate, start, end) {
  const cross = (candidate.x - start.x) * (end.y - start.y)
    - (candidate.y - start.y) * (end.x - start.x);
  if (Math.abs(cross) > 1e-6) return false;
  const dot = (candidate.x - start.x) * (candidate.x - end.x)
    + (candidate.y - start.y) * (candidate.y - end.y);
  return dot <= 1e-6;
}

function pointInOrOnPolygon(candidate, boundary) {
  let inside = false;
  for (let index = 0, prior = boundary.length - 1; index < boundary.length; prior = index++) {
    const start = boundary[prior];
    const end = boundary[index];
    if (pointOnSegment(candidate, start, end)) return true;
    const crosses = (start.y > candidate.y) !== (end.y > candidate.y)
      && candidate.x < ((end.x - start.x) * (candidate.y - start.y))
        / (end.y - start.y) + start.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function orientation(first, second, third) {
  return (second.x - first.x) * (third.y - first.y)
    - (second.y - first.y) * (third.x - first.x);
}

function properlyIntersects(firstStart, firstEnd, secondStart, secondEnd) {
  const firstA = orientation(firstStart, firstEnd, secondStart);
  const firstB = orientation(firstStart, firstEnd, secondEnd);
  const secondA = orientation(secondStart, secondEnd, firstStart);
  const secondB = orientation(secondStart, secondEnd, firstEnd);
  return firstA * firstB < 0 && secondA * secondB < 0;
}

function rectangleContainedByRoom(corners, boundary) {
  if (!corners.every((candidate) => pointInOrOnPolygon(candidate, boundary))) return false;
  const centre = {
    x: corners.reduce((sum, item) => sum + item.x, 0) / corners.length,
    y: corners.reduce((sum, item) => sum + item.y, 0) / corners.length,
  };
  if (!pointInOrOnPolygon(centre, boundary)) return false;
  const rectangleEdges = corners.map((start, index) => [start, corners[(index + 1) % corners.length]]);
  const roomEdges = boundary.map((start, index) => [start, boundary[(index + 1) % boundary.length]]);
  return !rectangleEdges.some(([rectangleStart, rectangleEnd]) => roomEdges.some(
    ([roomStart, roomEnd]) => properlyIntersects(rectangleStart, rectangleEnd, roomStart, roomEnd),
  ));
}

function unique(items, key, label) {
  const ids = items.map((item) => exactId(item?.[key], `${label} ID`));
  if (new Set(ids).size !== ids.length) fail(`${label} IDs are not unique.`);
  return ids;
}

function reviewedRooms(geometry) {
  if (!Array.isArray(geometry.rooms) || geometry.rooms.length === 0) fail('no canonical rooms were supplied.');
  unique(geometry.rooms, 'id', 'room');
  return geometry.rooms.map((source) => {
    if (!Array.isArray(source.boundary) || source.boundary.length < 3) {
      fail(`room ${source.id} has no closed boundary.`);
    }
    const boundary = source.boundary.map((value, index) => point(value, `room ${source.id} boundary ${index}`));
    if (Math.abs(polygonArea(boundary)) < 1) fail(`room ${source.id} has zero area.`);
    return Object.freeze({
      id: source.id,
      name: displayText(source.name, source.id, `room ${source.id} name`),
      function: displayText(source.function, 'unspecified', `room ${source.id} function`),
      boundary: Object.freeze(boundary),
    });
  });
}

function reviewedWalls(geometry) {
  if (!Array.isArray(geometry.walls) || geometry.walls.length === 0) fail('no canonical walls were supplied.');
  unique(geometry.walls, 'id', 'wall');
  return geometry.walls.map((source) => {
    const start = point(source.start, `wall ${source.id} start`);
    const end = point(source.end, `wall ${source.id} end`);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length < 1) fail(`wall ${source.id} has zero length.`);
    return Object.freeze({
      id: source.id,
      start,
      end,
      length,
      thickness: positiveMeasure(source.thickness, `wall ${source.id} thickness`, 2_000),
      kind: displayText(source.kind, 'unknown', `wall ${source.id} kind`),
    });
  });
}

function reviewedOpenings(geometry, walls) {
  if (!Array.isArray(geometry.openings)) fail('canonical openings are missing.');
  unique(geometry.openings, 'id', 'opening');
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  return geometry.openings.map((source) => {
    const wallId = exactId(source.wall_id, `opening ${source.id} host wall`);
    const wall = wallById.get(wallId);
    if (!wall) fail(`opening ${source.id} references an unknown host wall.`);
    const offset = coordinate(source.offset, `opening ${source.id} offset`);
    const width = positiveMeasure(source.width, `opening ${source.id} width`);
    if (offset < 0 || offset + width > wall.length + 1e-6) {
      fail(`opening ${source.id} falls outside its host wall.`);
    }
    if (!['door', 'window', 'opening'].includes(source.kind)) {
      fail(`opening ${source.id} has an unsupported kind.`);
    }
    const swing = source.swing;
    if (!OPENING_OPERATIONS[source.kind].has(swing)) {
      fail(`opening ${source.id} has an operation incompatible with its kind.`);
    }
    const reviewedUsage = source.reviewed_usage ?? source.reviewedUsage;
    if (!OPENING_USAGES[source.kind].has(reviewedUsage)) {
      fail(`opening ${source.id} has an unreviewed or incompatible portal role.`);
    }
    const directionX = (wall.end.x - wall.start.x) / wall.length;
    const directionY = (wall.end.y - wall.start.y) / wall.length;
    return Object.freeze({
      id: source.id,
      wallId,
      kind: source.kind,
      swing,
      reviewedUsage,
      thickness: wall.thickness,
      start: Object.freeze({
        x: wall.start.x + directionX * offset,
        y: wall.start.y + directionY * offset,
      }),
      end: Object.freeze({
        x: wall.start.x + directionX * (offset + width),
        y: wall.start.y + directionY * (offset + width),
      }),
    });
  });
}

function reviewedPlacements(option, rooms) {
  if (!Array.isArray(option.placements) || option.placements.length === 0) {
    fail(`layout ${option.layoutId} has no measured placements.`);
  }
  unique(option.placements, 'placementId', 'placement');
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return option.placements.map((source) => {
    const placementId = exactId(source.placementId, 'placement');
    const assetId = exactId(source.assetId, `placement ${placementId} asset`);
    const roomId = exactId(source.roomId, `placement ${placementId} room`);
    const room = roomById.get(roomId);
    if (!room) fail(`placement ${placementId} references an unknown room.`);
    const x = coordinate(source.x, `placement ${placementId} x`);
    const y = coordinate(source.y, `placement ${placementId} y`);
    const width = positiveMeasure(source.width, `placement ${placementId} width`);
    const depth = positiveMeasure(source.depth, `placement ${placementId} depth`);
    const height = positiveMeasure(source.height, `placement ${placementId} height`);
    const clearance = coordinate(source.clearance, `placement ${placementId} clearance`);
    if (clearance < 0) fail(`placement ${placementId} clearance cannot be negative.`);
    if (source.z !== 0 || source.rotationDegrees !== 0) {
      fail(`placement ${placementId} has no verified axis-aligned floor footprint.`);
    }
    const corners = [
      { x, y }, { x: x + width, y },
      { x: x + width, y: y + depth }, { x, y: y + depth },
    ];
    if (!rectangleContainedByRoom(corners, room.boundary)) {
      fail(`placement ${placementId} is not contained by room ${roomId}.`);
    }
    return Object.freeze({
      placementId,
      assetId,
      roomId,
      x,
      y,
      width,
      depth,
      height,
      clearance,
    });
  });
}

function previewBounds(walls, rooms) {
  const points = [
    ...walls.flatMap((wall) => [wall.start, wall.end]),
    ...rooms.flatMap((room) => room.boundary),
  ];
  const minX = Math.min(...points.map((item) => item.x));
  const maxX = Math.max(...points.map((item) => item.x));
  const minY = Math.min(...points.map((item) => item.y));
  const maxY = Math.max(...points.map((item) => item.y));
  if (![minX, maxX, minY, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) {
    fail('canonical geometry has no drawable whole-unit bounds.');
  }
  return Object.freeze({ minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY });
}

/**
 * Build a minimal projection for one exact service layout option.
 * Throws on any stale source, approval gap, unsafe option or undrawable placement.
 */
export function buildLayoutReviewPreview({ projectId, geometryReview, layoutSet, layoutId } = {}) {
  exactId(projectId, 'project');
  if (!record(geometryReview) || geometryReview.projectId !== projectId) {
    fail('approved geometry belongs to another project or is missing.');
  }
  if (geometryReview.approvalStatus !== 'approved') fail('geometry is not approved.');
  const geometryVersion = version(geometryReview.geometryVersion, 'geometry');
  const geometrySha256 = digest(geometryReview.geometrySha256, 'geometry');
  if (!record(geometryReview.validation)
    || geometryReview.validation.valid !== true
    || !Array.isArray(geometryReview.validation.issues)
    || geometryReview.validation.issues.length !== 0
    || geometryReview.validation.whole_unit_topology?.ready_for_whole_unit_3d !== true) {
    fail('approved geometry no longer passes whole-unit validation.');
  }
  const geometry = geometryReview.geometry;
  if (!record(geometry) || geometry.units !== 'mm'
    || (geometry.project_id !== undefined && geometry.project_id !== projectId)
    || (geometry.revision !== undefined && geometry.revision !== geometryVersion)) {
    fail('canonical geometry identity or units do not match its review envelope.');
  }

  if (!record(layoutSet)) fail('layout option set is missing.');
  const optionSetVersion = version(layoutSet.optionSetVersion, 'layout option set');
  const optionSetSha256 = digest(layoutSet.optionSetSha256, 'layout option set');
  if (!record(layoutSet.sourceReferences)
    || layoutSet.sourceReferences.geometryVersion !== geometryVersion
    || layoutSet.sourceReferences.geometrySha256 !== geometrySha256) {
    fail('layout options are stale against the approved geometry.');
  }
  const designBriefVersion = version(layoutSet.sourceReferences.designBriefVersion, 'design brief');
  const designBriefSha256 = digest(layoutSet.sourceReferences.designBriefSha256, 'design brief');
  if (!Array.isArray(layoutSet.options) || !Array.isArray(layoutSet.safeLayoutIds)) {
    fail('layout option evidence is incomplete.');
  }
  unique(layoutSet.options, 'layoutId', 'layout');
  if (new Set(layoutSet.safeLayoutIds).size !== layoutSet.safeLayoutIds.length
    || !layoutSet.safeLayoutIds.every((value) => typeof value === 'string' && SAFE_ID.test(value))) {
    fail('safe-layout ledger is invalid.');
  }
  exactId(layoutId, 'layout');
  const options = layoutSet.options.filter((item) => item.layoutId === layoutId);
  if (options.length !== 1 || !layoutSet.safeLayoutIds.includes(layoutId)) {
    fail(`layout ${layoutId} is not uniquely service-approved for review.`);
  }
  const option = options[0];
  const layoutSha256 = digest(option.layoutSha256, `layout ${layoutId}`);
  if (typeof layoutSet.assetLibraryVersion !== 'string' || !layoutSet.assetLibraryVersion
    || option.assetLibraryVersion !== layoutSet.assetLibraryVersion) {
    fail(`layout ${layoutId} is not bound to the current measured asset library.`);
  }
  const validation = option.validation;
  if (!record(validation)
    || validation.feasible !== true
    || !Array.isArray(validation.hardConstraintViolations)
    || validation.hardConstraintViolations.length !== 0
    || validation.doorSwingCheck !== 'passed'
    || validation.circulationCheck !== 'passed') {
    fail(`layout ${layoutId} does not pass every hard service gate.`);
  }

  const rooms = reviewedRooms(geometry);
  const walls = reviewedWalls(geometry);
  const openings = reviewedOpenings(geometry, walls);
  const placements = reviewedPlacements(option, rooms);

  return Object.freeze({
    schema: LAYOUT_REVIEW_PREVIEW_SCHEMA,
    projectId,
    optionSetVersion,
    optionSetSha256,
    layoutId,
    layoutSha256,
    assetLibraryVersion: layoutSet.assetLibraryVersion,
    source: Object.freeze({
      geometryVersion,
      geometrySha256,
      designBriefVersion,
      designBriefSha256,
    }),
    bounds: previewBounds(walls, rooms),
    rooms: Object.freeze(rooms),
    walls: Object.freeze(walls),
    openings: Object.freeze(openings),
    placements: Object.freeze(placements),
  });
}
