# Prosperity, version web solo

Adaptation française jouable de Prosperity (Reiner Knizia et Sebastian Bleasdale), réalisée à partir de `bb-prosperity-rulebook.pdf`. Les règles proviennent du document fourni ; les 60 technologies et les 6 bâtiments de départ disposent désormais d'illustrations isométriques originales générées pour cette adaptation.

## Démarrer

Node.js 22 recommandé.

```sh
npm install --legacy-peer-deps
npm run dev
```

Ouvrir l'adresse affichée par Vite, généralement http://127.0.0.1:5173. Pour une version compilée :

```sh
npm run build
npm run preview
```

Le dossier `dist` peut être servi par un hébergement statique. Aucun serveur de jeu, compte ou service distant n'est nécessaire ; polices, illustrations et règles sont incluses dans le projet.

## Jeu

- 24 technologies disponibles au départ, puis 36 révélations en sept décennies.
- Actions directement sur la trésorerie, les jetons de pollution et chacune des deux pistes de recherche.
- Deux actions préparées par tour : aperçu cumulé, variations chiffrées, annulation de la dernière action ou de toute la préparation, puis validation explicite.
- Placement par couleur, remplacement des effets, ouverture des deux cases inférieures par le transport de gauche.
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

- React, TypeScript et Vite pour l'interface.
- [boardgame.io](https://github.com/boardgameio/boardgame.io) pour l'exécution des coups, l'état de partie et le mélange reproductible. La préparation est une liste d'actions rejouée par les mêmes règles pour l'aperçu et la validation atomique.
- `src/game/catalog.ts` : les 60 tuiles, les bâtiments de départ et la validation du catalogue.
- `src/game/engine.ts` : règles et coups indépendants de l'interface.
- `src/GameBoard.tsx` : plateau, marché, actions et décomptes.
- `src/Editor.tsx` : atelier de tuiles.
- `src/artwork.ts` : correspondance des 66 illustrations, cadrages et anciennes références.
- `src/storage.ts` : sauvegardes locales et exports.
- `scripts/extract_assets.py` : ancien outil d'extraction des scans, conservé pour référence ; il ne produit pas les illustrations utilisées par l'interface.

## Illustrations

Les six atlas PNG de `public/assets/tiles/` ont été créés avec l'outil intégré `image_gen`. Direction artistique : miniatures architecturales isométriques, volumes mats, silhouettes lisibles, végétation géométrique, verre turquoise et accents de brique. Les prompts finaux sont conservés dans `public/assets/tiles/prompts.json`.

Chaque technologie possède son propre cadrage, avec au moins 362 pixels par case source. L'affichage utilise les atlas natifs sans agrandir les anciens scans. Les symboles et valeurs restent des éléments d'interface nets, indépendants du dessin. Les atlas sont partagés en cache entre les tuiles ; aucun service distant n'est nécessaire pour jouer.

Les anciens chemins d'illustrations sont reconnus à l'import et dans les sauvegardes, puis remplacés par les nouvelles références. Les valeurs, actions préparées, illustrations personnelles et réglages des symboles sont préservés. Les anciens JPG restent archivés dans `public/assets`, mais ne sont plus chargés par le plateau, le marché ou la bibliothèque.

Le mode multijoueur reste à implémenter. Le moteur repose sur les coups de boardgame.io, mais l'état actuel comporte une seule nation. L'extension demandera des états par joueur, un ordre de résolution des décomptes, le classement de recherche final et un transport réseau.

L'audit npm signale des vulnérabilités dans des dépendances transitives de boardgame.io (notamment sa pile serveur et son outillage Svelte), ainsi que dans l'outillage de test Vitest. Le jeu utilise uniquement le client local, sans serveur multijoueur, sans rendu Svelte et avec le débogueur désactivé. La mise à niveau de ces dépendances doit faire partie du travail avant l'introduction d'un serveur public ; une rétrogradation forcée de boardgame.io n'a pas été appliquée.

## Vérifications

```sh
npm test
npm run build
npm run test:e2e
```

Les tests du moteur couvrent les achats invalides, les remplacements, les accès, les prix, les décomptes, les limites, le score final et une partie complète avec rechargements. Les tests Playwright utilisent Chrome installé localement et le serveur Vite sur le port 5173. Ils vérifient une partie complète, les sauvegardes, l'atelier et le mobile. Les captures sont écrites dans `.artifacts`.

## Crédits

Jeu : Reiner Knizia et Sebastian Bleasdale. Illustrations du jeu original : Arnaud Demaegd et Neriac. Éditeur : Ystari Games, 2013. Nouvelles illustrations de cette adaptation : générées avec `image_gen`. Adaptation non officielle ; le livret et les anciens scans fournis restent la propriété de leurs ayants droit.
