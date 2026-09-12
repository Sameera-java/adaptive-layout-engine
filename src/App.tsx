import { useMemo, useState } from "react";
import { defineAd } from "./spec";
import { surfaces, type SurfaceProfile } from "./surfaces";
import { resolveLayout, describeFlow } from "./resolver";
import { RenderDom } from "./render-dom";

// A single spec, defined once. The resolver adapts this differently per surface below.
const adSpec = defineAd({
  elements: [
    { id: "headline", type: "text", role: "primary", priority: 1, content: "Summer Sale — 40% Off" },
    { id: "product-image", type: "image", role: "hero", priority: 1, content: "/product.svg" },
    { id: "cta", type: "button", role: "action", priority: 2, content: "Shop Now" },
    { id: "price", type: "text", role: "secondary", priority: 2, content: "$29.99" },
    { id: "logo", type: "image", role: "branding", priority: 3, content: "LOGO" },
  ],
});

const surfaceNames = Object.keys(surfaces);

// A genuinely cramped 5th profile (not enough width for every element's
// minimum size), simulating a surface never defined in surfaces.ts.
const tightBanner: SurfaceProfile = {
  width: 300,
  height: 80,
  safeArea: { top: 4, right: 8, bottom: 4, left: 8 },
  minTapTarget: 32,
  minTextSize: 11,
  viewingDistance: "near",
  touchOnly: false,
};

const page: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  minHeight: "100vh",
  background: "#0b0b0f",
  color: "#e8e8ec",
  padding: "40px 20px",
};

const container: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
};

const card: React.CSSProperties = {
  background: "#16161d",
  border: "1px solid #26262f",
  borderRadius: 12,
  padding: "16px 20px",
  marginBottom: 20,
};

export default function App() {
  const [surfaceKey, setSurfaceKey] = useState<string>(surfaceNames[0]);
  const [showTight, setShowTight] = useState(false);

  const surface = showTight ? tightBanner : surfaces[surfaceKey];
  const layout = useMemo(() => resolveLayout(adSpec, surface), [surface]);
  const flow = useMemo(() => describeFlow(surface), [surface]);
  const scale = surface.width > 640 ? 640 / surface.width : 1;

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Adaptive layout engine</h1>
        <p style={{ color: "#8b8b95", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 520 }}>
          One ad spec, resolved live per surface. The resolver reads aspect
          ratio and constraints only — never a surface's name — so the
          checkbox below feeds it a surface it has never seen.
        </p>

        <div style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <select
              value={surfaceKey}
              disabled={showTight}
              onChange={(e) => setSurfaceKey(e.target.value)}
              style={{
                padding: "7px 10px",
                fontSize: 13.5,
                background: "#0f0f14",
                color: "#e8e8ec",
                border: "1px solid #2c2c36",
                borderRadius: 6,
              }}
            >
              {surfaceNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({surfaces[name].width}×{surfaces[name].height})
                </option>
              ))}
            </select>

            <label style={{ fontSize: 13.5, display: "flex", gap: 7, alignItems: "center", color: "#c4c4cc" }}>
              <input type="checkbox" checked={showTight} onChange={(e) => setShowTight(e.target.checked)} />
              Simulate unseen surface (300×80)
            </label>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12.5, color: "#8b8b95" }}>
            <span>
              Flow: <strong style={{ color: "#e8e8ec" }}>{flow}</strong>
            </span>
            <span>
              {surface.width}×{surface.height}px
            </span>
          </div>

          {layout.dropped.length > 0 && (
            <p style={{ color: "#ffb020", fontSize: 12.5, margin: "10px 0 0" }}>
              Degraded: dropped {layout.dropped.join(", ")} for lack of space.
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
              borderRadius: 10,
            }}
          >
            <RenderDom spec={adSpec} layout={layout} />
          </div>
        </div>
      </div>
    </div>
  );
}
