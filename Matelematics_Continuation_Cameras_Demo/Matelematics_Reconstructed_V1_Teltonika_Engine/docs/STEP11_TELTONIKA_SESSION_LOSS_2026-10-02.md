# Teltonika — interruption de session avant COMMIT
2026-10-02

## Preuve concurrente reçue
Le test concurrent précédent a été exécuté : B effectivement bloquée par A via pg_blocking_pids ; A inserted, B duplicate ; une position, une télémétrie, un travail ; nettoyage fixture/schema/index vérifié.
Cela couvre deux sessions READ COMMITTED et un seul paquet dans le laboratoire.

## Essai préparé
scripts/security/teltonika-local-atomic-session-loss.mjs.
Syntaxe Node vérifiée. Exécution SQL non encore vérifiée.
Conteneur fixe supabase_db_recovery-20261001-175031 ; aucun client distant, mot de passe ou URL de production.
Installation temporaire de la candidate et d'une fixture marquée dans une transaction COMMIT.
A écrit avec persist puis attend sans COMMIT.
Le contrôleur exige le résultat inserted, puis appelle pg_terminate_backend uniquement sur le nom unique de session A et son état idle in transaction.
La session doit sortir avec un code non nul.
Une autre connexion vérifie zéro position/télémétrie/travail et l'état offline/last_seen_at initial conservé.
Le rejouement doit être inserted, le suivant duplicate ; comptes exacts 1/1/1 avec travail en attente et boîtier online.
finally nettoie les sessions du run, fixtures, schéma et index ; marqueur de propriété et vérification d'absence.
Ne pas interrompre Node : si finally ne peut terminer, conserver la sortie et les identifiants pour nettoyage.
Les séquences peuvent avancer ; aucune modification du serveur natif.

## Limites ouvertes
pg_terminate_backend teste une interruption de session PostgreSQL, pas un crash du processus PostgreSQL, du conteneur ou de l'hôte.
Le résultat de persist avant COMMIT n'est pas un ACK réseau ; cette candidate n'est pas intégrée au serveur.
ACK perdu après COMMIT sur socket réel, RPC/service-role, worker d'alertes et charge restent non testés.
Aucun changement de production.
