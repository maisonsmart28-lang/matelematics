# Step 11 — test FMC150 via Traccar, sécurité et agents IA

## Résultat attendu

Les deux FMC150 restent connectés à leur Traccar actuel. Le bridge lit les positions via l’API Traccar, puis peut écrire seulement les positions normalisées dans une entreprise de test Matelematics. Il n’envoie aucune commande aux boîtiers et ne modifie pas leur configuration.

Ce test valide le flux Traccar → Matelematics, la carte et l’enregistrement des positions. Il ne valide pas le décodeur Teltonika natif Matelematics, les champs CAN détaillés, la vidéo ni les commandes distantes. Le schéma `positions` ne portant pas encore une provenance Traccar dédiée, ces données doivent rester dans le tenant de test.

## Préparation

1. Utiliser une entreprise Matelematics de test avec deux véhicules et les deux IMEI enregistrés dans `devices`, chacun rattaché à son véhicule.
2. Dans Traccar, créer un compte technique non administrateur, sans commandes et limité à ces deux appareils. Le `uniqueId` de Traccar doit être l’IMEI.
3. Le PC qui exécute le bridge doit pouvoir joindre Traccar. Pour le lab local, l’URL est `http://127.0.0.1:8082`. Ne pas exposer cette interface au public.
4. Copier les variables Traccar de `.env.example` dans `.env.local` et remplacer les valeurs fictives. Ne jamais partager ni committer `.env.local`.

## Dry-run, sans écriture en base

À exécuter depuis la racine du dépôt, dans PowerShell :

```powershell
npm run traccar:bridge:selftest
npm run traccar:bridge -- --once
```

Le premier test utilise des serveurs HTTP simulés sur loopback. Le second lit les appareils et positions de Traccar, sans appeler Supabase. Les journaux ne montrent ni coordonnées ni IMEI complet.

Pour inventorier les attributs télématiques d'une journée UTC (y compris ceux des relevés dont le GPS est invalide), lancer `npm run traccar:bridge -- --history=2026-09-24 --history-telemetry`. Cette commande lit les deux appareils autorisés, compte les champs et leurs types sans afficher leurs valeurs, coordonnées ni trajets. Les noms de champs Traccar ne prouvent pas à eux seuls la présence d'une mesure CAN ou sa bonne unité : valider chaque conversion avant d'écrire dans `telemetry`.

Pour suivre les positions durant un essai routier, utiliser `npm run traccar:bridge -- --watch` et arrêter avec `Ctrl+C`. Cette version interroge l’API REST toutes les 5 secondes, ce qui suffit pour deux appareils de test. Avant une flotte de production, remplacer le polling par le WebSocket Traccar et ajouter un curseur de reprise durable.

## Écriture optionnelle — tenant de test uniquement

Vérifier d’abord les deux véhicules et l’UUID de l’entreprise de test. N’activer les écritures qu’après un dry-run correct :

```powershell
$env:TRACCAR_BRIDGE_ALLOW_WRITES = "I_ACCEPT_TEST_ONLY_WRITES"
$env:TRACCAR_TEST_COMPANY_ID = "UUID_DE_L_ENTREPRISE_DE_TEST"
npm run traccar:bridge -- --write --once
```

Pour continuer l’essai, ajouter `--watch`. Le bridge exige les deux IMEI de la liste, leur présence dans Traccar et leur rattachement à l’entreprise de test dans Supabase. Il ignore les points invalides, convertit la vitesse de nœuds en km/h, vérifie les doublons (appareil, horodatage et coordonnées), et actualise l’état des appareils. Il ne supprime aucune donnée. Ne lancer qu’une instance à la fois.

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

- Aucun accès au Traccar de l’utilisateur ou à Supabase n’a été utilisé ici.
- Le test selftest valide les gardes et le mapping contre des serveurs simulés seulement.
- L’écriture réelle nécessite un tenant de test et les valeurs locales que l’utilisateur ne doit pas transmettre dans le chat.
- Les positions réelles peuvent révéler les déplacements de personnes ; limiter les personnes autorisées, informer les conducteurs et vérifier les formalités applicables.
