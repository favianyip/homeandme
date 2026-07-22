# Render Pipeline

## Current path

Approved canonical geometry and approved measured layout are passed to Blender 4.0.2. The scene records project ID, geometry revision/hash, layout ID/hash, asset-library version and style. Wall openings are real voids. Approved layout placements become dimensioned scene objects with placement, asset and room IDs.

Outputs:

- Hash-bound canonical geometry JSON
- Approved layout JSON
- Blender `.blend`
- GLB
- Four PNG views: overview, living, bedroom and kitchen
- Blender log and artifact hashes

The browser fetches private GLB bytes through an expiring URL, validates origin/content type/size and `glTF` magic, then passes bytes to `three-d-stage.setGlb()`. Replaced GPU resources are disposed.

## Consistency

A render set references exact geometry, layout, brief, model, material, lighting, camera and renderer versions. Journey shows all four views before explicit design approval.

## Honest limitation

Current Eevee/procedural output proves dimensional same-scene rendering but is BIM-style, not customer-grade photorealism. Production completion requires high-detail licensed measured assets, PBR materials, improved cameras/lighting, Cycles or equivalent high-quality rendering, clipping/light-leak tests and visual acceptance.

Free-form image generation is not an architectural authority and is not used in the passing E2E.
