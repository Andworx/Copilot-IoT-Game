<#
.SYNOPSIS
    Verifies the game Application Insights component and active smart detection alert.
#>
[CmdletBinding()]
param(
    [string]$ResourceGroup = 'rg-aw-azcom-iot-copilot',
    [string]$AppInsightsName = 'func-aw-azcom-iot-game',
    [string]$WorkspaceResourceId = '/subscriptions/2e291b4a-5f03-4dcd-bb56-09643c729adc/resourceGroups/DefaultResourceGroup-EUS/providers/Microsoft.OperationalInsights/workspaces/DefaultWorkspace-2e291b4a-5f03-4dcd-bb56-09643c729adc-EUS',
    [string]$FailureAnomaliesAlertName = 'Failure Anomalies - func-aw-azcom-iot-game',
    [string]$SmartDetectionActionGroupName = 'application insights smart detection',
    [string]$SmartDetectionActionGroupShortName = 'SmartDetect'
)

$ErrorActionPreference = 'Stop'

function Invoke-AzJson([string[]]$Arguments) {
    $json = & az @Arguments --only-show-errors -o json
    if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: az $($Arguments -join ' ')" }
    return $json | ConvertFrom-Json
}

function Assert-Equal($Name, $Actual, $Expected) {
    if ($Actual -ne $Expected) { throw "$Name is '$Actual', expected '$Expected'." }
}

function Assert-EqualOrdinalIgnoreCase($Name, [string]$Actual, [string]$Expected) {
    if (-not [string]::Equals($Actual, $Expected, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Name is '$Actual', expected '$Expected'."
    }
}

$sub = az account show --query id -o tsv
if ($LASTEXITCODE -ne 0 -or -not $sub) { throw 'Azure CLI is not authenticated.' }
$rgScope = "/subscriptions/$sub/resourceGroups/$ResourceGroup"
$appInsightsId = "$rgScope/providers/Microsoft.Insights/components/$AppInsightsName"
$smartDetectionActionGroupId = "$rgScope/providers/Microsoft.Insights/actionGroups/$SmartDetectionActionGroupName"
$alertId = "$rgScope/providers/Microsoft.AlertsManagement/smartDetectorAlertRules/$FailureAnomaliesAlertName"

$component = Invoke-AzJson @('resource', 'show', '--ids', $appInsightsId, '--api-version', '2020-02-02')
Assert-Equal 'Game Application Insights kind' $component.kind 'web'
Assert-Equal 'Game Application Insights application type' $component.properties.Application_Type 'web'
Assert-Equal 'Game Application Insights ingestion mode' $component.properties.IngestionMode 'LogAnalytics'
Assert-Equal 'Game Application Insights retention days' $component.properties.RetentionInDays 90
Assert-Equal 'Game Application Insights ingestion public access' $component.properties.publicNetworkAccessForIngestion 'Enabled'
Assert-Equal 'Game Application Insights query public access' $component.properties.publicNetworkAccessForQuery 'Enabled'
Assert-EqualOrdinalIgnoreCase 'Game Application Insights workspace' $component.properties.WorkspaceResourceId $WorkspaceResourceId

$actionGroup = Invoke-AzJson @('resource', 'show', '--ids', $smartDetectionActionGroupId, '--api-version', '2023-01-01')
Assert-Equal 'Smart Detection action group location' $actionGroup.location 'Global'
Assert-Equal 'Smart Detection action group enabled' $actionGroup.properties.enabled $true
Assert-Equal 'Smart Detection action group short name' $actionGroup.properties.groupShortName $SmartDetectionActionGroupShortName

$alert = Invoke-AzJson @('resource', 'show', '--ids', $alertId, '--api-version', '2021-04-01')
Assert-Equal 'Game failure anomalies alert location' $alert.location 'global'
Assert-Equal 'Game failure anomalies alert state' $alert.properties.state 'Enabled'
Assert-Equal 'Game failure anomalies alert severity' $alert.properties.severity 'Sev3'
Assert-Equal 'Game failure anomalies alert frequency' $alert.properties.frequency 'PT1M'
Assert-Equal 'Game failure anomalies detector' $alert.properties.detector.id 'FailureAnomaliesDetector'
Assert-EqualOrdinalIgnoreCase 'Game failure anomalies alert scope' $alert.properties.scope[0] $appInsightsId
Assert-EqualOrdinalIgnoreCase 'Game failure anomalies action group' $alert.properties.actionGroups.groupIds[0] $smartDetectionActionGroupId

$diagnosticSettings = Invoke-AzJson @('monitor', 'diagnostic-settings', 'list', '--resource', $appInsightsId)
$diagnosticSettingItems = if ($null -ne $diagnosticSettings.value) { @($diagnosticSettings.value) } else { @($diagnosticSettings) }
if ($diagnosticSettingItems.Count -ne 0) { throw 'Game Application Insights has diagnostic settings, but the target design expects none.' }

foreach ($type in @('Microsoft.Insights/metricAlerts', 'Microsoft.Insights/scheduledQueryRules', 'Microsoft.Insights/activityLogAlerts')) {
    $rules = @(Invoke-AzJson @('resource', 'list', '--resource-group', $ResourceGroup, '--resource-type', $type))
    if ($rules.Count -ne 0) { throw "Unexpected $type resources in ${ResourceGroup}: $($rules.name -join ', ')." }
}

Write-Host "Game monitoring is configured for $AppInsightsName with active smart detection alert '$FailureAnomaliesAlertName'."