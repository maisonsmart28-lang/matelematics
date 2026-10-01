# Réparation locale ACL/Auth — procédure de validation

Complète STEP11_RESTORE_VALIDATION_2026-10-01.md. Script spécifique au laboratoire restauré du 29 septembre, pas une migration de production ni une procédure générale Supabase.

## Exécution

Depuis la racine applicative sous Windows :

```powershell
node scripts/security/repair-local-restore.mjs --check
if ($LASTEXITCODE -ne 0) { throw "Simulation echouee : ne pas appliquer." }
```

Le mode check exécute les corrections et assertions dans une transaction puis ROLLBACK. Il n'est pas une simple lecture : il peut verrouiller temporairement des objets. Le conteneur ciblé est uniquement supabase_db_20260929-142153, contexte Docker desktop-linux à named pipe local, image Supabase postgres 17.6.1.x, connexion socket locale supabase_admin/base postgres. Les overrides DOCKER_HOST sont refusés. Aucun mot de passe ni connexion à Supabase distant.

Après PASS uniquement :

```powershell
node scripts/security/repair-local-restore.mjs --apply
if ($LASTEXITCODE -ne 0) { throw "Reparation locale echouee." }
```

Apply utilise COMMIT. Un échec SQL arrête psql et ferme la connexion : la transaction non validée est annulée. Le script ne restaure pas de dump et ne touche pas aux noms, profils ou positions métier ; il modifie les GRANT/REVOKE, propriétaires auth, et désactive les jobs cron du laboratoire.

## Assertions et périmètre

Inventaire exact 19 tables RLS et 34 fonctions public non surchargées, cinq comptes Auth. Refus sur inventaire différent pour examen manuel. Les signatures de fonctions sont obtenues du catalogue via regprocedure après contrôle d'unicité des noms et du statut SECURITY DEFINER. Table anon aucun CRUD, authenticated SELECT19 INSERT/UPDATE6 DELETE0 ; fonctions anon EXECUTE0, authenticated EXECUTE22 (9 definer et 13 invoker). Auth schema USAGE/CREATE et propriétaires des relations/routines/enums rétablis à supabase_auth_admin. Aucun cron actif après réparation. Ne modifie ni les policies ni les corps de fonctions ni les droits des séquences public.

## Preuves et limites — état au 1 octobre 2026

Syntaxe JavaScript `node --check` PASS et refus hors Windows constaté dans l'environnement de développement. L'opérateur a exécuté le script sur Windows : --check ROLLBACK PASS et --apply COMMIT PASS dans le laboratoire initial.

Une nouvelle restauration a également été réalisée dans `supabase_db_recovery-20261001-175031`. Le même fichier SQL a été exécuté directement via docker exec/psql, avec PGAPPNAME=matelematics-local-restore-repair : ROLLBACK PASS puis COMMIT PASS. Le lanceur Node reste limité à l'ancien conteneur ; ne pas lui attribuer la validation de sélection du nouveau laboratoire.

Les tests Auth/API du nouveau laboratoire ont réussi : A lit ses 3 véhicules, B lit une fixture propre ensuite supprimée et son absence vérifiée ; requêtes de véhicules étrangers vides pour A et B. Accès anonyme companies/vehicles/positions/telemetry refusés HTTP401. Écritures de valeurs actuelles vehicles.name, profiles.role, profiles.company_id par A refusées HTTP403. Ces preuves sont transmises par l'opérateur, pas exécutées par l'agent. Voir [le parcours et les limites détaillés](STEP11_FRESH_RESTORE_EVIDENCE_2026-10-01.md).

La reprise est reproductible pour ce dump et les scénarios testés, avec préparation Storage et réparation ACL/Auth explicites. Ce n'est pas encore un outil automatique de reprise complet. L'archive chiffrée précédente n'inclut pas les scripts : prévoir un nouveau paquet versionné. Copie externe, périodicité, rétention, fonctionnement Storage et RPO/RTO mesurés restent ouverts.

Référence : https://supabase.com/docs/guides/self-hosting/restore-from-platform — les dumps bruts embarquent des objets internes et peuvent nécessiter des adaptations spécifiques. Ce script traite les anomalies observées dans notre laboratoire, pas toutes les incompatibilités de version.
