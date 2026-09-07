# Rollback conceptuel — V1 réelle minimale

Ce document est un plan de secours conceptuel seulement.
Aucun rollback n'a été exécuté.

## Principe
- ne pas supprimer les tables existantes `companies`, `profiles`, `vehicles`
- ne pas renommer ou transformer les colonnes existantes
- ne pas supprimer `vehicles.device_id`
- ne pas activer PostGIS dans cette V1

## Rollback prévu si nécessaire
1. Supprimer les tables ajoutées dans cette V1 :
   - `video_clips`
   - `camera_events`
   - `cameras`
   - `trips`
   - `alerts`
   - `telemetry`
   - `positions`
   - `vehicle_driver_assignments`
   - `drivers`
   - `devices`
2. Supprimer les fonctions créées :
   - `set_updated_at()`
   - `current_user_company_id()`
   - `current_user_role()`
   - `is_matelematics_admin()`
   - `is_client_admin()`
3. Supprimer les policies RLS ajoutées
4. Revenir aux politiques existantes de l'état réel avant V1

## Important
Le rollback défini ici est purement documentaire. Il ne doit pas être exécuté tant que la revue finale n'est pas validée.
