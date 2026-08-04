import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  wallFootprint,
  openingCutout,
  polygonArea,
  pointInPolygon,
  intersectPolygons,
  junctionTrim,
} from '../geometry-clipper.js';

const EPS = 0.01; // mm tolerance for coordinate checks

// ─── wallFootprint ───────────────────────────────────────────────────────────

describe('wallFootprint', () => {
  it('horizontal wall returns 4-point positive-area polygon', () => {
    const fp = wallFootprint({ a: [0, 0], b: [5000, 0], thickness: 150 });
    assert.equal(fp.length, 4);
    assert.ok(polygonArea(fp) > 0, 'area must be positive');
    // area = length × thickness
    assert.ok(Math.abs(polygonArea(fp) - 5000 * 150) < EPS, 'area ≈ 750000 mm²');
  });

  it('vertical wall returns positive area', () => {
    const fp = wallFootprint({ a: [0, 0], b: [0, 4000], thickness: 150 });
    assert.ok(polygonArea(fp) > 0);
    assert.ok(Math.abs(polygonArea(fp) - 4000 * 150) < EPS);
  });

  it('area matches when given a thicknessOverride', () => {
    const fp = wallFootprint({ a: [0, 0], b: [3000, 0] }, 200);
    assert.ok(Math.abs(polygonArea(fp) - 3000 * 200) < EPS);
  });

  it('returns [] for a degenerate (zero-length) wall', () => {
    const fp = wallFootprint({ a: [100, 200], b: [100, 200] });
    assert.deepEqual(fp, []);
  });

  it('supports hnm-project path format', () => {
    const fp = wallFootprint({ path: { kind: 'line', start: [0, 0], end: [2000, 0] }, thickness: 100 });
    assert.equal(fp.length, 4);
    assert.ok(polygonArea(fp) > 0);
  });
});

// ─── openingCutout ───────────────────────────────────────────────────────────

describe('openingCutout', () => {
  it('returns 4-point rectangle for a mid-span opening', () => {
    const wall = { a: [0, 0], b: [5000, 0], thickness: 150 };
    const co = openingCutout(wall, { startRatio: 0.2, endRatio: 0.5 });
    assert.equal(co.length, 4);
    // area ≈ span_length × thickness
    const spanLen = 0.3 * 5000; // 1500 mm
    assert.ok(Math.abs(Math.abs(polygonArea(co)) - spanLen * 150) < EPS);
  });

  it('full-span cutout covers the full wall length', () => {
    const wall = { a: [0, 0], b: [3000, 0], thickness: 100 };
    const co = openingCutout(wall, { t0: 0, t1: 1 });
    assert.ok(Math.abs(Math.abs(polygonArea(co)) - 3000 * 100) < EPS);
  });
});

// ─── polygonArea ─────────────────────────────────────────────────────────────

describe('polygonArea', () => {
  it('matches known rectangle area', () => {
    // Same winding as room boundary (positive)
    const rect = [[0, 0], [5, 0], [5, 4], [0, 4]];
    assert.ok(Math.abs(polygonArea(rect) - 20) < EPS);
  });

  it('returns negative for reversed winding', () => {
    const rect = [[0, 4], [5, 4], [5, 0], [0, 0]];
    assert.ok(polygonArea(rect) < 0);
  });

  it('wallFootprint always returns positive area', () => {
    for (const [a, b] of [
      [[0, 0], [4000, 0]],
      [[0, 0], [0, 3000]],
      [[1000, 500], [3000, 500]],
      [[800, 200], [800, 2500]],
    ]) {
      const fp = wallFootprint({ a, b, thickness: 150 });
      assert.ok(polygonArea(fp) > 0, `failed for a=${a} b=${b}`);
    }
  });
});

// ─── pointInPolygon ──────────────────────────────────────────────────────────

