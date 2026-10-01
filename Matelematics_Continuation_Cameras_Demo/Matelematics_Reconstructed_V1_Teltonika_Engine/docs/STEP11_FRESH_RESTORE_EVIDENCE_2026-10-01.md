# Étape 11 — nouvelle restauration et tests fonctionnels

Date des preuves : 1 octobre 2026. Résultats transmis par l'opérateur Windows. Aucun accès ni changement en production pendant ce parcours.

## Cible et archive

Laboratoire distinct : `%LOCALAPPDATA%\Matelematics\RestoreLab\20261001-175031`. project_id `recovery-20261001-175031`, conteneur `supabase_db_recovery-20261001-175031`. CLI 2.118.0 épinglée. Ports : API55321, DB55322, shadow55320, Studio55323 (exclu), Mailpit55324 ; autres ports réservés55327/55329. Ancien laboratoire conservé.

Entrée : `database-tous-schemas.dump` extrait de l'archive chiffrée dans RecoveryCheck, 8835662 octets ; SHA256 `816C49144D20F621DA8A880EA4BB3F86B3AFCF335825DC44CBB625DB4B8FA783`. Ce fichier a été comparé au manifeste de l'archive avant reprise.

## Parcours réellement validé

1. Init du projet local neuf, configuration de ports distincts, `supabase db start` : DB healthy.
2. Contrôle préalable : `public.vehicles` absent. Copier le dump dans `/tmp/matelematics-recovery.dump` du nouveau conteneur.
3. Préparer le SQL, sans connexion à la base :

```text
pg_restore --clean --if-exists --no-owner --no-acl --file=/tmp/matelematics-recovery.sql /tmp/matelematics-recovery.dump
```

4. Premier restore transactionnel échoué : les tables Storage initialisées par la nouvelle instance incluent `storage.iceberg_namespaces` et `storage.iceberg_tables`. Leurs FK dépendent de `buckets_analytics_pkey`, que le dump ancien veut supprimer. SQL arrêté, transaction annulée ; aucun restore partiel validé.
5. Préparer un fichier de garde et nettoyage **pour le nouveau laboratoire jetable seulement** :

```sql
DO $guard$
BEGIN
  IF current_database() <> 'postgres'
     OR current_user <> 'supabase_admin'
     OR to_regclass('public.vehicles') IS NOT NULL THEN
    RAISE EXCEPTION 'Base non conforme au laboratoire neuf';
  END IF;
END
$guard$;
DROP SCHEMA IF EXISTS storage CASCADE;
```

Ne jamais appliquer cette suppression sur une base en service. Elle retire les objets Storage initiaux, puis le dump recrée ceux de l'instantané. Elle ne prouve pas la compatibilité avec une nouvelle version du service Storage, resté exclu.
6. Préparer un second fichier pour désactiver les jobs restaurés :

```sql
DO $cron$
DECLARE v_job_id bigint;
BEGIN
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE active LOOP
    PERFORM cron.alter_job(v_job_id, active := false);
  END LOOP;
  IF EXISTS (SELECT 1 FROM cron.job WHERE active) THEN
    RAISE EXCEPTION 'Job cron encore actif';
  END IF;
END
$cron$;
```

7. Exécuter les trois fichiers, dans cet ordre, sous une transaction unique : préparation Storage, SQL du dump, désactivation cron.

```text
psql -X --single-transaction -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f /tmp/prepare-storage-restore.sql -f /tmp/matelematics-recovery.sql -f /tmp/disable-restored-cron.sql
```

8. Restore PASS ; comptages ci-dessous. Rejouer `scripts/security/repair-local-restore.sql` avec le marqueur PGAPPNAME du laboratoire : `psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f /tmp/repair-local-restore.sql -c "ROLLBACK;"`, puis même commande avec `COMMIT;`. Les deux : PASS (ACL19 tables/34 fonctions, propriétaires Auth, cron inactif).
9. `supabase stop` du nouveau workdir, sans suppression de sauvegarde/volume, puis `supabase start --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor` du même workdir. Code0, Auth/DB/Kong/Mailpit healthy et REST running.
10. Tests utilisateurs ci-dessous via http://127.0.0.1:55321, clé anon locale et JWT utilisateur. Aucune clé service_role dans les lectures destinées à prouver RLS. La fixture B a été préparée et nettoyée par SQL privilégié local uniquement.

## Comptages après restauration

