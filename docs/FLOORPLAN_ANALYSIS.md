# Floor-plan Analysis

## Accepted operational MVP inputs

PDF, PNG, JPG and JPEG. Upload checks extension, MIME, signature and configurable byte limit; rejects selected active/embedded PDF constructs. Original bytes are private and SHA-256-addressed.

## Current controlled raster path

1. Preserve source.
2. Render the first PDF page when applicable.
3. Decode and normalize raster.
4. OCR printed labels/scale evidence.
5. Detect dominant orthogonal wall axes.
6. Recover enclosed room cells.
7. Detect door/window evidence.
8. Convert pixels to millimetres only after scale evidence.
9. Produce processed image, overlay, provisional canonical geometry and validation report.
10. Require review/approval.

## Qualified scope

The passing fixture is a clean, orthogonal, HDB-shaped synthetic plan uploaded through the customer API. Results: 4 rooms, 6 wall axes, 2 doors, 2 windows, validated scale and geometry.

This does **not** establish accuracy on arbitrary HDB, EC, condominium, landed, photographed, compressed, diagonal, irregular or multipage plans.

## Required production work

- Vector-PDF line/text extraction before rasterisation.
- Floor-plan page classification.
- Conservative scan cleanup and perspective handling.
- Printed-dimension reconciliation.
- Full detection provenance/confidence schema.
- Columns, beams, risers, shafts, stairs, voids, levels and fixed fixtures.
- Customer two-point scale calibration in Journey.
- Permissioned real-plan benchmark and actual error metrics.
