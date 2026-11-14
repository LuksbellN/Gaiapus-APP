---
title: Gaiapus — SeuImposto Design Reference
created: 2026-11-14
status: reference-inspected
tags:
  - gaiapus
  - frontend
  - design-reference
---

# Gaiapus — SeuImposto Design Reference

Related decisions: [[2026-11-14-gaiapus-frontend-ux-decisions]].
Execution: [[2026-11-14-gaiapus-frontend-implementation-plan]].

## User direction

The user approved the revised dark Earth composition and requested the actual logo from `Docs/logo gaiapus.jpg`, with design references from [seuimposto.com](https://seuimposto.com/).

The dark Gaiapus Earth composition remains the primary visual authority. SeuImposto supplies bounded secondary interaction and craft references.

## Inspection evidence

Inspected the live homepage and opened its location-search overlay in the in-app browser on 2026-11-14. Reviewed screenshots, accessible controls, and read-only computed styles. The text fetch returned 403, but the live browser loaded the interface successfully. No account, form submission, or external communication was required.

This is a review of the homepage/map and search state, not a whole-site or mobile audit. Political figures, results, logos, and factual assertions on the reference site are unrelated to Gaiapus and are not reused.

## Observed system

| Element | Observed value or behavior | Gaiapus adaptation |
|---|---|---|
| Main layout | Map occupies the primary canvas; analysis stays in a narrow adjacent region | Keep the large realistic Earth and contextual evidence beside it |
| Body | `#0F0E0D`, near-white `#FAFAF9` | Retain Gaiapus midnight navy and near-white rather than change its approved palette |
| Panels | `#151412`, `#1B1A17`, `#22201D` | Use a small hierarchy of navy surfaces with quiet transitions |
| Text hierarchy | `#D6D4CF`, `#A6A39C`, `#85827C`, `#6F6C66` | Use deliberate supporting-text levels; verify actual navy pairings for contrast |
| Separators | Foreground alpha 0.08, 0.16, 0.25 | Thin, quiet lines between groups; avoid enclosing each row in another card |
| Body face | Geist with Helvetica/Arial fallbacks | Geist is a suitable UI face candidate; final font loading must be verified in the build |
| Headings | Compact sans subsections; a Faustina editorial headline on the inspected page | Preserve the current Gaiapus sans heading direction; borrow compact hierarchy |
| Toolbar controls | Rounded/pill controls, often `100px` radius, low-opacity surfaces | Compact search/location/account controls; do not make entire analysis panels pill-shaped |
| Gaps/padding | Root `--gap: 12px`, `--pad: 16px`, `--m: 20px` | Tight related controls with larger separation between major regions |
| Hover | Root `--hover: .12s` | Fast feedback, with calm longer transitions only for map context changes |
| Easing | `cubic-bezier(.16,1,.3,1)` ease-out | Interruptible panel/camera continuity, respecting reduced motion |
| Search | Search dialog, geographically disambiguated rows, keyboard selection, Escape close | Location palette with Ctrl/Cmd K, arrow navigation, Enter select, Escape close |
| Map-time controls | Compact anchored bottom control strip | A shallow map/date dock that reflects actual product periods |

The site's 12–13 px control/body choices are observed facts, not the Gaiapus body-size target. Preserve the frontend plan's readable type and laptop/mobile requirements.

## Logo treatment

- Canonical user source: `Docs/logo gaiapus.jpg`.
- Exact frontend copy: `apps/web/public/brand/gaiapus-logo.jpg`.
- Use the supplied green/brown Earth/leaf/orbit/star emblem with `object-fit: contain`.
- Keep the ivory background intentional in a compact rounded brand tile on navy.
- The JPEG is preserved byte-for-byte; no recoloring, background removal, tracing, or geometric reconstruction is needed for this iteration.
- Generated reference images may approximate the emblem. The implementation must render the actual copied asset.

## Updated visual reference

- Current composition: `apps/web/design/references/gaiapus-public-dark-v2.png`.
- Previous composition retained: `apps/web/design/references/gaiapus-public-dark-v1.png`.
- V2 adds the supplied emblem, keyboard-search cue, flatter analytical rows, quieter controls, and a slimmer bottom dock.
- This is a visual comp; it is not a running frontend, verified map geometry, or scientific observation.

## Implementation priorities

1. Use the actual brand asset in desktop and compact mobile navigation.
2. Implement accessible command-style location search over the real catalog contract, including empty/error states and state/country labels.
3. Flatten rows inside the right analysis region while keeping the primary example action obvious.
4. Preserve the globe's dominant scale at 1366 × 768 and adapt it to a compact map plus sheet at 390 × 844.
5. Keep bottom date/territory controls anchored without obscuring map attribution or keyboard focus.
6. Let sourced coverage decide which analytical rows and time controls are enabled.

No API, database, or scientific contract change is implied by this reference update.
