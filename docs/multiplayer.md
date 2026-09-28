# Multijoueur Prosperity

## Lancer une table locale

Node.js 22.13 ou ultérieur et les dépendances du projet suffisent ; aucun compte externe n’est nécessaire.

```sh
npm install --legacy-peer-deps
npm run dev:multi
```

Ouvrir `http://127.0.0.1:3000/multiplayer`, créer une partie et partager son lien `/game/<code>`. Utiliser des profils de navigateur distincts pour simuler plusieurs personnes : les onglets du même profil partagent la même session invitée. Deux à quatre personnes prennent place, se déclarent prêtes, puis le créateur lance la partie. Le premier joueur est tiré au sort par le moteur. Le solo reste disponible à `/` et conserve sa sauvegarde séparée.

Les deux processus peuvent aussi être lancés séparément :

```sh
npm run server
npm run dev
```

Le serveur écoute par défaut sur le port `8000`. Pour jouer entre machines d’un réseau, configurer `HOST=0.0.0.0`, `FRONTEND_ORIGIN` avec l’adresse exacte du frontend et `NEXT_PUBLIC_GAME_SERVER_URL` avec l’adresse joignable du serveur. Les variables se définissent selon le shell utilisé. Ne pas partager un lien `localhost` à une autre machine.

## État, moteur et présentation

`src/multiplayer/types.ts` distingue explicitement :

| Donnée | Propriétaire | Contenu |
| --- | --- | --- |
| `AuthoritativeGameState.shared` | Serveur | Catalogue figé, marché, révélation, phase, décompte et journal public |
| `AuthoritativeGameState.players` | Serveur | Territoire, argent, pollution, recherche, prospérité et bilan de chaque nation |
| `AuthoritativeGameState.secret` | Serveur uniquement | Ordre futur du deck et reçus d’idempotence |
| `ctx` et `_stateID` | boardgame.io | Ordre des sièges, joueur actif, identité du tour et révision du snapshot |
| `PreparedTurn` | Navigateur du joueur | Match, siège, tour, révision de départ et zéro à deux intentions |
| Métadonnées de présence | Transport | Connexions ouvertes par siège, indépendamment de l’appartenance au match |
| Session invitée | Navigateur / adaptateur d’identité | Secret aléatoire côté navigateur ; empreinte de vérification côté serveur |

`src/multiplayer/game.ts` orchestre les nations avec boardgame.io. Il projette une nation vers le modèle existant grâce à `nationView`, puis utilise `src/game/engine.ts` pour les prix, placements, aperçus, effets et décisions. Les règles communes ne sont pas dupliquées dans React. Les quelques règles propres au multijoueur sont l’ordre des décomptes, la rotation des joueurs et le classement de recherche final.

Le deck est mélangé par le plugin aléatoire natif, avec une graine privée. `createMultiplayerGame(seed)` permet les scénarios reproductibles dans les tests. Le serveur public de la partie ne fournit pas cette graine aux clients. Le catalogue, normalisé et validé sur le serveur, porte une empreinte SHA-256 stable. Il ne peut plus être modifié après création du salon. Les valeurs d’une tuile ne font jamais partie d’une commande d’achat.

À chaque révélation, les cinq décomptes possibles suivent les mêmes règles que le solo. La file de résolution commence au joueur actif puis suit l’ordre de la table. Elle s’arrête sur chaque choix d’énergie ou de recherche et attend son propriétaire. Ces choix ne consomment aucune des deux actions. Le dernier commit lance le décompte final, dans l’ordre du livret. Le classement de recherche rétablit 3/1 points, 2 points pour chaque premier ex æquo et aucun pour les deuxièmes ex æquo ; la pollution critique bloque les gains de prospérité. Le classement final compare prospérité puis trésorerie restante.

## Préparer, annuler, valider

1. Le navigateur reçoit un snapshot autoritaire de boardgame.io.
2. `draft.ts` crée un `PreparedTurn` lié au match, au siège, à `ctx.turn` et à `_stateID`.
3. Chaque intention est ajoutée localement. `previewState` rejoue A puis B sur une copie : B bénéficie donc de la recherche, de l’argent ou du placement produit par A.
4. L’annulation retire B, ou toute la liste. Aucune de ces interactions, ni aucun survol, ne produit de move réseau.
5. « Terminer le tour » envoie un unique move natif `commitPreparedTurn` avec les deux intentions et un `commandId` aléatoire. Le move a `client: false` : aucun commit optimiste officiel.
6. Dans la file native du match, le serveur authentifie le siège, vérifie les champs, le match, le tour, `_stateID`, la phase, les décisions et les deux actions. Le moteur rejoue le batch avant toute affectation à l’état officiel.
7. Si A ou B est illégale, aucun résultat partiel n’est enregistré. Le client reçoit un code stable et un nouveau snapshot.
8. Si le batch est légal, la nation et le marché sont remplacés ensemble, le reçu du `commandId` est conservé avec l’état et boardgame.io passe au joueur suivant. Un second paquet identique reçoit `DUPLICATE_COMMAND` sans autre transition ; réutiliser l’identifiant avec un autre contenu est refusé.
9. Après la sauvegarde, le transport diffuse la mise à jour native à tous les clients, y compris son auteur. `lastCommit` fournit les deux intentions publiques, leur description et les révisions pour la présentation séquentielle. Le journal contient seulement les actions validées.

