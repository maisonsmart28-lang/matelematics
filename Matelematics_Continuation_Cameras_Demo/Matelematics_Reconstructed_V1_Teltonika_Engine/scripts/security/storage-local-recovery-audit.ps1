$ErrorActionPreference = "Stop"
# Deliberately fixed to the new local recovery lab. No remote URL accepted.
$labDir = Join-Path $env:LOCALAPPDATA "Matelematics\RestoreLab\20261001-175031"
$baseUrl = "http://127.0.0.1:55321"
$container = "supabase_db_recovery-20261001-175031"
$bucket = "compliance-documents"
$companyA = "20000000-0000-0000-0000-000000000001"
$marker = [guid]::NewGuid().ToString("N")
$objectPath = "$companyA/local-storage-audit-$marker.png"
$workDir = Join-Path $env:TEMP "matelematics-storage-$marker"
New-Item -ItemType Directory -Path $workDir | Out-Null
$statusFile = Join-Path $workDir "status.json"
$sourceFile = Join-Path $workDir "synthetic.png"
$downloadFile = Join-Path $workDir "download.png"
$config = $null
$sessionA = $null
$sessionB = $null
$attempted = $false
$cleanupFailed = $false

function Login-Local([string]$email) {
    $credential = Get-Credential -UserName $email -Message "Mot de passe du compte restaure : $email"
    if ($null -eq $credential -or $credential.UserName -ne $email) {
        throw "Compte attendu : $email"
    }
    try {
        $body = @{email=$email; password=$credential.GetNetworkCredential().Password} | ConvertTo-Json -Compress
        return Invoke-RestMethod -Uri "$baseUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{apikey=$config.ANON_KEY} -ContentType "application/json" -Body $body -TimeoutSec 20
    } finally {
        $credential=$null
        $body=$null
    }
}

function Assert-Denied([string]$label, [string]$url, [hashtable]$requestHeaders) {
    try {
        $response=Invoke-WebRequest -Uri $url -Headers $requestHeaders -UseBasicParsing -TimeoutSec 20
        $code=[int]$response.StatusCode
    } catch {
        if ($null -eq $_.Exception.Response) {throw "Erreur reseau : $label"}
        $code=[int]$_.Exception.Response.StatusCode
    }
    # Storage may deliberately mask an inaccessible object as not found.
    if ($code -notin @(400,401,403,404)) {
        throw "FAIL: $label HTTP $code ; refus attendu."
    }
    Write-Host "PASS: $label refuse (HTTP $code)"
}

