"use client";
// components/SimCanvas.tsx
// Static batch view for Simulation mode: renders every generated annihilation
// at once (full paths, no playback), like the matplotlib reference plot.
//
// Perf: at a few hundred events, one <Line>/<mesh> per photon/marker means
// thousands of draw calls and React nodes — that's what causes visible lag.
// Instead everything is merged into a handful of draw calls total, regardless
// of event count: one LineSegments geometry for all photon paths, one
// InstancedMesh each for scatter/endpoint markers, and one Points cloud for
// annihilation stars.

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { PetEvent, energyColor } from "@/lib/physics";
import { Axes, TissueBody, makeStarTexture } from "./PetCanvas";

// ---- every photon path segment, one LineSegments draw call ----------------
function PhotonLines({ events }: { events: PetEvent[] }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const ev of events) {
      for (const ph of [ev.a, ev.b]) {
        for (let i = 0; i < ph.vertices.length - 1; i++) {
          const v0 = ph.vertices[i], v1 = ph.vertices[i + 1];
          positions.push(...v0.pos, ...v1.pos);
          colors.push(...energyColor(v0.energy), ...energyColor(v1.energy));
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [events]);

  useDisposeOnChange(geometry);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.85} />
    </lineSegments>
  );
}

// dispose the previous geometry buffer when it's replaced, so regenerating
// large batches repeatedly doesn't leak GPU memory
function useDisposeOnChange(geometry: THREE.BufferGeometry) {
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
}

// ---- one InstancedMesh draw call for any number of same-shape markers -----
function MarkerInstances({ positions, colors, radii, segments = 8 }: {
  positions: THREE.Vector3[]; colors: THREE.Color[]; radii: number[]; segments?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < positions.length; i++) {
      m.makeScale(radii[i], radii[i], radii[i]).setPosition(positions[i]);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [positions, colors, radii]);

  if (positions.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} frustumCulled={false}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

// ---- every annihilation point, one Points draw call ------------------------
function StarPoints({ events }: { events: PetEvent[] }) {
  const starTex = useMemo(() => makeStarTexture("#ffffff"), []);
  const geometry = useMemo(() => {
    const positions = new Float32Array(events.length * 3);
    events.forEach((ev, i) => {
      positions[i * 3] = ev.p0[0];
      positions[i * 3 + 1] = ev.p0[1];
      positions[i * 3 + 2] = ev.p0[2];
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [events]);
  useDisposeOnChange(geometry);

  return (
    <points geometry={geometry}>
      <pointsMaterial map={starTex} size={5} sizeAttenuation transparent depthWrite={false} />
    </points>
  );
}

export default function SimCanvas({ events, bodyR, showAxes, axesSize = 60 }: {
  events: PetEvent[]; bodyR: number; showAxes: boolean; axesSize?: number;
}) {
  const scatters = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const yellow = new THREE.Color("#ffe600");
    for (const ev of events) {
      for (const ph of [ev.a, ev.b]) {
        const verts = ph.fate === "absorbed" ? ph.vertices.slice(0, -1) : ph.vertices;
        for (const v of verts) {
          if (!v.scatter) continue;
          positions.push(new THREE.Vector3(...v.pos));
          colors.push(yellow);
        }
      }
    }
    return { positions, colors, radii: positions.map(() => 0.5) };
  }, [events]);

  const endpoints = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const radii: number[] = [];
    const escapedColor = new THREE.Color("#5ad1ff");
    const absorbedColor = new THREE.Color("#ff5a7a");
    for (const ev of events) {
      for (const ph of [ev.a, ev.b]) {
        positions.push(new THREE.Vector3(...ph.endpoint));
        colors.push(ph.fate === "escaped" ? escapedColor : absorbedColor);
        radii.push(ph.fate === "escaped" ? 0.9 : 0.5);
      }
    }
    return { positions, colors, radii };
  }, [events]);

  return (
    <Canvas camera={{ position: [70, 42, 88], fov: 50 }} dpr={[1, 2]} style={{ background: "transparent" }}>
      <fogExp2 attach="fog" args={["#05070d", 0.0018]} />
      <ambientLight color="#5b6b8c" intensity={0.7} />
      <pointLight color="#9fd0ff" intensity={1.1} position={[60, 80, 60]} />
      <pointLight color="#ff6a8a" intensity={0.5} position={[-70, -30, -40]} />

      <TissueBody bodyR={bodyR} />

      {showAxes && <Axes size={axesSize} />}
      <PhotonLines events={events} />
      <MarkerInstances positions={scatters.positions} colors={scatters.colors} radii={scatters.radii} segments={6} />
      <MarkerInstances positions={endpoints.positions} colors={endpoints.colors} radii={endpoints.radii} segments={8} />
      <StarPoints events={events} />

      <OrbitControls
        enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.4}
        minDistance={axesSize * 0.6} maxDistance={axesSize * 3.2}
      />
    </Canvas>
  );
}
