$ErrorActionPreference = "Stop"
$container = "supabase_db_recovery-20261001-175031"
$apply = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-schema-apply.sql")
$audit = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-function-surface.sql")
$guard = @'
BEGIN;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF session_user<>'supabase_admin' OR current_database()<>'postgres' OR inet_server_addr() IS NOT NULL
 OR to_regnamespace('matelematics_rls_lab') IS NULL THEN RAISE EXCEPTION 'Expected recovery lab'; END IF;
END $guard$;
'@

$sql = $guard + "`n" + $apply + "`n" + $audit + "`nROLLBACK;"
$sql | docker exec -i $container psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Function surface inventory failed; transaction rolled back" }
Write-Host "FUNCTION INVENTORY COMPLETE - ROLLBACK; listed functions require review, not a security PASS"
