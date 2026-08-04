// Home & Me's authoritative project document.
//
// This is deliberately an adapter around hnm-plan-contract/1: detection and validation can
// continue shipping the proven contract while editor, 3D, render, and export features migrate
// to one extensible document. Coordinates remain millimetres to avoid lossy round trips.

export const PROJECT_SCHEMA = 'hnm-project/1';

const point = (p) => [Number(p && p[0]) || 0, Number(p && p[1]) || 0];

function centroid(poly) {
  if (!poly || !poly.length) return [0, 0];
  const sum = poly.reduce((a, p) => [a[0] + (+p[0] || 0), a[1] + (+p[1] || 0)], [0, 0]);
  return [+(sum[0] / poly.length).toFixed(1), +(sum[1] / poly.length).toFixed(1)];
}

/** Promote the validated detector contract into the shared project model. */
export function contractToProject(contract, options = {}) {
  if (!contract || contract.schema !== 'hnm-plan-contract/1') {
    throw new TypeError('contractToProject expects hnm-plan-contract/1');
  }
  const projectId = options.projectId || `project-${Date.now()}`;
  const storeyId = options.storeyId || 'storey-1';
  const now = options.now || new Date().toISOString();

  return {
    schema: PROJECT_SCHEMA,
    id: projectId,
    name: options.name || 'Detected home',
    units: 'mm',
    createdAt: now,
    modifiedAt: now,
    revision: {
      number: options.revision || 1,
      parentRevision: options.parentRevision || null,
      geometrySha256: options.geometrySha256 || null,
    },
    provenance: {
      source: contract.source || null,
      lane: contract.lane || 'raster',
      confidence: contract.scale && contract.scale.confidence,
      scaleStatus: options.scaleStatus || 'unverified',
      requiresConfirmation: true,
    },
    calibration: {
      status: options.scaleStatus || 'unverified',
      mmPerPx: Number.isFinite(contract.scale?.mmPerPx) ? contract.scale.mmPerPx : null,
      source: contract.scale?.source || 'unknown',
      confirmedBy: options.scaleConfirmedBy || null,
    },
    verticalDimensions: {
      status: options.verticalDimensionsStatus || 'unverified',
      requiresSiteVerification: options.requiresSiteVerification !== false,
    },
    orientation: {
      // Detector screen +Y points down. Persist north separately instead of silently assuming it.
      northDegrees: options.northDegrees == null ? null : +options.northDegrees,
      source: options.northDegrees == null ? 'unknown' : (options.orientationSource || 'user'),
    },
    storeys: [{
      id: storeyId,
      name: options.storeyName || 'Level 1',
      elevation: 0,
      height: options.storeyHeight || 2800,
      envelope: contract.envelope || null,
    }],
    geometry: {
      walls: (contract.walls || []).map((w) => ({
        id: w.id,
        storeyId,
        path: { kind: 'line', start: point(w.a), end: point(w.b) },
        thickness: w.thickness,
        height: w.height,
        structuralClass: w.type || 'unknown',
        isVoid: !!w.void,
        confidence: w.confidence,
      })),
      openings: (contract.openings || []).map((o) => ({
        id: o.id,
        storeyId,
        wallId: o.wall,
        kind: o.kind || 'opening',
        span: { startRatio: o.t0, endRatio: o.t1, width: o.width },
        height: o.height || (o.kind === 'window' ? 1200 : 2100),
        sill: o.sill == null ? (o.kind === 'window' ? 900 : 0) : o.sill,
        handing: o.handing || 'unknown',
        between: o.between || [],
        confidence: o.confidence,
      })),
      spaces: (contract.rooms || []).map((r) => ({
        id: r.id,
        storeyId,
        name: r.label || null,
        type: r.cls || 'unknown',
        wallIds: r.cycle || [],
        boundary: r.poly || [],
        anchor: centroid(r.poly),
        areaM2: r.areaM2,
        confidence: r.confidence,
      })),
      // Reserved first-class geometry for the correction editor and future detectors.
      columns: [],
      shafts: [],
      beams: [],
    },
    relationships: { adjacency: contract.adjacency || [], references: [] },
    library: { wallTypes: [], openingTypes: [], components: [], materials: [] },
    outputs: { renders: [], panoramas: [], constructionDocuments: [] },
    jobs: [],
    issues: contract.issues || [],
  };
}

/** Small fail-fast gate for consumers at the 2D/3D boundary. */
export function validateProject(project) {
  const errors = [];
  if (!project || project.schema !== PROJECT_SCHEMA) errors.push('unsupported schema');
  if (!project || project.units !== 'mm') errors.push('units must be mm');
  if (!project || !project.storeys || !project.storeys.length) errors.push('at least one storey is required');
  const ids = new Set();
  for (const group of ['walls', 'openings', 'spaces', 'columns', 'shafts', 'beams']) {
    for (const item of (project && project.geometry && project.geometry[group]) || []) {
      if (!item.id) errors.push(`${group} item has no id`);
      else if (ids.has(item.id)) errors.push(`duplicate geometry id: ${item.id}`);
      ids.add(item.id);
    }
  }
  const walls = new Set(((project && project.geometry && project.geometry.walls) || []).map((w) => w.id));
  for (const opening of (project && project.geometry && project.geometry.openings) || []) {
    if (opening.wallId && !walls.has(opening.wallId)) errors.push(`opening ${opening.id} references missing wall`);
  }
  return { ok: errors.length === 0, errors };
}
