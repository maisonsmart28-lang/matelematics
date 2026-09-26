# Step 11 — test FMC150 via Traccar, sécurité et agents IA

## Résultat attendu

Les deux FMC150 restent connectés à leur Traccar actuel. Le bridge lit les positions et la télématique minimale via l’API Traccar, puis peut les écrire dans une entreprise Matelematics explicitement choisie. Il n’envoie aucune commande aux boîtiers et ne modifie pas leur configuration.

Ce test valide le flux Traccar → Matelematics, la carte et l’enregistrement des positions et de la télématique minimale. Il ne valide pas le décodeur Teltonika natif Matelematics, les champs CAN détaillés, la vidéo ni les commandes distantes. Le schéma `positions` ne porte pas encore une provenance Traccar dédiée : tester l'import dans un périmètre isolé.

## Préparation

1. Utiliser une entreprise Matelematics avec un ou deux véhicules et enregistrer uniquement les IMEI concernés dans `devices`, chacun rattaché à son véhicule. `TRACCAR_ALLOWED_IMEIS` accepte un ou deux IMEI : pour isoler un véhicule, renseigner uniquement son IMEI dans `.env.local` ou dans la session PowerShell. Cela n'efface ni les anciens enregistrements ni les autres véhicules.
2. Dans Traccar, créer un compte technique non administrateur, sans commandes et limité aux appareils concernés. Le `uniqueId` de Traccar doit être l’IMEI.
3. Le PC qui exécute le bridge doit pouvoir joindre Traccar. Pour le lab local, l’URL est `http://127.0.0.1:8082`. Ne pas exposer cette interface au public.
4. Copier les variables Traccar de `.env.example` dans `.env.local` et remplacer les valeurs fictives. Ne jamais partager ni committer `.env.local`.

## Dry-run, sans écriture en base

À exécuter depuis la racine du dépôt, dans PowerShell :

```powershell
npm run traccar:bridge:selftest
npm run traccar:bridge -- --once
```

Le premier test utilise des serveurs HTTP simulés sur loopback. Le second lit seulement les appareils autorisés et leurs positions dans Traccar, sans appeler Supabase. Les journaux ne montrent ni coordonnées ni IMEI complet.

Si une journée ne contient aucun relevé, lancer `npm run traccar:bridge -- --status`. Cette commande lit uniquement `/api/devices` et affiche pour chaque IMEI autorisé son état déclaré par Traccar, la dernière mise à jour en UTC et son ancienneté en minutes. Elle ne contacte ni les positions ni Supabase et refuse `--write`. Une dernière mise à jour ancienne peut indiquer un boîtier silencieux ; l'état seul ne prouve ni la cause ni la configuration du boîtier.

Pour inventorier les attributs télématiques d'une journée UTC (y compris ceux des relevés dont le GPS est invalide), lancer `npm run traccar:bridge -- --history=2026-09-24 --history-telemetry`. Cette commande lit les deux appareils autorisés et compte les champs, leurs types, leurs valeurs nulles ou zéro et leur variation, sans afficher leurs valeurs, coordonnées ni trajets. Elle affiche en priorité les champs lisibles avant les identifiants `io*` et limite la sortie à 80 noms. La présence ou la variation d'un champ Traccar ne prouve pas à elle seule une mesure CAN réelle ni sa bonne unité : valider chaque conversion avant d'écrire dans `telemetry`.

Pour simuler la séparation GPS / télématique sans écrire en base, lancer `npm run traccar:bridge -- --history=2026-09-24 --history-plan`. Les candidats télématiques doivent contenir un contact booléen ou un nombre entier de satellites plausible. `telemetryWithoutGps` compte les points qui possèdent l'un de ces attributs mais dont le GPS est invalide. Ce plan n'insère rien, ne vérifie pas encore les unités des autres champs et ne prouve pas que le récepteur de production soit prêt.

Pour suivre les positions durant un essai routier, utiliser `npm run traccar:bridge -- --watch` et arrêter avec `Ctrl+C`. Cette version interroge l’API REST toutes les 5 secondes, ce qui suffit pour deux appareils de test. Avant une flotte de production, remplacer le polling par le WebSocket Traccar et ajouter un curseur de reprise durable.

## Écriture optionnelle — tenant de test uniquement

Vérifier d’abord les deux véhicules et l’UUID de l’entreprise de test. N’activer les écritures qu’après un dry-run correct :

```powershell
$env:TRACCAR_BRIDGE_ALLOW_WRITES = "I_ACCEPT_TEST_ONLY_WRITES"
$env:TRACCAR_TEST_COMPANY_ID = "UUID_DE_L_ENTREPRISE_DE_TEST"
npm run traccar:bridge -- --write --once
```

