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

Le script `scripts/security/rls-jwt-read-audit.mjs` se connecte avec **deux comptes de test distincts de rôle `user`**, chacun rattaché à une entreprise différente, au moyen de la clé publique Supabase. Il n'utilise aucune clé serveur, ne modifie aucune ligne et ne publie ni email, ni mot de passe, ni JWT. Il vérifie dans les deux sens la lecture du profil propre, de l'entreprise propre, le refus du profil et de l'entreprise opposés, l'absence d'accès aux partenaires et le périmètre des véhicules. Il échoue si les deux comptes ont la même entreprise. L'essai réel n'a pas encore été exécuté : leurs mots de passe ne sont pas disponibles dans l'environnement de l'agent.

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
