# Model Registry

| Role | Model/tool | Version/source | Hardware | Input → output | Strength | Limitation/fallback | Last validation |
|---|---|---|---|---|---|---|---|
| OCR | Tesseract OCR | Ubuntu package | CPU | Raster crop → room/scale text | Local, deterministic invocation | Clean print only; unresolved text remains unverified | 2026-07-22 |
| Raster geometry | OpenCV deterministic pipeline | SpatialForge `raster_geometry.py` | CPU | Raster pixels → walls/rooms/opening proposals | Auditable and hash-bound | Controlled orthogonal fixtures only; manual review fallback | 2026-07-22 |
| Geometry validation | SpatialForge deterministic kernel | `geometry.py` | CPU | Canonical mm geometry → issues/bounds/areas | Authority-preserving | Schema does not yet cover every architectural element | 2026-07-22 |
| Layout | Deterministic measured-asset rules | `layout_engine.py`, asset library `mvp-1` | CPU | Approved geometry + brief → three options | Uses real dimensions and basic collision/fit checks | Preliminary clearances; designer review required | 2026-07-22 |
| Scene/model | Blender | 4.0.2 Ubuntu ARM64 | CPU/Eevee | Geometry + layout → GLB/.blend/renders | Same-scene geometry and placement hashes | Current assets/materials are not photoreal production quality | 2026-07-22 |
| Language reasoning | None in authoritative staging path | — | — | — | No LLM can silently alter geometry | Natural-language revision interpreter not implemented | — |
| Image enhancement | Disabled | — | — | — | Prevents geometry drift | May be added only with depth/normal/segmentation checks | — |

No model weights are stored in the public repository. External floor-plan processing is disabled unless explicitly configured and consented.
