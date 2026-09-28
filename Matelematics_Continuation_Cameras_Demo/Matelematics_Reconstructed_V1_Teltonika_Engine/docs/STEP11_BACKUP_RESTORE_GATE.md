# Étape 11 — sauvegarde et restauration : état du 28 septembre 2026

## Inventaire vérifié

Le projet Supabase Matelematics `nhkwxcjncluvetrgxhwv` est actif, en région `eu-west-3`, PostgreSQL 17.6.1.165. Son organisation est sur le plan **Free**. La base occupe environ **140 Mo**, contient **5 comptes Auth**, un bucket Storage privé `compliance-documents` et **un objet Storage** (comptages, sans lecture de contenu). La taille enregistrée dans les métadonnées est nulle ; ne pas l'interpréter comme une taille réelle ni télécharger ce document dans l'espace de travail.

Selon la [documentation officielle Supabase sur les sauvegardes](https://supabase.com/docs/guides/platform/backups), les sauvegardes quotidiennes gérées sont prévues pour Pro, Team et Enterprise ; Supabase recommande aux projets Free d'exporter régulièrement leurs données avec `supabase db dump` et de conserver une copie hors site. La sauvegarde de la base couvre les métadonnées Storage, **pas les fichiers stockés**. Aucun RPO/RTO, dump réel ni restauration n'a été vérifié dans cet audit.

## Décision pour le démarrage minimal

1. **Avant toute nouvelle donnée client**, réaliser un export logique chiffré et daté du schéma métier, des données et des rôles ; traiter **Auth et les métadonnées Storage séparément**, puis copier aussi les objets Storage. Conserver les exports hors dépôt Git, hors répertoire OneDrive synchronisé, avec accès limité. Ne pas écrire le mot de passe de la base dans la commande ou dans le fichier de documentation.
2. Vérifier l'intégrité des fichiers (SHA-256), le nombre d'objets Storage, la taille et la date. Tester la restauration dans une **instance locale isolée** ou un projet de test dédié, jamais sur le projet actif. La restauration d'un projet actif coupe l'accès et peut effacer des données plus récentes.
3. Mesurer le temps de restauration et les contrôles métier après reprise : comptes Auth, politiques RLS, entreprises, véhicules, positions, télémétrie, fichiers Storage, et connexion d'un utilisateur de test. Documenter le point de restauration obtenu.
4. Mettre en place une fréquence de sauvegarde selon la perte de données acceptable. Une simple exportation ponctuelle ne répond pas à l'objectif de continuité. Avant de vendre un engagement de disponibilité ou de conservation, choisir une politique explicite de rétention et d'export automatique supervisé.

**Portée de la CLI 2.118.0 :** par défaut, `supabase db dump` exclut les schémas gérés `auth` et `storage` ; le dump de schéma seul exclut aussi les données et les rôles personnalisés. Il serait incorrect d'appeler les seuls fichiers `roles.sql`, `schema.sql`, `data.sql` une sauvegarde complète de ces 5 comptes Auth et du document Storage. Vérifier la prise en charge et la restauration des schémas gérés dans un environnement isolé avant toute promesse de reprise. [Référence CLI](https://supabase.com/docs/reference/cli/introduction#supabase-db-dump).\n\nLa [procédure CLI officielle](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) sépare les exports `roles.sql`, `schema.sql`, `data.sql` et décrit la restauration dans un projet distinct. La [restauration locale](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup) dépend du type d'archive et de la version Postgres. Ces deux parcours ne doivent pas être confondus.

## État de la porte de validation

- Inventaire du projet : **PASS**.
- Export PostgreSQL et objets Storage : **NON TESTÉ**.
- Restauration isolée et contrôle fonctionnel : **NON TESTÉ**.
- Gestion des secrets, chiffrement, périodicité et copie hors site : **À METTRE EN PLACE**.
- Sauvegarde automatique quotidienne gérée sur ce projet Free : **ne pas supposer disponible**.

Aucune commande de restauration sur la base active ne doit être utilisée pour cet essai. Ne pas lancer `supabase_restore_project` sur le projet actif.

## Première étape exécutable : export métier local (partiel)

La CLI `2.118.0`, Docker `29.8.0`, `supabase login` et `supabase link` sont validés sur le poste Windows. La commande ci-dessous n'utilise que le schéma `public` et les rôles ; **elle n'est pas une sauvegarde complète**. Les fichiers peuvent contenir des positions et autres données personnelles. Ils doivent rester sous le profil Windows local, hors OneDrive, hors Git, et être chiffrés avant copie externe. Aucun mot de passe ne doit figurer dans les arguments.

```powershell
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $env:LOCALAPPDATA "Matelematics\\Backups\\$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
npx --yes supabase db dump --linked --role-only --file (Join-Path $backupDir "roles.sql")
if ($LASTEXITCODE -ne 0) { throw "Export des rôles échoué" }
npx --yes supabase db dump --linked --schema public --file (Join-Path $backupDir "public-schema.sql")
if ($LASTEXITCODE -ne 0) { throw "Export du schéma public échoué" }
npx --yes supabase db dump --linked --schema public --data-only --use-copy --file (Join-Path $backupDir "public-data.sql")
if ($LASTEXITCODE -ne 0) { throw "Export des données public échoué" }
Get-ChildItem -LiteralPath $backupDir -File | ForEach-Object {
    if ($_.Length -eq 0) { throw "Fichier vide: $($_.Name)" }
    [pscustomobject]@{ Name = $_.Name; Bytes = $_.Length; SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
}
Write-Output "Dossier local: $backupDir"
```

Le chemin d'export est affiché par `$backupDir` dans la même session PowerShell. Ne pas copier le contenu de `public-data.sql` dans le chat. Prochaine porte : contrôler séparément Auth, métadonnées et fichier Storage ; tester la restauration isolée. Un hash atteste l'intégrité après copie mais ne prouve pas la restaurabilité.
