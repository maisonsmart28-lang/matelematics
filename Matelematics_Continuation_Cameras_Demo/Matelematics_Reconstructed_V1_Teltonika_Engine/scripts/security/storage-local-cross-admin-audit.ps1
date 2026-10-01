$ErrorActionPreference="Stop"
$baseUrl="http://127.0.0.1:55321"
$container="supabase_db_recovery-20261001-175031"
$labDir=Join-Path $env:LOCALAPPDATA "Matelematics\RestoreLab\20261001-175031"
$companyA="20000000-0000-0000-0000-000000000001"
$bucket="compliance-documents"
$marker=[guid]::NewGuid().ToString("N")
$email="audit-storage-admin-$marker@matelematics.local"
$password=[guid]::NewGuid().ToString("N")+"Aa!9"
$workDir=Join-Path $env:TEMP "matelematics-cross-admin-$marker"
New-Item -ItemType Directory -Path $workDir | Out-Null
$statusFile=Join-Path $workDir "status.json"
$sourceFile=Join-Path $workDir "fixture.png"
$downloadFile=Join-Path $workDir "download.png"
$pathA="$companyA/cross-admin-$marker.png"
$foreignInsert="$companyA/cross-admin-insert-$marker.png"
$pathB=$null
$userId=$null
$session=$null
$config=$null
$stage="configuration"
$cleanupFailed=$false

function Run-LocalSql([string]$sql) {
    $output=$sql | docker exec -i $container psql -X -A -t -v ON_ERROR_STOP=1 -U supabase_admin -d postgres
    if ($LASTEXITCODE -ne 0) {throw "SQL local echoue"}
    return $output
}

