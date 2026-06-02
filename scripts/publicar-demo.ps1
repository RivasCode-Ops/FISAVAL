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
    Write-Host "Aviso: gh nao logado. Use 'gh auth login' ou git push com suas credenciais."
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    git remote add origin https://github.com/RivasCode-Ops/FISAVAL.git 2>$null
    git push -u origin main
} else {
    git push -u origin main
}

Write-Host ""
Write-Host "OK. Ative Pages: Settings -> Pages -> branch main -> pasta /docs"
Write-Host "URL: https://rivascode-ops.github.io/FISAVAL/"
