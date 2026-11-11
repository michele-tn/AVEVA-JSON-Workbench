#Requires -Version 7.0
<#
.SYNOPSIS
Starts AVEVA JSON Workbench and exposes it on a local IPv4 interface with Caddy.
.PARAMETER WorkbenchPath
Path to an extracted executable. Defaults to the adjacent release executable or archive.
.PARAMETER LanAddress
Local IPv4 address to bind. Required when automatic selection is ambiguous.
.PARAMETER SkipFirewall
Use existing firewall policy.
#>
[CmdletBinding()]
param(
    [string]$WorkbenchPath,
    [ipaddress]$LanAddress,
    [ValidateRange(1, 65535)][int]$Port = 8787,
    [switch]$SkipFirewall
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
if (!$IsWindows) { throw 'This script requires Windows.' }

if (!$LanAddress) {
    $interfaces = @(Get-NetIPConfiguration | Where-Object {
        $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address
    })
    $candidates = @($interfaces | Where-Object { $_.NetAdapter.HardwareInterface -and $_.IPv4DefaultGateway })
    if (!$candidates) { $candidates = @($interfaces | Where-Object { $_.NetAdapter.HardwareInterface }) }
    $addresses = @($candidates.IPv4Address.IPAddress | Where-Object { $_ -and $_ -notlike '169.254.*' } | Sort-Object -Unique)
    if ($addresses.Count -ne 1) {
        throw "Pass -LanAddress with your LAN adapter IPv4 address. Detected: $($addresses -join ', ')."
    }
    $LanAddress = [ipaddress]$addresses[0]
}
if ($LanAddress.AddressFamily -ne 'InterNetwork' -or [ipaddress]::IsLoopback($LanAddress) -or
    $LanAddress.Equals([ipaddress]::Any)) {
    throw 'LanAddress must be an IPv4 address assigned to a non-loopback interface.'
}
$address = $LanAddress.IPAddressToString
$adapter = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $address
if (!$SkipFirewall) {
    $profile = Get-NetConnectionProfile -InterfaceIndex $adapter.InterfaceIndex
    if ($profile.NetworkCategory -notin 'Private', 'DomainAuthenticated') {
        throw 'Automatic firewall setup requires a Private or Domain network. For a managed firewall, use -SkipFirewall after the administrator has allowed the port.'
    }
}

foreach ($endpoint in @('127.0.0.1', $address, '0.0.0.0', '::')) {
    if (Get-NetTCPConnection -State Listen -LocalAddress $endpoint -LocalPort $Port -ErrorAction SilentlyContinue) {
        throw "Port $Port is already in use on $endpoint. Stop the existing listener or pass -Port."
    }
}

function Wait-ForHttp($Url, $Process) {
    $deadline = [datetime]::UtcNow.AddSeconds(20)
    do {
        if ($Process.HasExited) { throw "Process $($Process.Id) exited with code $($Process.ExitCode)." }
        try {
            $response = Invoke-WebRequest -Uri $Url -NoProxy -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        } catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Milliseconds 300
    } while ([datetime]::UtcNow -lt $deadline)
    throw "No HTTP 200 from $Url. $lastError"
}

$tempRoot = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).ProviderPath
$session = Join-Path $tempRoot ('workbench-lan-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $session | Out-Null
$workbench = $null
$proxy = $null
try {
    if (!$WorkbenchPath) {
        $exeName = 'AVEVA-JSON-Workbench-win-x64.exe'
        $releaseRoot = Split-Path -Parent $PSScriptRoot
        $WorkbenchPath = Join-Path $releaseRoot $exeName
        if (!(Test-Path -LiteralPath $WorkbenchPath -PathType Leaf)) {
            $archive = Join-Path $releaseRoot 'Release-assets/AVEVA-JSON-Workbench-win-x64.7z'
            if (!(Test-Path -LiteralPath $archive -PathType Leaf)) {
                throw 'Supply -WorkbenchPath with the path to the extracted Workbench executable.'
            }
            Write-Host 'Extracting the Workbench executable...'
            & tar.exe -xf $archive -C $session $exeName
            if ($LASTEXITCODE -ne 0) { throw 'Could not extract the archive. Extract it manually and pass -WorkbenchPath.' }
            $WorkbenchPath = Join-Path $session $exeName
        }
    }
    $workbenchFile = Get-Item -LiteralPath $WorkbenchPath
    if ($workbenchFile -isnot [IO.FileInfo] -or $workbenchFile.Extension -ne '.exe') {
        throw 'WorkbenchPath must point to a Windows executable.'
    }

    $architecture = switch ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
        'X64' { 'amd64' }
        'Arm64' { 'arm64' }
        default { throw 'Caddy setup supports Windows x64 and ARM64.' }
    }
    $release = Invoke-RestMethod 'https://api.github.com/repos/caddyserver/caddy/releases/latest' -TimeoutSec 30
    $assetName = "caddy_$($release.tag_name.TrimStart('v'))_windows_$architecture.zip"
    $asset = $release.assets | Where-Object name -eq $assetName | Select-Object -First 1
    if (!$asset -or $asset.digest -notmatch '^sha256:([a-f0-9]{64})$') {
        throw "The latest official Caddy release does not expose a SHA-256 digest for $assetName."
    }
    $expectedHash = $Matches[1]
    $zip = Join-Path $session 'caddy.zip'
    Write-Host "Downloading official Caddy $($release.tag_name) for Windows $architecture..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -TimeoutSec 120
    if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $expectedHash) {
        throw 'Caddy SHA-256 verification failed.'
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $session
    $caddy = Join-Path $session 'caddy.exe'
    $config = Join-Path $session 'Caddyfile'
    $localUrl = "http://127.0.0.1:${Port}/"
    $lanUrl = "http://${address}:${Port}/"
    Set-Content -LiteralPath $config -Value @"
{
    admin off
}
http://${address}:${Port} {
    bind $address
    reverse_proxy 127.0.0.1:${Port} {
        header_up Host 127.0.0.1:${Port}
    }
}
"@

    $workbench = Start-Process -FilePath $workbenchFile.FullName -ArgumentList '--no-open', '--port', "$Port" -NoNewWindow -PassThru
    Wait-ForHttp $localUrl $workbench
    $proxy = Start-Process -FilePath $caddy -ArgumentList 'run', '--config', 'Caddyfile', '--adapter', 'caddyfile' -WorkingDirectory $session -NoNewWindow -PassThru
    Wait-ForHttp $lanUrl $proxy

    if (!$SkipFirewall) {
        $ruleName = "AVEVA-Workbench-LAN-$address-$Port"
        if (!(Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
            Write-Host 'Windows may ask for administrator approval to add the LAN firewall rule.'
            $firewallCommand = @"
`$ErrorActionPreference = 'Stop'
New-NetFirewallRule -Name '$ruleName' -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalAddress '$address' -LocalPort $Port -RemoteAddress LocalSubnet -Profile Private,Domain | Out-Null
"@
            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($firewallCommand))
            $elevated = Start-Process -FilePath (Join-Path $PSHOME 'pwsh.exe') -Verb RunAs -ArgumentList '-NoProfile', '-NonInteractive', '-EncodedCommand', $encoded -Wait -PassThru
            if ($elevated.ExitCode -ne 0) { throw 'Windows could not add the LAN firewall rule.' }
        }
    }

    Write-Host "Local: $localUrl"
    Write-Host "LAN:   $lanUrl"
    Write-Host 'Press Ctrl+C to stop Caddy and the Workbench.'
    while (!$proxy.HasExited -and !$workbench.HasExited) { Start-Sleep -Seconds 1 }
    throw 'Caddy or the Workbench stopped unexpectedly.'
}
finally {
    foreach ($process in @($proxy, $workbench)) {
        if ($process -and !$process.HasExited) {
            Stop-Process -InputObject $process -ErrorAction SilentlyContinue
            [void]$process.WaitForExit(5000)
        }
    }
    $resolved = (Resolve-Path -LiteralPath $session).ProviderPath
    if ((Split-Path -Parent $resolved) -eq $tempRoot -and
        (Split-Path -Leaf $resolved) -match '^workbench-lan-[0-9a-f-]{36}$') {
        Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Continue
    }
}
