# Validation du chemin atomique natif avec PostgreSQL
2026-10-02

Preuve reçue : orchestration synthétique PASS et build/TypeScript/47 pages PASS sur PC utilisateur.
Nouveau script scripts/security/teltonika-native-atomic-local.ts : syntaxe vérifiée seulement, SQL non encore exécuté.
Il appelle persistAtomicPacket et le véritable syncCanAlertsInTransaction, pas une fonction SQL candidate différente.

Cible fixe 127.0.0.1:55322, base postgres, rôle supabase_admin.
Mot de passe local par défaut postgres ; remplacement possible uniquement via MATELEMATICS_LOCAL_DB_PASSWORD, jamais affiché.
Aucune lecture de .env.local, aucune URL distante, aucune activation de TELTONIKA_STORAGE_MODE.
Vérifie présence du schéma du laboratoire et absence de l'index natif avant préparation.
CREATE INDEX unique partiel et fixtures dans une transaction ; nettoyage final de l'index et des seules fixtures identifiées.
Le test nécessite des commits locaux pour vérifier plusieurs opérations séparées ; ne pas interrompre le processus.
Les trous de séquence ne sont pas annulés.

Cas : excès de vitesse fictif 150 km/h produit une vraie alerte active ; rejouement sans doublon ; événement suivant à 0 km/h résout l'alerte.
Une règle véhicule explicite rend ce seuil indépendant des paramètres entreprise.
Une panne après les véritables mutations d'alertes doit annuler position, télémétrie, nouvelle alerte et état du boîtier.
Vérifie exactement 2 positions, 2 télémétries, 1 alerte résolue et last_seen_at inchangé lors de la panne.
Vérifie nettoyage des lignes et absence d'index.

Limites : core SQL et moteur d'alertes réels, mais pas l'entrée persistTelemetry HTTP/device lookup, ni socket TCP/ACK.
Connexion privilégiée de laboratoire : droits d'un rôle d'ingestion de production non prouvés.
Index temporaire créé uniquement par ce test ; migration/droits/reconciliation historiques à préparer ensuite.
Format du contrôle pg_get_indexdef à confirmer par cette exécution.
Aucun déploiement ni changement de la base distante.
