// lib/physics.ts
// Monte-Carlo photon transport for PET — faithful TypeScript port of
// pet_3d_compton.py. Framework- and renderer-agnostic: uses plain [x,y,z]
// tuples so it can be unit-tested in Node and reused anywhere.
//
// Validated against the Python/JS reference: identical Compton energies
// (255.5 keV at 90 deg, 170.3 at backscatter), Klein-Nishina forward bias,
// muscle-mu curve, ~2-3% absorption, exact body-surface exit points.

export type Vec3 = [number, number, number];

export const MEC2 = 511;      // electron rest energy [keV]
export const E0 = 511;        // annihilation photon energy [keV]
export const BODY_R = 15;     // body radius [cm]
export const RING_R = 40;     // detector distance [cm]
export const E_CUTOFF = 20;   // absorption threshold [keV]

// ---- tissue attenuation curves --------------------------------------------
// linear attenuation coefficient [1/cm] vs energy [keV], approximate
// NIST/XCOM-style curves per tissue (photoelectric-dominated at low energy,
// Compton-dominated near 511 keV). Educational approximations, not dosimetry.
export type TissueId = "muscle" | "fat" | "bone" | "lung";
export interface TissueDef { label: string; mu: number[]; }
const TISSUE_E = [10, 20, 30, 50, 100, 200, 300, 511, 1000];
export const TISSUES: Record<TissueId, TissueDef> = {
  muscle: { label: "Soft tissue / muscle", mu: [5.0, 0.82, 0.44, 0.25, 0.17, 0.14, 0.12, 0.096, 0.071] },
  fat: { label: "Fat", mu: [4.0, 0.70, 0.38, 0.22, 0.15, 0.127, 0.109, 0.088, 0.066] },
  bone: { label: "Bone (cortical)", mu: [40.0, 4.5, 1.6, 0.55, 0.26, 0.20, 0.17, 0.14, 0.106] },
  lung: { label: "Lung", mu: [1.3, 0.213, 0.114, 0.065, 0.044, 0.036, 0.031, 0.025, 0.018] },
};

function logLogInterp(xs: number[], ys: number[], E: number): number {
  E = Math.max(xs[0], Math.min(xs[xs.length - 1], E));
  const lx = Math.log(E);
  for (let i = 0; i < xs.length - 1; i++) {
    if (lx <= Math.log(xs[i + 1])) {
      const x0 = Math.log(xs[i]), x1 = Math.log(xs[i + 1]);
      const y0 = Math.log(ys[i]), y1 = Math.log(ys[i + 1]);
      return Math.exp(y0 + ((y1 - y0) * (lx - x0)) / (x1 - x0));
    }
  }
  return ys[ys.length - 1];
}

export function muFor(tissue: TissueId, E: number): number {
  return logLogInterp(TISSUE_E, TISSUES[tissue].mu, E);
}

// kept for backward compat (default tissue used by the curated demo)
export function muMuscle(E: number): number {
  return muFor("muscle", E);
}

function knShape(c: number, a: number): number {
  const P = 1 / (1 + a * (1 - c));
  return P * P * (P + 1 / P - (1 - c * c));
}

// sample cos(theta) from Klein-Nishina at energy E by rejection
export function sampleCos(E: number): number {
  const a = E / MEC2;
  let gmax = 0;
  for (let i = 0; i <= 200; i++) gmax = Math.max(gmax, knShape(-1 + (2 * i) / 200, a));
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const c = -1 + 2 * Math.random();
    if (Math.random() * gmax < knShape(c, a)) return c;
  }
}

export function comptonE(E: number, c: number): number {
  return E / (1 + (E / MEC2) * (1 - c));
}

// vector helpers
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): number => Math.sqrt(dot(a, a));
const cross = (a: Vec3, b: Vec3): Vec3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

// rotate direction by polar angle (given cos) + random azimuth, in true 3D
function newDir(d: Vec3, cosT: number): Vec3 {
  const s = Math.sqrt(1 - cosT * cosT), phi = 2 * Math.PI * Math.random();
  const tmp: Vec3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(d, tmp));
  const v = cross(d, u);
  return unit(add(add(scale(u, s * Math.cos(phi)), scale(v, s * Math.sin(phi))), scale(d, cosT)));
}

// exact crossing of segment p->q with sphere radius R (p inside)
function sphereExit(p: Vec3, q: Vec3, R: number): Vec3 {
  const dd = sub(q, p);
  const A = dot(dd, dd), B = 2 * dot(p, dd), C = dot(p, p) - R * R;
  const s = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  return add(p, scale(dd, s));
}

export type Fate = "escaped" | "absorbed";
export interface Vertex { pos: Vec3; energy: number; scatter: boolean; }
export interface Photon { vertices: Vertex[]; fate: Fate; endpoint: Vec3; }
export interface PetEvent { p0: Vec3; a: Photon; b: Photon; }

export interface TransportConfig {
  bodyR: number;
  ringR: number;
  eCutoff: number;
  muFn: (E: number) => number;
}
const DEFAULT_TRANSPORT_CFG: TransportConfig = { bodyR: BODY_R, ringR: RING_R, eCutoff: E_CUTOFF, muFn: muMuscle };

