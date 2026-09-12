import { useMemo, useState } from "react";
import { defineAd } from "./spec";
import { surfaces, type SurfaceProfile } from "./surfaces";
import { resolveLayout } from "./resolver";
import { RenderDom } from "./render-dom";

// A single spec, defined once. The resolver adapts this differently per surface below.
const adSpec = defineAd({
  elements: [
    { id: "headline", type: "text", role: "primary", priority: 1, content: "Summer Sale — 40% Off" },
    { id: "product-image", type: "image", role: "hero", priority: 1 },
    { id: "cta", type: "button", role: "action", priority: 2, content: "Shop Now" },
    { id: "price", type: "text", role: "secondary", priority: 2, content: "$29.99" },
    { id: "logo", type: "image", role: "branding", priority: 3, content: "LOGO" },
  ],
});

const surfaceNames = Object.keys(surfaces);

// A tricky 5th profile with intentionally little vertical room, to demonstrate
// graceful degradation (branding should drop before headline/CTA are touched).
const tightBanner: SurfaceProfile = {
  width: 300,
  height: 80,
  safeArea: { top: 4, right: 8, bottom: 4, left: 8 },
  minTapTarget: 32,
  minTextSize: 11,
  viewingDistance: "near",
  touchOnly: false,
};

export default function App() {
  const [surfaceKey, setSurfaceKey] = useState<string>(surfaceNames[0]);
  const [showTight, setShowTight] = useState(false);

  const surface = showTight ? tightBanner : surfaces[surfaceKey];
  const layout = useMemo(() => resolveLayout(adSpec, surface), [surface]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, color: "#eee", background: "#0b0b0f", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22 }}>Adaptive Layout Engine — Demo</h1>
      <p style={{ color: "#999", maxWidth: 640 }}>
        One ad spec, resolved live into a different arrangement per surface. The
        resolver never checks a surface's name — it reads aspect ratio and
        constraints only, so the "Tight banner" option below simulates an
        unseen 5th surface and still resolves correctly.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
        <select
          value={surfaceKey}
          disabled={showTight}
          onChange={(e) => setSurfaceKey(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 14 }}
        >
          {surfaceNames.map((name) => (
            <option key={name} value={name}>
              {name} ({surfaces[name].width}×{surfaces[name].height})
            </option>
          ))}
        </select>

        <label style={{ fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={showTight} onChange={(e) => setShowTight(e.target.checked)} />
          Simulate unseen surface (728×90 tight banner)
        </label>
      </div>

      {layout.dropped.length > 0 && (
        <p style={{ color: "#ffb020", fontSize: 13 }}>
          Degraded: dropped {layout.dropped.join(", ")} for lack of space.
        </p>
      )}

      <div style={{ display: "inline-block", transform: surface.width > 800 ? "scale(0.5)" : "none", transformOrigin: "top left" }}>
        <RenderDom spec={adSpec} layout={layout} />
      </div>
    </div>
  );
}
