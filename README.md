# Prosperity, version web solo et multijoueur

Adaptation française jouable de Prosperity (Reiner Knizia et Sebastian Bleasdale), réalisée à partir de `bb-prosperity-rulebook.pdf`. Les règles proviennent du document fourni ; les 60 technologies et les 6 bâtiments de départ disposent désormais d'illustrations isométriques originales générées pour cette adaptation.

## Démarrer

Node.js 22 recommandé (Next.js requiert au minimum Node.js 20.9).

```sh
npm install
npm run dev
```

Ouvrir http://127.0.0.1:3000. Pour une version de production locale :

```sh
npm run build
npm start
```

Le frontend utilise Next.js App Router. Polices, illustrations et règles sont incluses dans le projet.

## Jeu

- 24 technologies disponibles au départ, puis 36 révélations en sept décennies.
- Trois vues : Ma nation, Recherche et Comparaison. Navigation générale accessible par le bouton de menu ; défilement vertical naturel.
- Technologies disposées en six niveaux, du niveau 6 au niveau 1, avec deux cartes maximum par ligne et par domaine. Chaque piste affiche ses 27 sous-étapes et son jeton sur la case exacte, indépendamment de la hauteur des cartes.
- Révélation, décompte puis actions : une progression visible et une commande principale en bas de la table. Les quatre actions apparaissent pendant leur phase, avec deux jetons numérotés puis cochés ; une même action peut être répétée.
- Deux actions préparées par tour : aperçu cumulé, variations chiffrées, annulation de la dernière action ou de toute la préparation, puis validation explicite.
- Placement par couleur, remplacement des effets, ouverture des deux cases inférieures par le transport de gauche.
- Chaque case ouvre une fenêtre : bâtiment installé, catégorie libre ou transport requis. Depuis D1/D2, la recherche cible C1. La confirmation présente l'emplacement, le prix, la tuile remplacée, les effets retirés/ajoutés et le budget avant/après. Les technologies hors budget restent inspectables. Fermeture par croix, Échap ou arrière-plan, focus clavier contenu et rendu au déclencheur.
- Marché annoté : achat disponible, catégorie incompatible, accès fermé, fonds insuffisants ou phase d’actions requise. Les possibilités d'achat et leurs aperçus utilisent le moteur existant.
- Suivi compact des décomptes révélés dans la décennie, dont les deux prospérités de 2030. Le suivi utilise le journal public et s’adapte au catalogue choisi.
- Piste de pollution à disques interactifs, repères des PP même couverts, avertissement à 15 et blocage explicite à partir de 16 pollutions, y compris au-delà de la piste. Cliquer un disque retire toujours la dernière pollution occupée.
- Aide, journal et détails des décomptes accessibles à la demande. Comparaison des nations réelles en réseau ; bilan de la seule nation en solo.
- Décomptes énergie, écologie, capital, recherche et prospérité, choix du paiement des déficits, allocation de recherche et pollution sans plafond.
- Décompte final dans l'ordre du livret, journal, annulation de la dernière action, sauvegarde automatique et records locaux.
- Interface adaptée aux petits écrans, navigation clavier, règles en français et accès au PDF original.

Le livret n'inclut pas de mode solo. Cette adaptation est un défi de score où le joueur réalise les 36 tours. Seul le classement comparatif final de recherche est supprimé : pas de bonus automatique de 3 ou 1 point. La recherche finale avance bien les deux pistes. Seul le plateau argent illustré dans le PDF est proposé. Ces choix sont exposés dans les règles intégrées.

## Atelier

Modification des valeurs et caractéristiques, création, duplication, restauration des originales et suppression des créations. Illustrations du catalogue ou import PNG/JPEG/WebP (2 Mo maximum). Import/export JSON avec validation des valeurs, des identifiants et des images.

Les cinq symboles de ressources sont composés directement sur l'illustration selon les valeurs choisies, y compris les signes négatifs. Leur affichage peut être activé ou masqué. Aucune valeur n'est imprimée dans les nouvelles images : modifier une tuile met donc toujours ses symboles à jour. L'aperçu, le marché et le plateau partagent ce même rendu ; l'export JSON conserve l'image, les valeurs et ce réglage.

