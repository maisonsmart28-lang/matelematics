# Schéma et rôle d'ingestion préparés
2026-10-03

## Preuve reçue
persistTelemetry sur PostgreSQL réel : recherche SQL, alertes create/resolve, doublon, erreur tardive et rollback PASS ; nettoyage PASS.
Build, TypeScript et 47 pages PASS.
Erreur initiale du déclencheur d'essai corrigée ; succès reçu après correctif af7fa98.

## Préparation
teltonika-native-schema-apply.sql et revert.sql : corps SQL à exécuter dans une transaction contrôlée.
Ce ne sont PAS encore des migrations Supabase versionnées. La génération CLI et l'application restent ouvertes.
Le script dryrun.ps1 cible le conteneur de recovery fixe, simule application, contrôle des droits effectifs, retour arrière, puis ROLLBACK.
Exécution SQL de ces nouveaux scripts NON ENCORE VÉRIFIÉE.
Aucune mutation distante : lecture de métadonnées uniquement pour examiner politiques et déclencheurs.

## Rôle interne
matelematics_ingest_native : NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEROLE, NOCREATEDB, NOREPLICATION, NOBYPASSRLS.
Aucune appartenance attribuée aux comptes JWT. Un login dédié et son secret seront provisionnés séparément avant exploitation.
Onze politiques RLS visant uniquement ce rôle, sans remplacement des politiques authenticated.
Il est un rôle backend couvrant toute la flotte, PAS un rôle de client isolé par entreprise.
Droits par colonnes : lecture du boîtier/rattachement, paramètres/lifecycle d'alertes et empreinte de télémétrie ; INSERT positions/télémétrie/alertes ; UPDATE état du boîtier et status/resolved_at des alertes.
UPDATE véhicules.updated_at nécessaire à SELECT FOR UPDATE : autorise aussi la modification de cette colonne, aucune colonne métier sensible.
USAGE des deux séquences, sans SELECT/UPDATE sur les séquences.
Pas de DELETE, pas de lecture profils, pas de modification des paramètres d'alertes, des rattachements ou du nom du véhicule.
PUBLIC peut conférer des droits supplémentaires : contrôle des droits effectifs inclus, pas seulement des GRANT explicites.
Les contraintes et déclencheurs de cohérence entreprise-véhicule existants restent actifs.

## Index et retour arrière
Index unique partiel Teltonika sur company_id/device_id/empreinte. Aucun historique supprimé ou réécrit.
Doublons existants : échec et rollback ; réconciliation historique distincte toujours ouverte.
CREATE INDEX standard peut bloquer des écritures ; adapté à l'essai local seulement. Fenêtre d'arrêt ou stratégie concurrente à décider avant application hébergée.
Retour arrière supprime les onze politiques nouvelles, révoque exactement les grants, supprime le rôle puis l'index ; aucune suppression de données.
Refuse un rôle/index préexistant à l'application et un membre du rôle au retour arrière.
Arrêter l'ingestion et retirer le login dédié avant rollback.
Empreintes native-v1 et données validées sont conservées après revert ; ne pas réactiver legacy sans stratégie de déduplication revue.

## Limites
Ce premier aller-retour vérifie DDL/ACL/politiques, pas encore l'ingestion effective sous ce rôle.
Test avec SET ROLE puis connexion LOGIN dédiée à venir ; restriction éventuelle du service hébergé à la création de rôles non vérifiée.
Droits supplémentaires via routines PUBLIC et autres schémas à inventorier avant certification du rôle.
Mode atomic toujours désactivé par défaut ; pas de déploiement, pas de modification .env.local.
