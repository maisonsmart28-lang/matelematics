# Step 11 — candidate de persistance atomique Teltonika
Date : 2026-10-02.

## Statut
Script préparé : scripts/security/teltonika-local-atomic-experiment.sql.
Exécution SQL non encore vérifiée. Aucun changement de production et aucune intégration au serveur.
Le chemin actuel de storage.ts reste composé de plusieurs opérations distinctes.

## Inventaire local reçu
35065 lignes Teltonika ; 11862 avec ingest_fingerprint ; 23203 sans empreinte.
Aucun groupe d'empreintes répétées dans cet inventaire. Aucun index unique Teltonika existant.
L'absence de doublons observés ne prouve pas l'absence de risque concurrent.

## Candidate expérimentale
Une fonction privée verrouille le boîtier, contrôle les rattachements et écrit dans la même transaction :
position éventuelle, télémétrie, intention durable de traitement des alertes et état du boîtier.
Un index unique partiel protège l'empreinte par entreprise et boîtier.
Le rejouement d'une empreinte de cette candidate retourne le statut du travail d'alertes.
Une empreinte historique sans marqueur atomique exige une réconciliation ; aucune ligne historique n'est corrigée automatiquement.
Les entrées sans GPS peuvent conserver la télémétrie sans créer de position.

## Essais inclus
Panne de conversion après insertion de position ; panne injectée lors de l'intention d'alertes ;
succès puis rejouement ; refus du doublon par index ; travail marqué terminé non relancé ;
absence de GPS ; refus d'une empreinte historique ; absence de droit EXECUTE anon/authenticated.
Les essais se déroulent dans une transaction terminée par ROLLBACK.
Les séquences peuvent avancer malgré ROLLBACK ; des trous d'identifiants sont possibles.

## Exécution locale
Conteneur attendu : supabase_db_recovery-20261001-175031.
psql : utilisateur supabase_admin, base postgres, connexion Unix interne.
PGAPPNAME obligatoire : matelematics-local-atomic-audit.
Le script exige également le schéma matelematics_rls_lab et refuse un schéma candidat préexistant.
statement_timeout : 20 secondes ; lock_timeout : 5 secondes.
L'index expérimental peut verrouiller temporairement telemetry pendant cet essai local.

## Limites ouvertes
Pas de test avec connexions concurrentes, crash réel, RPC/API ou boîtier physique.
L'empreinte est fournie à la fonction : son calcul canonique et la détection d'une collision restent à valider.
Le travail d'alertes est une intention durable, pas une alerte calculée : worker, ordre des événements, reprises et règles restent à construire et tester.
La simulation de travail terminé ne constitue pas un test de worker.
Aucune migration de production, aucun remplacement du chemin actuel, aucun ACK réseau testé par ce script.
Les lignes historiques sans empreinte et les anciens paquets partiellement persistés exigent une stratégie distincte.
Les limites précédentes des étapes 10/11 restent ouvertes, notamment copie de sauvegarde hors machine, capacité et validation réelle Renault.
