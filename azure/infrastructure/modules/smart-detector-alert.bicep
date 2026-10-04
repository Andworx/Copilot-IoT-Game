param name string
param scopeResourceId string
param actionGroupId string
param tags object = {}

resource alert 'Microsoft.AlertsManagement/smartDetectorAlertRules@2021-04-01' = {
  name: name
  location: 'global'
  tags: tags
  properties: {
    actionGroups: {
      groupIds: [
        actionGroupId
      ]
    }
    description: 'Failure Anomalies notifies you of an unusual rise in the rate of failed HTTP requests or dependency calls.'
    detector: {
      id: 'FailureAnomaliesDetector'
    }
    frequency: 'PT1M'
    scope: [
      scopeResourceId
    ]
    severity: 'Sev3'
    state: 'Enabled'
  }
}

output id string = alert.id
output name string = alert.name
