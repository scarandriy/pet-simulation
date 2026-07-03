"use client";
// components/Nav.tsx
// Top navigation bar shared by every route via the root layout. Uses
// next/link for client-side transitions and next/navigation's usePathname
// to highlight the currently active section.

import Link from "next/link";
import { usePathname } from "next/navigation";

export const HEADER_H = 44;

export default function Nav() {
  const pathname = usePathname();
  return (
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
      <NavLink href="/visualization" active={pathname === "/" || pathname?.startsWith("/visualization")}>
        Visualization
      </NavLink>
      <NavLink href="/simulation" active={pathname?.startsWith("/simulation") ?? false}>
        Simulation
      </NavLink>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        border: "none", background: active ? "rgba(255,255,255,.12)" : "transparent",
        color: active ? "#e8eef7" : "#8ea0bd", borderRadius: 8, padding: "6px 14px",
        fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