describe('pointInPolygon', () => {
  const square = [[0, 0], [4, 0], [4, 4], [0, 4]];

  it('detects interior point', () => {
    assert.ok(pointInPolygon(square, 2, 2));
  });

  it('detects exterior point', () => {
    assert.ok(!pointInPolygon(square, 5, 2));
    assert.ok(!pointInPolygon(square, 2, 5));
    assert.ok(!pointInPolygon(square, -1, 2));
  });
});

// ─── intersectPolygons ───────────────────────────────────────────────────────

describe('intersectPolygons', () => {
  it('two overlapping unit squares → correct overlap area', () => {
    // Subject: [0,0]→[3,0]→[3,3]→[0,3]  (positive-area)
    const subject = [[0, 0], [3, 0], [3, 3], [0, 3]];
    // Clip:    [1,-1]→[4,-1]→[4,2]→[1,2] (positive-area)
    const clip = [[1, -1], [4, -1], [4, 2], [1, 2]];
    const result = intersectPolygons(subject, clip);
    // Expected: [1,0]→[3,0]→[3,2]→[1,2], area = 2×2 = 4
    assert.ok(result.length >= 4, 'at least 4 vertices');
    const area = Math.abs(polygonArea(result));
    assert.ok(Math.abs(area - 4) < EPS, `area should be 4, got ${area}`);
  });

  it('non-overlapping polygons → empty result', () => {
    const A = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const B = [[5, 0], [7, 0], [7, 2], [5, 2]];
    const result = intersectPolygons(A, B);
    assert.equal(result.length, 0);
  });

  it('one fully inside the other → inner polygon returned', () => {
    const outer = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const inner = [[2, 2], [6, 2], [6, 6], [2, 6]];
    const result = intersectPolygons(inner, outer);
    const area = Math.abs(polygonArea(result));
    assert.ok(Math.abs(area - 16) < EPS, `area should be 16, got ${area}`);
  });

  it('two wall footprints at a junction → returns the overlap rectangle', () => {
    const H = wallFootprint({ a: [0, 0], b: [5000, 0], thickness: 150 });
    const V = wallFootprint({ a: [1000, -300], b: [1000, 1000], thickness: 150 });
    const overlap = intersectPolygons(H, V);
    assert.ok(overlap.length >= 4, 'should have an overlap region');
    const area = Math.abs(polygonArea(overlap));
    // Expected overlap: 150mm × 150mm = 22500 mm²
    assert.ok(Math.abs(area - 150 * 150) < EPS, `area ≈ 22500, got ${area}`);
  });
});

// ─── junctionTrim ────────────────────────────────────────────────────────────