Cocher « Utiliser mon catalogue personnalisé » au lancement d'une partie pour jouer ses créations. Les tuiles datées ajoutées augmentent le nombre de tours. La partie conserve une copie du catalogue choisi au départ. Les records personnalisés sont identifiés séparément du meilleur score classique. Une graine identique et un catalogue identique reproduisent le mélange.

Les données sont stockées dans `localStorage` sur l'origine du navigateur. L'export du catalogue permet de conserver les créations hors du navigateur. La préparation et ses possibilités d'annulation survivent au rechargement. Après validation, le tour est définitif et la prochaine tuile peut être révélée. Les anciennes sauvegardes sont reprises sans perdre leurs actions déjà jouées.

## Architecture

- Next.js 16 App Router, React et TypeScript pour l'interface. L'application de jeu existante reste derrière une frontière client sans SSR.
- [boardgame.io](https://github.com/boardgameio/boardgame.io) pour l'exécution des coups, l'état de partie et le mélange reproductible. La préparation est une liste d'actions rejouée par les mêmes règles pour l'aperçu et la validation atomique.
- `src/game/catalog.ts` : les 60 tuiles, les bâtiments de départ et la validation du catalogue.
- `src/game/engine.ts` : règles et coups indépendants de l'interface.
- `src/game/presentation.ts` : sélecteurs purs de prix, disponibilité, aperçu, effets d’action et suivi des révélations, partagés entre solo et multijoueur.
- `src/GameBoard.tsx` : plateau, marché, actions et décomptes.
- `src/game-ui/` : plateau de recherche, territoire, pollution, détails d’achat et séquence de tour. Les aperçus utilisent le moteur existant ; aucune règle n’est recalculée dans la présentation.
- `src/table.css` : thème et composition des trois vues, styles consolidés, responsive et réduction des animations.
- `src/game-ui/sound.ts` : ancien raccordement facultatif de sons locaux, conservé sans bouton dans la nouvelle interface ; aucun asset sonore n'est installé.
- `src/Editor.tsx` : atelier de tuiles.
- `src/artwork.ts` : correspondance des 66 illustrations, cadrages et anciennes références.
- `src/storage.ts` : sauvegardes locales et exports.
- `scripts/extract_assets.py` : ancien outil d'extraction des scans, conservé pour référence ; il ne produit pas les illustrations utilisées par l'interface.

## Illustrations

Les six atlas PNG de `public/assets/tiles/` ont été créés avec l'outil intégré `image_gen`. Direction artistique : miniatures architecturales isométriques, volumes mats, silhouettes lisibles, végétation géométrique, verre turquoise et accents de brique. Les prompts finaux sont conservés dans `public/assets/tiles/prompts.json`.

Chaque technologie possède son propre cadrage, avec au moins 362 pixels par case source. L'affichage utilise les atlas natifs sans agrandir les anciens scans. Les symboles et valeurs restent des éléments d'interface nets, indépendants du dessin. Les atlas sont partagés en cache entre les tuiles ; aucun service distant n'est nécessaire pour jouer.

Les anciens chemins d'illustrations sont reconnus à l'import et dans les sauvegardes, puis remplacés par les nouvelles références. Les valeurs, actions préparées, illustrations personnelles et réglages des symboles sont préservés. Les anciens JPG restent archivés dans `public/assets`, mais ne sont plus chargés par le plateau, le marché ou la bibliothèque.

## Multijoueur réseau

```sh
npm run dev:multi
```

Ouvrir `http://127.0.0.1:3000/multiplayer`, créer une partie et partager le lien. Deux à quatre joueurs rejoignent, se déclarent prêts, puis le créateur lance. Pour tester plusieurs joueurs sur une machine, utiliser des profils de navigateur distincts. Le menu du solo propose également « Jouer en multijoueur ».

Le serveur Node (`npm run server`, port 8000) reste autoritaire. Chacun possède sa nation ; les décomptes s’appliquent dans l’ordre de la table et le classement final rétablit les bonus de recherche multijoueurs. Les territoires sont consultables et les marqueurs de recherche numérotés identifient tous les joueurs.

Les vues et fenêtres de détail sont communes au solo et au réseau. Le joueur actif, la nation consultée et les résultats publics du décompte sont distingués. Seule la nation devant résoudre un choix dispose du bouton de validation ; les autres peuvent examiner la table. Les prix et aperçus suivent la nation consultée. Le suivi de décennie ne lit jamais la pioche cachée.

Les deux actions sont préparées et prévisualisées exclusivement dans le navigateur, avec annulation et sauvegarde locale. La validation envoie un seul batch, rejoué atomiquement par le moteur serveur. Les autres joueurs ne reçoivent les actions qu’après validation et sauvegarde. Les doubles envois sont reconnus sans rejouer le tour.

Une reconnexion retrouve la session invitée et un snapshot complet. La préparation n’est restaurée que si joueur, tour et révision correspondent encore. Le code partagé seul ne permet pas d’usurper un siège. Fermer le navigateur du créateur ne coupe pas une partie lancée.

`server/app.ts` compose les adaptateurs de stockage et d’identité avec le transport boardgame.io. Le stockage de développement est en mémoire : **redémarrer le serveur efface les parties**. Pour utiliser une base, implémenter `MatchStore`, l’injecter dans ce point de composition et configurer ses paramètres. Aucune règle de Prosperity n’a à être modifiée. Aucun fournisseur cloud n’est imposé.

Les fichiers principaux sont `src/multiplayer/game.ts` (orchestration), `draft.ts` (préparation privée), `NetworkGame.tsx` (plateau distant), et `server/` (lobby, identité, stockage et intégration du transport natif). [La documentation multijoueur](docs/multiplayer.md) décrit les protocoles, le filtrage des secrets, la reconnexion, les points d’extension et les variables d’environnement pour un déploiement futur.

Les dépendances ont reçu des mises à jour ciblées, sans remplacer boardgame.io. `npm audit` ne signale aucune vulnérabilité avec le verrou actuel. Le détail et les limites de déploiement figurent dans la documentation.

## Vérifications

```sh
npm test
npm run build
npm run test:e2e
```

Les tests du moteur couvrent les achats invalides, les remplacements, les accès, les prix, les décomptes, les limites, le score final et une partie complète avec rechargements. Les tests Playwright utilisent Chrome installé localement et démarrent Next.js sur le port 3000 ainsi que le serveur de jeu sur le port 8000 si nécessaire. Ils vérifient une partie complète, les sauvegardes, l'atelier et le mobile, ainsi que les pions, les remplacements, les accès et la pollution critique. Les quatre formats desktop (1366×768, 1440×900, 1920×1080, 2560×1440) sont contrôlés avec les 60 technologies révélées. Les captures sont écrites dans `.artifacts`. `node scripts/check_table.mjs` produit aussi des vues du plateau et d’un achat avec remplacement.

Le déploiement coordonné du frontend et du serveur WebSocket sur Vercel est décrit dans [docs/deployment-vercel.md](docs/deployment-vercel.md).

Les tests multijoueurs couvrent aussi les cinq décomptes par nation, les choix obligatoires, les batches dépendants et atomiques, les doublons, les préparations obsolètes, les secrets des snapshots et de vraies connexions réseau. Un scénario Playwright ouvre trois contextes Chrome indépendants et vérifie création, préparation privée, annulation, commits, rechargement, coupure réseau et affichage mobile.

Les scénarios UX vérifient aussi les actions répétées, les prix et phases, le double décompte de 2030 et l’avertissement avant pollution critique. La campagne `tests/guide.pw.ts` vérifie les groupes de 0/1/2/3/5 cartes, les frontières des pistes, le contexte de placement, la double confirmation, le focus et les largeurs 360/390/768/1366/1920. Elle produit les captures et leurs preuves d'état dans `.artifacts/guide/` ; C22/C23 proviennent du test réseau à trois navigateurs. Voir le [compte rendu visuel](docs/visual-refresh.md).

## Crédits

Jeu : Reiner Knizia et Sebastian Bleasdale. Illustrations du jeu original : Arnaud Demaegd et Neriac. Éditeur : Ystari Games, 2013. Nouvelles illustrations de cette adaptation : générées avec `image_gen`. Adaptation non officielle ; le livret et les anciens scans fournis restent la propriété de leurs ayants droit.