| Objet | Lignes |
| --- | ---: |
| auth.users | 5 |
| public.companies | 5 |
| public.vehicles | 7 |
| public.positions | 35928 |
| public.telemetry | 35990 |
| storage.objects | 1 |
| jobs cron actifs | 0 |

## Contrôles fonctionnels

| Scénario | Résultat | Limite |
| --- | --- | --- |
| Auth A, profil user/entreprise attendue | PASS | Connexion par mot de passe local restauré |
| A lit ses véhicules | PASS, 3 | Table vehicles uniquement |
| A requête véhicules hors entreprise | PASS, JSON [] | Requête testée, pas audit exhaustif |
| Auth B, entreprise distincte | PASS | Profil user |
| B sans fixture | PASS, 0 véhicule propre, étrangers [] | Lecture positive testée ensuite |
| B lit sa fixture | PASS | UUID unique, nom LOCAL RECOVERY AUDIT B |
| B requête véhicules étrangers | PASS, JSON [] | Avec fixture propre présente |
| Suppression fixture | DELETE1, absence vérifiée, COMMIT | Aucun véhicule fictif restant |
| anon companies/vehicles/positions/telemetry | PASS, HTTP401 chacun | Pas toutes les tables ni RPC |
| A PATCH vehicles.name/profiles.role/profiles.company_id | PASS, HTTP403 chacun | Valeurs actuelles : permissions, pas nouveaux tests d'escalade |
| Déconnexions A et B | PASS | Sessions utilisées pour tests |

## Conclusion et points ouverts

La reprise DB puis ACL/Auth et les scénarios véhicules/JWT/API testés sont validés sur une nouvelle instance. Le parcours reste spécifique à l'instantané, avec des corrections explicites ; le lanceur Node cible encore le premier laboratoire. Pas de mesure fiable de RTO à partir des échanges, aucun RPO garanti.

Restent ouverts : seconde copie hors PC, nouveau paquet chiffré contenant la recette et les scripts versionnés, export automatique supervisé/fréquence/rétention, restauration d'un fichier binaire sauvegardé et restrictions d'écriture Storage, autres tables/RPC et flux applicatifs. Le test de lecture binaire et de refus Storage sur fixture est désormais PASS, voir ci-dessous. L'objet Storage sauvegardé est seulement un placeholder de 0 octet. Ne pas déclarer l'étape11 entière ni l'audit de sécurité clos.

Les journaux locaux `restore-fresh.log`, `restore-fresh-retry.log`, `repair-fresh-check.log`, `repair-fresh-apply.log`, `start-minimal-api.log` constituent les traces sur le poste ; ils ne sont pas publiés dans Git. Mot de passe d'archive et secrets Auth/API non documentés.

## Storage — corrections et test du 1 octobre, 20:35

Après activation du service Storage, celui-ci est healthy. Les droits provenant du restore sans ACL nécessitaient une réparation supplémentaire. La comparaison en lecture seule avec la source a confirmé :

- Schéma storage propriétaire supabase_admin ; USAGE/CREATE à supabase_storage_admin.
- Huit relations, dix-neuf routines et une enum de l'instantané propriétaires supabase_storage_admin.
- API anon/authenticated/service_role : USAGE storage et SELECT/INSERT/UPDATE/DELETE sur storage.objects et storage.buckets. Ces GRANT permettent l'exécution SQL ; les politiques RLS décident de l'accès aux lignes. Ils ne rendent pas le bucket public.
- EXECUTE autorisé dans la source sur storage.foldername(text), storage.filename(text), storage.extension(text), rétabli localement pour ces trois rôles.

Réparation locale transactionnelle réalisée : propriétaires des relations (tables avant séquences), routines et enum réaffectés au rôle du service ; GRANT USAGE/CREATE ; vérification sous SET LOCAL ROLE supabase_storage_admin : schéma sélectionné storage, un objet. COMMIT PASS. Deuxième correction : guard RLS actif sur objects et buckets et bucket compliance-documents privé, GRANT schéma/table/fonctions ci-dessus, COMMIT. Les autres ACL Storage ne sont pas déclarées intégralement équivalentes à la source.

Politiques storage.objects présentes :
- SELECT authenticated : bucket compliance-documents, premier dossier UUID entreprise, can_access_company.
- INSERT/DELETE/UPDATE authenticated : can_manage_company ; UPDATE contient USING et WITH CHECK.
- RLS activé, FORCE RLS faux.

