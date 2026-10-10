# Read-only network adoption review. Deliberately provides no apply switch.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$cliInfo = az version -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or [version]$cliInfo.'azure-cli' -lt [version]'2.76.0') { throw 'Network preview requires Azure CLI 2.76.0 or later (ProviderNoRbac support).' }
$expectedSubscription = '9e8c862e-9bba-4363-a21b-c45cabe8b637'
$subscription = az account show --query id --only-show-errors -o tsv
if ($LASTEXITCODE -ne 0 -or $subscription -ne $expectedSubscription) { throw 'Select the recorded baseline subscription first.' }
$template = Join-Path $PSScriptRoot 'main.bicep'
# Existing infra deployer has Reader on the RG and deployments/*, but no network
# write grants. ProviderNoRbac performs provider validation with read permissions.
az deployment group validate -g rg-aw-azcom-iot-copilot --name network-baseline --template-file $template --validation-level ProviderNoRbac --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw 'Network template validation failed.' }
az deployment group what-if -g rg-aw-azcom-iot-copilot --name network-baseline --template-file $template --validation-level ProviderNoRbac --no-prompt --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'Network what-if failed.' }
