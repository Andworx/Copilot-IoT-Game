<#
.SYNOPSIS
    Collect DNS and TCP evidence without changing demo network settings.
.DESCRIPTION
    Compares system DNS with optional router and Azure DNS resolvers, then checks
    TCP by hostname and optionally by expected IP. A TCP pass does not prove HTTP,
    authentication, browser access, or public network isolation. No secrets needed.
.PARAMETER ServiceName
    Service hostname, without scheme or path.
.PARAMETER Port
    TCP service port (443 by default).
.PARAMETER RouterDns
    Optional router DNS server address.
.PARAMETER AzureDns
    Optional Azure private resolver inbound address.
.PARAMETER ExpectedAddress
    Optional expected service IP; tested independently of DNS.
.EXAMPLE
    .\Test-DemoNetwork.ps1 -ServiceName 'example.azurewebsites.net' -RouterDns '192.168.8.1' -AzureDns '10.20.3.4' -ExpectedAddress '10.20.1.10'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$')]
    [string]$ServiceName,
    [ValidateRange(1, 65535)]
    [int]$Port = 443,
    [System.Net.IPAddress]$RouterDns,
    [System.Net.IPAddress]$AzureDns,
    [System.Net.IPAddress]$ExpectedAddress
)

$ErrorActionPreference = 'Continue'
foreach ($commandName in @('Resolve-DnsName', 'Test-NetConnection')) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "Required Windows command unavailable: $commandName"
    }
}

$dnsTargets = @([pscustomobject]@{ Label = 'System'; Server = $null })
if ($RouterDns) { $dnsTargets += [pscustomobject]@{ Label = 'Router'; Server = $RouterDns.ToString() } }
if ($AzureDns) { $dnsTargets += [pscustomobject]@{ Label = 'Azure'; Server = $AzureDns.ToString() } }

foreach ($dnsTarget in $dnsTargets) {
    foreach ($recordType in @('A', 'AAAA')) {
        $dnsArgs = @{ Name = $ServiceName; Type = $recordType; DnsOnly = $true; ErrorAction = 'Stop' }
        if ($dnsTarget.Server) { $dnsArgs.Server = $dnsTarget.Server }
        try {
            $answers = @(Resolve-DnsName @dnsArgs)
            $addresses = @($answers | Where-Object { $_.IPAddress } | ForEach-Object { $_.IPAddress })
            [pscustomobject]@{
                Check = 'DNS'; Source = $dnsTarget.Label; Server = $dnsTarget.Server
                Target = $ServiceName; RecordType = $recordType; Addresses = $addresses
                ExpectedMatch = $(if ($ExpectedAddress -and $recordType -eq 'A') { $addresses -contains $ExpectedAddress.ToString() } else { $null })
                Error = $null
            }
        } catch {
            [pscustomobject]@{
                Check = 'DNS'; Source = $dnsTarget.Label; Server = $dnsTarget.Server
                Target = $ServiceName; RecordType = $recordType; Addresses = @()
                ExpectedMatch = $null; Error = $_.Exception.Message
            }
        }
    }
}

$tcpTargets = @($ServiceName)
if ($ExpectedAddress) { $tcpTargets += $ExpectedAddress.ToString() }
foreach ($tcpTarget in $tcpTargets) {
    try {
        $tcp = Test-NetConnection -ComputerName $tcpTarget -Port $Port -InformationLevel Detailed -WarningAction SilentlyContinue -ErrorAction Stop
        [pscustomobject]@{
            Check = 'TCP'; Target = $tcpTarget; Port = $Port
            RemoteAddress = [string]$tcp.RemoteAddress; Succeeded = $tcp.TcpTestSucceeded
            Error = $null
        }
    } catch {
        [pscustomobject]@{ Check = 'TCP'; Target = $tcpTarget; Port = $Port; RemoteAddress = ''; Succeeded = $false; Error = $_.Exception.Message }
    }
}
