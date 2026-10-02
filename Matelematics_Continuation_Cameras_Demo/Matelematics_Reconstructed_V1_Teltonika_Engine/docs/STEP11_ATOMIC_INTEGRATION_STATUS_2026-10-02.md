# Intégration atomique Teltonika — état exact
2026-10-02

Décision : poursuivre les corrections avant hébergement ; aucun déploiement ou changement de base distante.
Les preuves SQL de candidate et de concurrence locale restent acquises.
Le test d'interruption n'a pas terminé et reste NON VALIDÉ. L'utilisateur a supprimé exactement son ancien run a09f722e-d510-4566-b8b2-d57f5b8b56a1 ; suppression et absence de fixture/schema/index vérifiées, COMMIT reçu.

## Code préparé
server/teltonika/ingest-transaction.ts et son self-test.
Exécute BEGIN READ COMMITTED, limites de temps, callback de stockage, puis COMMIT ; retourne uniquement après succès du COMMIT.
Erreur avant COMMIT : ROLLBACK ; connexion détruite si rollback échoue.
Erreur pendant COMMIT : résultat considéré inconnu, connexion détruite, aucun rejouement automatique ; réconciliation par empreinte nécessaire.
Les erreurs du fournisseur ne sont pas exposées par l'erreur générique de COMMIT incertain.
Tests exécutés avec Node et client synthétique : succès, échec de chacune des quatre opérations, rollback défaillant, BEGIN défaillant, COMMIT incertain sans replay : PASS.
Ce test n'est pas une preuve PostgreSQL réseau.

## Intégration restante
Le module n'est PAS encore appelé par storage.ts. Le chemin réel reste non atomique.
Il faut adapter la lecture du boîtier et la déduplication avec verrou/contrainte unique, les mutations d'alertes et leur lecture au même client SQL, puis position/télémétrie/état.
Les fonctions actuelles d'alertes utilisent Supabase HTTP ; les appeler dans le callback ne les inclurait PAS dans la transaction PostgreSQL.
Ne pas introduire un drapeau annonçant une atomicité avant cette adaptation.
Une alternative outbox exige un worker durable avant activation, pas seulement une intention stockée.
Préparer migration avec droits internes et réconciliation des empreintes historiques ; validation locale sur chemin serveur intégré ensuite.
Aucun fichier .env modifié ; aucune migration appliquée ; aucun changement du comportement runtime actuel.
