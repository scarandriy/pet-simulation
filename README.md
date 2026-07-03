# PET Monte-Carlo Simulation (Next.js)

3D visualization of Monte-Carlo photon transport in Positron Emission Tomography.
The physics (`lib/physics.ts`) is a faithful port of the reference `pet_3d_compton.py`:
Klein-Nishina scattering angles, the Compton energy-angle relation for energy loss,
an energy-dependent muscle attenuation curve, and absorption via a low-energy cutoff.
It has been validated in Node (correct Compton energies, forward-biased sampling,
~2-3% absorption, exact body-surface exit points).

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy (hosting)

This is a standard Next.js App Router app, so the simplest host is Vercel:

```bash
npm i -g vercel   # once
vercel            # from this folder, follow prompts
```

Any Node host works too (`npm run build && npm run start`). The scene is fully
client-rendered, so there is no server-side compute; a static/edge deploy is fine.

## Structure

- `lib/physics.ts` — pure, framework-agnostic simulation. No Three.js, no React. Unit-testable.
- `components/PetCanvas.tsx` — react-three-fiber scene. Renders what physics produces; no physics of its own. Uses drei `OrbitControls` and `Line`.
- `components/PetVisualizer.tsx` — DOM HUD + controls; dynamically imports the canvas with `ssr:false` (Three.js can't server-render).
- `app/page.tsx`, `app/layout.tsx` — Next.js entry.

## Handoff notes for Claude Code (in-browser iteration)

The physics is done and verified; do not change `lib/physics.ts` logic. The rendering
layer is a strong starting point but wants a real browser to polish. Focus areas:

1. **Verify it boots.** `npm install && npm run dev`; confirm the canvas renders and
   events play. Check the `@react-three/fiber` / `@react-three/drei` / `three` versions
   in `package.json` actually resolve together; bump as a set if drei complains about
   the three or fiber version (these three must be mutually compatible).
2. **`revealed()` scatter matching** in `PetCanvas.tsx` uses `Vector3.equals` to find
   which scatter points are revealed. It works because points are the same values, but
   consider matching by vertex index instead for robustness.
3. **Auto-advance.** Currently `onArrive` just sets a flag; wire an optional timer in
   `PetVisualizer` to move to the next event a few seconds after arrival, scaled by speed.
4. **Trail glow.** drei `<Line>` gives real width; for extra bloom add
   `@react-three/postprocessing` with a subtle `Bloom` pass.
5. **Detector realism (optional).** Ring is planar and lights nothing yet; to make hits
   light the nearest crystal, lift the block meshes into state and highlight on arrival,
   or upgrade to a cylinder with real ray intersection (lets some photons escape axially,
   a nice teaching point).
6. **Responsiveness.** HUD panels are fixed-position; add breakpoints so they don't
   overlap on narrow screens.
7. **Live energy readout (optional).** Show each photon's current keV near its head as
   it travels, using the per-vertex energy already stored in `physics.ts`.
