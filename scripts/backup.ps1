# DockPilot PostgreSQL Backup Script for PowerShell
[CmdletBinding()]
param (
    [string]$BackupDir = ".\backups",
    [string]$ContainerName = "dockpilot-postgres",
    [string]$DbUser = "dockpilot",
    [string]$DbName = "dockpilot"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DumpFile = Join-Path $BackupDir "dockpilot_${Timestamp}.sql"
$ChecksumFile = "${DumpFile}.sha256"

Write-Host "==> Starting DockPilot database backup..." -ForegroundColor Cyan
Write-Host "Container: $ContainerName"
Write-Host "Database:  $DbName"
Write-Host "Target:    $DumpFile"

& docker exec -t $ContainerName pg_dump -U $DbUser $DbName > $DumpFile
if ($LASTEXITCODE -ne 0) {
    throw "Database dump failed with exit code $LASTEXITCODE"
}

$Hash = Get-FileHash -Path $DumpFile -Algorithm SHA256
"$($Hash.Hash)  $(Split-Path $DumpFile -Leaf)" | Out-File -FilePath $ChecksumFile -Encoding utf8

$FileSize = (Get-Item $DumpFile).Length / 1MB
Write-Host ("==> Backup completed successfully ({0:N2} MB)" -f $FileSize) -ForegroundColor Green
Write-Host "Artifact: $DumpFile"
Write-Host "Checksum: $ChecksumFile"
