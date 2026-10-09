"""Offline checks for adoption hazards: subnet loss, incomplete DNS and secret capture."""
import json
from pathlib import Path

p = Path(__file__).parent
b = json.loads((p / 'baseline.json').read_text())
subnets = {s['name']: s['properties'] for s in b['vnet']['properties']['subnets']}
assert set(subnets) == {'GatewaySubnet', 'private-endpoint', 'dns-inbound', 'function-integration'}
assert subnets['function-integration']['delegations'][0]['properties']['serviceName'] == 'Microsoft.App/environments'
assert subnets['dns-inbound']['delegations'][0]['properties']['serviceName'] == 'Microsoft.Network/dnsResolvers'
assert len(b['endpoints']) == len(b['zones']) == len(b['links']) == len(b['zoneGroups']) == 5
assert b['inbound']['properties']['ipConfigurations'][0]['privateIpAddress'] == '10.20.3.4'
assert b['gateway']['properties']['enableBgp'] is True
assert b['gateway']['properties']['vpnGatewayGeneration'] == 'Generation1'
assert b['gateway']['properties']['vpnClientConfiguration']['vpnClientProtocols'] == ['OpenVPN']
for group in b['zoneGroups']:
    assert any(group['name'].startswith(e['name'] + '/') for e in b['endpoints'])
    for zone in group['properties']['privateDnsZoneConfigs']:
        assert zone['properties']['privateDnsZoneId'].split('/')[-1] in {z['name'] for z in b['zones']}
def inspect(value):
    if isinstance(value, dict):
        for key, child in value.items():
            assert key.lower() not in {'privatekey','clientsecret','connectionstring','radiusserversecret','provisioningstate','etag','serviceassociationlinks'}, key
            inspect(child)
    elif isinstance(value, list):
        for child in value: inspect(child)
inspect(b)
print('Baseline retains all subnets and DNS connections; no runtime associations or secret fields.')