// transport one photon; vertices are tagged with role + energy so the renderer
// never has to guess which point was a scatter (fixes the old 1e-6 matching).
export function transport(p0: Vec3, dir0: Vec3, energy = E0, cfg: TransportConfig = DEFAULT_TRANSPORT_CFG): Photon {
  let pos = p0.slice() as Vec3;
  let dir = dir0.slice() as Vec3;
  const vertices: Vertex[] = [{ pos: pos.slice() as Vec3, energy, scatter: false }];
  let fate: Fate = "escaped";

  while (norm(pos) < cfg.bodyR) {
    const step = -Math.log(Math.random()) / cfg.muFn(energy);   // exp(1/mu)
    const nxt = add(pos, scale(dir, step));
    if (norm(nxt) >= cfg.bodyR) {                                 // crossed surface
      pos = sphereExit(pos, nxt, cfg.bodyR);
      vertices.push({ pos: pos.slice() as Vec3, energy, scatter: false });
      break;
    }
    pos = nxt;
    const c = sampleCos(energy);
    energy = comptonE(energy, c);
    if (energy < cfg.eCutoff) {                                   // absorbed inside
      vertices.push({ pos: pos.slice() as Vec3, energy, scatter: true });
      fate = "absorbed";
      break;
    }
    vertices.push({ pos: pos.slice() as Vec3, energy, scatter: true });
    dir = newDir(dir, c);
  }

  let endpoint: Vec3;
  if (fate === "escaped") {
    endpoint = add(pos, scale(dir, cfg.ringR));
    vertices.push({ pos: endpoint.slice() as Vec3, energy, scatter: false });
  } else {
    endpoint = pos.slice() as Vec3;
  }
  return { vertices, fate, endpoint };
}

export function makeEvent(): PetEvent {
  const p0: Vec3 = [-8 + 16 * Math.random(), -8 + 16 * Math.random(), -8 + 16 * Math.random()];
  const ang = 2 * Math.PI * Math.random(), z = -1 + 2 * Math.random(), r = Math.sqrt(1 - z * z);
  const d: Vec3 = [r * Math.cos(ang), r * Math.sin(ang), z];
  return { p0, a: transport(p0, d), b: transport(p0, scale(d, -1)) };
}

// curated generators so the demo reliably shows both outcomes
export function bothEscape(): PetEvent {
  for (let t = 0; t < 20000; t++) { const e = makeEvent(); if (e.a.fate === "escaped" && e.b.fate === "escaped") return e; }
  return makeEvent();
}
export function oneAbsorbed(): PetEvent {
  for (let t = 0; t < 20000; t++) { const e = makeEvent(); if ((e.a.fate === "absorbed") !== (e.b.fate === "absorbed")) return e; }
  return makeEvent();
}

// default storyline: clean, clean, absorption, clean, absorption
export function buildStoryline(): PetEvent[] {
  return [bothEscape(), bothEscape(), oneAbsorbed(), bothEscape(), oneAbsorbed()];
}

// ---- configurable simulation mode -----------------------------------------
export interface SimConfig {
  tissue: TissueId;
  bodyR: number;
  ringR: number;
  eCutoff: number;
  rangeR: number;   // annihilation points are sampled uniformly in a cube of ±rangeR
  count: number;    // number of annihilations to simulate
}
export const DEFAULT_SIM_CONFIG: SimConfig = {
  tissue: "muscle", bodyR: BODY_R, ringR: RING_R, eCutoff: E_CUTOFF, rangeR: 8, count: 12,
};

export function makeEventWith(cfg: SimConfig): PetEvent {
  const r = cfg.rangeR;
  const p0: Vec3 = [-r + 2 * r * Math.random(), -r + 2 * r * Math.random(), -r + 2 * r * Math.random()];
  const ang = 2 * Math.PI * Math.random(), z = -1 + 2 * Math.random(), rr = Math.sqrt(1 - z * z);
  const d: Vec3 = [rr * Math.cos(ang), rr * Math.sin(ang), z];
  const tcfg: TransportConfig = { bodyR: cfg.bodyR, ringR: cfg.ringR, eCutoff: cfg.eCutoff, muFn: (E) => muFor(cfg.tissue, E) };
  return { p0, a: transport(p0, d, E0, tcfg), b: transport(p0, scale(d, -1), E0, tcfg) };
}

export function generateEvents(cfg: SimConfig): PetEvent[] {
  const events: PetEvent[] = [];
  for (let i = 0; i < cfg.count; i++) events.push(makeEventWith(cfg));
  return events;
}

// energy -> color stops (hot yellow-white at 511, orange, red near cutoff)
export function energyColor(E: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (E - E_CUTOFF) / (E0 - E_CUTOFF)));
  const hot: [number, number, number] = [1.0, 0.949, 0.69];
  const mid: [number, number, number] = [1.0, 0.541, 0.239];
  const cold: [number, number, number] = [1.0, 0.353, 0.478];
  const lerp = (a: number[], b: number[], f: number) => a.map((x, i) => x + (b[i] - x) * f);
  return (t > 0.5 ? lerp(mid, hot, (t - 0.5) * 2) : lerp(cold, mid, t * 2)) as [number, number, number];
}
