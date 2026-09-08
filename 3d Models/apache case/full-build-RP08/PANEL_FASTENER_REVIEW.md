# RP05 large-panel-to-shell interference review

**Status:** three low-material shell-rail coupons are exported; no structural
shell geometry has been changed. Do not reprint `panel_L.stl`, `panel_R.stl`,
or any shell quadrant until all three coupons pass.

## Corrected finding

The reported problem is the fit of the two large ribbed panel halves inside the
four shell pieces. It is not a small-faceplate installation problem.

The large panel's perimeter ribs clear the shell's top rail in the nominal CAD.
The collision comes from ten circular replaceable-module bosses that extend
below the panel and cross into the shell rail:

| Location | Boss centers (global X/Y, mm) | Rail interference |
|---|---|---|
| Front row under safety module | (-138,13), (-58,13) | Front rail; outer boss also touches left rail |
| Front row under key/rocker module | (-40,13), (40,13) | Front rail |
| Front row under cable module | (58,13), (138,13) | Front rail; outer boss also touches right rail |
| Outer rear row under safety/cable modules | (-138,77), (138,77) | Left and right side rails |
| Rear row under screen module | (-105,216), (105,216) | Rear rail |

Each boss is 9 mm in diameter and spans Z=66..77 mm. The shell top rail spans
Z=69..77 mm, so the nominal vertical intersection is the full 8 mm rail height.
At straight sections, the boss circle enters the front rail by approximately
3.2 mm and the rear rail by approximately 2.75 mm. The two outer front bosses
also enter the side rail by approximately 0.51 mm. This is a real modeled
collision and explains why `panel_L` and `panel_R` cannot seat.

## Options reviewed

### 1. Move the module fastener holes inward

This would move the boss centers away from the shell rail, but it would require
new hole patterns in the screen, safety, key/rocker and cable faceplates. It may
also reduce spacing around controls. It is mechanically possible but is the
least compatible option.

### 2. Cut localized shell-rail pockets — recommended

Keep all faceplate and panel fastener coordinates unchanged. Add a rounded
clearance pocket in the inside edge of the shell top rail at the eight collision
locations. A starting coupon should use:

- 9.6 mm pocket diameter for the 9 mm boss;
- 0.3 mm radial clearance;
- clearance only through the interfering inner portion of the rail;
- rounded transitions, not square notches; and
- at least 3 mm ligament to any unrelated shell hole or seam feature.

The panel bosses then enter the local pockets while the remainder of the panel
ribs and rail continue to locate and support the panel. This changes only the
affected shell pieces and preserves every faceplate and both panel halves.

The two rear screen-boss pockets are close to the existing rear panel-mount
holes and require a CAD ligament check before full shell export.

### 3. Use the shell rail as the module screw anchor

The colliding panel bosses could be removed locally and the module screws passed
through the panel into inserts in the shell rail. This preserves X/Y locations,
but it couples faceplate removal to the shell and creates mixed mounting methods
across a module. The rear screen locations are also close to existing panel
fasteners. It is a valid fallback, but more complex to assemble and service.

### 4. Remove the bosses without replacing their support

Not recommended. It would leave some faceplate corners without a positive screw
anchor and could allow the faceplates to flex or lift.

## Recommended implementation plan

1. Print `coupon_front.stl`, `coupon_rear.stl`, and `coupon_corner.stl` from
   `exports/panel-shell-coupons/`. Each contains the actual top-rail section
   and a 9.6 mm boss pocket with a recessed RP05 orientation label.
2. Test an existing panel half against all three coupons. The boss should enter
   without force and the panel base/rib should sit fully on its intended datum.
3. Confirm the pocket does not expose a seam insert, panel insert, or the case
   wall and that at least 0.3 mm running clearance remains after printing.
4. If the coupon passes, apply the pocket operation to the ten locations and
   split it automatically across the affected shell quadrants.
5. Re-export only the shell pieces whose rail contains a pocket. Preserve
   `panel_L`, `panel_R`, every faceplate, trays, joiners and rear carrier.
6. Validate manifold geometry, printer bounds, pocket-to-hole ligaments and a
   full panel/shell Boolean intersection before approving a full shell reprint.

## RP05 decision

Localized shell-rail pockets are the recommended fix. The three coupons cover
the straight front rail, rear rail beside its existing insert hole, and combined
front/side corner. No current full shell STL incorporates the pockets yet.
