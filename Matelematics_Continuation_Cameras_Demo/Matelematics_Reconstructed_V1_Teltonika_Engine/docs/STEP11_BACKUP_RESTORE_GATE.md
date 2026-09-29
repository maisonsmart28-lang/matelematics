# Étape 11 — sauvegarde et restauration : état du 28 septembre 2026

## Inventaire vérifié

Le projet Supabase Matelematics `nhkwxcjncluvetrgxhwv` est actif, en région `eu-west-3`, PostgreSQL 17.6.1.165. Son organisation est sur le plan **Free**. La base occupe environ **140 Mo**, contient **5 comptes Auth**, un bucket Storage privé `compliance-documents` et **un objet Storage** (comptages, sans lecture de contenu). La taille enregistrée dans les métadonnées est nulle ; ne pas l'interpréter comme une taille réelle ni télécharger ce document dans l'espace de travail.

Selon la [documentation officielle Supabase sur les sauvegardes](https://supabase.com/docs/guides/platform/backups), les sauvegardes quotidiennes gérées sont prévues pour Pro, Team et Enterprise ; Supabase recommande aux projets Free d'exporter régulièrement leurs données avec `supabase db dump` et de conserver une copie hors site. La sauvegarde de la base couvre les métadonnées Storage, **pas les fichiers stockés**. Le RPO/RTO et la restauration complète restent non validés. Voir les preuves du 29 septembre ci-dessous.

## Décision pour le démarrage minimal

1. **Avant toute nouvelle donnée client**, réaliser un export logique chiffré et daté du schéma métier, des données et des rôles ; traiter **Auth et les métadonnées Storage séparément**, puis copier aussi les objets Storage. Conserver les exports hors dépôt Git, hors répertoire OneDrive synchronisé, avec accès limité. Ne pas écrire le mot de passe de la base dans la commande ou dans le fichier de documentation.
2. Vérifier l'intégrité des fichiers (SHA-256), le nombre d'objets Storage, la taille et la date. Tester la restauration dans une **instance locale isolée** ou un projet de test dédié, jamais sur le projet actif. La restauration d'un projet actif coupe l'accès et peut effacer des données plus récentes.
3. Mesurer le temps de restauration et les contrôles métier après reprise : comptes Auth, politiques RLS, entreprises, véhicules, positions, télémétrie, fichiers Storage, et connexion d'un utilisateur de test. Documenter le point de restauration obtenu.
4. Mettre en place une fréquence de sauvegarde selon la perte de données acceptable. Une simple exportation ponctuelle ne répond pas à l'objectif de continuité. Avant de vendre un engagement de disponibilité ou de conservation, choisir une politique explicite de rétention et d'export automatique supervisé.

**Portée de la CLI 2.118.0 :** par défaut, `supabase db dump` exclut les schémas gérés `auth` et `storage` ; le dump de schéma seul exclut aussi les données et les rôles personnalisés. Il serait incorrect d'appeler les seuls fichiers `roles.sql`, `schema.sql`, `data.sql` une sauvegarde complète de ces 5 comptes Auth et du document Storage. Vérifier la prise en charge et la restauration des schémas gérés dans un environnement isolé avant toute promesse de reprise. [Référence CLI](https://supabase.com/docs/reference/cli/introduction#supabase-db-dump).\n\nLa [procédure CLI officielle](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) sépare les exports `roles.sql`, `schema.sql`, `data.sql` et décrit la restauration dans un projet distinct. La [restauration locale](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup) dépend du type d'archive et de la version Postgres. Ces deux parcours ne doivent pas être confondus.

## État de la porte de validation

- Inventaire du projet : **PASS**.
- Export PostgreSQL : **PARTIELLEMENT VALIDÉ** (fichiers SQL `public` et archive brute tous schémas). Objet Storage : **NON SAUVEGARDÉ**.
- Restauration isolée : **ÉCHEC CONTRÔLÉ**, dépendances Supabase documentées ; contrôle fonctionnel **NON VALIDÉ**.
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

## Échec du premier export et reprise sécurisée (29 septembre)

Le premier `db dump --linked --role-only` a téléchargé l'image PostgreSQL 17.6.1.165 puis échoué auprès du pooler `aws-1-eu-west-3.pooler.supabase.com:5432` avec `EAUTHQUERY unsupported or invalid secret format`. Le bloc PowerShell s'est arrêté sur l'export des rôles : **aucun des trois dumps n'est validé**, même si un fichier partiel existe. La CLI annonçait `Initialising login role`, ce qui suggère la connexion temporaire sans mot de passe DB ; la cause exacte du rejet n'est pas démontrée. La [documentation de dépannage Supabase](https://supabase.com/docs/guides/troubleshooting/supabase-cli-failed-sasl-auth-or-invalid-scram-server-final-message) propose le flux avec `SUPABASE_DB_PASSWORD` pour contourner les erreurs du rôle temporaire. Utiliser le mot de passe **PostgreSQL du projet**, pas le mot de passe de l'application, dans une variable d'environnement de session créée via `Get-Credential`, puis supprimer cette variable dans `finally`. Ne jamais mettre le mot de passe dans `--password`, `--db-url`, l'historique, Git ou le chat. Si le mot de passe DB est inconnu, ne pas le réinitialiser sans inventaire des chaînes de connexion applicatives : sa rotation peut les interrompre.


## Preuves et limites — 29 septembre 2026

Dossier Windows local hors Git et OneDrive : `%LOCALAPPDATA%\Matelematics\Backups\20260929-001429`. Ne jamais publier ces archives ni leur contenu ; elles contiennent potentiellement des comptes et positions.

| Fichier | Octets | SHA-256 | État |
| --- | ---: | --- | --- |
| `roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` | exporté |
| `schema-public.sql` | 127291 | `0B1B395D4EA10FC5C4FB165F62B9935B2B7ED38DA996DD9DA8790CCAD6740B1F` | exporté |
| `data-public.sql` | 120782360 | `27988F23E1C3800211516634DCA58BFDAEA1A40988893B129E07D7E34810D0A2` | exporté, avertissement FK circulaires |
| `public-complet.dump` | 8454767 | `DE6C05CBF0ED151072C9CDD4C1B98C26040B7E0CBFE5D7F80B5494C271C7152A` | archive lisible, restauration non autonome |
| `database-tous-schemas.dump` | 8835662 | `816C49144D20F621DA8A880EA4BB3F86B3AFCF335825DC44CBB625DB4B8FA783` | export brut, `pg_restore --list` et lecture intégrale `--file=/dev/null` PASS |

`schema-supabase.sql` a été exporté, mais `data-supabase.sql` **a échoué deux fois** pendant `COPY public.telemetry` : « SSL connection has been closed unexpectedly ». Ce dernier fichier, s'il existe, est **incomplet et impropre à la restauration**. Ne pas le traiter comme preuve de sauvegarde. Le dump brut multi-schémas a réussi entre ces essais ; cela ne démontre pas que le flux CLI pourra être répété de façon fiable. La CLI exclut les définitions de schémas gérés par Supabase dans son dump de schéma par défaut ; l'export brut inclut les composants internes, avec risques d'incompatibilité au restore. Référence : [guide officiel Supabase](https://supabase.com/docs/guides/self-hosting/restore-from-platform).

Essais de restauration, tous **locaux**, sans écriture sur le projet distant :
1. `public-complet.dump` dans PostgreSQL 17 vide : après suppression du schéma `public` initial, échec de la contrainte `public.notifications.user_id -> auth.users(id)`, absent de l'archive `public`.
2. `database-tous-schemas.dump` dans le `postgres` d'une instance Supabase locale 17.6.1.171 : `pg_restore --clean` échoue sur le propriétaire du déclencheur système `pgrst_drop_watch`. L'option `--single-transaction` annule l'essai.
3. Même archive dans la base locale vide `matelematics_restore_151334` : `CREATE EXTENSION pg_cron` échoue, car `cron.database_name` désigne uniquement `postgres`. L'option `--single-transaction` annule l'essai. Ne pas changer `cron.database_name` sur la base active pour contourner ce test.

**Conclusion technique :** l'archive brute est intègre à la lecture, mais aucune restauration complète ni reprise du SaaS n'est validée. Les objets Storage ne sont pas dans les dumps. La prochaine procédure doit préparer un environnement Supabase isolé compatible (schémas et extensions), établir un format d'export restaurable sans les conflits d'objets gérés, restaurer dans une transaction et comparer les comptes Auth, tables métier, télémétrie, RLS et objet Storage. Ne pas relancer `db dump --data-only` à l'identique ni répéter `pg_restore --clean` dans le `postgres` local déjà initialisé. Conserver le conteneur `supabase_db_20260929-142153` comme laboratoire jetable jusqu'à la fin de l'analyse.

Les hashes sont des preuves d'intégrité des fichiers locaux à cette date, pas une certification de reprise. Avant copie hors site, chiffrer les archives ; planifier ensuite une fréquence, une rétention et un test périodique.
