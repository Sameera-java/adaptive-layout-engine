// ---------------------------------------------------------------------------
// surfaces.ts — surface profiles with real physical/interaction constraints.
//
// IMPORTANT: nothing in the resolver ever switches on a surface's *name*.
// The resolver only ever reads these typed fields. That's what lets a brand
// new, never-before-seen surface (e.g. given live in an interview) resolve
// correctly without touching resolver.ts.
// ---------------------------------------------------------------------------

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SurfaceProfile {
  width: number;
  height: number;
  /** Inset from the edges that must stay clear of content (e.g. broadcast overscan). */
  safeArea?: SafeArea;
  /** Minimum square size (px) for anything tappable, when the surface is touch-driven. */
  minTapTarget?: number;
  /** Minimum readable font size (px) — larger for surfaces viewed from a distance. */
  minTextSize?: number;
  /** How far the viewer typically is from the surface. Informs text-size pressure. */
  viewingDistance?: "near" | "far";
  /** Whether the only interaction method is touch (forces minTapTarget enforcement). */
  touchOnly?: boolean;
}

const noSafeArea: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: {
    width: 320,
    height: 480,
    safeArea: { top: 12, right: 12, bottom: 12, left: 12 },
    minTapTarget: 44,
    minTextSize: 14,
    viewingDistance: "near",
    touchOnly: true,
  },
  mobileLandscape: {
    width: 480,
    height: 270,
    safeArea: { top: 8, right: 16, bottom: 8, left: 16 },
    minTapTarget: 44,
    minTextSize: 14,
    viewingDistance: "near",
    touchOnly: true,
  },
  broadcastLowerThird: {
    width: 1920,
    height: 250,
    safeArea: { top: 10, right: 60, bottom: 10, left: 60 },
    minTextSize: 32,
    viewingDistance: "far",
    touchOnly: false,
  },
  retailKiosk: {
    width: 1080,
    height: 1080,
    safeArea: { top: 20, right: 20, bottom: 20, left: 20 },
    minTapTarget: 60,
    minTextSize: 20,
    viewingDistance: "near",
    touchOnly: true,
  },
};

export function withDefaults(s: SurfaceProfile): Required<SurfaceProfile> {
  return {
    safeArea: noSafeArea,
    minTapTarget: 0,
    minTextSize: 12,
    viewingDistance: "near",
    touchOnly: false,
    ...s,
  };
}
