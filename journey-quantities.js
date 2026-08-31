// Deterministic quantity schedule from hnm-project/1.
// Figures come from approved semantic geometry, never from rendered meshes or generated images.

import { compileWallOpeningSegments, isParapetHostWall } from './geometry-clipper.js';

const M = 1 / 1000;
const round = (n, p = 3) => +n.toFixed(p);
const length = (a, b) => Math.hypot((b[0] - a[0]) * M, (b[1] - a[1]) * M);
const polygonAreaM2 = (points) => Math.abs((points || []).reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0)) / 2_000_000;

function addGroup(groups, key, values) {
  const g = groups[key] || (groups[key] = { count: 0, lengthM: 0, faceAreaM2: 0, volumeM3: 0 });
  g.count++;
  g.lengthM += values.lengthM || 0;
  g.faceAreaM2 += values.faceAreaM2 || 0;
  g.volumeM3 += values.volumeM3 || 0;
}

export function buildQuantitySchedule(project) {
  if (!project || project.schema !== 'hnm-project/1') throw new TypeError('buildQuantitySchedule expects hnm-project/1');
  const walls = {};
  const projectWalls = (project.geometry?.walls || [])
    .filter((wall) => !wall.isVoid && wall.path?.kind === 'line');
  const wallContracts = projectWalls.map((wall) => ({
    id: wall.id,
    a: wall.path.start,
    b: wall.path.end,
    thickness: wall.thickness,
    height: wall.height,
    type: wall.structuralClass,
  }));
  const openingContracts = (project.geometry?.openings || []).map((opening) => ({
    id: opening.id,
    wall: opening.wallId,
    t0: opening.span?.startRatio,
    t1: opening.span?.endRatio,
    height: opening.height,
    sill: opening.sill,
    kind: opening.kind,
  }));
  const compiledWalls = compileWallOpeningSegments(wallContracts, openingContracts);
  const projectSpaceContracts = (project.geometry?.spaces || []).map((space) => ({
    id: space.id,
    label: space.name,
    wallIds: space.wallIds || [],
    boundary: space.boundary || [],
    areaM2: space.areaM2,
    minDim: space.minDim,
    labelSuspect: space.labelSuspect,
  }));
  const compiledByHost = new Map();
  for (const segment of compiledWalls) {
    const hosted = compiledByHost.get(segment.hostWallId) || [];
    hosted.push(segment);
    compiledByHost.set(segment.hostWallId, hosted);
  }
  for (const wall of projectWalls) {
    const height = Number(wall.height) * M;
    const thickness = Number(wall.thickness) * M;
    const parapetHeight = isParapetHostWall(wall, projectSpaceContracts)
      ? Math.min(height, 1.1) : null;
    let netFaceAreaM2 = 0;
    let netVolumeM3 = 0;
    for (const segment of compiledByHost.get(wall.id) || []) {
      const len = length(segment.a, segment.b);
      let solidHeight = parapetHeight ?? height;
      if (segment.segmentKind === 'opening') {
        const sill = Math.max(0, Number(segment.opening?.sill) * M);
        const head = Math.min(height, sill + Math.max(0, Number(segment.opening?.height) * M));
        solidHeight = Math.min(height, sill) + Math.max(0, height - head);
      }
      netFaceAreaM2 += len * solidHeight * 2;
      netVolumeM3 += len * solidHeight * thickness;
    }
    addGroup(walls, wall.structuralClass || 'unknown', {
      lengthM: length(wall.path.start, wall.path.end),
      faceAreaM2: netFaceAreaM2,
      volumeM3: netVolumeM3,
    });
  }

  const openings = {};
  const wallById = new Map((project.geometry?.walls || []).map((wall) => [wall.id, wall]));
  for (const opening of project.geometry?.openings || []) {
    const key = opening.kind || 'opening';
    const g = openings[key] || (openings[key] = { count: 0, clearWidthM: 0, clearAreaM2: 0 });
    const hostWall = wallById.get(opening.wallId);
    const start = opening.span?.startRatio;
    const end = opening.span?.endRatio;
    const derivedWidthMm = hostWall?.path?.kind === 'line'
      && Number.isFinite(start) && Number.isFinite(end)
      ? length(hostWall.path.start, hostWall.path.end) / M * (end - start)
      : null;
    const width = (derivedWidthMm
      ?? (Number.isFinite(opening.span?.width) ? opening.span.width : 0)) * M;
    const height = (opening.height || 0) * M;
    g.count++;
    g.clearWidthM += width;
    g.clearAreaM2 += width * height;
  }

  const spaces = {};
  let internalFloorAreaM2 = 0;
  for (const space of project.geometry?.spaces || []) {
    const key = space.type || 'unknown';
    const g = spaces[key] || (spaces[key] = { count: 0, floorAreaM2: 0 });
    const area = Array.isArray(space.boundary) && space.boundary.length >= 3
      ? polygonAreaM2(space.boundary)
      : (Number.isFinite(space.areaM2) ? space.areaM2 : 0);
    g.count++;
    g.floorAreaM2 += area;
    internalFloorAreaM2 += area;
  }

  const normalize = (groups) => Object.fromEntries(Object.entries(groups).map(([key, group]) => [key,
    Object.fromEntries(Object.entries(group).map(([field, value]) => [field, typeof value === 'number' ? round(value) : value]))
  ]));

  return {
    schema: 'hnm-quantity-schedule/1',
    projectId: project.id,
    projectRevision: project.revision?.number || null,
    geometrySha256: project.revision?.geometrySha256 || null,
    units: { length: 'm', area: 'm2', volume: 'm3' },
    totals: {
      walls: projectWalls.length,
      openings: (project.geometry?.openings || []).length,
      spaces: (project.geometry?.spaces || []).length,
      internalFloorAreaM2: round(internalFloorAreaM2),
    },
    walls: normalize(walls),
    openings: normalize(openings),
    spaces: normalize(spaces),
  };
}
