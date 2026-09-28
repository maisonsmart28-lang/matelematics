# Reprise de l'audit — étapes 10 et 11 (27 septembre 2026)

## État vérifié

| Domaine | Résultat | Limite / décision |
| --- | --- | --- |
| 10E — comparaison locale RabbitMQ et NATS | B1 fiabilité local PASS ; B2 borné 60 000 événements à 2 000/s contrôlé pour les deux, dernier RabbitMQ isolé confirmé | Local mono-nœud : aucun choix de broker pour la production, aucune preuve HA ni capacité 50k/100k véhicules |
| 10E — conformité et coûts | Critères CNDP, pays de stockage et coût MAD/véhicule documentés | Validation juridique, devis réels, TLS et restauration hors laboratoire encore requis avant production |
| 11 — bridge FMC150 depuis Traccar | Backfill des 23, 24 et 25 septembre déjà exécuté pour l'appareil `…6283` ; télémétrie sans GPS conservée lorsque admissible | Aucun CAN normalisé prouvé ; le second FMC150 `…6168` n'a pas encore fourni de relevés ; essai sur boîtier en ligne à reprendre |
| 11 — GT06 | Simulateur, transaction atomique de test, affichage GPS et badge « Données GPS simulées » vérifiés | Boîtier Accurate physique et firmware exact à valider avant de qualifier ce protocole |
| Audit sécurité source | `security:p0-step3` PASS, `security:p0-step4` PASS après garde Conducteurs et mise à jour du contrôle, `security:p1-step6d` PASS | Contrôles statiques locaux ; il faut aussi une validation RLS/JWT et une restauration de sauvegarde en conditions prévues |

## Corrections de cette reprise

- Page Conducteurs : création, modification, désaffectation et archivage visibles uniquement si le rôle du tableau de bord **et** l'API accordent la permission ; la fenêtre de modification/création a le même double contrôle. L'API `/api/drivers` refuse déjà les mutations pour le rôle `user` et applique ses fonctions SQL sous le JWT du demandeur.
- Le contrôle P0 Step 4 vérifie la structure de la page Conducteurs actuellement utilisée au lieu d'attendre des noms d'état d'une ancienne implémentation ; 13 vérifications réussies.
- Les documents `STEP10E_LOCAL_QUEUE_COMPARISON.md` et `STEP11_TRACCAR_BRIDGE_SECURITY_AI.md` ont été remis en phase avec les résultats fournis. Aucun déploiement Vercel.

## Prochains critères bloquants

1. **Étape 11, sécurité réelle** : test RLS/JWT avec comptes de rôles distincts et entreprise/partenaire croisés, sans clé serveur ; contrôler réponses GET et mutations refusées. Les contrôles statiques ne remplacent pas ce test.
2. **Étape 11, matériel** : avec le FMC150 `…6283` connecté, comparer l'origine et les unités de chaque signal CAN au configurateur et à un relevé physique ; ne rendre visibles les rubriques carburant et diagnostic qu'avec un profil CAN décodé. Vérifier ensuite l'autre FMC150 et l'Accurate réel séparément.
3. **Étape 10, infrastructure candidate** : seulement après autorisation d'un environnement représentatif, mesurer TLS, réseau distant, sauvegarde/restauration, HA et coûts réels en MAD/véhicule/mois. Les chiffres locaux ne sont pas une décision d'hébergement.

Aucune purge de messages, changement de configuration de traceur ou écriture sur données de production ne fait partie de cette reprise.

## Contrôle JWT en lecture seule préparé

Les tables `partners`, `companies`, `vehicles`, `profiles`, `drivers`, `positions`, `telemetry` et `devices` ont RLS activée dans le projet Supabase. Un déclencheur `trg_profiles_protect_security_fields` protège la modification des rôles et des liens entreprise/partenaire. Ces constats de configuration ne prouvent pas les refus d'accès pour des JWT réels.

