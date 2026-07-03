"use client";
// components/SimulationView.tsx
// Configurable simulation mode: tune tissue, geometry, and event count, then
// render the full batch at once (static). The WebGL canvas is client-only,
// so it's dynamically imported.

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import {
  DEFAULT_SIM_CONFIG, SimConfig, TISSUES, TissueId, generateEvents, PetEvent,
} from "@/lib/physics";

const SimCanvas = dynamic(() => import("./SimCanvas"), { ssr: false });

export default function SimulationView() {
  const [cfg, setCfg] = useState<SimConfig>(DEFAULT_SIM_CONFIG);
  const [events, setEvents] = useState<PetEvent[]>(() => generateEvents(DEFAULT_SIM_CONFIG));
  const [showAxes, setShowAxes] = useState(true);

  const set = useCallback(<K extends keyof SimConfig>(key: K, value: SimConfig[K]) => {
    setCfg((c) => ({ ...c, [key]: value }));
  }, []);

  const regenerate = useCallback((next?: SimConfig) => {
    setEvents(generateEvents(next ?? cfg));
  }, [cfg]);

  const axesSize = Math.max(60, cfg.bodyR + cfg.rangeR + 25, cfg.ringR + 20);

  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(1200px 800px at 60% -10%, #111a2e, #05070d)", color: "#e8eef7", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <SimCanvas events={events} bodyR={cfg.bodyR} showAxes={showAxes} axesSize={axesSize} />

      <div style={{ position: "absolute", top: 20, left: 24, maxWidth: "38ch", pointerEvents: "none" }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>PET — custom simulation</h1>
        <p style={{ margin: "4px 0 0", color: "#8ea0bd", fontSize: 12.5 }}>
          {events.length} annihilation{events.length === 1 ? "" : "s"} in {TISSUES[cfg.tissue].label.toLowerCase()},
          sampled within ±{cfg.rangeR} cm of the body center.
        </p>
      </div>

      <div style={panel}>
        <div style={row}>
          <span style={labelStyle}>Tissue</span>
          <select
            value={cfg.tissue}
            onChange={(e) => set("tissue", e.target.value as TissueId)}
            style={select}
          >
            {Object.entries(TISSUES).map(([id, t]) => (
              <option key={id} value={id} style={{ color: "#111" }}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={row}>
          <span style={labelStyle}><span>Annihilations</span><span>{cfg.count}</span></span>
          <input type="range" min={1} max={3000} step={1} value={cfg.count} onChange={(e) => set("count", parseInt(e.target.value, 10))} />
        </div>

        <div style={row}>
          <span style={labelStyle}><span>Source range</span><span>±{cfg.rangeR} cm</span></span>
          <input type="range" min={1} max={cfg.bodyR} step={1} value={cfg.rangeR} onChange={(e) => set("rangeR", parseFloat(e.target.value))} />
        </div>

        <div style={row}>
          <span style={labelStyle}><span>Body radius</span><span>{cfg.bodyR} cm</span></span>
          <input type="range" min={5} max={40} step={1} value={cfg.bodyR} onChange={(e) => {
            const bodyR = parseFloat(e.target.value);
            setCfg((c) => ({ ...c, bodyR, rangeR: Math.min(c.rangeR, bodyR), ringR: Math.max(c.ringR, bodyR + 5) }));
          }} />
        </div>

        <div style={row}>
          <span style={labelStyle}><span>Escape distance</span><span>{cfg.ringR} cm</span></span>
          <input type="range" min={cfg.bodyR + 5} max={120} step={1} value={cfg.ringR} onChange={(e) => set("ringR", parseFloat(e.target.value))} />
        </div>

        <div style={row}>
          <span style={labelStyle}><span>Absorption cutoff</span><span>{cfg.eCutoff} keV</span></span>
          <input type="range" min={5} max={100} step={1} value={cfg.eCutoff} onChange={(e) => set("eCutoff", parseFloat(e.target.value))} />
        </div>

        <button style={{ ...btn, width: "100%", background: "linear-gradient(180deg,#2aa8dd,#1b7fb0)", fontWeight: 600, marginTop: 4 }} onClick={() => regenerate()}>
          Regenerate
        </button>

        <label style={{ ...labelStyle, marginTop: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} /> Axes
        </label>
      </div>
    </div>
  );
}

const row: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#8ea0bd", display: "flex", justifyContent: "space-between" };
const select: React.CSSProperties = { background: "rgba(255,255,255,.06)", color: "#e8eef7", border: "1px solid rgba(120,150,200,.25)", borderRadius: 8, padding: "6px 8px" };
const panel: React.CSSProperties = {
  position: "absolute", top: 20, right: 20, width: 260, background: "rgba(14,20,34,.82)",
  border: "1px solid rgba(120,150,200,.18)", borderRadius: 12, padding: 16, backdropFilter: "blur(9px)",
};
const btn: React.CSSProperties = {
  border: "1px solid rgba(120,150,200,.18)", background: "rgba(255,255,255,.04)",
  color: "#e8eef7", borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer",
};
