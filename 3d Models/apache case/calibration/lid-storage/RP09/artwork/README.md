# Left-panel Microsoft cloud artwork

`left_panel_iot_cloud_overlay.svg` is a transparent, full-colour 85 x 196 mm
overlay for `lid_storage_left_design_plate_blank.stl`. The document coordinates
match the plate exactly. The hidden `alignment-guide` layer contains the rounded
plate boundary and the four M3 hole centres at X 17.5/67.5 mm and Y 4/192 mm;
the printable artwork avoids those locations.

`left_panel_iot_cloud_preview.png` shows the transparent artwork over a dark
panel for inspection only. The dark background is not present in the SVG.

`left_panel_iot_cloud_print_mask.svg` is the generated single-colour geometry
mask used by OpenSCAD for the raised printable artwork STL. It uses the same
eight approved logo vectors and should not be edited by hand.

The layout reflects the repository's deployed IoT path rather than presenting a
generic logo grid:

1. Azure IoT Hub
2. Azure Event Hubs
3. Azure Functions
4. Azure SignalR Service to Power Pages
5. Microsoft Dataverse to Power Apps
6. Copilot Studio through the Function backend

The eight logos are copied without recolouring from
[`loryanstrant/MicrosoftCloudLogos`](https://github.com/loryanstrant/MicrosoftCloudLogos)
at commit `217772d2906bc9870d08dfe5a8d9c2fa86645006`. Their precise upstream paths
are recorded in each logo group's `data-source` attribute and in
`generate_left_panel_cloud_svg.py`. Microsoft logos remain property of Microsoft
Corporation; this artwork does not imply Microsoft endorsement.

To regenerate after cloning that logo repository:

```powershell
python .\generate_left_panel_cloud_svg.py `
  --logo-root C:\path\to\MicrosoftCloudLogos
python .\validate_left_panel_cloud_svg.py
```

Import the SVG at 100% scale. It is intentionally transparent so it can be
placed over the existing solid plate. Product names remain SVG text objects for
easy editing; convert text to paths in the chosen vector/CAD application before
final production if that importer does not embed fonts.
