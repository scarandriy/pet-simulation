<div align="center">

# 🔬 PET Monte-Carlo Simulation

**Interactive 3D visualization of 511 keV photon transport in Positron Emission Tomography.**

_Physics-accurate. Framework-agnostic core. Runs entirely in the browser._

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![react-three-fiber](https://img.shields.io/badge/r3f-8-black?style=for-the-badge&logo=react&logoColor=61DAFB)](https://r3f.docs.pmnd.rs/)

[![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-8A2BE2?style=flat-square)](#-contributing)
[![Made with love](https://img.shields.io/badge/made%20with-%E2%9D%A4-red?style=flat-square)](#)

</div>

---

## 📖 About

**PET Monte-Carlo Simulation** is a browser-based, physics-accurate visualization of what actually
happens to the two 511 keV photons emitted by a positron–electron annihilation as they travel through
human tissue.

The physics core (`lib/physics.ts`) is a faithful TypeScript port of a Python reference implementation
(`pet_3d_compton.py`). It implements:

- **Klein–Nishina** angular distribution for Compton scattering
- **Compton energy–angle relation** for step-by-step energy loss
- **Energy-dependent linear attenuation** curves for muscle, fat, bone, and lung
- **Photoelectric absorption** via a low-energy cutoff
- **Exact spherical exit points** using analytic ray–sphere intersection

Validated against the reference: identical Compton energies (255.5 keV at 90°, 170.3 keV at back-scatter),
forward-biased Klein–Nishina sampling, and a ~2–3% absorption rate inside a 15 cm soft-tissue sphere.

## ✨ Features

- ⚛️ **Physics-accurate photon transport** — not a cartoon animation; every scatter angle and energy loss is sampled correctly
- 🎬 **Two modes** — a narrated animated storyline for teaching, plus a static batch view for exploring statistics
- 🎛️ **Configurable simulation** — swap tissue (muscle / fat / bone / lung), tune body radius, source range, absorption cutoff, and event count in real time
- 🚀 **GPU-instanced rendering** — thousands of photon paths in only a handful of draw calls via merged `BufferGeometry` and `InstancedMesh`
- 🌐 **100% client-side** — no backend, no server compute; deploys to any static/edge host
- 🧪 **Framework-agnostic core** — `lib/physics.ts` has zero Three.js / React imports and is unit-testable in plain Node

## 🖼️ Preview

<div align="center">

<!-- Add a screenshot or GIF at docs/preview.png and it will render here -->
<img src="docs/preview.png" alt="PET Monte-Carlo Simulation screenshot" width="720" onerror="this.style.display='none'"/>

_Photon paths coloured by energy — blue markers for escape, red for absorption, yellow stars for Compton interactions._

</div>

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (or pnpm / yarn)

### Install & run

```bash
git clone https://github.com/<your-user>/pet-next.git
cd pet-next
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | What it does                                 |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the Next.js dev server with HMR        |
| `npm run build` | Production build (`.next/`)                  |
| `npm run start` | Serve the production build                   |
| `npm run lint`  | Run ESLint over the app                      |

## ☁️ Deploy

The scene is fully client-rendered, so any static/edge host works.

### Vercel (recommended)

```bash
npm i -g vercel   # once
vercel            # from this folder, follow prompts
```

### Any Node host

```bash
npm run build
npm run start     # serves on port 3000
```

## 🧱 Project Structure

```
pet-next/
├── app/
│   ├── layout.tsx              # Root layout — renders <Nav /> + page slot
│   ├── page.tsx                # /               → redirects to /visualization
│   ├── visualization/
│   │   └── page.tsx            # /visualization  → curated animated storyline
│   └── simulation/
│       └── page.tsx            # /simulation     → configurable batch view
├── components/
│   ├── Nav.tsx                 # Shared top navigation (Next.js <Link>)
│   ├── PetVisualizer.tsx       # Storyline HUD + controls
│   ├── PetCanvas.tsx           # react-three-fiber scene for the storyline
│   ├── SimulationView.tsx      # Simulation HUD + controls
│   └── SimCanvas.tsx           # GPU-instanced batch renderer
├── lib/
│   └── physics.ts              # Pure, framework-agnostic Monte-Carlo core
├── next.config.js
├── tsconfig.json
└── package.json
```

## 🛠️ Tech Stack

<table>
<tr>
  <td align="center" width="120">
    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" width="40" height="40" alt="Next.js"/><br/>
    <b>Next.js 14</b><br/>
    <sub>App Router</sub>
  </td>
  <td align="center" width="120">
    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40" height="40" alt="React"/><br/>
    <b>React 18</b><br/>
    <sub>Client components</sub>
  </td>
  <td align="center" width="120">
    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="40" height="40" alt="TypeScript"/><br/>
    <b>TypeScript 5</b><br/>
    <sub>Strict mode</sub>
  </td>
  <td align="center" width="120">
    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/threejs/threejs-original.svg" width="40" height="40" alt="Three.js"/><br/>
    <b>Three.js r160</b><br/>
    <sub>WebGL rendering</sub>
  </td>
  <td align="center" width="120">
    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40" height="40" alt="R3F"/><br/>
    <b>react-three-fiber</b><br/>
    <sub>+ drei helpers</sub>
  </td>
</tr>
</table>

## 🔬 How the Physics Works

Every simulated event follows the same loop until each photon either escapes the body or falls below the absorption cutoff:

1. **Sample a step length** from an exponential distribution using the tissue's linear attenuation coefficient `μ(E)` at the photon's current energy.
2. **Advance** the photon along its direction by that step.
3. **Test the body boundary** — if the step would exit the tissue sphere, snap the photon to the exact surface crossing point and mark it as *escaped*.
4. **Sample a Compton scattering angle** from the Klein–Nishina distribution via rejection sampling.
5. **Reduce the energy** using the Compton energy–angle relation.
6. **Cutoff check** — if the new energy is below `E_CUTOFF` (default 20 keV), mark the photon as *absorbed* (photoelectric-dominated regime).
7. **Rotate the direction** by the scattered angle in true 3D (arbitrary azimuth), and repeat from step 1.

All results (vertex positions, energies, scatter flags, fate) are stored in a plain data structure that the renderer just consumes — the physics has zero rendering concerns.

## 🗺️ Roadmap

- [ ] Auto-advance to the next event after arrival (with a speed-scaled timer)
- [ ] Live per-photon energy readout near the moving head
- [ ] Postprocessing bloom pass on photon trails (`@react-three/postprocessing`)
- [ ] Responsive HUD breakpoints for narrow screens
- [ ] Line-of-response reconstruction accuracy metric across the batch
- [ ] Optional detector ring with real ray–crystal intersection

## 🤝 Contributing

Contributions of every size are welcome — bug reports, feature ideas, and pull requests all help.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-thing`)
3. Commit your changes (`git commit -m "feat: add amazing thing"`)
4. Push to the branch (`git push origin feat/amazing-thing`)
5. Open a Pull Request

Please keep `lib/physics.ts` numerically consistent with the reference implementation — if you touch it, run a quick validation of Compton energies at 90° and 180° first.

## 📜 License

Released for **educational use**. The tissue attenuation curves are approximate NIST/XCOM-style
educational values and must **not** be used for dosimetry or clinical decisions.

## 🙏 Acknowledgments

- Reference implementation: `pet_3d_compton.py`
- [Three.js](https://threejs.org/) and the [react-three-fiber](https://r3f.docs.pmnd.rs/) / [drei](https://github.com/pmndrs/drei) ecosystem
- Klein–Nishina cross-section and NIST/XCOM attenuation data
- The Next.js team for the App Router

---

<div align="center">

Made with ⚛️ + 🔺 + ⚡

</div>