Le script `scripts/security/rls-jwt-read-audit.mjs` se connecte avec **deux comptes de test distincts de rôle `user`**, chacun rattaché à une entreprise différente, au moyen de la clé publique Supabase. Il n'utilise aucune clé serveur, ne modifie aucune ligne et ne publie ni email, ni mot de passe, ni JWT. Il vérifie dans les deux sens la lecture du profil propre, de l'entreprise propre, le refus du profil et de l'entreprise opposés, l'absence d'accès aux partenaires et le périmètre des véhicules. Il échoue si les deux comptes ont la même entreprise. L'essai réel a été exécuté par l'utilisateur avec les deux JWT : les deux comptes ne voient que leur entreprise (A : 3 véhicules ; B : 0). Le compte A ne peut pas modifier le nom d'un véhicule visible ; un test d'écriture sans changement de valeur a confirmé le refus. Le privilège SQL UPDATE sur `vehicles` est absent pour `authenticated` : ce test prouve le refus d'accès de bout en bout, et non spécifiquement l'effet de la politique RLS. Aucun mot de passe n'a été partagé.

Depuis PowerShell dans le dossier du projet, utiliser uniquement deux **comptes de test** (ne pas transmettre ces identifiants dans le chat) :

```powershell
$credA = Get-Credential -Message "Compte utilisateur TEST A"
$credB = Get-Credential -Message "Compte utilisateur TEST B dans une autre entreprise"
$env:RLS_TEST_A_EMAIL = $credA.UserName
$env:RLS_TEST_A_PASSWORD = $credA.GetNetworkCredential().Password
$env:RLS_TEST_B_EMAIL = $credB.UserName
$env:RLS_TEST_B_PASSWORD = $credB.GetNetworkCredential().Password
node scripts/security/rls-jwt-read-audit.mjs
Remove-Item Env:RLS_TEST_A_EMAIL,Env:RLS_TEST_A_PASSWORD,Env:RLS_TEST_B_EMAIL,Env:RLS_TEST_B_PASSWORD
```

Si une exception interrompt ces commandes, fermer la fenêtre PowerShell pour détruire les variables d'environnement de cette session. Le script lit uniquement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans `.env.local` ; il ne charge pas les secrets serveur. La commande n'a pas besoin du serveur Next.js ou de Docker.

**Limite actuelle :** il n'y a qu'un partenaire enregistré dans la base. Un refus entre deux partenaires ne peut pas être vérifié avec ces comptes. Les tentatives de modification `vehicles.name`, `profiles.role` et `profiles.company_id` sont une étape distincte avec données de test et remise en état ; ce script ne les exécute pas.

## Résultats JWT complémentaires (27 septembre)

- `rls-jwt-write-deny-audit.mjs` : **PASS** pour le refus d'UPDATE sur un véhicule visible du compte A ; la valeur initiale est intacte. Le refus vient déjà du privilège SQL manquant pour `authenticated`, avant l'évaluation RLS. Les droits d'UPDATE accordés aux administrateurs restent non testés.
- `rls-jwt-telemetry-read-audit.mjs` : **PASS dans le sens B → A** pour un identifiant existant de chaque table `devices`, `drivers`, `positions` et `telemetry`. Dans le sens A → B : **NOT TESTED**, car B ne possède aucune ligne dans ces quatre tables. Ne pas interpréter une table vide comme une preuve d'isolation.
- Une requête initiale filtrant les positions d'A sous le JWT de B a été annulée par délai d'exécution (code PostgreSQL `57014`). Le test corrigé cible une clé primaire ; il passe. Ce dépassement de délai est un signal de performance distinct, à diagnostiquer avant la production.
- `profiles.role`, `profiles.company_id` et l'isolation entre deux partenaires sont **non testés avec JWT**. Le déclencheur SQL a été lu et interdit ces mutations pour le rôle `user`, mais sa définition ne remplace pas un essai contrôlé.

Suite : créer des enregistrements de test dans la seconde entreprise et un second partenaire avec comptes dédiés, puis exécuter les essais dans les deux sens ; documenter identifiants, état initial et procédure de restauration avant toute mutation de profil. Aucun enregistrement de production ne doit être déplacé pour ce test.

## Reprise du 28 septembre : authentification et contrôle Supabase

