// app/layout.tsx
import type { Metadata } from "next";
import Nav, { HEADER_H } from "@/components/Nav";

export const metadata: Metadata = {
  title: "PET Monte-Carlo Simulation",
  description: "3D visualization of Monte-Carlo photon transport in Positron Emission Tomography",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
          <Nav />
          <div style={{ position: "absolute", top: HEADER_H, left: 0, right: 0, bottom: 0 }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
