"use client";
// components/PetVisualizer.tsx
// HUD + controls in the DOM overlay; the WebGL canvas is loaded client-only
// (Three.js cannot server-render), so it is dynamically imported with ssr:false.

import dynamic from "next/dynamic";
import { useMemo, useState, useCallback } from "react";
import { buildStoryline, PetEvent, E_CUTOFF } from "@/lib/physics";

const PetCanvas = dynamic(() => import("./PetCanvas"), { ssr: false });

function describe(ev: PetEvent): string {
  const nsc = ev.a.vertices.filter(v => v.scatter).length + ev.b.vertices.filter(v => v.scatter).length;
  const both = ev.a.fate === "escaped" && ev.b.fate === "escaped";
  if (both) {
    return nsc === 0
      ? "Both photons escaped straight out — a clean coincidence; the line of response passes right through the source."
      : `Both photons escaped after Compton-scattering ${nsc} time(s), bending and losing energy on the way out. Scatter tilts the line of response off the true source: the noise real PET must correct.`;
  }
  return `One photon scattered repeatedly, each collision draining its energy until it fell below ${E_CUTOFF} keV, where photoelectric absorption takes over — so it never escaped the body. Its partner did escape.`;
}

export default function PetVisualizer() {
  const events = useMemo(() => buildStoryline(), []);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [arrived, setArrived] = useState(false);
  const [runId, setRunId] = useState(0);
  const [showAxes, setShowAxes] = useState(true);

  const go = useCallback((i: number) => {
    setIdx((i + events.length) % events.length);
    setArrived(false);
    setPlaying(true);
    setRunId((n) => n + 1);
  }, [events.length]);

  const ev = events[idx];

  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(1200px 800px at 60% -10%, #111a2e, #05070d)", color: "#e8eef7", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <PetCanvas event={ev} playing={playing} speed={speed} runId={runId} showAxes={showAxes} onArrive={() => setArrived(true)} />

      <div style={{ position: "absolute", top: 20, left: 24, maxWidth: "44ch", pointerEvents: "none" }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>PET — Monte-Carlo photon transport</h1>
        <p style={{ margin: "4px 0 0", color: "#8ea0bd", fontSize: 12.5 }}>
          Each annihilation emits two 511 keV photons back-to-back. They travel through tissue,
          Compton-scatter (losing energy and bending), then escape the body — or degrade
          and get absorbed inside it.
        </p>
      </div>

      <div style={{ position: "absolute", left: 24, bottom: 92, maxWidth: "52ch", background: "rgba(14,20,34,.72)", border: "1px solid rgba(120,150,200,.18)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(9px)", fontSize: 13, pointerEvents: "none" }}>
        {arrived ? describe(ev) : "Emission — a positron–electron annihilation fires two 511 keV photons in exactly opposite directions."}
      </div>
      <div style={{ position: "absolute", left: 24, bottom: 64, color: "#8ea0bd", fontSize: 12, pointerEvents: "none" }}>
        Event {idx + 1} of {events.length}
      </div>

      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 22, display: "flex", gap: 10, alignItems: "center", background: "rgba(14,20,34,.72)", border: "1px solid rgba(120,150,200,.18)", borderRadius: 999, padding: "8px 12px", backdropFilter: "blur(9px)" }}>
        <button onClick={() => go(idx - 1)} style={btn}>‹ Prev</button>
        <button onClick={() => setPlaying(p => !p)} style={{ ...btn, background: "linear-gradient(180deg,#2aa8dd,#1b7fb0)", fontWeight: 600 }}>{playing ? "Pause" : "Play"}</button>
        <button onClick={() => go(idx + 1)} style={btn}>Next ›</button>
        <button onClick={() => go(idx)} style={btn}>Replay</button>
        <label style={{ color: "#8ea0bd", fontSize: 12, display: "flex", gap: 7, alignItems: "center" }}>
          Speed <input type="range" min={0.3} max={3} step={0.1} value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} />
        </label>
        <label style={{ color: "#8ea0bd", fontSize: 12, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={showAxes} onChange={e => setShowAxes(e.target.checked)} /> Axes
        </label>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  border: "1px solid rgba(120,150,200,.18)", background: "rgba(255,255,255,.04)",
  color: "#e8eef7", borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer",
};
