"use client";
// components/PetCanvas.tsx
// react-three-fiber scene. Renders whatever lib/physics.ts produces; contains
// no physics of its own. Uses drei's OrbitControls (robust, no CDN script) and
// drei's Line (real thick trails, unlike raw WebGL lines).

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Text } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import {
  PetEvent, Photon, Vec3, BODY_R, energyColor,
} from "@/lib/physics";

// ---- flat, camera-facing star sprite (matches matplotlib's star marker) ----
export function makeStarTexture(color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2, cy = size / 2, outerR = size * 0.46, innerR = outerR * 0.42, points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.22;
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ---- precompute per-photon draw data (cumulative length + colored points) ----
interface DrawPhoton {
  pts: THREE.Vector3[];
  colors: [number, number, number][];
  cum: number[];
  total: number;
  scatters: THREE.Vector3[];
  fate: Photon["fate"];
  endpoint: THREE.Vector3;
}
function prep(ph: Photon): DrawPhoton {
  const pts = ph.vertices.map((v) => new THREE.Vector3(...v.pos));
  const colors = ph.vertices.map((v) => energyColor(v.energy));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  // the final vertex of an absorbed photon is tagged scatter:true but is really
  // the absorption point, not a Compton interaction — exclude it so it renders
  // only as the red absorption marker, never as a yellow interaction point.
  const scatterVerts = ph.fate === "absorbed" ? ph.vertices.slice(0, -1) : ph.vertices;
  const scatters = scatterVerts.filter((v) => v.scatter).map((v) => new THREE.Vector3(...v.pos));
  return {
    pts, colors, cum, total: cum[cum.length - 1] || 1e-6,
    scatters, fate: ph.fate, endpoint: new THREE.Vector3(...ph.endpoint),
  };
}

// reveal the polyline + head position up to path-length t
function revealed(dp: DrawPhoton, t: number) {
  let i = 0;
  while (i < dp.cum.length - 1 && dp.cum[i + 1] <= t) i++;
  const pts = dp.pts.slice(0, i + 1).map((p) => p.clone());
  const cols = dp.colors.slice(0, i + 1).map((c) => [...c] as [number, number, number]);
  let head = dp.pts[dp.pts.length - 1];
  let arrived = true;
  if (i < dp.pts.length - 1) {
    const f = Math.max(0, Math.min(1, (t - dp.cum[i]) / Math.max(1e-6, dp.cum[i + 1] - dp.cum[i])));
    head = dp.pts[i].clone().lerp(dp.pts[i + 1], f);
    pts.push(head.clone());
    cols.push([...dp.colors[i]] as [number, number, number]);
    arrived = false;
  }
  return { pts, cols, head, arrived, revealedScatters: dp.scatters.filter((s) => {
    const idx = dp.pts.findIndex((p) => p.equals(s));
    return idx >= 0 && dp.cum[idx] <= t;
  }) };
}

// matplotlib-style 3D box axes: a wireframe cube frames the simulation, with
// ticks + "x [cm]" / "y [cm]" / "z [cm]" labels running along the three edges
// that meet at one corner — axes sit on the outside, not through the center.
export function Axes({ size = 60, step = 20 }: { size?: number; step?: number }) {
  const s = size;
  const frameColor = "#8fb0dd";
  const edges: [Vec3, Vec3][] = useMemo(() => [
    [[-s, -s, -s], [s, -s, -s]], [[s, -s, -s], [s, s, -s]], [[s, s, -s], [-s, s, -s]], [[-s, s, -s], [-s, -s, -s]],
    [[-s, -s, s], [s, -s, s]], [[s, -s, s], [s, s, s]], [[s, s, s], [-s, s, s]], [[-s, s, s], [-s, -s, s]],
    [[-s, -s, -s], [-s, -s, s]], [[s, -s, -s], [s, -s, s]], [[s, s, -s], [s, s, s]], [[-s, s, -s], [-s, s, s]],
  ], [s]);
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let v = -Math.floor(s / step) * step; v <= s; v += step) arr.push(v);
    return arr;
  }, [s, step]);
  const off = s * 0.08;

  return (
    <group>
      {edges.map((pts, i) => (
        <Line key={i} points={pts.map((p) => new THREE.Vector3(...p))} color={frameColor} lineWidth={1.3} transparent opacity={0.6} />
      ))}

      {ticks.map((v) => (
        <Text key={`x${v}`} position={[v, -s - off, -s - off]} fontSize={2.2} color="#c3d3ec" anchorX="center" anchorY="middle">{v}</Text>
      ))}
      <Text position={[0, -s - off * 2.2, -s - off * 2.2]} fontSize={4} color="#ff8f8f" anchorX="center" anchorY="middle">x [cm]</Text>

      {ticks.map((v) => (
        <Text key={`y${v}`} position={[-s - off, v, -s - off]} fontSize={2.2} color="#c3d3ec" anchorX="center" anchorY="middle">{v}</Text>
      ))}
      <Text position={[-s - off * 2.2, 0, -s - off * 2.2]} fontSize={4} color="#8fffbb" anchorX="center" anchorY="middle">y [cm]</Text>

      {ticks.map((v) => (
        <Text key={`z${v}`} position={[-s - off, -s - off, v]} fontSize={2.2} color="#c3d3ec" anchorX="center" anchorY="middle">{v}</Text>
      ))}
      <Text position={[-s - off * 2.2, -s - off * 2.2, 0]} fontSize={4} color="#8fc0ff" anchorX="center" anchorY="middle">z [cm]</Text>
    </group>
  );
}

