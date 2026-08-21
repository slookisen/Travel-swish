$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    throw 'Avhengigheter mangler. Kjor .\setup-test.ps1 forst.'
}

Write-Host 'Bygger installasjonsklar PWA...' -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'PWA-bygget feilet.' }

Write-Host 'Apne http://127.0.0.1:4173/Travel-swish/ i Chrome eller Edge.' -ForegroundColor Green
Write-Host 'Trykk Ctrl+C for a stoppe.'
& npx.cmd vite preview --host 127.0.0.1 --port 4173 --strictPort