function Assert-ForeignIntact {
    Invoke-WebRequest -Uri "$baseUrl/storage/v1/object/authenticated/$bucket/$pathA" -Headers $serviceHeaders -OutFile $downloadFile -UseBasicParsing -TimeoutSec 20 | Out-Null
    if ((Get-FileHash $downloadFile -Algorithm SHA256).Hash -ne $sourceHash) {throw "Fichier A modifie"}
    Run-LocalSql ('DO $check$ BEGIN IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id=''compliance-documents'' AND name='''+$foreignInsert+''') THEN RAISE EXCEPTION ''Objet etranger cree''; END IF; END $check$;') | Out-Null
}

function Test-ForeignDenied([string]$label,[string]$method,[string]$url,[string]$file,[string]$body) {
    $p=@{Uri=$url;Method=$method;Headers=$userHeaders;UseBasicParsing=$true;TimeoutSec=20;ErrorAction="Stop"}
    if ($file) {$p.InFile=$file;$p.ContentType="image/png"}
    if ($body) {$p.Body=$body;$p.ContentType="application/json"}
    try {$r=Invoke-WebRequest @p;$code=[int]$r.StatusCode}
    catch {
        if ($null -eq $_.Exception.Response) {throw "Erreur reseau"}
        $code=[int]$_.Exception.Response.StatusCode
    }
    if ($code -notin @(400,401,403,404) -and -not ($method -eq "Delete" -and $code -eq 200)) {throw "Operation etrangere non refusee HTTP $code"}
    Assert-ForeignIntact
    Write-Host "PASS: administrateur B $label etranger sans effet (HTTP $code)"
}

try {
    $command='npx --yes supabase@2.118.0 --workdir "'+$labDir+'" status --output json > "'+$statusFile+'"'
    & $env:ComSpec /d /c $command
    if ($LASTEXITCODE -ne 0) {throw "Status local inaccessible"}
    $config=Get-Content $statusFile -Raw | ConvertFrom-Json
    if (-not $config.ANON_KEY -or -not $config.SERVICE_ROLE_KEY) {throw "Cles locales absentes"}
    Remove-Item $statusFile
    $serviceHeaders=@{apikey=$config.SERVICE_ROLE_KEY;Authorization="Bearer $($config.SERVICE_ROLE_KEY)"}
    $companyRaw=Run-LocalSql "SELECT p.company_id FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE u.email='user.crud.test@matelematics.local' AND p.role='user';"
    $companyB=([guid](($companyRaw -join "").Trim())).ToString()
    if ($companyB -eq $companyA -or $companyB -eq "00000000-0000-0000-0000-000000000000") {throw "Entreprise B non conforme"}
    $pathB="$companyB/cross-admin-$marker.png"

    $stage="creation compte fictif"
    $body=@{email=$email;password=$password;email_confirm=$true} | ConvertTo-Json -Compress
    $created=Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/users" -Method Post -Headers $serviceHeaders -ContentType "application/json" -Body $body -TimeoutSec 20
    $userId=([guid]$created.id).ToString()
    if ($userId -eq "00000000-0000-0000-0000-000000000000") {throw "Identifiant Auth absent"}
    Run-LocalSql "INSERT INTO public.profiles(id,company_id,full_name,role) VALUES ('$userId'::uuid,'$companyB'::uuid,'LOCAL STORAGE ADMIN AUDIT $marker','client_admin');" | Out-Null

    $stage="connexion administrateur fictif"
    $body=@{email=$email;password=$password} | ConvertTo-Json -Compress
    $session=Invoke-RestMethod -Uri "$baseUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{apikey=$config.ANON_KEY} -ContentType "application/json" -Body $body -TimeoutSec 20
    $password=$null
    $body=$null
    $userHeaders=@{apikey=$config.ANON_KEY;Authorization="Bearer $($session.access_token)"}
    $r=Invoke-WebRequest -Uri "$baseUrl/rest/v1/profiles?id=eq.$userId&select=role,company_id" -Headers $userHeaders -UseBasicParsing -TimeoutSec 20
    $parsed=$r.Content | ConvertFrom-Json
    $profiles=@($parsed)
    if ($profiles.Count -ne 1 -or $profiles[0].role -ne "client_admin" -or $profiles[0].company_id -ne $companyB) {throw "Profil JWT non conforme"}
    Write-Host "PASS: compte fictif client_admin de B authentifie"

    [IO.File]::WriteAllBytes($sourceFile,[Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=="))
    $sourceHash=(Get-FileHash $sourceFile -Algorithm SHA256).Hash
    $stage="fixture A et lecture positive B"
    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket/$pathA" -Method Post -Headers $serviceHeaders -ContentType "image/png" -InFile $sourceFile -TimeoutSec 20 | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket/$pathB" -Method Post -Headers $userHeaders -ContentType "image/png" -InFile $sourceFile -TimeoutSec 20 | Out-Null
    Invoke-WebRequest -Uri "$baseUrl/storage/v1/object/authenticated/$bucket/$pathB" -Headers $userHeaders -OutFile $downloadFile -UseBasicParsing -TimeoutSec 20 | Out-Null
    if ((Get-FileHash $downloadFile -Algorithm SHA256).Hash -ne $sourceHash) {throw "Lecture propre B incorrecte"}
    Write-Host "PASS: administrateur B cree et lit son propre fichier"

    $stage="refus lectures et ecritures etrangeres"
    Test-ForeignDenied "SELECT" "Get" "$baseUrl/storage/v1/object/authenticated/$bucket/$pathA" "" ""
    Test-ForeignDenied "INSERT" "Post" "$baseUrl/storage/v1/object/$bucket/$foreignInsert" $sourceFile ""
    Test-ForeignDenied "UPDATE" "Put" "$baseUrl/storage/v1/object/$bucket/$pathA" $sourceFile ""
    $body=@{prefixes=@($pathA)} | ConvertTo-Json -Compress
    Test-ForeignDenied "DELETE" "Delete" "$baseUrl/storage/v1/object/$bucket" "" $body
    Write-Host "STORAGE ISOLATION CLIENT_ADMIN ENTRE ENTREPRISES : PASS"
} catch {
    throw "AUDIT FAIL a l'etape : $stage. Aucun secret affiche."
} finally {
    if ($config -and $serviceHeaders) {
        try {
            $paths=@($pathA,$foreignInsert)
            if ($pathB) {$paths+= $pathB}
            $body=@{prefixes=$paths} | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/storage/v1/object/$bucket" -Method Delete -Headers $serviceHeaders -ContentType "application/json" -Body $body -TimeoutSec 20 | Out-Null
            foreach ($path in $paths) {
                Run-LocalSql ('DO $check$ BEGIN IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id=''compliance-documents'' AND name='''+$path+''') THEN RAISE EXCEPTION ''Fixture fichier restante''; END IF; END $check$;') | Out-Null
            }
            Write-Host "PASS: fichiers fictifs supprimes et absence verifiee"
        } catch {$cleanupFailed=$true;Write-Host "NETTOYAGE FICHIERS NON CONFIRME : marqueur $marker"}
    }
    if ($session) {
        try {Invoke-RestMethod -Uri "$baseUrl/auth/v1/logout" -Method Post -Headers $userHeaders -TimeoutSec 20 | Out-Null;Write-Host "PASS: deconnexion locale"}
        catch {$cleanupFailed=$true;Write-Host "Deconnexion non confirmee"}
    }
    # Resolve a possible creation whose HTTP response was interrupted.
    if (-not $userId -and $config) {
        try {
            $found=Run-LocalSql "SELECT id FROM auth.users WHERE email='$email';"
            $foundText=($found -join "").Trim()
            if ($foundText) {$userId=([guid]$foundText).ToString()}
        } catch {$cleanupFailed=$true;Write-Host "Verification compte fictif non confirmee : $email"}
    }
    if ($userId) {
        try {
            Run-LocalSql "DELETE FROM public.profiles WHERE id='$userId'::uuid AND full_name='LOCAL STORAGE ADMIN AUDIT $marker';" | Out-Null
            Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/users/$userId" -Method Delete -Headers $serviceHeaders -TimeoutSec 20 | Out-Null
            Run-LocalSql ('DO $check$ BEGIN IF EXISTS (SELECT 1 FROM auth.users WHERE id='''+$userId+'''::uuid) OR EXISTS (SELECT 1 FROM public.profiles WHERE id='''+$userId+'''::uuid) THEN RAISE EXCEPTION ''Compte fictif restant''; END IF; END $check$;') | Out-Null
            Write-Host "PASS: compte Auth et profil fictifs supprimes"
        } catch {$cleanupFailed=$true;Write-Host "NETTOYAGE COMPTE NON CONFIRME : $email / $userId"}
    }
    Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue
    $password=$null;$body=$null;$config=$null;$session=$null;$created=$null
    $serviceHeaders=$null;$userHeaders=$null
    if ($cleanupFailed) {throw "Nettoyage a reprendre : marqueur $marker"}
}
