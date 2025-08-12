"use client";

import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <header style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "72px",
            height: "72px",
            background: "url('/images/aikinote-logo.png') no-repeat center",
            backgroundSize: "contain",
            marginLeft: "8px",
          }}
        />
      </header>
      <div style={{ maxWidth: "327px", margin: "0 auto" }}>{children}</div>
    </>
  );
}
