# Déploiement Vercel

Le dépôt contient deux runtimes coordonnés, sans déplacer la logique du jeu :

- le frontend Next.js 16 (`src/app/`) ;
- le serveur Node boardgame.io / Socket.IO (`server.ts`, implémentation dans `server/`).

## Services

Créer deux services Vercel rattachés au même dépôt si Vercel Services est disponible :

1. **web** : framework Next.js, commande de build `npm run build` ;
2. **game-server** : runtime Node, entrée `server.ts`, commande locale `npm run server`.

Le frontend ne doit pas absorber Socket.IO dans un Route Handler Next.js. Le serveur racine suit la convention de détection Node de Vercel. Les WebSockets et Socket.IO sont pris en charge par la bêta publique Vercel/Fluid Compute ; vérifier les limites et la disponibilité sur le compte avant la mise en production.

## Variables

Service **web** :

```env
NEXT_PUBLIC_GAME_SERVER_URL=https://game.example.com
```

Service **game-server** :

```env
FRONTEND_ORIGIN=https://prosperity.example.com
```

Vercel fournit `PORT` au serveur. `HOST` peut être fixé à `0.0.0.0` si l’environnement l’exige. Les origines de production doivent être exactes ; ne pas utiliser `*`.

## Validation après déploiement

1. ouvrir `/`, `/multiplayer` et directement `/game/<code>` ;
2. créer une table avec un premier navigateur puis la rejoindre avec un second profil ;
3. valider un tour et vérifier la convergence des deux clients ;
4. couper puis rétablir le réseau d’un client et vérifier sa resynchronisation ;
5. contrôler les erreurs navigateur, serveur et les refus CORS.

## Limitation importante : persistance

`InMemoryMatchStore` reste volontairement en mémoire. Un redémarrage ou remplacement d’instance efface les salons et les parties. La reconnexion Socket.IO fonctionne tant que l’instance et son état existent, mais ne constitue pas une persistance durable. Avant un usage où les parties doivent survivre aux reprises d’instance, implémenter `MatchStore` avec un stockage partagé et coordonner aussi la file de commandes et la diffusion entre instances.

Le déploiement distant et le test WebSocket sur un domaine Vercel nécessitent un compte/projet Vercel ; ils ne sont pas exécutables par la seule validation locale.