### Test exécuté

Script versionné : `scripts/security/storage-local-recovery-audit.ps1`. Cible fixe nouveau laboratoire, API http://127.0.0.1:55321. Clés locales obtenues par CLI, jamais affichées. La clé service_role locale sert exclusivement au chargement et au nettoyage d'une petite PNG synthétique dans un chemin unique sous l'entreprise A. Connexions A/B par JWT utilisateur pour les tests.

| Contrôle | Preuve transmise |
| --- | --- |
| Chargement binaire API locale | PASS |
| Téléchargement par A | PASS, SHA256 identique à la PNG source |
| Téléchargement par B d'entreprise distincte | HTTP400, refus |
| Téléchargement anonyme | HTTP400, refus |
| URL publique du bucket privé | HTTP400, refus |
| Nettoyage API Storage | PASS |
| Absence métadonnée exacte fixture | DO assertion PASS |
| Déconnexions A et B | PASS |

Les refus HTTP400 sont ceux observés, pas des HTTP403 inventés. Ils indiquent ici l'absence d'accès sur les requêtes testées ; la lecture positive par A sur le même objet confirme que celui-ci existait pendant les essais. Les réponses d'erreur détaillées n'ont pas été enregistrées, donc ne pas prétendre à une cause interne plus précise.

La fixture est supprimée ; aucune modification de données métier ou de la production. Une assertion SQL vérifie l'absence de sa métadonnée après suppression API, pas une inspection directe de tous les blocs du volume.

### Limites encore ouvertes

Ce test crée un fichier après restauration : il valide le service et les accès, **pas** la sauvegarde puis restauration d'un fichier non vide. L'ancien instantané Storage contenait seulement un placeholder vide. Ces refus par utilisateur simple et les écritures autorisées par client_admin ont ensuite été validés, voir les preuves ci-dessous. Le cas d'un administrateur d'une autre entreprise reste ouvert. Les scripts de réparation Storage doivent encore être intégrés au parcours automatique ; actuellement les commandes sont documentées et ont été exécutées manuellement. Le paquet chiffré existant ne contient pas ces nouveaux scripts/documents.

## Écritures Storage — preuves complémentaires du 1 octobre

### Utilisateurs simples A/B

Script `storage-local-recovery-audit.ps1`, commit 8ab84ed, exécuté sur le nouveau laboratoire :
- INSERT A dans son entreprise : HTTP400, aucun objet créé.
- INSERT B dans l'entreprise A : HTTP400, aucun objet créé.
- UPDATE A sur son fichier et B sur fichier étranger : HTTP400 ; fichier inchangé.
- DELETE A et B : HTTP200 **sans suppression effective**. Téléchargement privilégié local et hash du fichier encore identique, métadonnée présente pendant les contrôles.
- Après chaque tentative : SHA256 existant identique et aucun nouvel objet parmi les deux chemins uniques de test.
- Nettoyage final via API locale privilégiée : absence des trois chemins vérifiée par assertion SQL ; deux déconnexions PASS.

Le code HTTP200 de DELETE ne signifie donc pas autorisation de suppression. Les vérifications d'état sont la preuve du refus effectif. Les assertions utilisent la clé privilégiée locale pour observer l'état, pas pour prouver l'autorisation de l'utilisateur.

### Administrateur de l'entreprise A

Compte restauré identifié en SQL local : client_admin de l'entreprise A. Script `storage-local-admin-audit.ps1`, commit 7e7f850, exécuté :
- Profil/Auth vérifiés : PASS.
- INSERT par JWT client_admin : PASS, téléchargement avec SHA256 source identique.
- UPDATE par JWT client_admin avec des octets différents : PASS, téléchargement avec SHA256 de remplacement identique.
- DELETE par JWT client_admin : PASS, métadonnée absente et téléchargement impossible.
- Nettoyage final de secours vérifié et déconnexion : PASS.

La clé service_role locale n'a servi qu'au nettoyage final de secours pour ce parcours autorisé. Les trois opérations positives ont utilisé le JWT client_admin. Les fixtures sont synthétiques, uniques et supprimées.

Ces résultats ferment les scénarios d'écriture énumérés, pas l'ensemble des contrôles Storage. Un administrateur d'une autre entreprise, les partenaires, les URL signées et la reprise d'un fichier non vide depuis sauvegarde ne sont pas encore couverts.