Le plateau affiche les territoires consultables, les marqueurs numérotés de toutes les nations, la présence et le joueur actif. Un bandeau présente les deux actions validées dans l’ordre, avec prise en compte de la réduction des animations. Ces animations n’interviennent jamais dans la validation métier. Aucun undo après commit n’est exposé ou accepté par le serveur.

## Reconnexion et réponses incertaines

La session reste dans `prosperity.session.v1.<match>` sur l’origine du navigateur. Fermer un onglet ou perdre le réseau ne retire pas son siège. Le créateur possède uniquement le droit de lancer le salon ; fermer son navigateur n’arrête pas une partie lancée.

Socket.IO reconnecte le client et boardgame.io fournit un snapshot complet. Les commandes restent désactivées jusqu’à cette synchronisation. La préparation reste dans `prosperity.draft.v1.<match>.<player>` ; elle est restaurée uniquement si le match, le joueur actif, la phase d’action, `ctx.turn` et `_stateID` correspondent exactement et si le moteur peut encore la rejouer. Sinon elle est supprimée. Une vieille préparation n’est jamais rebasée ni envoyée automatiquement.

La commande en attente est conservée séparément pour réutiliser le même `commandId` lors d’une nouvelle tentative explicite. Si la réponse a été perdue mais que le serveur avait accepté, le snapshot avancé remplace le draft ; un renvoi identique retrouve son reçu. Après huit secondes sans réponse, le client demande à nouveau le snapshot et permet une nouvelle tentative. Le navigateur ne présume jamais qu’un timeout signifie un échec de la transaction.

Une personne hors ligne peut retarder le jeu si son tour ou une décision de décompte exige son intervention. Aucune action automatique, exclusion ou substitution par un bot n’est introduite.

## Ports d’infrastructure et composition

Le point de composition unique est `server/app.ts`, fonction `createMultiplayerServer({ config, store, identity, audit })`. L’entrée `server/index.ts` choisit les adaptateurs locaux.

### Persistance

`server/store.ts` définit `MatchStore`, extension du véritable port `StorageAPI.Async` de boardgame.io, avec `getLobby` / `saveLobby`. `InMemoryMatchStore` conserve snapshots, métadonnées, catalogue, vérificateurs de session et reçus ; il copie les valeurs aux frontières et compare les révisions lors des écritures. Il est volontairement limité au processus de développement : **redémarrer le serveur efface les parties et les salons**.

Pour brancher une base de données :

1. Implémenter `MatchStore` : `connect`, `createMatch`, `fetch`, `setState`, `setMetadata`, `wipe`, `listMatches`, `getLobby` et `saveLobby`.
2. Sauvegarder atomiquement l’état, le reçu d’idempotence et les entrées de journal ; vérifier que la révision précédente vaut `state._stateID - 1`. `saveLobby` doit comparer `expectedRevision` et garantir l’unicité du code. Traiter lancement du match et changement d’état du salon transactionnellement dans un adaptateur durable.
3. Conserver l’état initial **filtré** pour `fetch({ initialState: true })`, comme le fait l’adaptateur fourni. Dans boardgame.io 0.50.2, `playerView` filtre le snapshot courant mais pas `sync.initialState`. L’état initial exposé ne doit contenir ni `secret`, ni plugins RNG, ni undo/redo internes.
4. Injecter l’implémentation dans `createMultiplayerServer` et configurer ses paramètres dans le point de composition.
5. Exécuter les tests d’intégration avec cet adaptateur, notamment concurrence, reconnexion et absence de secrets.

**Aucune règle de Prosperity n’a à être modifiée pour changer de base.** Un stockage partagé seul ne suffit pas à distribuer le serveur sur plusieurs processus : la file de commandes et la diffusion doivent également être coordonnées. L’implémentation fournie vise un processus Node.

### Transport

Le client utilise `SocketIO()` de boardgame.io, et le serveur sa classe `SocketIO`, son `Master`, sa file par match et son pub/sub. `server/transport.ts` ajoute uniquement les contrôles d’entrée et l’accusé `commandResult` (version 1), absent pour les rejets natifs. Les messages `sync`, `update` et `matchData` restent ceux de boardgame.io.

