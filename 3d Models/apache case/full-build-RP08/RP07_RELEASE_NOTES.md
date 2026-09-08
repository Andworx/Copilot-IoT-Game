# RP07 release notes — panel and converter fit update

This update remains within the requested version 7 folder. It retains the
successful 12 x 42 mm shared power-drop slit and changes six production STLs:

- `tray_L.stl`
- `panel_R.stl`
- `screen_face.stl`
- `safety_face.stl`
- `switch_face.stl`
- `activity_face.stl`

The Micro-USB plan-view envelope is corrected to 27 x 64 mm. USB-C1 moves left,
USB-C2 moves down, and Micro-USB moves down and toward the cable slit. The
converter mount holes retain their diameters and 52 mm pitch.

The four LEDs move from the safety face to the top of the screen face. M3 keys
and rockers move upward 10 mm. M4 sockets are centered at Y +/-18 mm, preserving
their 36 mm row pitch, and the panel-R M4 service opening increases to
66 x 60 mm to exceed the physically established 59 mm minimum.

All other production STLs must remain byte-identical to their RP06 ancestors.
The rear-control T02 coupons remain a separate physical gate; no T02 rear-power
candidate has been promoted into this release.

