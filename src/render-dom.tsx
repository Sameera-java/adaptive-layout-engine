// ---------------------------------------------------------------------------
// render-dom.tsx — turns a ResolvedLayout into actual positioned DOM nodes.
// Knows nothing about how the layout was decided — swap this for a Canvas
// renderer and resolver.ts would not need to change.
// ---------------------------------------------------------------------------

import type { AdSpec } from "./spec";
import type { ResolvedLayout } from "./resolver";

const roleStyle: Record<string, React.CSSProperties> = {
  primary: { fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" },
  secondary: { fontWeight: 500, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" },
  action: {
    background: "#ff5a3c",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    fontWeight: 700,
  },
  branding: {
    background: "rgba(255,255,255,0.85)",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    color: "#333",
  },
  hero: {
    background: "linear-gradient(135deg, #3a3f8f, #6a4fb3)",
  },
};

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
        border: "1px solid #333",
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
                padding: el.role === "hero" ? 0 : 4,
                overflow: "hidden",
                ...roleStyle[el.role],
              }}
              title={`${el.id} (${el.role})`}
            >
              {el.role !== "hero" ? el0?.content ?? el.id : null}
            </div>
          );
        })}
    </div>
  );
}