try {
    $command='npx --yes supabase@2.118.0 --workdir "'+$labDir+'" status --output json > "'+$statusFile+'"'
    & $env:ComSpec /d /c $command
    if ($LASTEXITCODE -ne 0) {throw "Configuration locale inaccessible"}
    $config=Get-Content $statusFile -Raw | ConvertFrom-Json
    if (-not $config.ANON_KEY -or -not $config.SERVICE_ROLE_KEY) {
        throw "Cles du laboratoire local introuvables"
    }
    Remove-Item $statusFile
    $sessionA=Login-Local "user.test@matelematics.local"
    $sessionB=Login-Local "user.crud.test@matelematics.local"
    $headersA=@{apikey=$config.ANON_KEY; Authorization="Bearer $($sessionA.access_token)"}
    $headersB=@{apikey=$config.ANON_KEY; Authorization="Bearer $($sessionB.access_token)"}
    foreach ($item in @(@{session=$sessionA;headers=$headersA;isA=$true},@{session=$sessionB;headers=$headersB;isA=$false})) {
        $response=Invoke-WebRequest -Uri "$baseUrl/rest/v1/profiles?id=eq.$($item.session.user.id)&select=role,company_id" -Headers $item.headers -UseBasicParsing -TimeoutSec 20
        $parsed=$response.Content | ConvertFrom-Json
        $profiles=@($parsed)
        if ($profiles.Count -ne 1 -or $profiles[0].role -ne "user" -or -not $profiles[0].company_id) {throw "Profil utilisateur inattendu"}
        if (($item.isA -and $profiles[0].company_id -ne $companyA) -or (-not $item.isA -and $profiles[0].company_id -eq $companyA)) {throw "Entreprises A/B non conformes"}
    }
    # A tiny synthetic PNG, no client data.
    [IO.File]::WriteAllBytes($sourceFile,[Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=="))
    $sourceHash=(Get-FileHash $sourceFile -Algorithm SHA256).Hash
    $serviceHeaders=@{apikey=$config.SERVICE_ROLE_KEY;Authorization="Bearer $($config.SERVICE_ROLE_KEY)"}
    $attempted=$true
    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket/$objectPath" -Method Post -Headers $serviceHeaders -ContentType "image/png" -InFile $sourceFile -TimeoutSec 20 | Out-Null
    Write-Host "PASS: image fictive chargee via API locale"

    $downloadUrl="$baseUrl/storage/v1/object/authenticated/$bucket/$objectPath"
    Invoke-WebRequest -Uri $downloadUrl -Headers $headersA -OutFile $downloadFile -UseBasicParsing -TimeoutSec 20 | Out-Null
    if ((Get-FileHash $downloadFile -Algorithm SHA256).Hash -ne $sourceHash) {throw "FAIL: SHA256 du fichier telecharge different"}
    Write-Host "PASS: compte A telecharge son fichier ; SHA256 identique"

    Assert-Denied "Lecture etrangere compte B" $downloadUrl $headersB
    $anonHeaders=@{apikey=$config.ANON_KEY;Authorization="Bearer $($config.ANON_KEY)"}
    Assert-Denied "Lecture anonyme" $downloadUrl $anonHeaders
    Assert-Denied "URL publique du bucket prive" "$baseUrl/storage/v1/object/public/$bucket/$objectPath" @{apikey=$config.ANON_KEY}
    Write-Host "STORAGE LOCAL : LECTURE BINAIRE ET REFUS TESTES PASS"
} finally {
    if ($attempted) {
        try {
            $body=@{prefixes=@($objectPath)} | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket" -Method Delete -Headers $serviceHeaders -ContentType "application/json" -Body $body -TimeoutSec 20 | Out-Null
            # Exact unique fixture, guard and assertion, read-only SQL.
            $sql="DO \$check\$ BEGIN IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='compliance-documents' AND name='$objectPath') THEN RAISE EXCEPTION 'Fixture encore presente'; END IF; END \$check\$;"
            # Dollar quoting is built explicitly to avoid PowerShell interpolation.
            $sql='DO $check$ BEGIN IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id=''compliance-documents'' AND name='''+$objectPath+''') THEN RAISE EXCEPTION ''Fixture encore presente''; END IF; END $check$;'
            $sql | docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres
            if ($LASTEXITCODE -ne 0) {throw "Absence de fixture non confirmee"}
            Write-Host "PASS: fichier fictif supprime via Storage API ; metadata absente"
        } catch {
            $cleanupFailed=$true
            Write-Host "NETTOYAGE NON CONFIRME : $bucket/$objectPath"
        }
    }
    foreach ($session in @($sessionA,$sessionB)) {
        if ($session) {
            try {
                Invoke-RestMethod -Uri "$baseUrl/auth/v1/logout" -Method Post -Headers @{apikey=$config.ANON_KEY;Authorization="Bearer $($session.access_token)"} -TimeoutSec 20 | Out-Null
                Write-Host "PASS: deconnexion locale"
            } catch {Write-Host "Deconnexion non confirmee"}
        }
    }
    Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue
    $config=$null
    $serviceHeaders=$null
    $headersA=$null
    $headersB=$null
    $anonHeaders=$null
    $sessionA=$null
    $sessionB=$null
    $item=$null
    $session=$null
    if ($cleanupFailed) {throw "Nettoyage a reprendre pour $objectPath"}
}
