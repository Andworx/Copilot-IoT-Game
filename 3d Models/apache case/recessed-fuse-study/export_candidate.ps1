param([string]$OpenScad='C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference='Stop'
$VersionHelper=Join-Path $PSScriptRoot '../../Save-ModelVersion.ps1'
& $VersionHelper -Tag before-export-RF02
$out=Join-Path $PSScriptRoot 'exports'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$src=Join-Path $PSScriptRoot 'recessed_insert.scad'
$results=@('shell_FL','shell_FR','shell_RL','shell_RR','test_FL','test_RL','tray_L','tray_R','lower_joiner','tray_joiner') | ForEach-Object -Parallel {
 $ErrorActionPreference='Stop'
 $part=$_
 $OpenScad=$using:OpenScad
 $src=$using:src
 $out=$using:out
 $temp=Join-Path 'C:\tmp' ('rf02-'+[guid]::NewGuid().ToString('N')+'.stl')
 $log= & $OpenScad -D ('part="'+$part+'"') -o $temp $src 2>&1
 $log | ForEach-Object { Write-Host "$_" }
 if($LASTEXITCODE -ne 0 -or ($log -match 'WARNING:|ERROR:') -or -not ($log -match 'Simple:\s+yes')) { throw "Invalid export: $part" }
 Copy-Item -LiteralPath $temp -Destination (Join-Path $out ($part+'.stl')) -Force
 $log | Set-Content (Join-Path $out ($part+'.log'))
 Remove-Item -LiteralPath $temp
 $part
} -ThrottleLimit 2
if(@($results).Count -ne 10){throw 'One or more exports failed'}
& $OpenScad --imgsize=1400,1000 --viewall --autocenter --projection=p --camera='0,0,35,45,0,30,550' -o (Join-Path $out 'assembly.png') $src
if($LASTEXITCODE -ne 0){throw 'Preview failed'}
& python (Join-Path $PSScriptRoot 'validate_candidate.py')
if($LASTEXITCODE -ne 0){throw 'Mesh validation failed'}
& $VersionHelper -Tag after-export-RF02
