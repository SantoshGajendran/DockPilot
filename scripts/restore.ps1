# DockPilot PostgreSQL Restore Script for PowerShell
[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,
    [string]$ContainerName = "dockpilot-postgres",
    [string]$DbUser = "dockpilot",
    [string]$DbName = "dockpilot",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupFile)) {
    throw "Backup file '$BackupFile' does not exist."
}

$ChecksumFile = "${BackupFile}.sha256"
if (Test-Path -Path $ChecksumFile) {
    Write-Host "==> Verifying SHA256 checksum..." -ForegroundColor Cyan
    $ExpectedHash = (Get-Content -Path $ChecksumFile | Select-Object -First 1).Split(" ")[0].Trim()
    $ActualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
    if ($ExpectedHash.ToLower() -ne $ActualHash.ToLower()) {
        throw "Checksum verification failed! Expected: $ExpectedHash, Got: $ActualHash"
    }
    Write-Host "Checksum verification succeeded." -ForegroundColor Green
}

if (-not $Force) {
    $Prompt = Read-Host "Are you sure you want to restore '$BackupFile' into '$DbName'? (y/N)"
    if ($Prompt -notmatch "^[Yy]$") {
        Write-Host "Restore aborted by user." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "==> Restoring database '$DbName' from '$BackupFile'..." -ForegroundColor Cyan

Get-Content -Path $BackupFile | & docker exec -i $ContainerName psql -U $DbUser -d $DbName
if ($LASTEXITCODE -ne 0) {
    throw "Restore failed with exit code $LASTEXITCODE"
}

Write-Host "==> Restore completed successfully." -ForegroundColor Green
