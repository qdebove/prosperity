# Refonte visuelle — guide du 23 septembre 2026

## Audit initial

Lecture du README, du guide Markdown, du document HTML autonome, du manifeste et des 40 images de `implementation_guide/` (originaux, recadrages et parcours du prototype). Les illustrations isométriques déjà présentes dans le jeu sont conservées.

| Élément | Chemins du projet | État initial |
|---|---|---|
| Navigation | `src/App.tsx`, `src/GameBoard.tsx` | À corriger : une table unique, sans les trois vues demandées |
| État et commandes | `src/game/engine.ts`, `src/multiplayer/draft.ts`, `src/multiplayer/game.ts` | Moteur partagé, préparation annulable et validation atomique à préserver |
| Nation | `src/game/catalog.ts`, `src/game-ui/PlayerTerritory.tsx` | Grille conforme ; cases libres et bloquées non consultables |
| Recherche | `src/game-ui/ResearchBoard.tsx` | À corriger : cartes comprimées sur une ligne, positions calculées sur des hauteurs fixes |
| Pollution | `src/game-ui/PollutionTrack.tsx`, `src/game/engine.ts` | Retrait contigu conforme ; PP couverts invisibles |
| Achat | `src/game/presentation.ts`, `src/game-ui/TechnologyDetails.tsx` | Aperçu calculé par le moteur ; inspecteur permanent à remplacer |
| Sauvegarde | `src/storage.ts` | Version 1 et migration des anciennes sauvegardes à préserver |
| Assets | `src/artwork.ts`, `public/assets/tiles/`, `src/play.css` | 66 illustrations existantes et polices locales conservées |
| Thème | `src/table.css`, ancien `src/game-ui/table-ux.css` | Deux couches de styles à consolider |
| Contrôles | `npm test`, `npm run build`, `npm run test:e2e` | 89 tests unitaires passent avant modification ; esbuild nécessite une exécution hors sandbox Windows |

## Règles vérifiées

- Recherche : 27 positions indexées de 0 à 26, débuts de niveaux `[0, 2, 5, 9, 14, 20]`. Les libellés de niveau et de sous-case commencent à 1. Les jetons sont enfants du point correspondant ; la hauteur des cartes ne participe pas au calcul.
- Les technologies de niveau supérieur restent achetables avec le surcoût défini par `priceOf`. Aucun verrou de niveau artificiel n'a été ajouté.
- Les cases D1 et D2 dépendent de C1. La ceinture verte initiale appartient à la catégorie transport dans le catalogue mais est explicitement exclue par `unlocked`. Les placements légaux imposent la catégorie, ce qui empêche d'y poser une tuile d'un autre type.
- Les seuils PP sont 1, 6 et 11 ; le seuil critique est 16. Les constantes sont partagées avec le moteur, sans changer les règles d'attribution.
- La comparaison affiche les états réels du réseau, avec la préparation privée de son propre joueur. En solo, aucune nation ou évolution fictive n'est ajoutée.
- Aucun format de sauvegarde, identifiant de tuile, coût, décompte ou règle de fin de partie n'a changé.

## Implémentation

Trois vues conservent la partie et leur position de défilement. Le contexte « Pour C1 » appartient à l'interface. La nation ouvre une fenêtre pour chaque type de case ; une dépendance transporte le contexte vers son prérequis. Les détails d'achat présentent la case, le bâtiment retiré, les effets retirés/ajoutés, le budget avant/après et le coût en action. Une garde immédiate protège la confirmation contre les doubles pressions ; le moteur revalide l'achat.

Les pistes partagent les rangées des cartes et affichent toutes leurs sous-étapes. Deux cartes maximum par domaine et par ligne, une sur petit écran. Les disques occupés restent interactifs et les PP couverts ont un repère périphérique. Les fenêtres natives ont un titre accessible, un focus modal, une fermeture Échap/fond/croix et restaurent le focus.

Les styles du jeu sont regroupés dans `src/table.css` ; l'ancien fichier de surcharges est supprimé. Les couleurs `--table-*` sont des choix d'intégration cohérents avec les tokens existants, pas des couleurs prétendument officielles extraites des JPEG.

## Vérifications et captures

| Commande | Résultat final |
|---|---|
| `npm test` | 89 tests réussis, 6 fichiers |
| `npm run build` | TypeScript et compilation Next.js réussis |
| `npm run test:e2e` | 22 tests navigateur réussis |
| `npm run test:e2e -- tests/guide.pw.ts tests/multiplayer.pw.ts` | 7 parcours réussis après ajustement des prises de vue complètes |
| `node scripts/index-captures.mjs` | Présence des 26 captures et métadonnées vérifiée, index généré |
| `node scripts/check_table.mjs` | Quatre largeurs desktop et aperçu d'achat vérifiés, sans débordement horizontal |
| `git diff --check` | Aucun défaut d'espacement |

Les tests navigateur couvrent une partie solo complète de 36 tours, l'atelier et ses exports, les anciennes sauvegardes, les symboles sur les illustrations personnalisées, le clavier, les scénarios du guide et de vrais clients réseau. Les anciens tests d'inspecteur permanent et de catalogue intégralement comprimé dans le viewport ont été adaptés à l'UX demandée.

[Index des 26 captures et preuves d'état](visual-captures.md) · [Galerie visuelle](../.artifacts/guide/index.html). Les PNG sont de vrais rendus Chrome, sans retouche ni génération d'image. Pour les vues complètes, les fichiers `Cxx-viewport.png` conservent le viewport du guide ; les fichiers `Cxx.png` utilisent une fenêtre réellement plus haute pour montrer toute la page sans recouvrement des barres collantes. Les deux tailles CSS sont consignées dans le JSON. C22/C23 présentent trois joueurs réels sur le serveur local. L'avant/après utilise une copie isolée du commit initial avec la fixture C01 ; cette copie temporaire a été supprimée après capture.

## Fichiers principaux modifiés

- `src/GameBoard.tsx` : navigation, contexte, fenêtres et commandes du tour.
- `src/game-ui/{PlayerTerritory,ResearchBoard,PollutionTrack,TechnologyDetails,DecadeTracker}.tsx`, nouveau `ComparisonBoard.tsx` : vues et interactions.
- `src/components.tsx` : titre accessible, boucle de focus et fermeture des fenêtres.
- `src/table.css`, `src/play.css`, `src/app/layout.tsx` : styles consolidés, chargés globalement par l’App Router, et symboles compacts ; suppression de `src/game-ui/table-ux.css`.
- `src/game/engine.ts` : export de la constante des seuils PP, sans changement de calcul.
- `src/multiplayer/NetworkGame.tsx` : comparaison depuis les états réels et identité des jetons.
- `tests/guide.pw.ts`, suites navigateur existantes et `tests/ui.ts` : scénarios, régressions et captures.
- `scripts/inspect-guide.mjs`, `scripts/index-captures.mjs`, `scripts/check_table.mjs`, README et présent dossier : revue des références et documentation reproductible.

## Limites de validation

Les formats mobiles sont testés dans Chrome à largeur CSS contrôlée, ainsi qu'avec les textes agrandis à 130 %. Aucun test n'a été effectué sur téléphone physique, Safari, Firefox ou lecteur d'écran. Le multijoueur est validé sur serveur local ; la disponibilité d'un hébergement externe n'entre pas dans cette refonte. Les captures sont des artefacts locaux ignorés par Git, régénérables avec les commandes ci-dessus. Le guide d'origine reste intact.
