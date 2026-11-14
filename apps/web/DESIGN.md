---
name: Gaiapus Illustrated Observatory
description: Colorful agricultural evidence in a navy and cyan interface.
colors:
  canvas: "#050c20"
  panel: "#0a1b3b"
  raised: "#0e2447"
  border: "#294e86"
  foreground: "#edf4ff"
  supporting: "#9cb7df"
  selection: "#69d2ff"
  available: "#79d88d"
  caution: "#f2c16a"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  control: "8px"
  panel: "14px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
---

## Overview

Match the user's supplied illustrated climate dashboard. Earth and atmospheric farm art give the interface its character; real HTML panels, controls, dates and data explain the evidence. The previous photorealistic, white, sparse teal, and generic KPI-grid candidates are not the active direction.

## Colors

Navy canvas and surfaces; cyan for selection and navigation. Natural greens/blues/tans belong to illustration. Green indicates an available example in the crop panel, not planting suitability. Amber labels modeled stress and unevaluated features. Reference-series lime is a series identity, not a quality judgment.

## Typography

Self-host Manrope 400/600/700 and Source Sans 3 400/600 through local Fontsource packages. Display titles use Manrope; labels/body use Source Sans 3. Use tabular numerals for scientific values. Keep units, dates, provenance and null meanings explicit.

## Layout

Desktop: 188 px left rail, slim top toolbar, flexible illustrated-Earth/timeline column, right evidence/crop/regional stack. At wider sizes, enlarge the rail and type proportionally. At 760 px and below, collapse the rail into an inert off-canvas menu and stack scene, timeline, and evidence panels without document overflow. Day cards scroll within their own region.

## Elevation & Depth

Quiet 1 px blue borders define evidence panels. Restrained soft shadows separate overlays. The atmospheric glow belongs to the Earth artwork; do not apply neon halos to every control.

## Shapes

14 px main panels, 8–10 px controls, 16 px dialogs. Use actual provided logo art without tracing/recoloring. The regional geographic contour comes from the prototype geometry, not a made-up silhouette.

## Components

`Panel` supplies consistent icon/title/action alignment. `Dialog` uses native dialog semantics, focus restoration and explicit search focus. Crop rows open source-backed retrospective examples. Timeline day selection updates the panel and URL together. Reserve/reference charts use matching source dates and break paths at gaps. The lazy MapLibre view is separate from the decorative globe and labels its base geography.

## Do's and Don'ts

- Preserve the illustrated reference's composition and colorful Earth.
- Keep unavailable data different from zero; keep old results out of a newly selected place.
- Label decorative weather art and scientific example origin.
- Never fabricate live conditions, crop eligibility, confidence bands, economic benefits, or account success.
- Never use the full design screenshot as a clickable website substitute.
- Keep reduced motion and mobile hidden-navigation isolation working after refinements.
