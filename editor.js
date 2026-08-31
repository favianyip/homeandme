// editor.js — Home & Me geometry correction editor.
//
// All mutations flow through journey-geometry-ops.js (applyGeometryOperation).
// The SVG viewBox is in floor-plan millimetres. The immutable uploaded raster is
// transformed into that same userspace through an explicit hash-bound affine registration.

import { applyGeometryOperation, createProjectHistory } from './journey-geometry-ops.js';
import { validateProject3dReadiness, validateProjectTopology } from './journey-topology-gate.js';
import {
  normalizePixelMetricRegistration,
  registrationSvgMatrix,
  verifyPixelMetricRegistrationIntegrity,
} from './journey-source-registration.js';

// ─── safe string helpers ──────────────────────────────────────────────────────
// Escape user-supplied text before injecting into SVG/HTML markup.
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── snap parameters ─────────────────────────────────────────────────────────
const SNAP_GRID_MM = 100;
const SNAP_ENDPOINT_MM = 200;   // attraction radius for endpoint snap
const SNAP_ORTHO_DEG = 6;       // within N° of axis → constrain
const EP_HIT_R_MM = 300;        // pointer hit zone on endpoint handle

// ─── state ───────────────────────────────────────────────────────────────────
let history = null;
let selected = null;    // { kind: 'endpoint'|'opening'|'space'|'wall', wallId?, id?, endpoint? }
let drag    = null;     // active drag descriptor
let snapRes = null;     // last resolved snap { point: [x,y], kind: string }
let activeTool = null;  // 'wall.add' while drawing a human correction
let addWallStart = null;
let sourceUnderlay = null;
let baseViewBox = null;
let viewport = null;

// ─── DOM refs (set in init) ───────────────────────────────────────────────────
let svgEl, propPanel;

// ─── coordinate helpers ───────────────────────────────────────────────────────
function eventToMm(e) {
  const rect = svgEl.getBoundingClientRect();
  const vb   = svgEl.viewBox.baseVal;
  return [
    vb.x + (e.clientX - rect.left)  * (vb.width  / rect.width),
    vb.y + (e.clientY - rect.top)   * (vb.height / rect.height),
  ];
}