Pour continuer l’essai, ajouter `--watch`. Le bridge exige les deux IMEI de la liste, leur présence dans Traccar et leur rattachement à l’entreprise choisie dans Supabase. Il ignore les relevés GPS invalides dans `positions`, mais conserve dans `telemetry` les relevés ayant un ID Traccar, une heure plausible et un contact booléen ou un nombre de satellites plausible, même sans GPS valide. Seuls `ignition`, `metadata.satellites`, `metadata.gps_valid` et l'identifiant de provenance Traccar sont importés : les valeurs CAN et leurs unités restent à valider. La vitesse GPS est convertie des nœuds en km/h. Les doublons télématiques sont bloqués par l'index unique `telemetry_traccar_origin_unique` (entreprise, appareil, ID de position Traccar). Les positions utilisent encore une vérification préalable (appareil, heure et coordonnées) : ne lancer qu’une instance à la fois. Le bridge actualise l’état des appareils et ne supprime aucune donnée.

Les historiques `--history=...` restent strictement en lecture seule : `--write --once` ne reprend que les dernières minutes. La reprise d'une journée UTC peut être demandée explicitement via `--write --backfill=AAAA-MM-JJ`, sans `--watch`, après avoir vérifié le plan `--history-plan` correspondant. Pour les deux journées connues, lancer les 23 et 24 séparément, dans cet ordre. La reprise filtre les deux appareils, leurs IDs Traccar et les heures dans la journée UTC ; elle peut être relancée après une erreur, sans recréer les relevés télématiques identiques. Vérifier les compteurs `telemetryInserted`, `positionInserted` et `invalidGps` à chaque étape. Ne pas copier les secrets dans la console ou dans GitHub. L'entreprise « 1er client » contient des appareils réels : vérifier le périmètre des accès et la confidentialité avant les écritures.

Le mode écriture utilise la clé Supabase secrète, qui contourne RLS. Elle reste dans `.env.local`, côté serveur, et le bridge impose des filtres explicites sur l’entreprise, les appareils et les véhicules. Ne pas utiliser l’entreprise de production pour cet essai.

## Socle de sécurité à exiger avant production

« Bloquer toute intrusion » ne peut pas être garanti. Le but est de réduire les voies d’entrée, limiter les dégâts, détecter vite et restaurer proprement.

| Domaine | Exigence | Vérification |
|---|---|---|
| Accès et tenant | RLS sur les données accessibles par API ; contrôle d’entreprise et de véhicule dans chaque route privilégiée | Tests autorisés dans le tenant attendu et refusés entre tenants |
| Secrets | Clés serveur jamais dans le navigateur, Git, logs ou prompts d’agents ; rotation documentée | Secret scan, audit des bundles client et des environnements CI |
| Identités | MFA admins, rôles minimaux et comptes de service distincts | Revue des accès et révocation d’un compte de test |
| Réseau | TLS, limitation de débit ; base, broker et administration sur réseau privé | Revue des ports et test d’accès depuis un réseau externe |
| Appareils | Liste blanche, authentification/protocole validés, limites de fréquence et déduplication | Appareil inconnu, trame invalide, rejeu et flood refusés |
| Reprise | Sauvegardes chiffrées, durée de conservation fixée et restauration testée | Exercice de restauration et procédure incident |
| Surveillance | Alertes sur échecs d’auth, activité anormale, backlog et erreurs d’écriture | Vérifier qu’une alerte est reçue et qu’une clé peut être révoquée |

Le dépôt contient déjà des contrôles (`security:p0-step3`, `security:p0-step4`, `security:p1-step6d`) à intégrer comme checks requis des pull requests. Aucun contrôle n’a été présenté comme un audit complet ou une garantie absolue.

## Agents IA du dépôt

Les profils Copilot proposés travaillent uniquement sur le code et les données synthétiques. Ils n’ont pas besoin des accès Supabase, des trajets GPS, des vidéos ou des secrets de production.

- **Coordinateur** : prépare priorités, dépendances, critères d’acceptation et résumés.
- **Développeur** : prépare une branche et une pull request sur une tâche assignée.
- **Relecteur sécurité** : analyse les diffs et rend des constats, sans modifier le code.
- **QA** : lance des validations locales ciblées, sans accès distant ni commandes destructives.

Les agents ne fusionnent pas, ne déploient pas, ne lancent pas de migration de production et ne modifient pas les traceurs. Activer les protections de branche, tests CI requis et revue humaine dans les paramètres GitHub. Les profils sont des consignes pour Copilot, pas un service autonome qui s’exécute seul.

## Limites de cette étape

- Le schéma Supabase et les rattachements des appareils ont été contrôlés. Les imports réels et leur validation doivent être suivis séparément ; l'accès direct à Traccar reste disponible uniquement sur le PC de l'utilisateur.
- Le test selftest valide les gardes et le mapping contre des serveurs simulés seulement.
- L’écriture réelle nécessite un tenant de test et les valeurs locales que l’utilisateur ne doit pas transmettre dans le chat.
- Les positions réelles peuvent révéler les déplacements de personnes ; limiter les personnes autorisées, informer les conducteurs et vérifier les formalités applicables.
