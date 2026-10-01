# Étape 11 — reprise locale : preuves au 1 octobre 2026

Ce document complète STEP11_BACKUP_RESTORE_GATE.md. Ses états ci-dessous remplacent les mentions antérieures NON VALIDÉ pour les seuls contrôles réalisés. Les résultats sont ceux transmis par l'opérateur Windows ; aucune nouvelle exécution distante n'est revendiquée.

## État actuel

- Archive PostgreSQL tous schémas restaurée localement : PASS, avec corrections de droits manuelles détaillées ci-dessous.
- Auth locale et lectures API des comptes A/B : PASS sur véhicules ; aucun accès aux véhicules étrangers dans les requêtes testées. A lit 3 véhicules. Une fixture propre à B a été créée, lue puis supprimée avec contrôle d'absence.
- Accès anonyme API companies, vehicles, positions, telemetry : refus HTTP 401, PASS.
- Écritures JWT/API compte A sur vehicles.name, profiles.role, profiles.company_id : refus HTTP 403, PASS. Les payloads reprenaient les valeurs actuelles ; ce test prouve le refus d'écriture, pas à lui seul la protection contre toutes les escalades.
- Tests SQL de changement rôle/entreprise et déclencheurs : PASS dans les scénarios décrits ci-dessous.
- Chiffrement, lecture 7-Zip, extraction et comparaison SHA256 : PASS.
- Copie sur support distinct : EN ATTENTE, utilisateur sans support disponible.
- Automatisation, rétention, RPO/RTO mesurés, test Storage de vrai document et audit exhaustif : NON VALIDÉS.

## Procédure de reprise et corrections locales

Laboratoire Windows : `%LOCALAPPDATA%\Matelematics\RestoreLab\20260929-142153`. Conteneur `supabase_db_20260929-142153`, PostgreSQL Supabase 17.6.1.171. Source de l'instantané : 17.6.1.165. Les corrections ont concerné uniquement la copie locale.

1. Restaurer dans le laboratoire isolé, base `postgres`, avec `supabase_admin`, options `--single-transaction --clean --if-exists --no-owner --no-acl`. Ne pas utiliser cette procédure sur le projet actif. Le rôle local postgres ne possédait pas les event triggers ; une autre base échouait sur pg_cron.
2. Comparer les comptages consignés dans le document principal : Auth 5, entreprises 5, véhicules 7, positions 35928, telemetry 35990, documents de conformité 0, métadonnées Storage 1, tables RLS 19, politiques 44. Ce sont les comptages de l'instantané, pas un inventaire permanent de production.
3. Désactiver les jobs cron restaurés avant fonctionnement du laboratoire : job 1 désactivé, contrôle active_jobs_remaining=0. Ce contrôle a été effectué après la restauration ; il ne prouve pas l'absence d'exécution antérieure.
4. Réparer les privilèges public : révoquer les droits des tables pour PUBLIC, anon et authenticated ; anon n'a aucun droit sur les 19 tables. authenticated conserve SELECT sur les 19, INSERT/UPDATE uniquement sur drivers, notification_rules, notifications, vehicle_compliance_documents, vehicle_driver_assignments, vehicle_maintenance_records ; aucun DELETE.
5. Pour les 15 fonctions SECURITY DEFINER auditées, révoquer EXECUTE PUBLIC/anon/authenticated puis autoriser authenticated uniquement sur can_access_company, can_manage_company, current_user_company_id, current_user_partner_id, current_user_role, is_client_admin, is_matelematics_admin, is_partner_admin et mark_notification_read. Conserver le rôle service_role autorisé sur les 15. Respecter les signatures exactes de l'archive, notamment les fonctions surchargées ; ne pas générer des GRANT globaux.
6. Pour les 19 autres fonctions public auditées : anon EXECUTE=0, authenticated EXECUTE=13. Les 13 autorisées sont archive_driver, cancel_vehicle_compliance_document, cancel_vehicle_maintenance_record, clear_vehicle_compliance_document_storage_path, complete_vehicle_maintenance_record, create_driver_with_assignment, create_vehicle_compliance_document, create_vehicle_maintenance_record, renew_vehicle_compliance_document, set_vehicle_compliance_document_storage_path, start_vehicle_maintenance_record, unassign_driver, update_driver_with_assignment. Les helpers demo, génération notifications, historiques fuel/trips et set_alert_settings_updated_at ne sont pas autorisés à authenticated dans cet inventaire.
7. Réparer Auth : GRANT USAGE, CREATE sur auth à supabase_auth_admin, et réaffecter les 28 relations restaurées, les routines et enums auth à ce rôle (tables avant séquences). Le schéma auth reste propriété de supabase_admin. Vérifier sous SET LOCAL ROLE supabase_auth_admin que current_schema()=auth, auth.users=5 et schema_migrations=82. Le défaut initial était SQLSTATE 3F000 : schéma auth inaccessible au rôle Auth.
8. Démarrer le laboratoire minimal avec CLI 2.118.0 : exclure realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor. Auth, REST, Kong et DB ont démarré ; services exclus affichés comme Stopped services sont attendus. Utiliser des redirections natives cmd pour les journaux PowerShell afin de ne pas confondre stderr et échec ; vérifier le code de sortie.
9. Tester Auth/API via http://127.0.0.1:54321 avec clé anon locale et JWT utilisateur, jamais service_role pour démontrer l'isolation. Lire le profil pour vérifier le rôle user et l'entreprise. Vérifier les réponses JSON vides par leur contenu : certaines constructions PowerShell autour d'Invoke-RestMethod comptent à tort un tableau vide comme un élément.

