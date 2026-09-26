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

Le simulateur doit afficher un ACK de connexion valide et l'envoi de trois positions. Le serveur doit afficher une connexion autorisée et trois positions synthétiques décodées. Aucun de ces processus ne contacte Supabase ni ne met à jour l'état d'un véhicule dans le SaaS. Arrêter le serveur par `Ctrl+C`.

Le port 5024 est lié uniquement à `127.0.0.1` ; le port 5023 reste au Traccar local. Ne pas réutiliser l'IMEI d'un véhicule réel ni publier le port du laboratoire sur Internet.

## Vérifications encore nécessaires

1. Comparer les coordonnées, dates et vitesses du décodeur natif avec Traccar à partir des mêmes trames synthétiques.
2. Relier les événements décodés à une entreprise et un véhicule de test, avec transaction atomique, anti-doublon, limites de reprise et refus entre entreprises. Examiner la fonction SQL de test de la branche GT06 avant toute exécution sur Supabase. Ne pas importer sa branche Git en bloc.
3. Tester déconnexion, reconnexion, trames malformées et appareil non autorisé dans la chaîne complète.
4. Valider un boîtier Accurate physique et son firmware exact. Le simulateur GT06 ne certifie aucun appareil réel ni CAN, carburant, DTC ou caméra.

Résultats déjà observés avant cette intégration : l'utilisateur a vu trois positions GT06 synthétiques enregistrées dans Traccar local. La fiche GT06 affichée dans le SaaS concernait des données synthétiques historiques. Ces deux observations ne prouvent pas encore le trajet natif GT06 → base Matelematics.