function wallAtParam(wall, t) {
  const [x1, y1] = wall.path.start;
  const [x2, y2] = wall.path.end;
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

function projectOntoWall(wall, mm) {
  const [wx1, wy1] = wall.path.start;
  const [wx2, wy2] = wall.path.end;
  const dx = wx2 - wx1, dy = wy2 - wy1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  return Math.max(0, Math.min(1, ((mm[0] - wx1) * dx + (mm[1] - wy1) * dy) / len2));
}

function wallLengthMm(wall) {
  if (wall.path?.kind !== 'line') return 0;
  const [x1, y1] = wall.path.start;
  const [x2, y2] = wall.path.end;
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function newGeometryId(prefix) {
  const random = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

// ─── snap chain ──────────────────────────────────────────────────────────────
function resolveSnap(rawMm, walls, ctx) {
  // 1. Endpoint snap — strong gravity
  let bestD2 = SNAP_ENDPOINT_MM ** 2;
  let snapped = null;
  for (const wall of walls) {
    if (wall.path?.kind !== 'line') continue;
    for (const ep of ['start', 'end']) {
      if (ctx?.skip?.wallId === wall.id && ctx?.skip?.endpoint === ep) continue;
      const p = wall.path[ep];
      const d2 = (p[0] - rawMm[0]) ** 2 + (p[1] - rawMm[1]) ** 2;
      if (d2 < bestD2) { bestD2 = d2; snapped = p; }
    }
  }

  if (snapped) return { point: [...snapped], kind: 'endpoint' };

  // 2. Orthogonal constraint relative to the drag origin
  if (ctx?.from) {
    const [fx, fy] = ctx.from;
    const dx = rawMm[0] - fx, dy = rawMm[1] - fy;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const near0   = Math.abs(angle) < SNAP_ORTHO_DEG || Math.abs(Math.abs(angle) - 180) < SNAP_ORTHO_DEG;
    const near90  = Math.abs(Math.abs(angle) - 90) < SNAP_ORTHO_DEG;
    if (near0)  return { point: [rawMm[0], fy], kind: 'orthogonal' };
    if (near90) return { point: [fx, rawMm[1]], kind: 'orthogonal' };
  }

  // 3. Grid snap
  const gx = Math.round(rawMm[0] / SNAP_GRID_MM) * SNAP_GRID_MM;
  const gy = Math.round(rawMm[1] / SNAP_GRID_MM) * SNAP_GRID_MM;
  return { point: [gx, gy], kind: 'grid' };
}

// ─── rendering ───────────────────────────────────────────────────────────────
function project() { return history?.current() ?? null; }

function computeViewBox(proj) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of proj.geometry?.walls ?? []) {
    if (w.path?.kind !== 'line') continue;
    for (const ep of ['start', 'end']) {
      const [x, y] = w.path[ep];
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (!isFinite(minX)) return { x: -1000, y: -1000, w: 12000, h: 10000 };
  const pad = 1200;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

function copyViewBox(value) {
  return { x: value.x, y: value.y, w: value.w, h: value.h };
}

function fitViewport() {
  const proj = project();
  if (!proj) return;
  baseViewBox = computeViewBox(proj);
  viewport = copyViewBox(baseViewBox);
  render();
}

function zoomViewport(factor, clientX = null, clientY = null) {
  if (!viewport || !baseViewBox || !svgEl || !Number.isFinite(factor) || factor <= 0) return;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const x = clientX == null ? rect.left + rect.width / 2 : clientX;
  const y = clientY == null ? rect.top + rect.height / 2 : clientY;
  const ratioX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
  const ratioY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
  const requestedWidth = viewport.w * factor;
  const minimumWidth = baseViewBox.w * 0.12;
  const maximumWidth = baseViewBox.w * 8;
  const width = Math.max(minimumWidth, Math.min(maximumWidth, requestedWidth));
  const applied = width / viewport.w;
  const height = viewport.h * applied;
  viewport = {
    x: viewport.x + ratioX * (viewport.w - width),
    y: viewport.y + ratioY * (viewport.h - height),
    w: width,
    h: height,
  };
  render();
}

function confidenceColor(conf) {
  if (conf === undefined || conf === null) return '#3a7f5c';
  if (conf >= 0.85) return '#3a7f5c';    // green — high confidence
  if (conf >= 0.50) return '#b07c2a';    // amber — uncertain
  return '#c0392b';                       // red — low / rejected
}

function render() {
  const proj = project();
  if (!proj || !svgEl) return;

  if (!baseViewBox || !viewport) {
    baseViewBox = computeViewBox(proj);
    viewport = copyViewBox(baseViewBox);
  }
  const vb = viewport;
  svgEl.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  const walls    = proj.geometry?.walls    ?? [];
  const openings = proj.geometry?.openings ?? [];
  const spaces   = proj.geometry?.spaces   ?? [];

  // Opening index by wall
  const opsByWall = {};
  for (const op of openings) {
    if (!opsByWall[op.wallId]) opsByWall[op.wallId] = [];
    opsByWall[op.wallId].push(op);
  }

  const parts = [];

  // ── exact source drawing underlay ─────────────────────────────────────────
  // It shares this SVG viewBox with every vector, so pan/zoom cannot drift the layers apart.
  if (sourceUnderlay) {
    parts.push(`<image class="source-underlay"
      x="0" y="0" width="${sourceUnderlay.imageWidth}" height="${sourceUnderlay.imageHeight}"
      transform="${registrationSvgMatrix(sourceUnderlay.registration)}"
      opacity="${sourceUnderlay.opacity}" preserveAspectRatio="none"
      pointer-events="none" aria-hidden="true"/>`);
  }

  // ── grid dots (background reference) ──────────────────────────────────────
  const gStep = 1000;
  const gx0 = Math.ceil(vb.x / gStep) * gStep;
  const gy0 = Math.ceil(vb.y / gStep) * gStep;
  for (let gx = gx0; gx <= vb.x + vb.w; gx += gStep) {
    for (let gy = gy0; gy <= vb.y + vb.h; gy += gStep) {
      parts.push(`<circle cx="${gx}" cy="${gy}" r="30" fill="#ccc" pointer-events="none" opacity="0.4"/>`);
    }
  }

  // ── walls ────────────────────────────────────────────────────────────────
  for (const wall of walls) {
    if (wall.path?.kind !== 'line') continue;
    const [x1, y1] = wall.path.start;
    const [x2, y2] = wall.path.end;
    const thick  = wall.thickness ?? 150;
    const conf   = wall.confidence ?? 1;
    const color  = confidenceColor(conf);
    const isSel  = selected?.kind === 'wall' && selected?.wallId === wall.id;
    const stroke = isSel ? '#5a7e8a' : color;

    // Wall body
    parts.push(`<line data-wall="${wall.id}" class="wall-line"
      x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="${stroke}" stroke-width="${thick}" stroke-linecap="round" opacity="0.82" cursor="pointer"/>`);

    // Uncertainty badge on wall midpoint
    if (conf < 0.85) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      parts.push(`<circle data-wall="${wall.id}" cx="${mx}" cy="${my}" r="220"
        fill="${color}" opacity="0.9" cursor="pointer"/>`);
      parts.push(`<text x="${mx}" y="${my + 75}" text-anchor="middle"
        font-size="240" font-family="sans-serif" fill="white" pointer-events="none" font-weight="bold">?</text>`);
    }

    // Openings on this wall
    for (const op of (opsByWall[wall.id] ?? [])) {
      if (!op.span) continue;
      const p0 = wallAtParam(wall, op.span.startRatio);
      const p1 = wallAtParam(wall, op.span.endRatio);
      const isSelOp = selected?.kind === 'opening' && selected?.id === op.id;
      const opNeedsReview = (op.confidence ?? 1) < 0.85 && !op.accepted;
      const opStroke = opNeedsReview
        ? confidenceColor(op.confidence)
        : op.kind === 'window' ? '#3b82f6' : '#8b5cf6';
      parts.push(`<line data-opening="${op.id}" data-wall="${wall.id}" class="opening-line"
        x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}"
        stroke="${isSelOp ? '#f59e0b' : opStroke}" stroke-width="${thick * 1.25}"
        stroke-linecap="round" opacity="0.95" cursor="pointer"/>`);
      // Grab handle midpoint
      const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      parts.push(`<circle data-opening="${op.id}" data-wall="${wall.id}" class="opening-grab"
        cx="${mx}" cy="${my}" r="180"
        fill="${isSelOp ? '#f59e0b' : opStroke}" opacity="0.9" cursor="pointer"/>`);
      if (opNeedsReview) {
        parts.push(`<text x="${mx}" y="${my + 72}" text-anchor="middle"
          font-size="230" font-family="sans-serif" fill="white" pointer-events="none" font-weight="bold">?</text>`);
      }
    }

    // Endpoint handles (drawn last so they sit on top)
    for (const ep of ['start', 'end']) {
      const [px, py] = wall.path[ep];
      const isSelEp = selected?.kind === 'endpoint' && selected?.wallId === wall.id && selected?.endpoint === ep;
      parts.push(`<circle data-ep="${ep}" data-wall="${wall.id}" class="ep-handle"
        cx="${px}" cy="${py}" r="${isSelEp ? 280 : 210}"
        fill="${isSelEp ? '#5a7e8a' : '#fff'}"
        stroke="${isSelEp ? '#5a7e8a' : stroke}" stroke-width="55"
        cursor="grab"/>`);
    }
  }

  // Live preview for a missing-wall correction. This belongs to rendering, not snap resolution;
  // keeping it here prevents the add-wall tool from referencing an undefined SVG buffer.
  if (activeTool === 'wall.add' && addWallStart && snapRes?.point) {
    parts.push(`<line x1="${addWallStart[0]}" y1="${addWallStart[1]}"
      x2="${snapRes.point[0]}" y2="${snapRes.point[1]}"
      stroke="#5a7e8a" stroke-width="100" stroke-dasharray="240 140"
      opacity="0.9" pointer-events="none"/>`);
  }

  // ── snap indicator ────────────────────────────────────────────────────────
  if (snapRes && drag) {
    const [sx, sy] = snapRes.point;
    const snapColor = snapRes.kind === 'endpoint' ? '#f59e0b'
                    : snapRes.kind === 'orthogonal' ? '#10b981'
                    : '#94a3b8';
    parts.push(`<circle cx="${sx}" cy="${sy}" r="200"
      fill="none" stroke="${snapColor}" stroke-width="55" opacity="0.85" pointer-events="none"/>`);
    parts.push(`<circle cx="${sx}" cy="${sy}" r="65"
      fill="${snapColor}" opacity="0.9" pointer-events="none"/>`);
  }

  // ── spaces ────────────────────────────────────────────────────────────────
  for (const sp of spaces) {
    const labelPoint = sp.anchor || sp.centroid;
    if (!labelPoint) continue;
    const [cx, cy] = labelPoint;
    const isSelSp = selected?.kind === 'space' && selected?.id === sp.id;
    parts.push(`<text data-space="${esc(sp.id)}" class="space-lbl"
      x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-size="260" font-family="'Helvetica Neue',sans-serif" letter-spacing="2"
      fill="${isSelSp ? '#5a7e8a' : '#8a908c'}" cursor="pointer"
      paint-order="stroke" stroke="white" stroke-width="120" stroke-linejoin="round">${esc(sp.name) || '?'}</text>`);
  }

  svgEl.innerHTML = parts.join('\n');
  // Assign the already-verified private blob URL through the DOM so it is never parsed
  // as markup and remains outside the public static dependency graph.
  svgEl.querySelector('image.source-underlay')?.setAttribute('href', sourceUnderlay?.imageUrl || '');

  // Refresh toolbar state
  const topology = validateProjectTopology(proj);
  const readiness = validateProject3dReadiness(proj);
  const reviewRequired = topology.warnings.filter((item) =>
    item.code === 'WALL_REVIEW_REQUIRED' || item.code === 'OPENING_REVIEW_REQUIRED');
  const badge = document.getElementById('unresolvedBadge');
  const btnApprove = document.getElementById('btnApprove');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnAddWall = document.getElementById('btnAddWall');
  const banner = document.getElementById('banner');
  const gateList = document.getElementById('gateIssues');
  const gateSummary = document.getElementById('gateSummary');
  if (badge) {
    badge.textContent = topology.blocking.length
      ? `${topology.blocking.length} structural blocker${topology.blocking.length === 1 ? '' : 's'}`
      : reviewRequired.length > 0 ? `${reviewRequired.length} unreviewed` : '2D gate ready';
    badge.title = [...topology.blocking, ...reviewRequired].map((item) => item.message).join('\n');
    badge.className = 'badge ' + (topology.blocking.length || reviewRequired.length > 0 ? 'warn' : 'ok');
  }
  if (btnApprove) btnApprove.disabled = !sourceUnderlay || reviewRequired.length > 0 || !topology.ok;
  if (btnUndo) btnUndo.disabled = !history?.canUndo();
  if (btnRedo) btnRedo.disabled = !history?.canRedo();
  if (btnAddWall) btnAddWall.classList.toggle('active', activeTool === 'wall.add');
  const btnPan = document.getElementById('btnPan');
  if (btnPan) {
    btnPan.classList.toggle('active', activeTool === 'pan');
    btnPan.setAttribute('aria-pressed', String(activeTool === 'pan'));
  }
  if (banner) banner.textContent = activeTool === 'wall.add'
    ? (addWallStart ? 'Click the second endpoint · Esc cancels' : 'Click the first endpoint · Esc cancels')
    : activeTool === 'pan'
      ? 'Drag the drawing · wheel or ＋ / − zooms · Esc returns to editing'
      : 'Source-aligned vectors · drag endpoints · click openings or room labels';
  if (gateSummary) {
    gateSummary.textContent = readiness.ok
      ? 'Ready for a corrected 3D concept. This is not an as-built record.'
      : `${readiness.blocking.length + readiness.warnings.length} item(s) still block corrected 3D.`;
  }
  if (gateList) {
    const items = [...readiness.blocking, ...readiness.warnings];
    gateList.innerHTML = items.length
      ? items.map((item) => `<li><b>${esc(item.code.replaceAll('_', ' '))}</b><span>${esc(item.message)}</span></li>`).join('')
      : '<li class="gate-ok"><b>3D CONCEPT GATE PASSED</b><span>Topology and reviewed dimensions are complete.</span></li>';
  }
}

// ─── property panel ───────────────────────────────────────────────────────────
function renderPanel() {
  const proj = project();
  if (!propPanel || !proj) return;
  if (!selected) {
    propPanel.innerHTML = '<p class="hint">Click an endpoint handle (circle), opening (coloured bar), or room label to select it.</p>';
    return;
  }

  if (selected.kind === 'endpoint' || selected.kind === 'wall') {
    const wall = (proj.geometry?.walls ?? []).find(w => w.id === selected.wallId);
    if (!wall) { propPanel.innerHTML = ''; return; }
    const len  = Math.round(wallLengthMm(wall));
    const conf = wall.confidence != null ? `${Math.round(wall.confidence * 100)} %` : '—';
    propPanel.innerHTML = `
      <h3 class="prop-title">Wall</h3>
      <div class="prop-row"><span class="prop-label">ID</span><span class="prop-val mono">${esc(wall.id)}</span></div>
      <div class="prop-row"><span class="prop-label">Length</span><span class="prop-val">${len.toLocaleString()} mm</span></div>
      <div class="prop-row"><span class="prop-label">Thickness</span><span class="prop-val">${wall.thickness ?? 150} mm</span></div>
      <div class="prop-row"><span class="prop-label">Confidence</span><span class="prop-val">${esc(conf)}</span></div>
      ${selected.kind === 'endpoint' ? `<div class="prop-row"><span class="prop-label">Endpoint</span><span class="prop-val">${esc(selected.endpoint)}</span></div>` : ''}
      ${(wall.confidence ?? 1) < 0.85 && !wall.accepted ? '<button class="prop-btn" id="btnWallAccept">Mark wall reviewed</button>' : ''}
      <button class="prop-btn" id="btnAddDoor">＋ Add door to this wall</button>
      <button class="prop-btn" id="btnAddWindow">＋ Add window to this wall</button>
      <button class="prop-btn" id="btnWallSplit">Split wall at midpoint</button>
      <button class="prop-btn" id="btnWallDelete">Delete wall</button>
      <p class="hint">Drag the white endpoint circles to reposition. Connected junctions move automatically.</p>
    `;
    document.getElementById('btnWallAccept')?.addEventListener('click', () => {
      commit({ type: 'wall.accept', wallId: wall.id });
    });
    const addOpening = (kind) => commit({
      type: 'opening.add',
      opening: {
        id: newGeometryId(kind === 'window' ? 'window' : 'door'),
        storeyId: wall.storeyId,
        wallId: wall.id,
        kind,
        span: { startRatio: 0.4, endRatio: 0.6 },
        height: kind === 'window' ? 1200 : 2100,
        sill: kind === 'window' ? 900 : 0,
        handing: kind === 'window' ? 'none' : 'unknown',
        confidence: 1,
      },
    });
    document.getElementById('btnAddDoor')?.addEventListener('click', () => addOpening('door'));
    document.getElementById('btnAddWindow')?.addEventListener('click', () => addOpening('window'));
    document.getElementById('btnWallSplit')?.addEventListener('click', () => {
      commit({
        type: 'wall.split', wallId: wall.id,
        point: wallAtParam(wall, 0.5), newWallId: newGeometryId('wall'),
      });
    });
    document.getElementById('btnWallDelete')?.addEventListener('click', () => {
      commit({ type: 'wall.delete', wallId: wall.id });
      selected = null; render(); renderPanel();
    });
    return;
  }

  if (selected.kind === 'opening') {
    const op = (proj.geometry?.openings ?? []).find(o => o.id === selected.id);
    if (!op) { propPanel.innerHTML = ''; return; }
    const KINDS = ['door', 'window', 'archway', 'sliding'];
    const HANDS = ['', 'left', 'right'];
    propPanel.innerHTML = `
      <h3 class="prop-title">${op.kind === 'window' ? 'Window' : 'Door'}</h3>
      <div class="prop-row"><span class="prop-label">ID</span><span class="prop-val mono">${esc(op.id)}</span></div>
      <div class="prop-row">
        <label class="prop-label" for="opKind">Kind</label>
        <select id="opKind" class="prop-input">
          ${KINDS.map(k => `<option value="${k}" ${op.kind === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row">
        <label class="prop-label" for="opH">Height (mm)</label>
        <input id="opH" type="number" class="prop-input" value="${op.height ?? 2100}" min="500" max="3000" step="50">
      </div>
      <div class="prop-row">
        <label class="prop-label" for="opS">Sill (mm)</label>
        <input id="opS" type="number" class="prop-input" value="${op.sill ?? 0}" min="0" max="2000" step="50">
      </div>
      <div class="prop-row">
        <label class="prop-label" for="opHand">Handing</label>
        <select id="opHand" class="prop-input">
          ${HANDS.map(h => `<option value="${h}" ${(op.handing ?? '') === h ? 'selected' : ''}>${h || 'Unknown'}</option>`).join('')}
        </select>
      </div>
      ${(op.confidence ?? 1) < 0.85 && !op.accepted ? '<p class="review-callout">Detection is uncertain. Confirm the type, wall and dimensions before marking it reviewed.</p>' : ''}
      <button class="prop-btn" id="btnOpApply">Apply &amp; mark reviewed</button>
      <button class="prop-btn" id="btnOpDelete">Delete opening</button>
      <p class="hint">Drag the coloured opening bar along its wall to reposition it.</p>
    `;
    document.getElementById('btnOpApply')?.addEventListener('click', () => {
      commit({
        type: 'opening.update',
        openingId: op.id,
        kind:    document.getElementById('opKind').value || undefined,
        height:  parseInt(document.getElementById('opH').value, 10) || undefined,
        sill:    parseInt(document.getElementById('opS').value, 10),
        handing: document.getElementById('opHand').value || undefined,
        accepted: true,
      });
    });
    document.getElementById('btnOpDelete')?.addEventListener('click', () => {
      commit({ type: 'opening.delete', openingId: op.id });
      selected = null; render(); renderPanel();
    });
    return;
  }

  if (selected.kind === 'space') {
    const sp = (proj.geometry?.spaces ?? []).find(s => s.id === selected.id);
    if (!sp) { propPanel.innerHTML = ''; return; }
    const TYPES = ['living', 'dining', 'bedroom', 'kitchen', 'bathroom', 'study', 'utility', 'store', 'balcony', 'corridor', 'other'];
    propPanel.innerHTML = `
      <h3 class="prop-title">Room</h3>
      <div class="prop-row">
        <label class="prop-label" for="spName">Name</label>
        <input id="spName" type="text" class="prop-input" value="${esc(sp.name ?? '')}">
      </div>
      <div class="prop-row">
        <label class="prop-label" for="spType">Type</label>
        <select id="spType" class="prop-input">
          ${TYPES.map(t => `<option value="${t}" ${(sp.type ?? '') === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <button class="prop-btn" id="btnSpApply">Apply</button>
    `;
    document.getElementById('btnSpApply')?.addEventListener('click', () => {
      commit({
        type: 'space.rename',
        spaceId: sp.id,
        name: document.getElementById('spName').value,
        type: document.getElementById('spType').value,
      });
    });
    return;
  }
}

// ─── commit helper ────────────────────────────────────────────────────────────
function commit(op) {
  if (!history) return;
  try {
    history.apply({ ...op, baseRevision: project()?.revision?.number },
                  { now: new Date().toISOString() });
    render();
    renderPanel();
  } catch (e) {
    const msg = document.getElementById('statusMsg');
    if (msg) { msg.textContent = e.message; setTimeout(() => { msg.textContent = ''; }, 4000); }
    else console.warn('Operation failed:', e.message);
  }
}

// ─── pointer events ───────────────────────────────────────────────────────────
function onDown(e) {
  const wantsPan = e.button === 1 || (e.button === 0 && activeTool === 'pan');
  if (wantsPan) {
    e.preventDefault();
    drag = { type: 'pan', clientX: e.clientX, clientY: e.clientY };
    svgEl.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  e.preventDefault();
  const t = e.target;

  if (activeTool === 'wall.add') {
    const walls = project()?.geometry?.walls ?? [];
    const raw = eventToMm(e);
    const resolved = resolveSnap(raw, walls, { from: addWallStart });
    if (!addWallStart) {
      addWallStart = resolved.point;
      snapRes = resolved;
    } else if (Math.hypot(
      resolved.point[0] - addWallStart[0], resolved.point[1] - addWallStart[1],
    ) > 20) {
      commit({
        type: 'wall.add',
        wall: {
          id: newGeometryId('wall'),
          storeyId: project()?.storeys?.[0]?.id,
          path: { kind: 'line', start: addWallStart, end: resolved.point },
          thickness: 100,
          height: project()?.storeys?.[0]?.height || 2700,
          structuralClass: 'unknown',
          confidence: 1,
          accepted: true,
        },
      });
      activeTool = null; addWallStart = null; snapRes = null;
    }
    render(); renderPanel();
    return;
  }

  if (t.classList.contains('ep-handle')) {
    const wallId   = t.dataset.wall;
    const endpoint = t.dataset.ep;
    const proj     = project();
    const wall     = (proj.geometry?.walls ?? []).find(w => w.id === wallId);
    if (!wall) return;
    selected = { kind: 'endpoint', wallId, endpoint };
    drag     = { type: 'endpoint', wallId, endpoint, from: [...wall.path[endpoint]] };
    svgEl.setPointerCapture(e.pointerId);
    render(); renderPanel();
    return;
  }

  if (t.classList.contains('opening-line') || t.classList.contains('opening-grab')) {
    selected = { kind: 'opening', id: t.dataset.opening, wallId: t.dataset.wall };
    drag     = { type: 'opening', openingId: t.dataset.opening, wallId: t.dataset.wall };
    svgEl.setPointerCapture(e.pointerId);
    render(); renderPanel();
    return;
  }

  if (t.classList.contains('space-lbl')) {
    selected = { kind: 'space', id: t.dataset.space };
    drag = null;
    render(); renderPanel();
    return;
  }

  if (t.classList.contains('wall-line')) {
    selected = { kind: 'wall', wallId: t.dataset.wall };
    drag = null;
    render(); renderPanel();
    return;
  }

  // Background click — deselect
  selected = null; drag = null; snapRes = null;
  render(); renderPanel();
}

function onMove(e) {
  if (drag?.type === 'pan') {
    e.preventDefault();
    const rect = svgEl.getBoundingClientRect();
    if (viewport && rect.width > 0 && rect.height > 0) {
      const dx = e.clientX - drag.clientX;
      const dy = e.clientY - drag.clientY;
      viewport = {
        ...viewport,
        x: viewport.x - dx * viewport.w / rect.width,
        y: viewport.y - dy * viewport.h / rect.height,
      };
      drag.clientX = e.clientX;
      drag.clientY = e.clientY;
      render();
    }
    return;
  }
  if (activeTool === 'wall.add') {
    const walls = project()?.geometry?.walls ?? [];
    snapRes = resolveSnap(eventToMm(e), walls, { from: addWallStart });
    render();
    return;
  }
  if (!drag) return;
  e.preventDefault();
  const mm   = eventToMm(e);
  const proj = project();
  const walls = proj.geometry?.walls ?? [];

  if (drag.type === 'endpoint') {
    snapRes = resolveSnap(mm, walls, {
      skip: { wallId: drag.wallId, endpoint: drag.endpoint },
      from: drag.from,
    });
  } else if (drag.type === 'opening') {
    snapRes = null;
    drag.lastMm = mm;
  }

  render();
}

function onUp(e) {
  if (!drag) return;
  e.preventDefault();
  if (drag.type === 'pan') {
    drag = null;
    if (svgEl.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
    return;
  }
  const mm   = eventToMm(e);
  const proj = project();
  const walls = proj.geometry?.walls ?? [];

  if (drag.type === 'endpoint') {
    const snap = resolveSnap(mm, walls, {
      skip: { wallId: drag.wallId, endpoint: drag.endpoint },
      from: drag.from,
    });
    // Only commit if actually moved more than 20mm
    const [fx, fy] = drag.from;
    if (Math.abs(snap.point[0] - fx) > 20 || Math.abs(snap.point[1] - fy) > 20) {
      commit({ type: 'wall.moveEndpoint', wallId: drag.wallId, endpoint: drag.endpoint, point: snap.point });
    }
  } else if (drag.type === 'opening') {
    const lastMm = drag.lastMm ?? mm;
    const wall = walls.find(w => w.id === drag.wallId);
    const opList = proj.geometry?.openings ?? [];
    const op = opList.find(o => o.id === drag.openingId);
    if (wall && op?.span) {
      const t = projectOntoWall(wall, lastMm);
      const span = op.span.endRatio - op.span.startRatio;
      const newStart = Math.max(0, Math.min(1 - span, t - span / 2));
      commit({ type: 'opening.update', openingId: op.id,
               startRatio: +newStart.toFixed(4), endRatio: +(newStart + span).toFixed(4) });
    }
  }

  drag = null; snapRes = null;
  render();
}

// ─── toolbar actions ──────────────────────────────────────────────────────────
function undo() { history?.undo(); render(); renderPanel(); }
function redo() { history?.redo(); render(); renderPanel(); }

function toggleAddWall() {
  activeTool = activeTool === 'wall.add' ? null : 'wall.add';
  addWallStart = null; snapRes = null; drag = null; selected = null;
  render(); renderPanel();
}

function togglePan() {
  activeTool = activeTool === 'pan' ? null : 'pan';
  addWallStart = null; snapRes = null; drag = null; selected = null;
  render(); renderPanel();
}

function cancelActiveTool() {
  if (!activeTool) return;
  activeTool = null; addWallStart = null; snapRes = null;
  render(); renderPanel();
}

function approveGeometry() {
  const proj = project();
  if (!proj) return;
  const topology = validateProjectTopology(proj);
  const reviewRequired = topology.warnings.filter((item) =>
    item.code === 'WALL_REVIEW_REQUIRED' || item.code === 'OPENING_REVIEW_REQUIRED');
  if (!topology.ok || reviewRequired.length) {
    const msg = document.getElementById('statusMsg');
    if (msg) msg.textContent = '2D review is blocked. Resolve every listed wall, room and opening item.';
    return;
  }
  // Dispatch the correction revision to the authenticated parent journey. This editor never approves it.
  document.dispatchEvent(new CustomEvent('hnm:approve-geometry', {
    bubbles: true,
    detail: { project: proj, revision: proj.revision?.number },
  }));
  const msg = document.getElementById('statusMsg');
  if (msg) { msg.textContent = `Correction revision ${proj.revision?.number} sent to the parent review desk. No approval occurs in this editor.`; }
}


// ─── init ─────────────────────────────────────────────────────────────────────
export async function init(options = {}) {
  svgEl     = document.getElementById('editorSvg');
  propPanel = document.getElementById('propPanel');
  if (!svgEl) { console.error('editor: #editorSvg not found'); return; }

  if (!options.project) throw new TypeError('The correction editor requires geometry supplied by its authenticated parent journey.');
  const proj = options.project;
  const supplied = options.sourceUnderlay;
  if (typeof supplied?.imageUrl !== 'string' || !supplied.imageUrl) {
    throw new TypeError('The correction editor requires the verified original-upload image.');
  }
  const parsedImageUrl = new URL(supplied.imageUrl, location.href);
  if (parsedImageUrl.protocol !== 'blob:' || parsedImageUrl.origin !== location.origin) {
    throw new TypeError('The correction editor accepts only a same-origin private source-image URL.');
  }
  if (proj.revision?.geometrySha256 !== supplied.geometrySha256) {
    throw new TypeError('The source registration is not bound to this editable geometry revision.');
  }
  const registration = normalizePixelMetricRegistration(supplied.registration, {
    sourceArtifactSha256: supplied.sourceArtifactSha256,
    imageWidth: supplied.intrinsicPixels?.width,
    imageHeight: supplied.intrinsicPixels?.height,
    geometrySha256: supplied.geometrySha256,
  });
  // The iframe repeats the asynchronous integrity check at its own trust boundary.
  await verifyPixelMetricRegistrationIntegrity(registration);
  sourceUnderlay = {
    imageUrl: parsedImageUrl.href,
    imageWidth: supplied.intrinsicPixels.width,
    imageHeight: supplied.intrinsicPixels.height,
    registration,
    opacity: 0.55,
  };
  baseViewBox = null;
  viewport = null;
  history    = createProjectHistory(proj, { limit: 100 });

  // Toolbar
  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);
  document.getElementById('btnAddWall')?.addEventListener('click', toggleAddWall);
  document.getElementById('btnPan')?.addEventListener('click', togglePan);
  document.getElementById('btnZoomOut')?.addEventListener('click', () => zoomViewport(1.25));
  document.getElementById('btnZoomIn')?.addEventListener('click', () => zoomViewport(0.8));
  document.getElementById('btnFit')?.addEventListener('click', fitViewport);
  const opacity = document.getElementById('sourceOpacity');
  opacity?.addEventListener('input', () => {
    sourceUnderlay.opacity = Math.max(0, Math.min(1, Number(opacity.value) / 100));
    render();
  });
  const sourceBadge = document.getElementById('sourceBadge');
  if (sourceBadge) sourceBadge.textContent = `SHA ${registration.sourceArtifactSha256.slice(0, 8)} · ${registration.sourceImageSizePx.width}×${registration.sourceImageSizePx.height}`;
  document.getElementById('btnApprove')?.addEventListener('click', approveGeometry);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') cancelActiveTool();
  });

  // Pointer events
  svgEl.addEventListener('pointerdown',  onDown);
  svgEl.addEventListener('pointermove',  onMove);
  svgEl.addEventListener('pointerup',    onUp);
  svgEl.addEventListener('pointercancel', () => { drag = null; snapRes = null; render(); });
  svgEl.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomViewport(event.deltaY < 0 ? 0.86 : 1.16, event.clientX, event.clientY);
  }, { passive: false });

  render();
  renderPanel();
}