Deux particularités de la version 0.50.2 sont prises en charge : les snapshots initiaux sont filtrés dans le stockage et les diffusions du `Master` sont retenues jusqu’à l’achèvement de la sauvegarde. Les synchronisations utilisent la même file que les commits. Une déconnexion ne détruit pas une file contenant encore du travail ; plusieurs onglets d’un même siège sont pris en compte pour la présence.

Pour changer de transport, remplacer l’adaptateur serveur au point de composition et la factory client dans `src/multiplayer/client.ts`. Les points d’extension réels sont `Master.transportAPI`, `getFilterPlayerView` et le transport client `Transport` de boardgame.io. Pour conserver Socket.IO mais changer sa distribution, utiliser ses options `socketAdapter` / `pubSub`, avec une stratégie de sérialisation des écritures adaptée. **Ne pas modifier `game/engine.ts`.** Les nouveaux accusés privés doivent rester privés et les diffusions doivent toujours suivre la sauvegarde.

### Identité

`IdentityService` dans `server/identity.ts` délivre un secret invité de 256 bits, stocke seulement son empreinte SHA-256 et vérifie celle-ci en temps constant. Le même adaptateur authentifie le lobby et les moves natifs via `authenticateCredentials`. Les métadonnées publiques n’exposent aucun vérificateur ou token.

Pour ajouter des comptes, remplacer cet adaptateur et l’échange de session dans le lobby, en associant l’identité du fournisseur au siège du match. Le moteur continue à utiliser un simple `playerId` (`0` à `3`), sans connaître OAuth, JWT ou un fournisseur concret. Le code de partie et le `playerId` ne remplacent jamais une preuve de session.

## Configuration et déploiement

| Variable | Valeur par défaut | Usage |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface d’écoute du serveur |
| `PORT` | `8000` | Port HTTP et Socket.IO |
| `FRONTEND_ORIGIN` | `http://127.0.0.1:3000` | Origine frontend exacte autorisée par CORS |
| `CLIENT_ORIGINS` | vide | Compatibilité facultative : plusieurs origines séparées par des virgules |
| `NEXT_PUBLIC_GAME_SERVER_URL` | `http://127.0.0.1:8000` en développement | URL publique utilisée par le navigateur pour l’API et Socket.IO |

En production : frontend Next.js et processus Node/Socket.IO séparés dans la même codebase. Définir `NEXT_PUBLIC_GAME_SERVER_URL` avant le build du frontend et `FRONTEND_ORIGIN` sur le serveur. Le serveur TypeScript se lance avec `npm run server`; son entrée racine `server.ts` est détectable comme serveur Node par Vercel. Voir [deployment-vercel.md](deployment-vercel.md).

Les corps du lobby sont limités à 4 Mio, les messages entrants Socket.IO à 16 Kio. Les catalogues et commandes sont validés au runtime. Les routes génériques `/games` de boardgame.io et ses événements arbitraires, undo, redo et chat sont bloqués. Le reverse proxy peut appliquer des limites de débit sans modifier le moteur. Les logs structurés contiennent match, siège, tour, identifiant de commande, types d’actions, révision et résultat ; jamais les secrets de session.

## Dépendances et vérifications

Les corrections ciblées conservent boardgame.io 0.50.2 : Socket.IO 4.8.3 pour toute la pile (y compris `koa-socket-2`), `@koa/cors` 5.0.0, `cookie` 0.7.2 pour `react-cookies`, Vitest 4.1.11. Le verrou actuel passe `npm audit` sans alerte. Aucun `npm audit fix --force` ni rétrogradation de boardgame.io.

L’application utilise React et désactive le débogueur boardgame.io (`debug: false`). L’audit doit être rejoué avant chaque exposition publique afin de tenir compte des avis publiés après ce verrou.

```sh
npm test
npm run build
npm run test:e2e
```

Les tests incluent les anciennes règles solo, les cinq décomptes sur plusieurs nations, les décisions séquentielles, le batch atomique, recherche puis achat, deux achats dépendants, annulation, idempotence, révisions obsolètes, classement final et une partie complète. Les tests serveur ouvrent de vraies connexions et examinent les snapshots, y compris l’état initial. Playwright démarre les services nécessaires et vérifie trois contextes Chrome indépendants, la préparation privée, le rechargement, les deux commits successifs, le retour après coupure réseau et l’affichage mobile.

Hors périmètre : fournisseur cloud, base durable concrète, comptes complets, changement d’appareil sans transfert de session, matchmaking, chat, classement social, bots et distribution sur plusieurs processus. Comme dans le solo existant, seul le territoire argent est proposé.

Références : livret fourni `bb-prosperity-rulebook.pdf`, pages 2, 4 et 6 ; [multijoueur boardgame.io](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/multiplayer.md). Les points d’intégration spécifiques sont vérifiés contre les sources installées de boardgame.io 0.50.2.
