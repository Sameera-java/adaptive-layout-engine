# Adaptive Layout Engine for Multi-Surface Ads

A constraint-based layout engine that takes one declarative ad spec and resolves
it into a correct, non-overlapping layout for any surface profile — mobile
portrait, mobile landscape, broadcast lower-third, square kiosk, or an
unseen 5th surface — without any per-surface hardcoding.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build (also runs the TypeScript compiler):

```bash
npm run build
npm run preview
```

## Running the demo

Open the app and use the dropdown to switch between the four required surface
profiles (`mobilePortrait`, `mobileLandscape`, `broadcastLowerThird`,
`retailKiosk`). The same `adSpec` in `src/App.tsx` re-resolves live for each —
notice the arrangement genuinely changes shape (vertical stack vs. horizontal
row vs. hero-backdrop grid), not just uniform scaling.

Check the "Simulate unseen surface" box to feed the resolver a 300×80 surface
it has never seen. Branding (`logo`) and then price (`secondary`) drop first;
the headline and CTA are protected and remain — this proves the degradation
order is priority-driven, not surface-specific.

## Resolution flow

```
Ad Spec + Surface Profile → classifyFlow() → degradeToFit() → placement (vertical | horizontal | grid) → Resolved Layout → RenderDom
```

1. **`classifyFlow`** looks only at the surface's *computed* usable aspect
ratio (never its name) and buckets it into `vertical` (tall), `horizontal`
(wide), or `grid` (roughly square).
2. **`degradeToFit`** checks whether the elements' minimum sizes fit the
available space on the relevant axis. If not, it repeatedly drops the
lowest-priority element — excluding the `action` role, which is never
dropped — until everything remaining fits.
3. Each flow's placement function (`resolveVertical` / `resolveHorizontal` /
`resolveGrid`) lays out the surviving elements along that axis, giving any
leftover space to elements in proportion to their priority weight
(`1 / priority`), so higher-priority elements grow more when there's room
to spare.
4. The output (`ResolvedLayout`) is a flat array of `{ id, x, y, width, height, visible }` — a renderer never has to know *why* something is
where it is, only render what it's given.

See `ARCHITECTURE.md` for the full breakdown of the priority/degradation logic.

## TypeScript design

* `AdElement.role` is a closed union (`"primary" | "hero" | "action" | "secondary" | "branding"`) — an unknown role is a compile-time error, not a
typo that silently falls through.
* `defineAd()` throws at construction time if two elements share an `id`,
catching a common authoring mistake before it reaches the resolver.
* `SurfaceProfile` marks everything except `width`/`height` optional, and
`withDefaults()` is the single place that fills in safe fallbacks — so the
resolver itself always works with a fully-populated `Required<SurfaceProfile>`
and never has to null-check.
* `ResolvedElement` is fully typed, so `render-dom.tsx` (or a future Canvas
renderer) consumes it without guessing at shape.

## Known limitations

* No text-measurement-aware wrapping — text box heights are estimated from
`minTextSize`, not measured against actual rendered glyph metrics.
* No animated transition when switching surfaces (bonus item, not attempted).
* `resolveGrid`'s bottom-band split is a reasonable heuristic for
roughly-square surfaces, but hasn't been stress-tested against extreme
element counts (6+ elements).
* Only one renderer is implemented (DOM). The architecture supports adding a
Canvas renderer without touching `resolver.ts`, but it hasn't been built.

## AI tool disclosure

I used Claude (Anthropic) to help design and implement this project — scaffolding
the Vite/React/TypeScript setup, drafting the `resolver.ts` algorithm structure
(flow classification, priority-weighted space allocation, degradation logic),
and writing this documentation. I reviewed and tested the logic myself
(including the smoke tests described in `ARCHITECTURE.md`) and can explain and
extend every part of it, including resolving a new, unseen surface live.

## Time spent

\~3 days, spread across algorithm design, implementation, and testing.

