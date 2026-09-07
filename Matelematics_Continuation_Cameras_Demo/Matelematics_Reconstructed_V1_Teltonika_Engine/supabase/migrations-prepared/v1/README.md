# V1 réelle minimale — fichiers préparés localement

Ce dossier contient les fichiers SQL préparés pour une future migration Supabase, sans exécution immédiate.

Règles suivies :
- conserver le schéma réel existant : companies, profiles, vehicles
- ne pas renommer les colonnes existantes
- ne pas changer registration -> plate/plate_number
- ne pas changer full_name -> name
- ne pas modifier les status métier sans validation officielle
- ne pas exécuter de SQL ni créer de migration automatique

Structure du dossier :
- 00_preflight.sql : validation uniquement (SELECT)
- 01_core.sql : tables nouvelles core (drivers, devices, vehicle_driver_assignments)
- 02_telematics.sql : positions, telemetry, alerts, trips
- 03_cameras.sql : cameras, camera_events, video_clips
- 04_indexes.sql : indexes utiles pour le multi-tenant
- 05_functions.sql : helpers auth/RLS + set_updated_at
- 06_rls.sql : politiques RLS sécurisées
- 07_validation.sql : validation SQL prévue après future exécution
- 08_test_plan.sql : plan de tests fonctionnels (non exécuté)
- 09_storage_plan.sql : plan bucket privé future `vehicle-videos`
- ROLLBACK.md : plan de rollback conceptuel, non exécuté

Aucun script de ce dossier n'est exécuté dans cette étape.
