// ---------------------------------------------------------------------------
// resolver.ts — the actual engine.
//
// Ad Spec + Surface Profile -> Resolved Layout
//
// Design goal: every decision below is driven by *computed* properties of the
// surface (aspect ratio, minTapTarget, minTextSize, viewingDistance) — never
// by a surface's name or identity. That's what lets an unseen 5th surface
// resolve correctly with zero code changes.
// ---------------------------------------------------------------------------

import type { AdElement, AdSpec, ElementRole } from "./spec";
import { type SurfaceProfile, withDefaults } from "./surfaces";

export interface ResolvedElement {
  id: string;
  role: ElementRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  visible: boolean;
}

export interface ResolvedLayout {
  surfaceWidth: number;
  surfaceHeight: number;
  elements: ResolvedElement[];
  /** ids of elements dropped for lack of space, in the order they were dropped. Useful for debugging/demo. */
  dropped: string[];
}

type Flow = "vertical" | "horizontal" | "grid";

/** Minimum viable box for an element, given what role it plays and what the surface demands. */
function minSize(el: AdElement, surface: Required<SurfaceProfile>) {
  switch (el.role) {
    case "action":
      return {
        w: Math.max(90, surface.touchOnly ? surface.minTapTarget : 70),
        h: Math.max(36, surface.touchOnly ? surface.minTapTarget : 32),
      };
    case "primary":
      return { w: 100, h: Math.round(surface.minTextSize * 1.7) };
    case "secondary":
      return { w: 70, h: Math.round(surface.minTextSize * 1.4) };
    case "branding":
      return { w: 36, h: 36 };
    case "hero":
      return { w: 80, h: 80 };
  }
}

/** Extra-space distribution weight — higher priority (lower number) claims more of any slack. */
function weight(el: AdElement) {
  return 1 / el.priority;
}

function classifyFlow(usableW: number, usableH: number): Flow {
  const ratio = usableW / usableH;
  if (ratio <= 0.85) return "vertical";
  if (ratio >= 1.6) return "horizontal";
  return "grid";
}

/**
 * Drops the lowest-priority, non-"action" element until the remaining elements'
 * minimum sizes fit the given budget along `axis`. Returns the surviving elements
 * (in original order) and the ids of anything dropped.
 */
function degradeToFit(
  elements: AdElement[],
  surface: Required<SurfaceProfile>,
  axis: "w" | "h",
  budget: number
): { kept: AdElement[]; dropped: string[] } {
  let kept = [...elements];
  const dropped: string[] = [];

  const totalMin = () => kept.reduce((sum, el) => sum + minSize(el, surface)[axis], 0);

  while (totalMin() > budget) {
    // Candidates for dropping: everything except the protected "action" role.
    const candidates = kept.filter((el) => el.role !== "action");
    if (candidates.length === 0) break; // nothing left we're allowed to drop
    // Drop the least important candidate (highest priority number = lowest importance).
    const toDrop = candidates.reduce((worst, el) => (el.priority > worst.priority ? el : worst));
    kept = kept.filter((el) => el.id !== toDrop.id);
    dropped.push(toDrop.id);
  }

  return { kept, dropped };
}

function resolveVertical(
  elements: AdElement[],
  surface: Required<SurfaceProfile>,
  area: { x: number; y: number; w: number; h: number }
): { placed: ResolvedElement[]; dropped: string[] } {
  const { kept, dropped } = degradeToFit(elements, surface, "h", area.h);

  const mins = kept.map((el) => minSize(el, surface));
  const usedMin = mins.reduce((s, m) => s + m.h, 0);
  const slack = Math.max(0, area.h - usedMin);
  const totalWeight = kept.reduce((s, el) => s + weight(el), 0) || 1;

  let cursorY = area.y;
  const placed: ResolvedElement[] = kept.map((el, i) => {
    const extra = slack * (weight(el) / totalWeight);
    const h = mins[i].h + extra;
    const w = el.role === "hero" ? area.w : Math.min(area.w, Math.max(mins[i].w, area.w * 0.9));
    const x = area.x + (area.w - w) / 2; // center horizontally
    const resolved: ResolvedElement = {
      id: el.id,
      role: el.role,
      x,
      y: cursorY,
      width: w,
      height: h,
      fontSize: el.role === "primary" || el.role === "secondary" ? surface.minTextSize : undefined,
      visible: true,
    };
    cursorY += h;
    return resolved;
  });

  return { placed, dropped };
}

