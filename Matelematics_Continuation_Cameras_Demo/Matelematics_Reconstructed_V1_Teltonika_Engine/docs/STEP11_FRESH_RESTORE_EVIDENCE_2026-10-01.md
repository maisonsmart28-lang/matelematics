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

Restent ouverts : seconde copie hors PC, nouveau paquet chiffré contenant la recette et les scripts versionnés, export automatique supervisé/fréquence/rétention, tests Storage sur vrai fichier et politiques d'accès, autres tables/RPC et flux applicatifs. L'objet Storage sauvegardé est seulement un placeholder de 0 octet. Ne pas déclarer l'étape11 entière ni l'audit de sécurité clos.

Les journaux locaux `restore-fresh.log`, `restore-fresh-retry.log`, `repair-fresh-check.log`, `repair-fresh-apply.log`, `start-minimal-api.log` constituent les traces sur le poste ; ils ne sont pas publiés dans Git. Mot de passe d'archive et secrets Auth/API non documentés.