describe('junctionTrim', () => {
  const TH = 150; // wall thickness (half = 75)

  it('T-junction: V starts at H → trims V endpoint to H face', () => {
    const walls = [
      { id: 'H', a: [0, 0], b: [5000, 0], thickness: TH },
      { id: 'V', a: [2000, 0], b: [2000, 3000], thickness: TH },
    ];
    const trim = junctionTrim(walls);

    const adjV = trim.get('V');
    // V starts at y=0 (H centerline). It should be trimmed to y=+75 (H's south face).
    assert.ok(Math.abs(adjV.a[1] - 75) < EPS, `V.a.y should be 75, got ${adjV.a[1]}`);
    // V's far endpoint is untouched
    assert.ok(Math.abs(adjV.b[1] - 3000) < EPS);

    // H is untouched (it is the continuous wall)
    const adjH = trim.get('H');
    assert.ok(Math.abs(adjH.a[0] - 0) < EPS);
    assert.ok(Math.abs(adjH.b[0] - 5000) < EPS);
  });

  it('T-junction: H starts at V body → trims H endpoint to V face', () => {
    const walls = [
      { id: 'V', a: [0, 0], b: [0, 7000], thickness: TH },
      { id: 'H', a: [0, 4000], b: [5000, 4000], thickness: TH },
    ];
    const trim = junctionTrim(walls);

    const adjH = trim.get('H');
    // H starts at x=0 (V centerline). Trim to V's right face: x=+75.
    assert.ok(Math.abs(adjH.a[0] - 75) < EPS, `H.a.x should be 75, got ${adjH.a[0]}`);
    assert.ok(Math.abs(adjH.b[0] - 5000) < EPS);

    // V is continuous — untouched
    const adjV = trim.get('V');
    assert.ok(Math.abs(adjV.a[1] - 0) < EPS);
    assert.ok(Math.abs(adjV.b[1] - 7000) < EPS);
  });

  it('L-junction: shorter wall endpoint trimmed to longer wall face', () => {
    const walls = [
      { id: 'H', a: [0, 0], b: [5000, 0], thickness: TH },  // longer
      { id: 'V', a: [0, 0], b: [0, 3000], thickness: TH },  // shorter → trimmed
    ];
    const trim = junctionTrim(walls);

    const adjV = trim.get('V');
    // V.a is at (0,0) inside H's footprint. V goes toward +y so snap to y=+75.
    assert.ok(Math.abs(adjV.a[1] - 75) < EPS, `V.a.y should be 75, got ${adjV.a[1]}`);

    // H is continuous — a stays at (0,0)
    const adjH = trim.get('H');
    assert.ok(Math.abs(adjH.a[0] - 0) < EPS);
  });

  it('after trimming, no two solid-wall footprints overlap', () => {
    // 3-room test plan:
    //   Room A: x=[0,5000], y=[0,4000]
    //   Room B: x=[5000,9000], y=[0,4000]
    //   Room C: x=[0,9000], y=[4000,7000]
    //
    // Walls (all 150mm thick, centerline):
    //   W1: top H   (0,0)→(9000,0)
    //   W2: left V  (0,0)→(0,7000)
    //   W3: bottom H(0,7000)→(9000,7000)
    //   W4: right V (9000,0)→(9000,7000)
    //   W5: mid V   (5000,0)→(5000,4000)   — divides A and B
    //   W6: mid H   (0,4000)→(9000,4000)   — divides top rooms from C
    const walls = [
      { id: 'W1', a: [0, 0],    b: [9000, 0],    thickness: TH },
      { id: 'W2', a: [0, 0],    b: [0, 7000],    thickness: TH },
      { id: 'W3', a: [0, 7000], b: [9000, 7000], thickness: TH },
      { id: 'W4', a: [9000, 0], b: [9000, 7000], thickness: TH },
      { id: 'W5', a: [5000, 0], b: [5000, 4000], thickness: TH },
      { id: 'W6', a: [0, 4000], b: [9000, 4000], thickness: TH },
    ];
    const trim = junctionTrim(walls);

    // Build per-wall AABBs in plan space
    const aabbs = walls.map((w) => {
      const we = trim.get(w.id);
      const halfTh = w.thickness / 2;
      const isH = Math.abs(we.a[1] - we.b[1]) < 1;
      return {
        id: w.id,
        xmin: Math.min(we.a[0], we.b[0]) - (isH ? 0 : halfTh),
        xmax: Math.max(we.a[0], we.b[0]) + (isH ? 0 : halfTh),
        ymin: Math.min(we.a[1], we.b[1]) - (isH ? halfTh : 0),
        ymax: Math.max(we.a[1], we.b[1]) + (isH ? halfTh : 0),
      };
    });

    // Check all pairs for interior overlap
    const OVERLAP_EPS = 0.1; // mm — touching edges are OK
    for (let i = 0; i < aabbs.length; i++) {
      for (let j = i + 1; j < aabbs.length; j++) {
        const A = aabbs[i], B = aabbs[j];
        const overlapX = Math.min(A.xmax, B.xmax) - Math.max(A.xmin, B.xmin);
        const overlapY = Math.min(A.ymax, B.ymax) - Math.max(A.ymin, B.ymin);
        const overlap = Math.min(overlapX, overlapY);
        assert.ok(
          overlap <= OVERLAP_EPS,
          `${A.id} and ${B.id} overlap by ${overlap.toFixed(2)} mm (xoverlap=${overlapX.toFixed(1)}, yoverlap=${overlapY.toFixed(1)})`
        );
      }
    }
  });
});
