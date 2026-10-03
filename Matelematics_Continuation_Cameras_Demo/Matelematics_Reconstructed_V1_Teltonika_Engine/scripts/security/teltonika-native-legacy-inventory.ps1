$ErrorActionPreference = "Stop"
$container = "supabase_db_recovery-20261001-175031"
$sql = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-legacy-inventory.sql")
$sql | docker exec -i $container psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Legacy inventory failed; no data modified" }
Write-Host "LEGACY INVENTORY COMPLETE - READ ONLY; no reconciliation performed"
