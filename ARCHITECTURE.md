# Architecture

## Resolution flow

```
Ad Spec + Surface Profile → Constraint Resolver → Resolved Layout → Renderer
```

- `spec.ts` — content definition, has no idea any surface exists.
- `surfaces.ts` — surface constraints, has no idea any content exists.
- `resolver.ts` — the only file that knows about both. Pure function:
  `(AdSpec, SurfaceProfile) => ResolvedLayout`. No DOM, no React.
- `render-dom.tsx` — consumes a `ResolvedLayout` and paints it. Doesn't know
  or care how the numbers were decided.

This separation is what makes both extension points in the brief possible
without touching the resolver:

- **A new surface** is just a new `SurfaceProfile` object — the resolver reads
  its fields generically (see below), so nothing else changes.
- **A new renderer** (e.g. Canvas) only needs to read `ResolvedElement[]` and
  draw — it never touches `resolver.ts`.

## Why the resolver never checks a surface's identity

`resolver.ts` never contains a surface's *name* anywhere. The only surface
data it reads are the numeric/boolean fields on `SurfaceProfile`
(`width`, `height`, `safeArea`, `minTapTarget`, `minTextSize`, `touchOnly`).
The very first thing it computes is:

```ts
function classifyFlow(usableW: number, usableH: number): Flow {
  const ratio = usableW / usableH;
  if (ratio <= 0.85) return "vertical";
  if (ratio >= 1.6) return "horizontal";
  return "grid";
}
```

This is a geometric property of *this specific input*, computed fresh every
call. Hand the resolver a surface it has never seen — any width/height/safe
area combination — and it buckets into one of the same three flows based on
math, not a lookup table. That's what "generalizes to an unseen 5th surface"
means in practice, and it's directly testable: see the "Simulate unseen
surface" checkbox in the demo, which feeds in a 300×80 profile that exists
nowhere else in the code.

## Priority & degradation algorithm, step by step

1. **Compute the usable area** — surface bounds minus `safeArea` insets.
2. **Classify flow** from the usable area's aspect ratio (above).
3. **Compute each element's minimum viable size** (`minSize()`), which reads:
   - `action` → at least a real tap target (`minTapTarget` if `touchOnly`)
   - `primary` / `secondary` (text) → height scales with `minTextSize`
     (far-viewing surfaces like broadcast get bigger minimum text)
   - `hero` / `branding` → small fixed floors
4. **Degrade to fit** (`degradeToFit`): sum the minimum sizes along the axis
   that matters for this flow (height for vertical, width for horizontal).
   If the sum exceeds the available budget, drop the *least important*
   element — highest `priority` number, i.e. lowest importance — and repeat.
   `action` is explicitly excluded from the drop candidates, so the CTA is
   never removed; in the worst case it will simply be shrunk to whatever
   space remains, never deleted.
5. **Allocate space** to the survivors: each gets at least its minimum, and
   any leftover space ("slack") is distributed in proportion to
   `1 / priority` — so a priority-1 headline claims more of the extra room
   than a priority-3 logo, without needing a separate rule for "if there's
   room, grow the headline."
6. Elements that were dropped in step 4 are still returned in the output,
   marked `visible: false`, so a renderer never has to infer what happened —
   it just filters on `visible`.

### Verified behavior (see README's demo instructions to reproduce)

- All four required surfaces resolve with zero drops and zero overlaps.
- A deliberately cramped 300×80 profile (not enough width for every
  element's minimum size) drops `logo` (branding, priority 3) first, then
  `price` (secondary, priority 2) — while `headline` (primary) and `cta`
  (action) remain fully intact and correctly positioned. This was confirmed
  with a standalone script that also checks every visible pair of elements
  for bounding-box overlap (none found).

## Layout composition per flow

- **Vertical** (tall surfaces, e.g. mobile portrait): elements stack
  top-to-bottom, each centered horizontally, heights allocated per the
  priority-weighted slack rule above.
- **Horizontal** (wide surfaces, e.g. broadcast lower-third, mobile
  landscape): elements sit left-to-right in a row, vertically centered,
  widths allocated the same way.
- **Grid** (roughly square, e.g. retail kiosk): the hero image fills the
  entire frame as a backdrop; the headline sits in a top band; secondary
  text, CTA, and branding share a bottom band (itself resolved with the
  same horizontal-row logic, reused rather than duplicated).

## Limitations

- No text-measurement-aware wrapping — see README.
- The grid composition's top/bottom band split is a fixed heuristic
  (`~18%`/`~22%` of height), not itself derived from element count.
- No animation between surface transitions.
- Element type set is fixed to `text | image | button` and role set to the
  five roles used in the sample spec; adding a new role means adding a case
  to `minSize()`, which is a small, explicit, single-location change rather
  than a scattered one.