Cette liste décrit les corrections effectivement réalisées ; elle ne constitue pas encore un script automatisé de restauration. Les GRANT doivent être versionnés avec leurs signatures avant une reprise autonome. L'archive chiffrée ne contient pas cette recette ni un script de réparation. Les propriétaires public diffèrent de la source avec --no-owner ; ne pas déclarer une équivalence complète des droits.

## Contrôles SQL locaux

- anon et authenticated ne sont ni superuser ni BYPASSRLS ; service_role a BYPASSRLS.
- Les 19 tables public auditées ont RLS activé ; pas de FORCE RLS.
- UPDATE direct utilisateur sur vehicles.name, profiles.role et profiles.company_id : refus SQLSTATE 42501.
- Déclencheurs companies/profiles actifs, session_replication_role=origin. Tests privilégiés locaux avec claims utilisateur pour exercer les déclencheurs : changement de role, company_id du profil et id d'entreprise refusés ; transaction ROLLBACK.
- Lecture ciblée telemetry étrangère compte B : invisible. Le comptage intégral sous RLS avait atteint statement_timeout ; ce coût reste à étudier, sans conclure à une fuite.
- Certaines tables manquent de fixtures positives/étrangères : ne pas transformer NOT TESTED en PASS.
- Droits de séquences hérités observés, y compris USAGE anon : durcissement éventuel non réalisé.

## Storage et chiffrement

L'unique objet téléchargé est un placeholder vide du bucket compliance-documents, pas un document client. Taille 0, SHA256 E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855. Les binaires Storage ne sont pas contenus dans pg_dump. Aucun test de restauration d'un vrai fichier ou du service Storage n'a été réalisé.

Archive : `%LOCALAPPDATA%\Matelematics\EncryptedBackups\matelematics-20261001-151852.7z`.
Taille : 8027585 octets.
SHA256 : `EEBC5FC69F4BFC27E0CF6BB1D11B2E8FE5E48BFB192CDB6D607A73E5EFF5F809`.
7-Zip 26.03, méthode affichée LZMA2 et 7zAES, en-têtes chiffrés via -mhe=on. Mot de passe saisi interactivement, non documenté.

Contenu : database-tous-schemas.dump (8835662 octets), roles.sql (370 octets), placeholder Storage vide et manifeste SHA256. Extraction dans un dossier neuf RecoveryCheck et comparaison des trois fichiers au manifeste : PASS. Conserver les originaux. data-supabase.sql est incomplet après erreurs SSL et exclu de l'archive.

## Conditions restantes pour clôture

1. Seconde copie chiffrée hors du PC et comparaison SHA256.
2. Script de réparation ACL/Auth reproductible avec assertions, testé sur un nouveau laboratoire ; inclure cette procédure dans un prochain paquet de reprise versionné.
3. Fréquence/rétention explicites, export supervisé et mesure réelle du RPO/RTO.
4. Validation des fonctions applicatives et de Storage avec fixtures adaptées, puis retour aux autres points des étapes 10/11. Aucune disponibilité de production ni absence totale d'intrusion n'est certifiée par ces tests.
