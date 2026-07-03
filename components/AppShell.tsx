"use client";
// components/AppShell.tsx
// Top-level tab switcher: "Visualization" (curated animated demo) vs
// "Simulation" (fully configurable Monte-Carlo batch/animated view).

import { useState } from "react";
import PetVisualizer from "./PetVisualizer";
import SimulationView from "./SimulationView";

const HEADER_H = 44;

export default function AppShell() {
  const [tab, setTab] = useState<"viz" | "sim">("viz");
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          height: HEADER_H, display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
          background: "#0a0f1c", borderBottom: "1px solid rgba(120,150,200,.18)", position: "relative", zIndex: 10,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ color: "#8ea0bd", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginRight: 14 }}>
          PET MONTE-CARLO
        </span>
        <TabButton active={tab === "viz"} onClick={() => setTab("viz")}>Visualization</TabButton>
        <TabButton active={tab === "sim"} onClick={() => setTab("sim")}>Simulation</TabButton>
      </div>
      <div style={{ position: "absolute", top: HEADER_H, left: 0, right: 0, bottom: 0 }}>
        {tab === "viz" ? <PetVisualizer /> : <SimulationView />}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none", background: active ? "rgba(255,255,255,.12)" : "transparent",
        color: active ? "#e8eef7" : "#8ea0bd", borderRadius: 8, padding: "6px 14px",
        fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
