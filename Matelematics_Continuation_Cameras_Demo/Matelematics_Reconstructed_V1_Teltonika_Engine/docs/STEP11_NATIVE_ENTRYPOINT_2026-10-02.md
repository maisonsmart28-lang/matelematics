# Point d'entrée atomique natif
2026-10-02

Preuve TCP reçue : aucun ACK ni télémétrie visible avant COMMIT ; COMMIT puis socket coupée avant ACK ; retransmission acquittée sans doublon ; erreur transactionnelle sans ACK ; alertes/résolution/rollback ; nettoyage vérifié.
Ce test passait par le parseur et le cœur SQL, pas persistTelemetry.

Correction : persistTelemetry sélectionne maintenant le mode atomique avant toute requête HTTP de recherche du boîtier.
La qualité, le CAN et les métadonnées sont construits puis persistAtomicPacket lit/verrouille le boîtier et le véhicule.
Le mode legacy conserve la recherche HTTP. Aucun nouveau mode activé par défaut.
closeAtomicStoragePool permet une fermeture contrôlée du pool.

Nouvel essai scripts/security/teltonika-native-entry-local.ts :
appelle réellement persistTelemetry, avec mode atomic et URL fixe 127.0.0.1:55322 uniquement dans le processus de test.
Ne charge pas .env.local ; désactive le bypass de flotte fictive pour ce test ; restaure les variables du processus et ferme le pool à la fin.
Installe index et fixtures temporaires ; produit une vraie alerte, rejoue, résout.
Crée ensuite un déclencheur BEFORE UPDATE limité à l'UUID exact du boîtier de test, pour échouer après les mutations réelles d'alertes.
Exige rollback de toutes les écritures et last_seen_at inchangé.
Supprime déclencheur/schéma, lignes et index, et vérifie absence de fixtures.
Syntaxe vérifiée ; exécution PostgreSQL de ce nouvel essai non encore vérifiée ; build à confirmer.

Droits utilisés : administrateur local de laboratoire. Ne constitue pas une preuve pour un rôle d'ingestion de production.
Migration versionnée, droits dédiés et réconciliation des empreintes historiques restent ouverts.
Aucun déploiement, changement .env.local ou modification de base distante.
