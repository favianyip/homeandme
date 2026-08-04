// Deterministic correction operations for hnm-project/1.
//
// The editor may use any canvas framework. This module is the authoritative mutation boundary:
// every gesture becomes a serialisable operation, is applied to an immutable project snapshot,
// increments the revision, and is rejected if it breaks project references.

import { validateProject } from './journey-project.js';

const clone = (value) => structuredClone(value);
const finitePoint = (value) => Array.isArray(value) && value.length === 2
  && value.every(Number.isFinite);

function findById(items, id, label) {
  const item = (items || []).find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${label} ${id} does not exist.`);
  return item;
}

function ensureUniqueGeometryId(project, id) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Geometry IDs must be non-empty strings.');
  for (const group of ['walls', 'openings', 'spaces', 'columns', 'shafts', 'beams']) {
    if ((project.geometry?.[group] || []).some((item) => item.id === id)) {
      throw new Error(`Geometry ID ${id} already exists.`);
    }
  }
}

function validateLineWall(wall) {
  if (wall?.path?.kind !== 'line') throw new Error('Only line walls are editable in this release.');
  if (!finitePoint(wall.path.start) || !finitePoint(wall.path.end)) {
    throw new Error('Wall endpoints must be finite [x, y] points.');
  }
  if (wall.path.start[0] === wall.path.end[0] && wall.path.start[1] === wall.path.end[1]) {
    throw new Error('A wall must have non-zero length.');
  }
}

function moveWallEndpoint(project, operation) {
  const wall = findById(project.geometry.walls, operation.wallId, 'Wall');
  if (wall.path?.kind !== 'line') throw new Error('Only line wall endpoints are editable in this release.');
  if (!['start', 'end'].includes(operation.endpoint)) throw new Error('Wall endpoint must be start or end.');
  if (!finitePoint(operation.point)) throw new Error('Wall endpoint must be a finite [x, y] point.');

  const oldPoint = wall.path[operation.endpoint];
  wall.path[operation.endpoint] = [...operation.point];

  // A detected junction is represented by coincident endpoints. Moving it as a unit prevents
  // tiny editor cracks and preserves room topology. Alt/option-style detached edits set false.
  if (operation.propagateJunction !== false) {
    for (const candidate of project.geometry.walls || []) {
      if (candidate.id === wall.id || candidate.path?.kind !== 'line') continue;
      for (const endpoint of ['start', 'end']) {
        const point = candidate.path[endpoint];
        if (point[0] === oldPoint[0] && point[1] === oldPoint[1]) {
          candidate.path[endpoint] = [...operation.point];
        }
      }
    }
  }
}

function addWall(project, operation) {
  const wall = clone(operation.wall);
  ensureUniqueGeometryId(project, wall?.id);
  validateLineWall(wall);
  project.geometry.walls.push(wall);
}

function acceptWall(project, operation) {
  const wall = findById(project.geometry.walls, operation.wallId, 'Wall');
  wall.accepted = true;
}

function deleteWall(project, operation) {
  const wall = findById(project.geometry.walls, operation.wallId, 'Wall');
  const hosted = (project.geometry.openings || []).filter((opening) => opening.wallId === wall.id);
  const referencedSpaces = (project.geometry.spaces || [])
    .filter((space) => (space.wallIds || []).includes(wall.id));
  if (hosted.length || referencedSpaces.length) {
    throw new Error('Delete or reassign hosted openings and room references before deleting this wall.');
  }
  project.geometry.walls = project.geometry.walls.filter((candidate) => candidate.id !== wall.id);
}

function splitWall(project, operation) {
  const wall = findById(project.geometry.walls, operation.wallId, 'Wall');
  validateLineWall(wall);
  ensureUniqueGeometryId(project, operation.newWallId);
  if (!finitePoint(operation.point)) throw new Error('Split point must be a finite [x, y] point.');

  const [x1, y1] = wall.path.start;
  const [x2, y2] = wall.path.end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = ((operation.point[0] - x1) * dx + (operation.point[1] - y1) * dy) / lengthSquared;
  const projected = [x1 + ratio * dx, y1 + ratio * dy];
  const distance = Math.hypot(projected[0] - operation.point[0], projected[1] - operation.point[1]);
  if (distance > 1 || ratio <= 0.01 || ratio >= 0.99) {
    throw new Error('Split point must lie on the wall and away from its endpoints.');
  }

  const hosted = (project.geometry.openings || []).filter((opening) => opening.wallId === wall.id);
  for (const opening of hosted) {
    const start = opening.span?.startRatio;
    const end = opening.span?.endRatio;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`Opening ${opening.id} has no valid hosted span.`);
    }
    if (start < ratio && end > ratio) {
      throw new Error(`Opening ${opening.id} crosses the requested wall split.`);
    }
  }

  const splitPoint = projected.map((value) => +value.toFixed(4));
  const newWall = clone(wall);
  newWall.id = operation.newWallId;
  newWall.path.start = splitPoint;
  newWall.path.end = [x2, y2];
  wall.path.end = splitPoint;
  project.geometry.walls.push(newWall);

  for (const opening of hosted) {
    const start = opening.span.startRatio;
    const end = opening.span.endRatio;
    if (end <= ratio) {
      opening.span.startRatio = start / ratio;
      opening.span.endRatio = end / ratio;
    } else {
      opening.wallId = newWall.id;
      opening.span.startRatio = (start - ratio) / (1 - ratio);
      opening.span.endRatio = (end - ratio) / (1 - ratio);
    }
  }
  for (const space of project.geometry.spaces || []) {
    if (!Array.isArray(space.wallIds) || !space.wallIds.includes(wall.id)) continue;
    space.wallIds = space.wallIds.flatMap((id) => id === wall.id ? [wall.id, newWall.id] : [id]);
  }
}

function updateOpening(project, operation) {
  const opening = findById(project.geometry.openings, operation.openingId, 'Opening');
  if (operation.wallId !== undefined) {
    findById(project.geometry.walls, operation.wallId, 'Wall');
    opening.wallId = operation.wallId;
  }
  if (operation.startRatio !== undefined || operation.endRatio !== undefined) {
    const start = operation.startRatio ?? opening.span?.startRatio;
    const end = operation.endRatio ?? opening.span?.endRatio;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end) {
      throw new Error('Opening span ratios must satisfy 0 <= start < end <= 1.');
    }
    opening.span = { ...(opening.span || {}), startRatio: start, endRatio: end };
  }
  for (const key of ['kind', 'height', 'sill', 'handing', 'assetId', 'accepted']) {
    if (operation[key] !== undefined) opening[key] = operation[key];
  }
}

function addOpening(project, operation) {
  const opening = clone(operation.opening);
  ensureUniqueGeometryId(project, opening?.id);
  findById(project.geometry.walls, opening?.wallId, 'Wall');
  const start = opening?.span?.startRatio;
  const end = opening?.span?.endRatio;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end) {
    throw new Error('Opening span ratios must satisfy 0 <= start < end <= 1.');
  }
  project.geometry.openings.push(opening);
}

function deleteOpening(project, operation) {
  findById(project.geometry.openings, operation.openingId, 'Opening');
  project.geometry.openings = project.geometry.openings
    .filter((opening) => opening.id !== operation.openingId);
}

function renameSpace(project, operation) {
  const space = findById(project.geometry.spaces, operation.spaceId, 'Space');
  if (typeof operation.name !== 'string') throw new Error('Space name must be a string.');
  space.name = operation.name.trim() || null;
  if (operation.type !== undefined) space.type = operation.type;
}

/** Apply one editor transaction and return a new approved-candidate project snapshot. */
export function applyGeometryOperation(project, operation, options = {}) {
  if (!operation || typeof operation.type !== 'string') throw new TypeError('A typed operation is required.');
  const validation = validateProject(project);
  if (!validation.ok) throw new Error(`Cannot edit invalid project: ${validation.errors.join('; ')}`);
  if (operation.baseRevision != null && operation.baseRevision !== project.revision?.number) {
    throw new Error(`Stale operation: expected revision ${project.revision?.number}.`);
  }

  const next = clone(project);
  if (operation.type === 'wall.moveEndpoint') moveWallEndpoint(next, operation);
  else if (operation.type === 'wall.add') addWall(next, operation);
  else if (operation.type === 'wall.accept') acceptWall(next, operation);
  else if (operation.type === 'wall.delete') deleteWall(next, operation);
  else if (operation.type === 'wall.split') splitWall(next, operation);
  else if (operation.type === 'opening.add') addOpening(next, operation);
  else if (operation.type === 'opening.update') updateOpening(next, operation);
  else if (operation.type === 'opening.delete') deleteOpening(next, operation);
  else if (operation.type === 'space.rename') renameSpace(next, operation);
  else throw new Error(`Unsupported geometry operation: ${operation.type}`);

  const after = validateProject(next);
  if (!after.ok) throw new Error(`Operation produced invalid project: ${after.errors.join('; ')}`);
  const previousRevision = project.revision?.number || 0;
  next.revision = {
    ...(next.revision || {}),
    number: previousRevision + 1,
    parentRevision: previousRevision,
    geometrySha256: null,
  };
  next.modifiedAt = options.now || new Date().toISOString();
  next.provenance = { ...(next.provenance || {}), requiresConfirmation: true };
  return next;
}

/** Small snapshot history suitable for an MVP correction editor. */
export function createProjectHistory(initialProject, options = {}) {
  const limit = Math.max(2, options.limit || 100);
  let past = [];
  let present = clone(initialProject);
  let future = [];
  return {
    current: () => clone(present),
    apply(operation, applyOptions) {
      const next = applyGeometryOperation(present, operation, applyOptions);
      past.push(present);
      if (past.length > limit) past.shift();
      present = next;
      future = [];
      return clone(present);
    },
    undo() {
      if (!past.length) return clone(present);
      future.push(present);
      present = past.pop();
      return clone(present);
    },
    redo() {
      if (!future.length) return clone(present);
      past.push(present);
      present = future.pop();
      return clone(present);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
