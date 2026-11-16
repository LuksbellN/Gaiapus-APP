# Mechanics · stake, case and rain gauge

## Deliverables
1. Stake: body that protects the probe PCB and can be driven into the soil without breaking the board.
2. IP65 case for the electronics: solar panel on top, light window/guide for 3 LEDs, button, protected vent for the SHT40, QR code.
3. Tipping-bucket rain gauge with reed switch, with a defined **mm per pulse** (rev G: 0.201 mm).
4. Exploded view, renders and cost estimate (3D printing and injection moulding).

## Interfaces with the electronics (agreed with hardware)
- PCB dimensions (width, total length, electrode positions at ~15 and ~40 cm)
- Mounting holes and position of the 18650 battery holder
- Position of the LEDs, button, USB-C, antenna connector and rain-gauge connector

Export the PCB from KiCad as STEP (File > Export > STEP) to fit it into the CAD.

---

## Stake rev G (2026-11-15, current) - rev F head + rain gauge + neck clamp

| File | What |
|---|---|
| `drawings/gaiapus-case-revG.pdf` (+ `png/sheet-1..4.png`) | 1 overview - 2 exterior views + feature table - 3 sections A-A, B-B, C-C - **4 rain gauge + clamp** (section D-D, clamp section E-E, gauge data, calibration, assembly) |
| `drawings/checks-revG.md` | 36 checks (head + gauge), 3D interference of the board models, gauge/clamp pairwise overlaps (all 0 mm3), tip-volume table |
| `cad/revG/gaiapus-revG-*.3mf` | printable parts in print orientation: head (base, lid, button, plunger, light bar, tip) + **rg-body, rg-funnel (rim down), rg-bucket (on its side), clamp-a, clamp-b** |
| `cad/revG/gaiapus-stake-revG-assembly.glb` | whole stake with boards, gauge (bucket at rest, magnet, reed, pin, stop screws), clamp, bolts and the gauge cable to the head gland |
| `cad/revG/renders/` | **exploded view with 21 numbered parts (`exploded-revG.png`)**, comparison with the design render, head + gauge views, gauge section, full stake |
| `tools/revG/` | generators: `raingauge.py` (gauge + clamp solids), `rg_tip.py` (tip volume -> mm/pulse), `interference_rg.py`, `explode.py` (exploded view), `make_all.sh` |

**Rain gauge:** tipping bucket, collector D100 (7854 mm2), **0.201 mm per pulse** (1.58 mL per tip, computed from the bucket model with the water and magnet moments), rest tilt 16.8 deg set by two M3 stop screws (1 turn = 1.2 deg = +-0.013 mm/pulse). Reed switch NO + magnet D6 x 3 (axis along the swing) -> J4 RAIN (GPIO17 wake). Funnel cone 42.5 deg, prints rim-down without support. Rim at z 105, 1 mm above the head top, on the LEFT side (QR stays visible on the right).
**Clamp:** two halves around the neck D40, resting on the collar; half A carries a 124 mm arm and a hollow 45 deg post with the D70 platform; 2 x M3 x 16 + nuts. The head M8 gland moved to x -28.5, y 6 (clear of the clamp ring) with a flat spot-face for the nut.

## Head case, rev F (2026-11-15, superseded by rev G; files in */archive-revF/)

| File | What |
|---|---|
| `drawings/archive-revF/gaiapus-case-revF.pdf` (+ `png/sheet-1..3.png`) | 1 overview (design vs model, parts, checks) - 2 exterior views + feature table - 3 exact sections A-A (x 0), B-B (button axis y 17.5), C-C (screws) |
| `drawings/archive-revF/checks-revF.md` | 27 clearance checks + 3D interference against the board models (all OK, 0 mm3 overlap) |
| `cad/archive-revF/gaiapus-revF-*.3mf` | printable parts in print orientation: base, lid (cap), button (TPU), plunger (PETG), light bar (smoked PETG), tip |
| `cad/archive-revF/gaiapus-stake-revF-assembly.glb` | whole stake with both boards, 18650, tube (x-ray), tip, panel, antenna, soil line |
| `cad/archive-revF/renders/` | comparison with the design render, head views, section, full stake |
| `tools/archive-revF/` | generators (geometry in `params.py` + `parts.py`; `search.py` finds the button/panel limits) |
| `*/archive-rev*/` | superseded |

Head 114 x 88, top 15 deg (104 rear / 80.4 front), panel recess 87.8 x 51.8 (panel up to 87 x 51), button on the panel axis at y 17.5.
