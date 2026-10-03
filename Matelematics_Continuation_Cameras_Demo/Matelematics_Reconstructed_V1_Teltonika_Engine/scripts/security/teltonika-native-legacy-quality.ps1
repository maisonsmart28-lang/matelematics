$ErrorActionPreference = "Stop"
$sql = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-legacy-quality.sql")
$sql | docker exec -i supabase_db_recovery-20261001-175031 psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Legacy quality inventory failed" }
Write-Host "LEGACY QUALITY INVENTORY COMPLETE - READ ONLY; metadata is not proof of alert completion"
