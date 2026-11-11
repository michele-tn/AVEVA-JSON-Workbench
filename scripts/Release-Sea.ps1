param(
    [string]$Executable,
    [string]$SevenZipPath,
    [string]$CertificateThumbprint
)

$ErrorActionPreference = 'Stop'

if (!$Executable) {
    $architecture = (& node -p process.arch).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Node.js is required to locate the SEA build output.' }
    $Executable = Join-Path $PSScriptRoot "../dist/sea/AVEVA-JSON-Workbench-win-$architecture.exe"
}
$Executable = (Resolve-Path -LiteralPath $Executable).Path
$releaseDir = Split-Path -Parent $Executable
$binaryName = Split-Path -Leaf $Executable
$archiveName = [IO.Path]::GetFileNameWithoutExtension($binaryName) + '.7z'
$certificateName = 'AVEVA-JSON-Workbench-Signing.cer'
$guideName = 'installation-and-user-guide.html'
$guide = Join-Path $PSScriptRoot "../$guideName"

if (!$SevenZipPath) {
    $sevenZip = Get-Command 7z.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $SevenZipPath = if ($sevenZip) { $sevenZip.Source } else { Join-Path $env:ProgramFiles '7-Zip/7z.exe' }
}
if (!(Test-Path -LiteralPath $SevenZipPath -PathType Leaf)) {
    throw 'Install 7-Zip or pass the full path with -SevenZipPath.'
}
$SevenZipPath = (Resolve-Path -LiteralPath $SevenZipPath).Path

$subject = 'CN=AVEVA JSON Workbench Local Signing'
if ($CertificateThumbprint) {
    $cert = Get-Item -LiteralPath "Cert:/CurrentUser/My/$CertificateThumbprint"
} else {
    $renewAfter = (Get-Date).AddDays(30)
    $cert = Get-ChildItem Cert:/CurrentUser/My -CodeSigningCert |
        Where-Object { $_.Subject -eq $subject -and $_.NotAfter -gt $renewAfter } |
        Sort-Object NotAfter -Descending | Select-Object -First 1
    if (!$cert) {
        $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject `
            -CertStoreLocation 'Cert:\CurrentUser\My' -KeyExportPolicy NonExportable `
            -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddYears(3)
    }
}

$staging = Join-Path $releaseDir ('.release-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
$stagedExe = Join-Path $staging $binaryName
$stagedCert = Join-Path $staging $certificateName
$stagedArchive = Join-Path $staging $archiveName
$stagedGuide = Join-Path $staging $guideName
$stagedChecksum = "$stagedArchive.sha3-256"
$stagedScreenshots = Join-Path $staging 'docs'
$screenshots = 'workbench.png', 'output-dialog.png'

try {
    Copy-Item -LiteralPath $Executable -Destination $stagedExe
    Copy-Item -LiteralPath $guide -Destination $stagedGuide
    New-Item -ItemType Directory -Path $stagedScreenshots | Out-Null
    foreach ($screenshot in $screenshots) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot "../docs/$screenshot") -Destination $stagedScreenshots
    }
    $signature = Set-AuthenticodeSignature -LiteralPath $stagedExe -Certificate $cert `
        -HashAlgorithm SHA256 -IncludeChain Signer
    if ($signature.SignerCertificate.Thumbprint -ne $cert.Thumbprint -or $signature.Status -eq 'HashMismatch') {
        throw "Authenticode signing failed: $($signature.StatusMessage)"
    }
    Export-Certificate -Cert $cert -FilePath $stagedCert | Out-Null

    Push-Location -LiteralPath $staging
    try {
        & $SevenZipPath a -t7z -mx=9 '-m0=LZMA2:d=256m:fb=273' -ms=on -mmt=2 `
            $archiveName $binaryName $certificateName $guideName 'docs/workbench.png' 'docs/output-dialog.png'
        if ($LASTEXITCODE -ne 0) { throw '7-Zip could not create the release archive.' }
        & $SevenZipPath t $archiveName
        if ($LASTEXITCODE -ne 0) { throw '7-Zip could not verify the release archive.' }
    } finally {
        Pop-Location
    }

    if ($binaryName -eq 'AVEVA-JSON-Workbench-win-x64.exe') {
        & node (Join-Path $PSScriptRoot 'write-release-checksum.cjs') $stagedArchive $stagedGuide
    } else {
        & node (Join-Path $PSScriptRoot 'write-release-checksum.cjs') $stagedArchive
    }
    if ($LASTEXITCODE -ne 0) { throw 'Could not write the archive SHA3-256 checksum.' }

    Move-Item -LiteralPath $stagedExe -Destination $Executable -Force
    Move-Item -LiteralPath $stagedCert -Destination (Join-Path $releaseDir $certificateName) -Force
    Move-Item -LiteralPath $stagedArchive -Destination (Join-Path $releaseDir $archiveName) -Force
    Move-Item -LiteralPath $stagedChecksum -Destination (Join-Path $releaseDir "$archiveName.sha3-256") -Force
    Move-Item -LiteralPath $stagedGuide -Destination (Join-Path $releaseDir $guideName) -Force
    $releaseScreenshots = Join-Path $releaseDir 'docs'
    New-Item -ItemType Directory -Path $releaseScreenshots -Force | Out-Null
    foreach ($screenshot in $screenshots) {
        Move-Item -LiteralPath (Join-Path $stagedScreenshots $screenshot) -Destination $releaseScreenshots -Force
    }
    Write-Output "Signer: $($cert.Subject) [$($cert.Thumbprint)]"
    Write-Output "Authenticode status on this computer: $($signature.Status)"
    Write-Output "Archive: $(Join-Path $releaseDir $archiveName)"
} finally {
    foreach ($file in $stagedExe, $stagedCert, $stagedArchive, $stagedGuide, $stagedChecksum) {
        if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
    }
    if (Test-Path -LiteralPath $stagedScreenshots) {
        foreach ($screenshot in $screenshots) {
            $file = Join-Path $stagedScreenshots $screenshot
            if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
        }
        Remove-Item -LiteralPath $stagedScreenshots
    }
    Remove-Item -LiteralPath $staging
}
