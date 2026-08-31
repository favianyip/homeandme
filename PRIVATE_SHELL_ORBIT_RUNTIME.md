# Private shell orbit runtime contract

Status: bounded local WebGL2 runtime implemented; private workflow and orbit feature remain
default-off and undeployed.

The private shell surface may not call a CDN, reinterpret a reference PNG as 3D or give unverified
bytes to WebGL. `private-shell-orbit-viewer.js` therefore separates artifact authority from
rendering. It independently re-hashes the GLB returned by the already authenticated review client,
checks the exact current shell version/hash, artifact-manifest hash, role, MIME and byte size, and
requires the `same-origin-private-no-store/1` transport receipt. Only then may it create one
in-memory Blob URL and a second private ArrayBuffer copy for the renderer.

## Implemented runtime

`private-shell-glb.js` is a bounded project-owned glTF 2.x binary parser.
`private-shell-webgl-orbit-runtime.js` uploads its verified CPU scene directly to WebGL2. Neither
file imports a package, calls `fetch`, creates an image, resolves a URI or carries export/authoring
code. The old `three-d-stage.js` remains ineligible because it imports Three.js from `unpkg.com` and
contains OBJ/GLB export behaviour.

The private surface uses this exact provider shape:

```js
{
  runtimeContract: 'homeandme-bundled-read-only-glb-orbit-runtime/1',
  inputContract: 'pointer-touch-keyboard-orbit/1',
  renderPolicy: 'self-contained-object-url-no-network/1',
  networkAccessEnabled: false,
  authoringEnabled: false,
  async mount({ viewport, objectUrl, artifactBytes, receipt, signal, readOnly }) {
    // Decode only artifactBytes. objectUrl remains a receipt-lifetime handle; it is not fetched.
    return {
      dispose() {},
      resetView() {},
    };
  },
}
```

The provider receives no service URL or bearer token. It decodes only the supplied ArrayBuffer and
never dereferences the Blob URL. It has no fetch fallback, environment map, analytics, asset
resolver, editor, exporter, download action, furniture generator or design/render control.

The owned decoder supports the exact current shell profile:

- one internal GLB BIN chunk and one selected scene;
- node hierarchies with matrix or translation/rotation/scale transforms;
- indexed or non-indexed triangle primitives;
- float POSITION/NORMAL attributes, optional float TEXCOORD_0 and unsigned indices;
- base-colour, double-sided and BLEND material state;
- the current shell's declared `KHR_lights_punctual`, `KHR_materials_transmission` and
  `KHR_materials_ior` records.

Punctual-light records are structurally validated, while the inspection shader intentionally uses
fixed neutral local lighting. Transmission and IOR are validated; transmission is represented by
bounded review transparency rather than physical refraction. This is a geometry inspection view,
not material/render fidelity.

## Required interaction and teardown

- Pointer drag and one-finger drag orbit.
- Wheel and two-finger pinch zoom.
- Shift-drag and Shift + arrow keys pan.
- Arrow keys orbit, `+` / `-` zoom, and `0` or the visible Reset view control restore framing.
- A focus-visible viewport with an accurate accessible name and reduced-motion-safe behaviour.
- Deterministic camera framing from the decoded shell bounds, with no auto-rotation by default.
- `dispose()` releases GPU buffers, materials, textures, observers and input handlers.
- Abort, shell revision/hash change, return-to-correction, a new sync and surface disposal stop the
  runtime and revoke the sole Blob URL synchronously.

Context loss is terminal: the canvas hides, a fatal event is emitted, the controlling receipt
session is closed and a fresh verified shell is required. It never attempts silent context restore.

## Verified evidence

The real generated HDB4 shell decodes to 208 selected-scene nodes, 154 triangle primitives, 3,720
vertices and 5,592 indices. Chromium renders non-background pixels with zero runtime network calls.
Separate browser modes prove keyboard acceptance, terminal context-loss handling and deterministic
canvas teardown. Desktop and mobile screenshots are stored outside the public repository at:

- `/home/favianyip/private-shell-webgl-orbit-desktop.png`
- `/home/favianyip/private-shell-webgl-orbit-mobile.png`

The noindex fixture is `tests/private-shell-webgl-orbit.browser.html`. With `/home/favianyip`
served as the local root, its default mode proves the real render; `?mode=context-loss` and
`?mode=teardown` prove the two terminal lifecycle paths. The fixture fetches the local generated GLB
once as test setup, then replaces `fetch` with a rejecting counter before mounting the runtime.

## Exact limitations

- WebGL2 is required; there is no WebGL1 or raster fallback.
- Textures, images, animation, skins, morph targets, cameras, sparse/normalised accessors,
  non-triangle modes, compression and unknown extensions fail closed.
- The renderer does not prove full opening-envelope visibility, source-plan recall, HDB authenticity,
  regulation, furniture fit or as-built similarity.
- Customer release still needs an authenticated private host, actual project/backend browser E2E and
  a separate visual-composition acceptance decision. Current camera PNGs remain manually rejected.

Neither this contract nor the green local orbit runtime unlocks furniture, design, AI rendering,
quotation or payment. Those remain separate dependency-ordered product stages.
