# Persistance atomique : essai concurrent local
2026-10-02

## Preuve reçue
La candidate ROLLBACK-only a été exécutée par l'utilisateur : huit notices PASS, notice finale LOCAL ATOMIC CANDIDATE PASS, puis ROLLBACK.
Pannes après position et lors de l'intention d'alertes : aucune écriture partielle.
Rejouement séquentiel : une position, une télémétrie, un travail ; index unique et refus des empreintes historiques vérifiés.
Aucun objet candidat conservé à l'issue de cet essai.

## Nouvelle vérification préparée
scripts/security/teltonika-local-atomic-concurrency.mjs, sans dépendance npm supplémentaire.
Vérification de syntaxe Node PASS ; PostgreSQL/Docker non disponibles dans l'environnement de préparation. Exécution concurrente NON ENCORE TESTÉE.
Commande : node scripts/security/teltonika-local-atomic-concurrency.mjs

Le script utilise exclusivement Docker exec dans supabase_db_recovery-20261001-175031.
Il reprend la définition de la candidate du fichier SQL adjacent, sans lancer les tests séquentiels.
Installation temporaire COMMIT de la candidate et d'une fixture marquée ; aucune configuration serveur modifiée.
La première session READ COMMITTED persiste puis garde sa transaction ouverte.
La deuxième tente la même empreinte. Le contrôleur exige une attente Lock et un blocage B par A observé via pg_blocking_pids.
Après COMMIT de A, les résultats doivent être inserted puis duplicate, avec travail d'alertes en attente.
Les comptes exacts doivent être 1 position / 1 télémétrie / 1 travail et le boîtier online.
finally termine uniquement les sessions portant les noms de ce run, supprime les fixtures et le schéma/index candidats dans une transaction, puis vérifie leur absence.
Un marqueur de run empêche de nettoyer les objets d'un autre essai. Ne pas lancer deux copies simultanément.
Si le processus Node est tué ou Docker indisponible, finally peut ne pas terminer : conserver toute erreur et les identifiants de run pour reprise du nettoyage.
Les séquences peuvent avancer malgré le nettoyage.

## Limites
Le test nécessite une installation temporaire locale : il ne peut être entièrement ROLLBACK-only puisque deux sessions doivent partager des objets visibles.
Un seul paquet et deux sessions READ COMMITTED ; pas de preuve générale sous d'autres niveaux d'isolation.
Pas de crash réel, ACK réseau, RPC/service-role, worker d'alertes ou charge soutenue.
Le serveur natif actuel n'utilise toujours pas cette candidate. Aucun changement de production.
