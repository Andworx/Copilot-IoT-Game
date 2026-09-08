param([string]$OpenScad='C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference='Stop'
$helper=Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP08
$out=Join-Path $PSScriptRoot 'exports'
$rear=Join-Path $PSScriptRoot 'rear_power.scad'
$tray=Join-Path $PSScriptRoot 'tray_routing_rp07.scad'
foreach($item in @(
  @('carrier',$rear),@('layout_template',$rear),@('rear_L',$rear),@('rear_R',$rear),@('tray_L',$tray)
)) {
  $part=$item[0]; $src=$item[1]
  $temp=Join-Path 'C:\tmp' ('rp08-'+[guid]::NewGuid().ToString('N')+'.stl')
  $log=& $OpenScad -D ('part="'+$part+'"') -o $temp $src 2>&1
  if($LASTEXITCODE -ne 0 -or $log -match 'WARNING:|ERROR:' -or -not ($log -match 'Simple:\s+yes')){throw "Failed $part : $log"}
  Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part+'.stl')) -Force
  $log|Set-Content (Join-Path $out ($part+'.log')); Remove-Item -LiteralPath $temp
  Write-Host "Exported $part"
}
& $OpenScad --imgsize=1500,850 --viewall --autocenter --projection=o --camera='0,0,0,0,0,0,185' -D 'part="carrier"' -o (Join-Path $out 'rp08_rear_carrier.png') $rear
if($LASTEXITCODE -ne 0){throw 'Carrier preview failed'}
& $OpenScad --imgsize=1500,850 --viewall --autocenter --projection=o --camera='0,0,0,0,0,0,185' -D 'part="layout_template"' -o (Join-Path $out 'rp08_case_template.png') $rear
if($LASTEXITCODE -ne 0){throw 'Template preview failed'}
& $OpenScad --imgsize=1400,1100 --viewall --autocenter --projection=o --camera='0,0,10,0,0,0,340' -D 'part="assembly"' -o (Join-Path $out 'rp08_tray_top.png') $tray
if($LASTEXITCODE -ne 0){throw 'Tray preview failed'}
& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' (Join-Path $PSScriptRoot 'validate_rp08.py')
if($LASTEXITCODE -ne 0){throw 'RP08 mesh validation failed'}
$guide=Join-Path $PSScriptRoot 'installation-guides'
& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' (Join-Path $guide 'generate_drill_guide.py')
if($LASTEXITCODE -ne 0){throw 'Drill guide generation failed'}
& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' (Join-Path $guide 'validate_guides.py') $guide
if($LASTEXITCODE -ne 0){throw 'Installation guide validation failed'}
& 'C:\Users\edrft\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe' -png -r 144 -f 1 -singlefile (Join-Path $guide 'output\pdf\rear-drill-guide-letter.pdf') (Join-Path $guide 'output\pdf\rear-drill-guide-letter-render')
if($LASTEXITCODE -ne 0){throw 'PDF render failed'}
& $helper -Tag after-validated-RP08
