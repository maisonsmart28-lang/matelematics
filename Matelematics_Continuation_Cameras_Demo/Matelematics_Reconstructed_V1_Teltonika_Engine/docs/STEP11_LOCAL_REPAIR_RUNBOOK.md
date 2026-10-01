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

## Preuves et limites

Syntaxe JavaScript `node --check` PASS. Refus hors Windows constaté sur l'environnement de développement. Aucun moteur Docker/PostgreSQL disponible dans cet environnement : transaction SQL et assertions NON ENCORE EXECUTEES par l'agent. L'opérateur doit transmettre le résultat du mode check avant application. Aucun PASS SQL n'est revendiqué pour ce nouveau script.

Le laboratoire existant possède déjà les corrections manuelles. Le succès du script dessus démontrera sa compatibilité et le rejeu, pas la reconstruction depuis zéro. Une nouvelle restauration isolée puis réparation et tests Auth/API reste nécessaire pour clore la reproductibilité. L'archive chiffrée précédente n'inclut pas ces fichiers : prévoir un nouveau paquet versionné après validation. Copie externe, périodicité, rétention et RPO/RTO restent ouverts.

Référence : https://supabase.com/docs/guides/self-hosting/restore-from-platform — les dumps bruts embarquent des objets internes et peuvent nécessiter des adaptations spécifiques. Ce script traite les anomalies observées dans notre laboratoire, pas toutes les incompatibilités de version.
