$ErrorActionPreference = "Stop"
$container = "supabase_db_recovery-20261001-175031"
if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) {
    throw "Retirer les overrides Docker avant le test local."
}
$context = (& docker context show).Trim()
if ($LASTEXITCODE -ne 0 -or $context -ne "desktop-linux") {
    throw "Le contexte Docker local desktop-linux est requis."
}
$endpoint = & docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $endpoint -notmatch '^npipe:') {
    throw "Le moteur Docker Desktop Windows local est requis."
}
$source = Join-Path $PSScriptRoot "rpc-sampling-local-audit.sql"
$sql = [System.IO.File]::ReadAllText($source)
if ($sql -notmatch 'ROLLBACK;\s*$') {
    throw "Le script de simulation doit se terminer par ROLLBACK."
}
# Keep every guard and all 88 tests. Only the final transaction decision changes.
$sql = [regex]::Replace($sql, 'ROLLBACK;\s*$', "COMMIT;")
$temp = Join-Path $env:TEMP ("matelematics-sampling-" + [guid]::NewGuid().ToString("N") + ".sql")
try {
    [System.IO.File]::WriteAllText($temp, $sql, (New-Object System.Text.UTF8Encoding($false)))
    & docker cp $temp "${container}:/tmp/rpc-sampling-local-apply.sql"
    if ($LASTEXITCODE -ne 0) { throw "Copie SQL echouee." }
    & docker exec -e PGAPPNAME=matelematics-local-sampling-audit $container psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/rpc-sampling-local-apply.sql
    if ($LASTEXITCODE -ne 0) { throw "Correction locale echouee ; transaction non validee." }
    Write-Host "CORRECTION ECHANTILLONNAGE LOCALE ET 88 TESTS : COMMIT PASS"
}
finally {
    Remove-Item $temp -ErrorAction SilentlyContinue
}
