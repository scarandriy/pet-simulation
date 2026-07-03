// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PET Monte-Carlo Simulation",
  description: "3D visualization of Monte-Carlo photon transport in Positron Emission Tomography",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
