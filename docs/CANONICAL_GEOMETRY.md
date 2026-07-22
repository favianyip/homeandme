# Canonical Geometry

Canonical geometry is an integer-millimetre, right-handed, Z-up document in `/home/favianyip/ai-interior-platform/src/spatialforge/domain.py`.

Current core fields include project ID, revision, units, coordinate system, topology mode, scale status, walls, openings and rooms. Partitioned-plan validation supports connected orthogonal internal partitions.

## Enforced invariants

- Non-zero wall lengths.
- Connected wall graph.
- No unintended collinear wall overlap.
- Closed, non-self-intersecting room boundaries.
- Hosted openings reference existing walls.
- Opening offset/width fit the parent wall.
- Opening vertical extent fits wall height.
- Approved scale is not inferred from raw pixels alone.
- Content hash is embedded in SVG, OBJ, GLB/scene manifests and downstream records.

## Authority

Vision output is a proposal and retains `requires_customer_confirmation`. Explicit approval promotes the exact content hash. Three.js never becomes the geometry source of truth.

## Known schema gaps

Production schema expansion remains needed for levels, columns, beams, stairs, voids, fixed elements, complete measurement provenance, warnings, approval actors and source references for every detected object.
