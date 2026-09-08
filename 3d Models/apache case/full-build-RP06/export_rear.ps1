param([string]$OpenScad='C:\Program Files\OpenSCAD\openscad.com', [string[]]$Only=@())
$ErrorActionPreference='Stop'
$helper=Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP02
$out=Join-Path $PSScriptRoot 'exports'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$src=Join-Path $PSScriptRoot 'rear_power.scad'
$parts=@('dial_coupon','xt_coupon','switch_3','switch_1','switch_2','switch_3_27','carrier','layout_template','rear_L','rear_R','shell_FL','shell_FR','tray_L','tray_R','panel_L','panel_R','screen_face','safety_face','switch_face','activity_face','lower_joiner','tray_joiner','shell_joiner_x','shell_joiner_y')
if($Only.Count) {
 foreach($p in $Only){if($p -notin $parts){throw "Unknown part $p"}}
 $parts=$Only
}
$done=$parts | ForEach-Object -Parallel {
 $ErrorActionPreference='Stop'
 $part=$_; $out=$using:out; $src=$using:src; $scad=$using:OpenScad
 $temp=Join-Path 'C:\tmp' ('rp02-'+[guid]::NewGuid().ToString('N')+'.stl')
 $log=& $scad -D ('part="'+$part+'"') -o $temp $src 2>&1
 if($LASTEXITCODE -ne 0 -or $log -match 'WARNING:|ERROR:' -or -not ($log -match 'Simple:\s+yes')) { throw "Failed $part : $log" }
 Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part+'.stl')) -Force
 $log | Set-Content (Join-Path $out ($part+'.log'))
 Remove-Item -LiteralPath $temp
 Write-Host "Exported $part"; $part
} -ThrottleLimit 2
if(@($done).Count -ne $parts.Count){throw 'Incomplete export'}
& $OpenScad --imgsize=1400,1000 --viewall --autocenter --projection=p --camera='0,70,40,60,0,160,450' -o (Join-Path $out 'assembly.png') $src
if($LASTEXITCODE -ne 0){throw 'Preview failed'}
& $OpenScad --imgsize=1400,1100 --viewall --autocenter --projection=p --camera='0,0,60,55,0,155,550' -D 'part="exploded"' -o (Join-Path $out 'exploded.png') $src
if($LASTEXITCODE -ne 0){throw 'Exploded preview failed'}
& $OpenScad --imgsize=1400,600 --viewall --autocenter --projection=o --camera='0,0,0,0,0,0,170' -D 'part="carrier"' -o (Join-Path $out 'rear_face.png') $src
if($LASTEXITCODE -ne 0){throw 'Face preview failed'}
& python (Join-Path $PSScriptRoot 'validate_rear.py')
if($LASTEXITCODE -ne 0){throw 'Validation failed'}
& python (Join-Path $PSScriptRoot 'check_clearances.py')
if($LASTEXITCODE -ne 0){throw 'Clearance validation failed'}
& $helper -Tag after-export-RP02
