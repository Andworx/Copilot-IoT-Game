param([string]$OpenScad='C:\Program Files\OpenSCAD\openscad.com')
$ErrorActionPreference='Stop'
$helper=Join-Path $PSScriptRoot '../../../Save-ModelVersion.ps1'
& $helper -Tag before-export-RP01
$out=Join-Path $PSScriptRoot 'exports'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$src=Join-Path $PSScriptRoot 'rear_power.scad'
$parts=@('xt_coupon','switch_3','switch_1','switch_2','switch_3_27','carrier','layout_template','rear_L','rear_R')
$done=$parts | ForEach-Object -Parallel {
 $ErrorActionPreference='Stop'
 $part=$_; $out=$using:out; $src=$using:src; $scad=$using:OpenScad
 $temp=Join-Path 'C:\tmp' ('rp01-'+[guid]::NewGuid().ToString('N')+'.stl')
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
& python (Join-Path $PSScriptRoot 'validate_rear.py')
if($LASTEXITCODE -ne 0){throw 'Validation failed'}
& $helper -Tag after-export-RP01
