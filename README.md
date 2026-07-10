# Mustang Fastback 1968 — Reveal (video → Three.js handoff)

Recreates the "cinematic video that becomes an interactive 3D scene"
transition: an AI video plays fullscreen while the R3F scene, with the SAME
camera pose, is already mounted behind it; at the end the video dissolves
into the scene and you take control.
Stack: Vite + React 18 + TypeScript + Tailwind v4 + React Three Fiber + drei.

## Getting started
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Add your own assets (2 files)
Copy into `public/`:
- `ford_mustang_1968.glb`   → the car (auto-normalized: centered, grounded, ~4.6m)
- `rooftop_night_2k.hdr`    → environment/lighting

The project still runs without them: placeholder car + night preset.
Compressing the GLB first is recommended: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco`

## The video workflow (built BACKWARDS)
1. Tune the scene until the initial pose looks right (the pose lives in `src/config.ts` → HANDOFF).
2. Set the browser window to 16:9 and hit **Export handoff** (top right):
   downloads `handoff_frame.png` rendered from the exact pose.
3. Generate the video with Kling using that PNG as the **end frame** (first+last
   frame conditioning): the video MUST end on that exact frame.
4. Save the video to `public/intro_placeholder.mp4` (or change the path in
   `src/config.ts` → ASSETS.introVideo). Done: the seam matches by construction.

The included `intro_placeholder.mp4` is a 3s placeholder for testing the flow.

## Seam details
- The crossfade starts ~150ms BEFORE the video ends (`EARLY_S` in Intro.tsx):
  hides the small tail-end drift typical of AI-generated video.
- The scene is mounted behind the video from the start → shaders compiled and
  the GLB loaded during the intro, so the handoff is instant.
- Color match: if the video's grading doesn't line up, adjust
  `gl.toneMappingExposure` and the lights in `Scene.tsx` (it's easier to match
  the scene to the video than the other way around).
- `prefers-reduced-motion` or a missing video → skips straight to 3D.

## Structure
- `src/config.ts`           → HANDOFF (camera pose, fov, aspect), ORBIT, ASSETS
- `src/components/Scene.tsx`→ canvas, HDR/fallback, neon rig, shadows, orbit, exporter
- `src/components/Car.tsx`  → GLB auto-fit + procedural fallback placeholder
- `src/components/Intro.tsx`→ fullscreen video, skip, early crossfade
- `src/App.tsx`             → intro→interactive state machine + Tailwind UI

Portfolio demo concept. "Ford"/"Mustang" belong to their respective owners;
use properly licensed models.


## Tuning model position + look (src/config.ts)
Common issues and where to fix them:

**Floating car** — many downloaded GLBs have stray geometry under the wheels
(shadow planes, pedestals): auto-grounding snaps to those and lifts the car.
Open the console: `Car.tsx` logs a table with each mesh's `min.y` — if one is
much lower than the rest, either hide it (`MODEL.hideNodes: ['name']`, partial
match) or compensate with `MODEL.yOffset` (negative = lower).

**Orientation / size** — `MODEL.rotationY` (radians) for the 3/4 front view,
`MODEL.scaleMul` for fine scale corrections.

**Dark environment (reference look)** — the HDR now provides ONLY
light/reflections, not the background: the visible environment is dark with
fog (`MOOD.bg/fogNear/fogFar`) and a reflective wet floor
(MeshReflectorMaterial in `Scene.tsx`). Overall exposure: `MOOD.exposure`.

**Camera handoff** — `HANDOFF.cameraPosition/target/fov` (remember to
re-export the frame if you change it).


## Environment: HDRI + neon + asphalt (R3F approach, no Blender)
The reference scene is rebuilt entirely in R3F:

- **HDRI** (`public/env.hdr`) → lights the body and gives it reflections, but
  is NOT visible: the background stays dark with fog. Download an **interior**
  HDRI (garage, parking, warehouse, tunnel) from Poly Haven (CC0, free) — a
  real HDRI has true dynamic range, AI-generated ones don't.
  To see the HDRI for debugging: `MOOD.showEnvBackground = true`.
  Without the file, it automatically falls back to the "warehouse" preset.
- **Neon** (`Neons.tsx`) → emissive mesh + rectAreaLight. BOTH are needed: an
  emissive material in Three.js *doesn't light* anything on its own.
  `toneMapped: false` and `emissiveIntensity > 1` are what trigger the Bloom.
- **Bloom** (`EffectComposer`) → what makes the neon "burn". Tune
  `BLOOM.intensity` and `luminanceThreshold` in config.
- **Wet asphalt** (`Floor.tsx`) → `MeshReflectorMaterial` (extends
  MeshStandardMaterial) with map/normalMap/roughnessMap: real reflection of
  the car + PBR detail. `FLOOR.mirror` ↑ and `roughness` ↓ = wetter.

### Textures
`public/textures/` contains color/normal/roughness maps **derived** from the
ambientCG displacement map (converted and optimized: 3 MB → 750 KB). For the
best result, download the **full set** of `CityStreetAsphaltGenericClean001`
from ambientCG (Color, NormalGL, Roughness) and replace the files, keeping the
same names.

### Recommended tuning order
1. `MOOD.envIntensity` — how much light the HDRI gives (0 = neon only)
2. `NEONS.emissiveIntensity` + `BLOOM.intensity` — the character
3. `FLOOR.mirror` / `FLOOR.roughness` — how wet it looks
4. `MOOD.fogNear/fogFar` — the depth
