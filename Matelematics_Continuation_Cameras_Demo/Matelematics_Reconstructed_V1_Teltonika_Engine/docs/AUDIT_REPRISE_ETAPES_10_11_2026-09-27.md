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

Le script `scripts/security/rls-jwt-read-audit.mjs` se connecte avec **deux comptes de test distincts de rôle `user`**, chacun rattaché à une entreprise différente, au moyen de la clé publique Supabase. Il n'utilise aucune clé serveur, ne modifie aucune ligne et ne publie ni email, ni mot de passe, ni JWT. Il vérifie dans les deux sens la lecture du profil propre, de l'entreprise propre, le refus du profil et de l'entreprise opposés, l'absence d'accès aux partenaires et le périmètre des véhicules. Il échoue si les deux comptes ont la même entreprise. L'essai réel a été exécuté par l'utilisateur avec les deux JWT : les deux comptes ne voient que leur entreprise (A : 3 véhicules ; B : 0). Le compte A ne peut pas modifier le nom d'un véhicule visible ; un test d'écriture sans changement de valeur a confirmé le refus. Aucun mot de passe n'a été partagé.

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

- `rls-jwt-write-deny-audit.mjs` : **PASS** pour le refus d'UPDATE sur un véhicule visible du compte A ; la valeur initiale est intacte. Les droits d'UPDATE accordés aux administrateurs restent non testés.
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
