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
