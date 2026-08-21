param([switch]$UseLocalBackend)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot 'backend'
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    throw 'Avhengigheter mangler. Kjør .\setup-test.ps1 først.'
}

$backendProcess = $null

if ($UseLocalBackend) {
    $pythonCandidates = @(
        (Join-Path $backendRoot '.venv-local\Scripts\python.exe'),
        (Join-Path $backendRoot '.venv313\Scripts\python.exe'),
        (Join-Path $backendRoot '.venv312\Scripts\python.exe'),
        (Join-Path $backendRoot '.venv\Scripts\python.exe')
    )
    $backendPython = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $backendPython) { throw 'Lokalt Python-miljo mangler. Kjor .\setup-test.ps1 -WithLocalBackend.' }
    $backendProcess = Start-Process -FilePath $backendPython -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru
    $env:VITE_BACKEND_URL = 'http://127.0.0.1:8000'
    Write-Host "Backend startet (PID $($backendProcess.Id))."
} else {
    Remove-Item Env:VITE_BACKEND_URL -ErrorAction SilentlyContinue
    Write-Host 'Bruker hostet livesok. Python er ikke nodvendig.' -ForegroundColor Green
}

Write-Host 'Åpne http://127.0.0.1:5173/Travel-swish/ i nettleseren.' -ForegroundColor Cyan
Write-Host 'Trykk Ctrl+C for å stoppe.'
try {
    & npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
} finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id
    }
}
