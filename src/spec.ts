// ---------------------------------------------------------------------------
// spec.ts — declarative ad content definition, independent of any surface.
// ---------------------------------------------------------------------------

/** The content role an element plays in the ad. Drives min-size rules in the resolver. */
export type ElementRole =
  | "primary"    // headline text
  | "hero"       // main product image
  | "action"     // CTA button — must always remain tappable & visible
  | "secondary"  // supporting text (price, subtitle)
  | "branding";  // logo — first to shrink/drop under pressure

export type ElementType = "text" | "image" | "button";

export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  /** 1 = highest importance, larger numbers = lower importance. Drives degradation order. */
  priority: number;
  /** Optional literal content, used only for text measurement in the demo renderer. */
  content?: string;
}

export interface AdSpec {
  elements: AdElement[];
}

/**
 * Defines an ad spec. Kept as a thin factory (rather than a plain object literal)
 * so we have one place to add validation later without touching call sites.
 */
export function defineAd(spec: AdSpec): AdSpec {
  const seen = new Set<string>();
  for (const el of spec.elements) {
    if (seen.has(el.id)) {
      throw new Error(`Duplicate element id in ad spec: "${el.id}"`);
    }
    seen.add(el.id);
  }
  return spec;
}
