# Publica E-FISCAL no GitHub (demo em /docs — Pages sem build)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Demo E-FISCAL — GitHub Pages em /docs"
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Execute primeiro: gh auth login"
    exit 1
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    gh repo create RivasCode-Ops/e-fiscal --public --source=. --remote=origin --push
} else {
    git push -u origin main
}

Write-Host ""
Write-Host "OK. Ative Pages: Settings -> Pages -> branch main -> pasta /docs"
Write-Host "URL esperada: https://rivascode-ops.github.io/e-fiscal/"