function resolveHorizontal(
  elements: AdElement[],
  surface: Required<SurfaceProfile>,
  area: { x: number; y: number; w: number; h: number }
): { placed: ResolvedElement[]; dropped: string[] } {
  const { kept, dropped } = degradeToFit(elements, surface, "w", area.w);

  const mins = kept.map((el) => minSize(el, surface));
  const usedMin = mins.reduce((s, m) => s + m.w, 0);
  const slack = Math.max(0, area.w - usedMin);
  const totalWeight = kept.reduce((s, el) => s + weight(el), 0) || 1;

  let cursorX = area.x;
  const placed: ResolvedElement[] = kept.map((el, i) => {
    const extra = slack * (weight(el) / totalWeight);
    const w = mins[i].w + extra;
    const h = el.role === "hero" ? area.h : Math.min(area.h, Math.max(mins[i].h, area.h * 0.8));
    const y = area.y + (area.h - h) / 2; // center vertically
    const resolved: ResolvedElement = {
      id: el.id,
      role: el.role,
      x: cursorX,
      y,
      width: w,
      height: h,
      fontSize: el.role === "primary" || el.role === "secondary" ? surface.minTextSize : undefined,
      visible: true,
    };
    cursorX += w;
    return resolved;
  });

  return { placed, dropped };
}

/**
 * Balanced ("square-ish") composition: hero fills the frame as a backdrop,
 * primary sits along the top band, secondary+action share a bottom band,
 * branding takes a small corner. Degradation is evaluated on the bottom
 * band's width budget and on overall vertical budget for the top band —
 * whichever role runs out of room first sheds elements starting at
 * lowest priority, protecting "action" throughout.
 */
function resolveGrid(
  elements: AdElement[],
  surface: Required<SurfaceProfile>,
  area: { x: number; y: number; w: number; h: number }
): { placed: ResolvedElement[]; dropped: string[] } {
  const hero = elements.find((e) => e.role === "hero");
  const primary = elements.find((e) => e.role === "primary");
  const rest = elements.filter((e) => e.role !== "hero" && e.role !== "primary");

  // Bottom band holds secondary/action/branding, sized to whichever needs must fit.
  const bottomBandH = Math.max(64, Math.round(area.h * 0.22));
  const topBandH = Math.max(minSize({ role: "primary" } as AdElement, surface).h + 12, Math.round(area.h * 0.18));

  const { kept: bottomKept, dropped } = degradeToFit(rest, surface, "w", area.w);

  const placed: ResolvedElement[] = [];

  if (hero) {
    placed.push({
      id: hero.id,
      role: hero.role,
      x: area.x,
      y: area.y,
      width: area.w,
      height: area.h,
      visible: true,
    });
  }

  if (primary) {
    placed.push({
      id: primary.id,
      role: primary.role,
      x: area.x + area.w * 0.06,
      y: area.y + area.h * 0.04,
      width: area.w * 0.88,
      height: topBandH,
      fontSize: surface.minTextSize,
      visible: true,
    });
  }

  const { placed: bottomPlaced } = resolveHorizontal(bottomKept, surface, {
    x: area.x + area.w * 0.05,
    y: area.y + area.h - bottomBandH - area.h * 0.04,
    w: area.w * 0.9,
    h: bottomBandH,
  });

  return { placed: [...placed, ...bottomPlaced], dropped };
}

/** Exposes the same flow classification the resolver uses internally, for UI/debug display. */
export function describeFlow(surfaceInput: SurfaceProfile): Flow {
  const surface = withDefaults(surfaceInput);
  const w = surfaceInput.width - surface.safeArea.left - surface.safeArea.right;
  const h = surfaceInput.height - surface.safeArea.top - surface.safeArea.bottom;
  return classifyFlow(w, h);
}

export function resolveLayout(spec: AdSpec, surfaceInput: SurfaceProfile): ResolvedLayout {
  const surface = withDefaults(surfaceInput);
  const area = {
    x: surface.safeArea.left,
    y: surface.safeArea.top,
    w: surfaceInput.width - surface.safeArea.left - surface.safeArea.right,
    h: surfaceInput.height - surface.safeArea.top - surface.safeArea.bottom,
  };

  const flow = classifyFlow(area.w, area.h);
  // Highest-priority-first ordering feeds the placement functions; degradeToFit
  // independently removes lowest-priority elements when space runs short.
  const ordered = [...spec.elements].sort((a, b) => a.priority - b.priority);

  const { placed, dropped } =
    flow === "vertical"
      ? resolveVertical(ordered, surface, area)
      : flow === "horizontal"
      ? resolveHorizontal(ordered, surface, area)
      : resolveGrid(ordered, surface, area);

  // Any element not placed at all (dropped) still appears in the output as invisible,
  // so a renderer never has to guess — it can just check `visible`.
  const placedIds = new Set(placed.map((p) => p.id));
  const droppedEntries: ResolvedElement[] = spec.elements
    .filter((el) => !placedIds.has(el.id))
    .map((el) => ({ id: el.id, role: el.role, x: 0, y: 0, width: 0, height: 0, visible: false }));

  return {
    surfaceWidth: surfaceInput.width,
    surfaceHeight: surfaceInput.height,
    elements: [...placed, ...droppedEntries],
    dropped,
  };
}
