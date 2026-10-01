$ErrorActionPreference = "Stop"
$labDir = Join-Path $env:LOCALAPPDATA "Matelematics\RestoreLab\20261001-175031"
$baseUrl = "http://127.0.0.1:55321"
$container = "supabase_db_recovery-20261001-175031"
$email = "client.admin.test@matelematics.local"
$companyId = "20000000-0000-0000-0000-000000000001"
$bucket = "compliance-documents"
$marker = [guid]::NewGuid().ToString("N")
$objectPath = "$companyId/local-admin-audit-$marker.png"
$workDir = Join-Path $env:TEMP "matelematics-storage-admin-$marker"
New-Item -ItemType Directory -Path $workDir | Out-Null
$statusFile = Join-Path $workDir "status.json"
$sourceFile = Join-Path $workDir "source.png"
$replacementFile = Join-Path $workDir "replacement.png"
$downloadFile = Join-Path $workDir "download.png"
$session = $null
$headers = $null
$config = $null
$attempted = $false
$cleanupFailed = $false

function Assert-DownloadedHash([string]$expected, [string]$label) {
    Invoke-WebRequest -Uri "$baseUrl/storage/v1/object/authenticated/$bucket/$objectPath" -Headers $headers -OutFile $downloadFile -UseBasicParsing -TimeoutSec 20 | Out-Null
    if ((Get-FileHash $downloadFile -Algorithm SHA256).Hash -ne $expected) {throw "FAIL: $label SHA256 different"}
    Write-Host "PASS: $label ; SHA256 identique"
}

function Assert-FixtureAbsent {
    $sql='DO $check$ BEGIN IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id=''compliance-documents'' AND name='''+$objectPath+''') THEN RAISE EXCEPTION ''Fixture encore presente''; END IF; END $check$;'
    $sql | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres
    if ($LASTEXITCODE -ne 0) {throw "Absence de fixture non confirmee"}
}

try {
    $command='npx --yes supabase@2.118.0 --workdir "'+$labDir+'" status --output json > "'+$statusFile+'"'
    & $env:ComSpec /d /c $command
    if ($LASTEXITCODE -ne 0) {throw "Configuration locale inaccessible"}
    $config=Get-Content $statusFile -Raw | ConvertFrom-Json
    if (-not $config.ANON_KEY -or -not $config.SERVICE_ROLE_KEY) {throw "Cles locales introuvables"}
    Remove-Item $statusFile
    $credential=Get-Credential -UserName $email -Message "Mot de passe de l'administrateur restaure localement"
    if ($null -eq $credential -or $credential.UserName -ne $email) {throw "Compte administrateur attendu"}
    $loginBody=@{email=$email;password=$credential.GetNetworkCredential().Password} | ConvertTo-Json -Compress
    $session=Invoke-RestMethod -Uri "$baseUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{apikey=$config.ANON_KEY} -ContentType "application/json" -Body $loginBody -TimeoutSec 20
    $credential=$null
    $loginBody=$null
    $headers=@{apikey=$config.ANON_KEY;Authorization="Bearer $($session.access_token)"}
    $response=Invoke-WebRequest -Uri "$baseUrl/rest/v1/profiles?id=eq.$($session.user.id)&select=role,company_id" -Headers $headers -UseBasicParsing -TimeoutSec 20
    $parsed=$response.Content | ConvertFrom-Json
    $profiles=@($parsed)
    if ($profiles.Count -ne 1 -or $profiles[0].role -ne "client_admin" -or $profiles[0].company_id -ne $companyId) {throw "Profil administrateur non conforme"}
    Write-Host "PASS: Auth client_admin et entreprise verifiees"

    $bytes=[Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==")
    [IO.File]::WriteAllBytes($sourceFile,$bytes)
    # Different binary content; synthetic PNG plus trailing byte, never real client data.
    [IO.File]::WriteAllBytes($replacementFile,($bytes + [byte[]]@(0)))
    $hash1=(Get-FileHash $sourceFile -Algorithm SHA256).Hash
    $hash2=(Get-FileHash $replacementFile -Algorithm SHA256).Hash
    if ($hash1 -eq $hash2) {throw "Fichiers de test non distincts"}
    $attempted=$true
    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket/$objectPath" -Method Post -Headers $headers -ContentType "image/png" -InFile $sourceFile -TimeoutSec 20 | Out-Null
    Write-Host "PASS: INSERT par JWT client_admin"
    Assert-DownloadedHash $hash1 "Lecture apres ajout"

    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket/$objectPath" -Method Put -Headers $headers -ContentType "image/png" -InFile $replacementFile -TimeoutSec 20 | Out-Null
    Write-Host "PASS: UPDATE par JWT client_admin"
    Assert-DownloadedHash $hash2 "Lecture apres remplacement"

    $deleteBody=@{prefixes=@($objectPath)} | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket" -Method Delete -Headers $headers -ContentType "application/json" -Body $deleteBody -TimeoutSec 20 | Out-Null
    Assert-FixtureAbsent
    # A 200 deletion response alone is insufficient: verify download is now denied.
    try {
        $response=Invoke-WebRequest -Uri "$baseUrl/storage/v1/object/authenticated/$bucket/$objectPath" -Headers $headers -UseBasicParsing -TimeoutSec 20
        $code=[int]$response.StatusCode
    } catch {
        if ($null -eq $_.Exception.Response) {throw "Erreur reseau pendant verification suppression"}
        $code=[int]$_.Exception.Response.StatusCode
    }
    if ($code -notin @(400,404)) {throw "FAIL: fichier encore accessible ou erreur inattendue HTTP $code"}
    Write-Host "PASS: DELETE par JWT client_admin ; metadata absente et telechargement impossible"
    Write-Host "STORAGE CLIENT_ADMIN INSERT UPDATE DELETE : PASS"
} finally {
    if ($attempted) {
        try {
            $serviceHeaders=@{apikey=$config.SERVICE_ROLE_KEY;Authorization="Bearer $($config.SERVICE_ROLE_KEY)"}
            $body=@{prefixes=@($objectPath)} | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket" -Method Delete -Headers $serviceHeaders -ContentType "application/json" -Body $body -TimeoutSec 20 | Out-Null
            Assert-FixtureAbsent
            Write-Host "PASS: nettoyage final verifie"
        } catch {
            $cleanupFailed=$true
            Write-Host "NETTOYAGE NON CONFIRME : $bucket/$objectPath"
        }
    }
    if ($session -and $headers) {
        try {
            Invoke-RestMethod -Uri "$baseUrl/auth/v1/logout" -Method Post -Headers $headers -TimeoutSec 20 | Out-Null
            Write-Host "PASS: deconnexion locale"
        } catch {Write-Host "Deconnexion non confirmee"}
    }
    Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue
    $credential=$null
    $loginBody=$null
    $session=$null
    $headers=$null
    $serviceHeaders=$null
    $config=$null
    if ($cleanupFailed) {throw "Nettoyage a reprendre pour $objectPath"}
}
