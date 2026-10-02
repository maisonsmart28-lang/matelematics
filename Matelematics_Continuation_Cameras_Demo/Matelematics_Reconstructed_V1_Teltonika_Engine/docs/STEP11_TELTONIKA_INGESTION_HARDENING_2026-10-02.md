# Ingestion Teltonika — contrôles locaux du 2 octobre 2026

Le gestionnaire TCP traite une seule séquence de décodage/persistance à la fois par connexion. Pendant l'attente d'une persistance, la socket est mise en pause ; un événement data déjà en attente est ajouté au tampon borné et ne relance pas un second traitement. La limite 2 Mio est contrôlée avant concaténation. Chaque ACK AVL attend le succès de onMessage ; après fermeture de la socket, aucun ACK tardif n'est émis.

Le délai d'inactivité est de 300 000 ms par défaut. TELTONIKA_IDLE_TIMEOUT_MS accepte un entier de 1 000 à 86 400 000 ms. Une valeur invalide bloque le démarrage. Adapter ce délai à la fréquence réelle du traceur et aux heartbeats ; une connexion inactive est fermée et le traceur devra se reconnecter. Ce délai ne limite pas une authentification maintenue active par un flux régulier et ne borne pas une panne de persistance indépendamment de la socket.

## Vérification

server/teltonika/protocol.selftest.ts utilise le vrai parser et des trames synthétiques CRC valides avec sockets simulées. Exécution isolée sous Node 24 : PASS pour login fragmenté, deux événements data avec persistences bloquées, concurrence maximale 1 et ACK après chaque persistance, erreur de persistance sans ACK, fermeture pendant persistance sans ACK tardif, tampon excessif et callback d'inactivité configuré.

Le test ne mesure pas un timeout en temps réel et ne teste ni DB, ni connexion réseau physique, ni reconnexion matérielle, ni débit de production. Commande sur le projet : npx tsx server/teltonika/protocol.selftest.ts. Build complet et tests existants après récupération restent à exécuter sur le poste opérateur.

## Journaux et limites

La correction précédente masque les IMEI (quatre derniers chiffres), supprime coordonnées et réponses brutes des commandes des journaux Teltonika, et masque les erreurs fournisseur GT06. L'opérateur a confirmé audit secrets, self-test GT06 et build TypeScript PASS après cette correction.

Restent ouverts : authentification cryptographique des traceurs, deadline d'authentification, plafond global/par IP des connexions, débit et backpressure globale, sérialisation entre deux connexions du même IMEI, contrôle de l'API commande locale, atomicité/idempotence DB du chemin Teltonika, origine des données sur poll Traccar, erreurs/logs des autres modules. ACK après onMessage n'est pas une preuve d'atomicité de toutes les écritures DB. Aucune commande n'a été envoyée à un boîtier ; aucune mutation distante ni déploiement n'a été effectué.

## Échéance Auth et plafond de connexions

TELTONIKA_AUTH_TIMEOUT_MS : 30 000 ms par défaut, entier 1 000–300 000. Le timer est absolu : les fragments entrants ne le prolongent pas. Il est annulé après IMEI accepté ou fermeture. L'authentification demeure fondée sur le registre IMEI, sans preuve cryptographique.

TELTONIKA_MAX_CONNECTIONS : 4 096 par défaut, entier 1–100 000.
TELTONIKA_MAX_CONNECTIONS_PER_IP : 64 par défaut, entier 1–plafond global.
Une configuration invalide bloque le démarrage. Une connexion excédentaire ou sans adresse distante est fermée avant installation du parser. Chaque connexion admise libère son compteur à close ; release est idempotent et les entrées IP vides sont supprimées.

Ces plafonds sont propres au processus Node, pas distribués. Les IP sont celles de socket.remoteAddress ; NAT opérateur ou proxy peuvent regrouper de nombreux traceurs sous la même adresse. Adapter la limite par IP à l'infrastructure avant exposition. Ces protections ne prouvent pas une capacité de 4 096 traceurs actifs.

Self-tests isolés PASS : échéance réelle de 1 s malgré fragments toutes les 100 ms, annulation après acceptation ; limite par IP, limite globale, adresse manquante, libération répétée, nettoyage des compteurs et configuration invalide. Les sockets sont simulées ; pas de test réseau sous charge. Le test server/teltonika/connection-limits.selftest.ts complète protocol.selftest.ts.

L'opérateur a aussi confirmé après la première sérialisation : protocole/ACK PASS, Codec 8/8E PASS, 22 contrôles tenant PASS et build TypeScript/47 pages PASS. Build et rejeu après ajout des plafonds restent à exécuter. Atomicité/idempotence de persistance, concurrence entre connexions du même IMEI, réseau distant et charge réelle restent ouverts.
