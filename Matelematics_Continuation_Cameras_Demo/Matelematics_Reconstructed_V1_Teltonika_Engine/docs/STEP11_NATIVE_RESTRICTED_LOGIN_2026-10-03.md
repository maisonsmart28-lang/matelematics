# Validation du login d'ingestion limité
2026-10-03

Preuve reçue : schéma/rôle/index simulés, dix politiques et droits effectifs PASS, retour arrière sans suppression de données PASS, ROLLBACK final.
La correction retire tout droit UPDATE véhicules. Le cœur utilise maintenant un verrou consultatif transactionnel par véhicule.
Preuves d'ingestion SQL/TCP précédentes sous administrateur acquises ; le nouveau verrou et rôle doivent être vérifiés ensemble.

Script préparé : scripts/security/teltonika-native-role-local.ts.
Syntaxe vérifiée ; nouvelle exécution PostgreSQL NON ENCORE VÉRIFIÉE.
Cible fixe loopback 55322 dans le laboratoire restauré, sans chargement de .env.
Installe temporairement les corps apply/revert déjà simulés.
L'administrateur crée seulement schéma/rôle/index, fixtures et login éphémère ; un pool séparé authentifie réellement ce login.
Login sans superutilisateur, création de base/rôle, réplication ou BYPASSRLS. Hérite uniquement du rôle d'ingestion nouvellement créé.
Secret aléatoire en mémoire : jamais affiché, aucune écriture dans .env ou GitHub.
Les requêtes d'ingestion ne font aucun SET ROLE/RESET ROLE et ne réutilisent pas la connexion administrateur.
Le login couvre toute la flotte ; c'est un acteur interne backend, pas un compte client.

Contrôles réels :
- identité session_user/current_user et attributs du rôle ;
- neuf refus 42501 : profils lecture/rôle, devices.company_id, vehicles.name, DELETE positions/télémétrie/alertes, paramètres d'alertes UPDATE, lecture du raw_payload ;
- insertions core et vraies alertes active/résolue, rejouement, panne après mutations d'alertes, last_seen_at inchangé, comptes exacts ;
- fermeture du pool limité puis nettoyage des fixtures, membership, CONNECT, login et corps revert ;
- absence des deux rôles, politiques, index et données fictives vérifiée.

Les UPDATE/DELETE interdits utilisent WHERE false : vérifie ACL sans risque de modification.
Le script est limité à la connexion privilégiée locale pour la préparation et le nettoyage ; ne pas interrompre Node.
Si nettoyage échoue, conserver run/vehicle/device affichés ; aucun nettoyage large automatique.
DDL/politiques temporaires COMMIT nécessaires pour qu'un login séparé les voie.
Aucune migration versionnée appliquée, aucun mode atomic activé sur la base distante.
La génération CLI de la migration et l'examen des routines accessibles par PUBLIC restent ouverts.
