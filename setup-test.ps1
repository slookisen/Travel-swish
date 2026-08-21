param([switch]$WithLocalBackend)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Host 'Installerer frontend-avhengigheter...'
& npm.cmd install --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Installasjon av frontend-avhengigheter feilet.' }

if (-not $WithLocalBackend) {
    Write-Host ''
    Write-Host 'Oppsett ferdig. Standard start bruker den hostede live-tjenesten og krever ikke Python.' -ForegroundColor Green
    Write-Host 'Kjor .\start-test.ps1 for a starte appen.' -ForegroundColor Green
    Write-Host 'For lokal backend: .\setup-test.ps1 -WithLocalBackend' -ForegroundColor DarkGray
    exit 0
}

$backendRoot = Join-Path $projectRoot 'backend'
$venvRoot = Join-Path $backendRoot '.venv-local'
Write-Host 'Finner en kompatibel Python-versjon for lokal backend...'
$pythonExe = $null
$pythonArgs = @()
$candidates = @(
    @{ Exe = 'py'; Args = @('-3.14') },
    @{ Exe = 'py'; Args = @('-3.13') },
    @{ Exe = 'py'; Args = @('-3.12') },
    @{ Exe = 'python'; Args = @() }
)
foreach ($candidate in $candidates) {
    if (-not (Get-Command $candidate.Exe -ErrorAction SilentlyContinue)) { continue }
    & $candidate.Exe @($candidate.Args) -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $pythonExe = $candidate.Exe
        $pythonArgs = $candidate.Args
        break
    }
}
if (-not $pythonExe) {
    throw 'Lokal backend krever Python 3.12 eller nyere. Standard hostet livesok virker uten Python.'
}

Write-Host 'Oppretter lokalt Python-miljo...'
& $pythonExe @pythonArgs -m venv $venvRoot
$backendPython = Join-Path $venvRoot 'Scripts\python.exe'
if (-not (Test-Path -LiteralPath $backendPython)) { throw 'Python-miljoet ble ikke opprettet.' }
& $backendPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Oppdatering av pip feilet.' }
& $backendPython -m pip install -r (Join-Path $backendRoot 'requirements-dev.txt')
if ($LASTEXITCODE -ne 0) { throw 'Installasjon av backend-avhengigheter feilet.' }

Write-Host ''
Write-Host 'Lokalt backend-oppsett ferdig.' -ForegroundColor Green
Write-Host 'Kjor .\start-test.ps1 -UseLocalBackend for a bruke det.' -ForegroundColor Green
