# GT06 natif — validation locale avant écriture

La branche historique `feature/accurate-gt06` possède une racine Git distincte de celle du SaaS. Ne pas fusionner sa totalité : elle modifierait des fichiers sans rapport. Ce contrôle apporte uniquement le parseur, son test et un serveur TCP de laboratoire en lecture seule. La passerelle Traccar locale et le GT06 natif sont deux chemins indépendants.

## Contrôle reproductible (PowerShell)

Depuis `Matelematics_Reconstructed_V1_Teltonika_Engine` :

```powershell
npm run gt06:lab:selftest
npm run gt06:lab:server
```

Garder cette fenêtre ouverte. Dans une **autre** fenêtre PowerShell, depuis le même dossier :

```powershell
$env:GT06_SIM_HOST = "127.0.0.1"
$env:GT06_SIM_PORT = "5024"
$env:GT06_SIM_IMEI = "864180070000001"
node scripts/traccar-lab/simulator-gt06.mjs --count=3
```

Le simulateur doit afficher un ACK de connexion valide et l'envoi de trois positions. Le serveur doit afficher une connexion autorisée et trois positions synthétiques décodées. **Par défaut, ce parcours n'écrit rien dans Supabase.** Arrêter le serveur par `Ctrl+C`.

## Écriture de test, sur activation explicite uniquement

La fonction `public.persist_gt06_test_packet` et la table privée de reçus existent déjà sur le projet Supabase Matelematics vérifié le 26 septembre 2026. Leur définition de référence est dans `server/gt06/gt06-test-atomic.sql` : **ne pas la réexécuter automatiquement**. Seul l'IMEI synthétique `864180070000001`, attaché à `Renault Express Test`, peut passer les contrôles du code et de la fonction SQL. Cette écriture vise la base Supabase du projet, pas la base Postgres Docker locale.

Depuis le dossier du projet, arrêter d'abord tout autre serveur sur le port 5024. Vérifier que `.env.local` contient `SUPABASE_URL` et `SUPABASE_SECRET_KEY` côté serveur, sans afficher ni recopier la clé. Dans une fenêtre PowerShell :

```powershell
$env:GT06_ENABLE_TEST_WRITES = "I_ACCEPT_TEST_ONLY_WRITES"
npm run gt06:lab:write
```

Dans une seconde fenêtre, exécuter le simulateur ci-dessus. Le serveur doit indiquer `transaction synthétique : inserted` pour chaque nouvelle trame. Un renvoi **identique de la même trame** doit indiquer `duplicate` ou `legacy_duplicate`. Une nouvelle exécution du simulateur produit des horodatages nouveaux et donc de nouvelles positions : ce n'est pas un test de doublon. Après essai, arrêter le serveur et retirer l'activation dans cette fenêtre avec `Remove-Item Env:GT06_ENABLE_TEST_WRITES`.

Ne jamais fournir l'IMEI d'un client réel ni exposer le port TCP ou la clé de serveur à un navigateur. Le mode écriture n'est pas un service d'ingestion prêt pour la production ; il ne gère pas encore les reprises persistantes ni les charges importantes.

Le port 5024 est lié uniquement à `127.0.0.1` ; le port 5023 reste au Traccar local. Ne pas réutiliser l'IMEI d'un véhicule réel ni publier le port du laboratoire sur Internet.

## Vérifications encore nécessaires

1. Comparer les coordonnées, dates et vitesses du décodeur natif avec Traccar à partir des mêmes trames synthétiques.
2. Vérifier sur un jeu de test la transaction atomique installée (écriture nouvelle, répétition exacte, refus des autres IMEI), puis contrôler l'affichage de ces seules positions synthétiques dans le tableau de bord.
3. Tester déconnexion, reconnexion, trames malformées et appareil non autorisé dans la chaîne complète.
4. Valider un boîtier Accurate physique et son firmware exact. Le simulateur GT06 ne certifie aucun appareil réel ni CAN, carburant, DTC ou caméra.

Résultats déjà observés avant cette intégration : l'utilisateur a vu trois positions GT06 synthétiques enregistrées dans Traccar local. La fiche GT06 affichée dans le SaaS concernait des données synthétiques historiques. Ces deux observations ne prouvent pas encore le trajet natif GT06 → base Matelematics.

## Résultats vérifiés le 27 septembre 2026

- Simulateur local : ACK GT06 valide, trois trames GPS décodées par Matelematics.
- Test TCP sur boucle locale : login fragmenté reconstitué, position à CRC erroné rejetée, position valide suivante acceptée, puis reconnexion avec un nouveau login et une nouvelle position ; `GT06 self-test PASS`.
- Persistance test : trois nouvelles positions, trois télémétries GT06 et trois reçus liés à `Renault Express Test` (`Test-001`, entreprise Matelematics), entre 2026-09-26 22:55:45 UTC et 22:55:55 UTC.
- Relecture *exactement identique* d'une trame déjà stockée via la fonction atomique : `duplicate` ; les compteurs restent 3/3/3.
- IMEI non autorisé (`864180070000002`) : refus `Invalid synthetic GT06 packet` ; compteurs toujours 3/3/3.
- Serveur Next local Webpack : route véhicule et API `/live` HTTP 200 ; le code de l'API trie les positions par `recorded_at` décroissant. L'affichage visuel de la nouvelle position dans le navigateur reste à confirmer.
- Ce résultat concerne uniquement l'IMEI de simulation. Pas de validation d'un boîtier Accurate physique ni de charge prolongée.
