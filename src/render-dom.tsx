// ---------------------------------------------------------------------------
// render-dom.tsx — turns a ResolvedLayout into actual positioned DOM nodes.
// Knows nothing about how the layout was decided — swap this for a Canvas
// renderer and resolver.ts would not need to change.
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { AdSpec } from "./spec";
import type { ResolvedLayout } from "./resolver";

const roleStyle: Record<string, React.CSSProperties> = {
  primary: {
    fontWeight: 700,
    color: "#fff",
    textShadow: "0 1px 6px rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
  },
  secondary: {
    fontWeight: 500,
    color: "#fff",
    textShadow: "0 1px 6px rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
  },
  action: {
    background: "#ff5a3c",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    fontWeight: 700,
    boxShadow: "0 2px 10px rgba(255,90,60,0.35)",
  },
  branding: {
    background: "rgba(255,255,255,0.92)",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "#444",
  },
  hero: {
    background: "linear-gradient(135deg, #2d3fa0 0%, #6a3fb8 55%, #9c4fc9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

function HeroPlaceholder({ width, height }: { width: number; height: number }) {
  const size = Math.max(20, Math.min(40, Math.min(width, height) * 0.22));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.85 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.6" fill="#fff" stroke="none" />
        <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L4 19" />
      </svg>
      {height > 40 && (
        <span style={{ fontSize: Math.min(12, height * 0.08), color: "#fff", fontWeight: 500 }}>Product photo</span>
      )}
    </div>
  );
}

function Hero({ imageUrl, width, height }: { imageUrl?: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt="Product"
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return <HeroPlaceholder width={width} height={height} />;
}

export function RenderDom({ spec, layout }: { spec: AdSpec; layout: ResolvedLayout }) {
  const contentById = Object.fromEntries(spec.elements.map((e) => [e.id, e]));

  return (
    <div
      style={{
        position: "relative",
        width: layout.surfaceWidth,
        height: layout.surfaceHeight,
        overflow: "hidden",
        background: "#111",
        borderRadius: 10,
      }}
    >
      {layout.elements
        .filter((el) => el.visible)
        .map((el) => {
          const el0 = contentById[el.id];
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                fontSize: el.fontSize,
                boxSizing: "border-box",
                padding: el.role === "hero" ? 0 : "0 8px",
                overflow: "hidden",
                ...roleStyle[el.role],
              }}
              title={`${el.id} (${el.role})`}
            >
              {el.role === "hero" ? (
                <Hero imageUrl={el0?.content} width={el.width} height={el.height} />
              ) : (
                el0?.content ?? el.id
              )}
            </div>
          );
        })}
    </div>
  );
}
