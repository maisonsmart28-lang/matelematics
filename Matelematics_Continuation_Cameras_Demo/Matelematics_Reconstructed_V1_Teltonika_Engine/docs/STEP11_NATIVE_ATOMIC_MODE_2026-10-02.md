# Mode atomique natif — raccordement
2026-10-02

Le serveur possède maintenant un chemin TELTONIKA_STORAGE_MODE=atomic.
Mode par défaut : legacy, inchangé ; activation NON autorisée ni effectuée sur une base distante.
TELTONIKA_DATABASE_URL séparée obligatoire ; aucune reprise implicite de DATABASE_URL.
La connexion utilise les options TLS de pg/URL ; ne pas désactiver la vérification des certificats.
Le pool est limité à 10 connexions et les attentes SQL sont bornées.

Le chemin atomique vérifie la définition attendue de l'index telemetry_teltonika_fingerprint_unique, verrouille le boîtier puis le véhicule et relit les rattachements.
GPS éventuel, télémétrie, cycle de vie des alertes et état du boîtier passent par le même client SQL.
Les paramètres d'alertes sont lus dans cette transaction. Une erreur d'alertes annule également GPS et télémétrie.
Le résultat remonte seulement après COMMIT confirmé. Une réponse COMMIT incertaine ferme la connexion et exige réconciliation.
Un doublon native-v1 ne rejoue pas les alertes : elles ont été validées dans le même COMMIT.
Une empreinte historique/lab-v1 exige une réconciliation et ne reçoit pas une confirmation silencieuse.
Le verrou véhicule sérialise plusieurs boîtiers affectés au même véhicule dans ce chemin.
Les écritures HTTP legacy et autres producteurs ne participent pas à ce verrou ; ne pas exploiter des modes mixtes en production.

Tests exécutés : orchestration avec client synthétique (succès, doublon, ancien marqueur, index absent, échec GPS/télémétrie/alertes/état et COMMIT incertain) PASS.
L'injection de COMMIT du test a été corrigée pour viser exactement COMMIT, pas BEGIN READ COMMITTED.
PostgreSQL réel sur ce chemin et TCP end-to-end NON ENCORE TESTÉS ; build complet à confirmer sur PC utilisateur.
Index réel et migration/droits adaptés NON ENCORE PRÉPARÉS/APPLIQUÉS pour ce nouveau mode.
Le contrôle exact pg_get_expr/pg_get_indexdef reste à confirmer sur PostgreSQL 17.
Ne pas activer le mode avant ces vérifications. Aucun .env modifié, aucun déploiement.

Les alertes sont traitées directement dans la transaction : ce chemin ne dépend pas du worker/outbox expérimental.
Les événements retardés suivent les règles temporelles existantes ; aucune nouvelle garantie historique n'est revendiquée.
Le mode simulation de flotte conserve son comportement sans stockage.
