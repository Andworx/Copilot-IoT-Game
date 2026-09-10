# APACHE 2800 reference-model fit analysis

**Analysis revision:** 1.0  
**Date:** 2026-09-03  
**Production design:** Rev 5  
**Reference model commit:** `03e16003008ad060749bf5ab678bf31af2ec339e`

## Purpose and authority

This analysis compares the Rev 5 chassis contact envelope with the lower-case
solid in the vendored open APACHE 2800 STEP assembly. It is a diagnostic aid,
not a production-dimension promotion. The upstream author explicitly describes
the case model as approximate and notes measurement errors. Physical fit tests
in this project's actual case remain authoritative.

The STEP files also contain the stale internal product label `Apache 3800` even
though the upstream repository and geometry identify this as its APACHE 2800
model. This provenance anomaly is recorded in the vendored `SOURCE.md` and is
another reason to use the model only as a diagnostic reference.

## Method

`apache_2800_fit_analysis.py` imports the STEP assembly through
CadQuery/OpenCascade, selects its largest solid as the lower case, locates the
modeled interior floor, and cuts exact horizontal B-rep sections at nine chassis
heights. At each height it compares the cavity face with the rounded Rev 5
profile calculated directly from `model_params.scad`.

The model reports a 339 x 292 x 124 mm lower-case solid, a modeled central
interior floor at Z = 5.000 mm, and a cavity centered at X = 0, Y = 0.

## Results

| Height above floor (mm) | Reference clear X x Y (mm) | Rev 5 X x Y (mm) | Total axial margin X / Y (mm) | Area outside cavity (mm²) | Uniform relief needed per side (mm) |
|---:|---:|---:|---:|---:|---:|
| 2 | 287.458 x 212.483 | 287.869 x 210.931 | -0.411 / +1.552 | 77.81 | 0.205 |
| 6 | 297.910 x 222.935 | 296.388 x 219.450 | +1.523 / +3.485 | 0 | 0 |
| 10 | 303.561 x 228.586 | 304.906 x 227.969 | -1.345 / +0.618 | 260.19 | 0.672 |
| 12 | 305.388 x 230.413 | 306.388 x 229.450 | -1.000 / +0.963 | 192.52 | 0.500 |
| 16 | 307.531 x 232.556 | 306.388 x 229.450 | +1.143 / +3.106 | 0 | 0 |
| 30 | 307.975 x 233.000 | 305.928 x 228.761 | +2.047 / +4.239 | 0 | 0 |
| 50 | 307.975 x 233.000 | 305.273 x 227.778 | +2.702 / +5.222 | 0 | 0 |
| 69 | 307.975 x 233.000 | 304.650 x 226.843 | +3.325 / +6.157 | 0 | 0 |
| 77 | 307.975 x 233.000 | 304.388 x 226.450 | +3.588 / +6.550 | 0 | 0 |

## Interpretation

1. **The reference model does not predict upper-wall binding.** From 16 mm
   upward, the Rev 5 chassis is fully contained. At the top it has approximately
   1.794 mm clearance per X side and 3.275 mm per Y side.
2. **The modeled conflict is in the bevel transition.** At 10–12 mm the chassis
   grows approximately 1.0–1.35 mm wider overall than the reference cavity. A
   0.50–0.67 mm X-side relief would remove the modeled conflict.
3. **Radius is not the corrective variable in this model.** At every conflicting
   section, increasing radius alone cannot obtain containment. The conflict
   reaches the straight X extents, while Y still has positive margin.
4. **The physical evidence and reference model disagree.** The previously
   printed 16 mm fit frame was accepted in the real case, yet the STEP model
   predicts transition interference inside that same height. This confirms that
   the external model must not automatically overwrite the validated bevel.
5. **Full-height print behavior remains a plausible cause.** If the Rev 5 upper
   gauge fits but the full shell does not, outward wall bow, seam assembly
   preload, or an actual-case rib omitted from the reference model is more likely
   than insufficient nominal top dimensions.

## Design decision

Do not shrink the complete chassis or change the validated radius from this
analysis alone. Print and evaluate the labeled Rev 5 upper-clearance frame. Also
measure the assembled full-height shell's outside X dimension at approximately
Z = 10, 12, 16, 50, and 69 mm. If the physical shell exceeds the CAD value at
the upper levels, compensate print bow or seam preload. If only Z = 10–12 binds,
introduce a local 0.7 mm-per-X-side transition relief without changing the top
or the already accepted Y profile.

## Tray and panel integration

The imported case cavity was also compared with the installed tray and fixed
panel stack. These checks use the corrected tray top of 17.5 mm above the
physical case floor.

| Interface | Available envelope (mm) | Designed envelope (mm) | Result |
|---|---:|---:|---|
| STEP cavity near tray elevation (conservative Z = 16 section) | 307.531 x 232.556 | Tray 291 x 214 | Clears by at least 8.265 mm X and 9.278 mm Y per side |
| Printed chassis lower-rail opening | 291.988 x 215.050 | Tray 291 x 214 | Clears by 0.494 mm X and 0.525 mm Y per side; physical fit gate |
| STEP cavity at panel elevation | 307.975 x 233.000 | Panel 294.988 x 217.050 | Clears by 6.494 mm X and 7.975 mm Y per side |
| Printed chassis top opening | 297.988 x 220.050 | Panel 294.988 x 217.050 | Intended 1.5 mm gap per side |

Correcting the floor components from the old floor-level visualization to the
real tray elevation exposed a collision between the centered floor Pi/GPIO
assembly and the screen-mounted Pi. The floor assembly was moved to X = +92 mm,
Y = +38 mm on the right tray half. The revised hard envelopes are separated by
5.47 mm in X, or 3.47 mm after applying the study's 2 mm component allowance.
All electronics-envelope collision assertions now pass.

The fuse block reaches 57.5 mm above the physical floor, leaving 14.5 mm to the
fixed-panel underside. This is closed-state clearance, not fuse-cover service
clearance; the panel must remain removable for fuse access. The imported lid is
not promoted as a closed-lid clearance authority because the upstream model is
approximate and its assembly origins are not guaranteed to match this project's
measured stack. A physical closed-lid witness test remains required.

## Reproduction

The script requires CadQuery 2.8/OpenCascade 7.9 or compatible versions:

```powershell
python analysis/apache_2800_fit_analysis.py
```

The analysis deliberately excludes panel inserts, inward seam pads, and
fasteners because they do not define the case-contact envelope.