- Deux tentatives de connexion à 11:20 UTC ont reçu `invalid_credentials` dans Supabase Auth ; les comptes de test A/B sont confirmés et non bannis. Les scripts JWT n'ont pas franchi la connexion de A ce jour. Le dernier test validé demeure celui du 27 septembre.
- Les cinq lignes synthétiques créées pour l'entreprise B (véhicule, boîtier fictif, conducteur, position et télémétrie) ont été **supprimées** après vérification de leurs marqueurs uniques ; une lecture de contrôle donne zéro ligne restante dans chacune des cinq tables. L'isolation A → B ne peut donc plus être retestée tant que l'authentification n'est pas rétablie et que les fixtures ne sont pas recréées.
- Les fonctions RLS `can_access_company` et `can_manage_company` fondent la décision sur `auth.uid()` et le profil, avec retour `false` pour un UID absent. Leur code a été examiné ; cela ne remplace pas une exécution avec JWT. Le linter Supabase avertit que neuf fonctions `SECURITY DEFINER` sont directement exécutables par `authenticated`. Une révocation globale risquerait de casser les politiques et fonctions qui les utilisent ; analyser les dépendances et les droits fonction par fonction avant tout changement. [Avis Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Protection Supabase contre les mots de passe compromis : **désactivée** selon le linter. À planifier dans la configuration Auth ; ne pas confondre avec la cause vérifiée `invalid_credentials` du test. [Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Le linter performance signale quatre politiques avec évaluation répétée des fonctions Auth et 18 clés étrangères sans index de couverture, dont `positions_company_device_fkey`. Le `57014` observé motive un profilage séparé avant d'ajouter des index au hasard. [Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).

**Prochaine action locale** : retrouver ou réinitialiser le mot de passe du compte test A dans le tableau de bord Supabase ; ne pas transmettre le secret dans le chat. Confirmer un nouveau login JWT avant de recréer des fixtures ou de lancer des essais d'écriture.

## Validation croisée JWT du 28 septembre (soir)

Après rétablissement des connexions A et B, une fixture synthétique a été recréée pour B : un véhicule, un boîtier fictif, un conducteur, une position sans coordonnées et une télémétrie sans capteur. Sous les JWT des deux comptes `user`, les huit contrôles ciblés ont réussi : chaque compte voit une ligne de sa propre entreprise et aucune ligne de l'autre entreprise dans `devices`, `drivers`, `positions` et `telemetry`. Le script de lecture `companies`/`vehicles` a aussi réussi dans les deux sens (A : 3 véhicules ; B : 1 fixture).

Les cinq lignes synthétiques de B ont ensuite été supprimées par marqueurs exacts et l'absence des cinq a été vérifiée. **Cette preuve de lecture en deux sens est acquise pour ces fixtures**, même si le résultat ne couvre pas les écritures sur `profiles.role` ou `profiles.company_id`, ni le cas interpartenaires. Le message final du script télématique a été corrigé pour annoncer `PASS in both directions` lorsque les huit directions disposent de fixtures et passent.

## Analyse des écritures directes (28 septembre, soir)

Les privilèges SQL du rôle `authenticated` autorisent SELECT mais **pas INSERT/UPDATE/DELETE** sur `vehicles`, `devices` et `profiles`. `drivers` autorise SELECT/INSERT/UPDATE, sans DELETE. Les politiques RLS de modification peuvent donc être plus permissives que les privilèges effectivement disponibles : un refus constaté sur `vehicles` ou `profiles` via JWT ne démontre pas à lui seul l'efficacité du prédicat RLS ou du déclencheur. Pour `profiles.role` et `profiles.company_id`, le refus des écritures directes est déjà garanti par l'absence de GRANT UPDATE pour `authenticated` ; le déclencheur constitue une autre couche de défense.

La route `/api/admin` utilise côté serveur `SUPABASE_SECRET_KEY`, vérifie le bearer token avec `auth.getUser`, charge le rôle en base et contrôle `canCreateRole` et le rattachement entreprise/partenaire avant de créer un compte. Les opérations privilégiées **via cette API** doivent faire l'objet d'essais fonctionnels séparés (autorisé/refusé, interentreprises/interpartenaires) ; ne pas considérer les droits SQL directs comme preuve suffisante de l'API. Ne pas donner de GRANT UPDATE sur `profiles` ou `vehicles` simplement pour faire passer un test.

## Contrôle local de l'API d'administration (28 septembre, nuit)

Le script `scripts/security/admin-api-jwt-deny-audit.mjs` exécuté contre le serveur Next.js local a confirmé : GET anonyme → 401 ; GET et POST `create_company` sous chacun des deux JWT `user` A/B → 403. Aucun compte ni entreprise n'a été créé. Ce résultat vérifie le garde d'entrée de `/api/admin` pour le rôle `user`, et non les droits des rôles supérieurs.

Les essais `client_admin` et `partner_admin` (créations permises/refusées, périmètre partenaire croisé) restent ouverts. Les exécuter avec des comptes de test distincts et nettoyage documenté, sans supposer que l'absence de GRANT SQL aux JWT couvre l'API qui détient une clé serveur.

## Contrôle partenaire croisé (28 septembre, nuit)

Deux lignes synthétiques (Partner TEST 2 et Client TEST C, avec UUID et marqueurs uniques) ont été créées pour le test local de `/api/admin`. Sous le JWT du `partner_admin` du partenaire 1 : GET admin a répondu 200 sans inclure le partenaire 2 ni son client ; la lecture directe du client par JWT est vide ; POST `create_user` ciblant Client TEST C a répondu 403. `client_admin` a aussi obtenu GET 200 et les refus 403 de `create_company` et d'attribution d'un rôle élevé. Les corps des POST de refus utilisaient un e-mail invalide et/ou un nom vide pour exclure une création involontaire.

**Résultat : PASS dans le sens partenaire 1 → partenaire 2** pour la lecture et la tentative de création hors périmètre. Aucun compte `partner_admin` n'était rattaché au partenaire 2 ; le sens inverse et les créations autorisées restent non testés. Les deux lignes synthétiques ont été supprimées avec vérification finale à zéro. Aucun droit SQL ou déploiement Vercel modifié.

## Écriture autorisée par API admin (28 septembre, nuit)

Avec le JWT du `partner_admin`, `POST /api/admin` action `create_company` a créé une entreprise synthétique avec marqueur unique. Le corps de requête contenait volontairement `partner_id=00000000-0000-0000-0000-000000000000` ; la route l'a remplacé par le partenaire réel de l'acteur (`10000000-0000-0000-0000-000000000001`). La réponse et une lecture sous le même JWT ont confirmé le nom et le rattachement. **PASS pour la création autorisée et la prévention de l'usurpation du partenaire.** La ligne, dépourvue de profils et de véhicules, a été supprimée par ID+nom exacts ; vérification finale : zéro.

Les créations d'utilisateur autorisées et le sens inverse partenaire 2 → partenaire 1 restent non testés. Ne pas créer de compte Auth de test sans procédure de suppression vérifiée ; l'essai précédent ne concernait qu'une entreprise.

## Diagnostic du délai `57014` sur positions

Un `EXPLAIN` sans exécution, sous `SET LOCAL ROLE authenticated` et la revendication `sub` du compte B, sur `positions WHERE company_id = Client TEST A LIMIT 1` prévoit un **Seq Scan** avec filtre `company_id = A AND (can_access_company(company_id) OR is_matelematics_admin())` ; le coût total estimé est 19103.52. La société A possède l'essentiel des positions, mais B n'a accès à aucune d'elles. Le `LIMIT 1` ne peut s'arrêter tôt lorsque toutes les lignes candidates sont rejetées par RLS ; cela explique le délai observé. Le contrôle par clé primaire existante a ensuite passé pour A et B.

Ne pas attribuer ce cas uniquement à un index manquant ni changer les politiques en production sans mesure représentative. Pour les vérifications négatives, cibler une clé primaire connue ; pour les API métier, filtrer par l'entreprise autorisée et borner la fenêtre temporelle. Si des requêtes réelles restent lentes, mesurer `EXPLAIN (ANALYZE, BUFFERS)` dans un environnement de test avant toute migration RLS ou d'index.

## Réponse d'erreur de l'API admin (28 septembre, nuit)

Après remplacement des messages d'exception des chemins GET et POST par « Erreur serveur. » dans les réponses 500, le test local `admin-api-elevated-deny-audit.mjs` a tenté de créer un compte avec un e-mail déjà utilisé. **PASS :** la réponse est 500 et ne contient aucun détail du fournisseur Auth. La tentative ne crée pas de nouvel utilisateur. Les contrôles `client_admin` et `partner_admin` précédemment validés passent encore ; la sortie du script reste `PARTIAL PASS` parce que les créations d'utilisateurs autorisées et le contrôle interpartenaires dans les deux sens n'ont pas été réalisés lors de cette exécution. La preuve précédente partenaire 1 → partenaire 2, avec fixture temporaire supprimée, demeure distincte.

**Suite contrôlée :** vérifier l'écriture `create_user` avec un compte Auth de test unique, constater son profil et son périmètre avec un JWT propre, puis supprimer précisément le compte et confirmer la disparition de son profil. Avant cet essai, préparer la procédure de nettoyage Auth et profil ; une erreur après création Auth peut laisser un compte sans profil si la suppression compensatoire échoue. Aucun changement de droits RLS ni déploiement Vercel n'est nécessaire pour ce test local.