export function TissueBody({ bodyR }: { bodyR: number }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[bodyR, 64, 48]} />
        <meshPhongMaterial color="#2a6ea0" transparent opacity={0.13} depthWrite={false} shininess={40} specular="#88bbff" side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[bodyR, 24, 16]} />
        <meshBasicMaterial color="#8fd0ff" wireframe transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EventView({ event, playing, speed, onArrive }:
  { event: PetEvent; playing: boolean; speed: number; onArrive: () => void }) {
  const A = useMemo(() => prep(event.a), [event]);
  const B = useMemo(() => prep(event.b), [event]);
  const starTex = useMemo(() => makeStarTexture("#ffffff"), []);
  const t = useRef(0);
  const arrivedRef = useRef(false);
  const [, force] = useState(0);
  useEffect(() => { t.current = 0; arrivedRef.current = false; }, [event]);

  useFrame((_, dt) => {
    if (!playing) return;
    const maxT = Math.max(A.total, B.total);
    if (t.current < maxT) {
      t.current = Math.min(maxT, t.current + dt * 40 * speed);
      force((n) => n + 1);
    } else if (!arrivedRef.current) {
      arrivedRef.current = true;
      onArrive();
    }
  });

  const ra = revealed(A, t.current);
  const rb = revealed(B, t.current);
  const bothArrived = ra.arrived && rb.arrived;

  return (
    <group>
      {/* annihilation point — flat camera-facing star, like a matplotlib marker */}
      <sprite position={new THREE.Vector3(...event.p0)} scale={[5, 5, 1]}>
        <spriteMaterial map={starTex} transparent depthWrite={false} />
      </sprite>

      {([[ra, A], [rb, B]] as const).map(([r, dp], k) => (
        <group key={k}>
          {r.pts.length > 1 && (
            <Line points={r.pts} vertexColors={r.cols} lineWidth={2.4} transparent opacity={0.95} />
          )}
          {r.revealedScatters.map((s, i) => (
            <mesh key={i} position={s}>
              <sphereGeometry args={[0.55, 12, 12]} />
              <meshBasicMaterial color="#ffe600" />
            </mesh>
          ))}
          {!r.arrived && (
            <mesh position={r.head}>
              <sphereGeometry args={[0.5, 12, 12]} />
              <meshBasicMaterial color="#fff2b0" />
            </mesh>
          )}
          {r.arrived && (
            <mesh position={dp.endpoint}>
              <sphereGeometry args={[dp.fate === "escaped" ? 1.0 : 0.55, 16, 16]} />
              <meshBasicMaterial color={dp.fate === "escaped" ? "#5ad1ff" : "#ff5a7a"} />
            </mesh>
          )}
        </group>
      ))}

      {/* line of response if both escaped */}
      {bothArrived && A.fate === "escaped" && B.fate === "escaped" && (
        <Line points={[A.endpoint, B.endpoint]} color="#5ad1ff" lineWidth={1} transparent opacity={0.35} />
      )}
    </group>
  );
}

export default function PetCanvas({
  event, playing, speed, onArrive, runId, showAxes, bodyR = BODY_R, axesSize = 60,
}: {
  event: PetEvent; playing: boolean; speed: number; onArrive: () => void; runId: number; showAxes: boolean;
  bodyR?: number; axesSize?: number;
}) {
  return (
    <Canvas camera={{ position: [70, 42, 88], fov: 50 }} dpr={[1, 2]} style={{ background: "transparent" }}>
      <fogExp2 attach="fog" args={["#05070d", 0.0018]} />
      <ambientLight color="#5b6b8c" intensity={0.7} />
      <pointLight color="#9fd0ff" intensity={1.1} position={[60, 80, 60]} />
      <pointLight color="#ff6a8a" intensity={0.5} position={[-70, -30, -40]} />

      <TissueBody bodyR={bodyR} />

      {showAxes && <Axes size={axesSize} />}
      <EventView key={runId} event={event} playing={playing} speed={speed} onArrive={onArrive} />

      <OrbitControls
        enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.5}
        minDistance={axesSize * 0.6} maxDistance={axesSize * 3.2}
      />
    </Canvas>
  );
}
