# Prosperity — Guide d’implémentation pour agent IA

**Mise en conformité d’un projet existant · Mise à jour du 23 septembre 2026**

## 1. Mission à exécuter

Tu interviens dans un projet Prosperity déjà existant. Adapte son interface aux exigences ci-dessous sans reconstruire le jeu ni changer sa stack. L’objectif est une interface interactive, simple, fluide et fidèle à la direction artistique originale. Le plateau et les illustrations doivent donner envie de jouer ; les informations secondaires apparaissent à la demande.

Le travail porte sur trois vues : **Ma nation**, **Recherche**, **Comparaison**. Supprime la vue immersive et les panneaux d’explication permanents. Préserve les règles, les sauvegardes et les mécanismes métier existants. Une démonstration peut simuler des données ; un jeu fonctionnel ne doit pas hériter de limitations artificielles de démonstration.

Commence par auditer le dépôt, puis implémente par étapes. Ne t’arrête pas à une proposition. Livre les modifications, les vérifications et des captures réelles des états obtenus.

### Autorité et limites de ce document

1. Les dernières demandes explicites de l’utilisateur définissent l’UX cible. Elles remplacent notamment la demande initiale de vue immersive.
2. Les règles et données vérifiées du projet définissent les calculs, coûts, décomptes et conditions d’action. Signale tout conflit avec les références avant de modifier une règle.
3. Les captures fournies définissent la direction artistique et les éléments de plateau à retrouver. Elles représentent plusieurs états et versions : ne fusionne pas leurs chiffres en une partie fictive supposée cohérente.
4. Les propositions techniques de ce guide sont adaptables à l’architecture existante.

**Ce document n’est pas un audit du dépôt cible.** Ses fichiers et sa stack ne sont pas connus ici. Les comportements à corriger ci-dessous sont des exigences et des points de contrôle, pas des défauts constatés dans ce dépôt.

**Illustrations :** 20 captures réelles du site accessible par son URL, complétées par les 20 références historiques (6 originales et 14 recadrages). Les captures du site sont présentées ci-dessous, avec le parcours qui les produit. Elles attestent les états observés, pas une conformité exhaustive. Les tests mobile restent à exécuter.

## Captures réelles du prototype — parcours illustrés

**Source :** https://prosperity-nations.deboveq.chatgpt.site/ — captures réalisées dans le navigateur lors des sessions des 21 et 23 septembre 2026. Les fichiers sont conservés sans retouche. Les dimensions d’image exactes figurent dans le manifeste ; elles ne sont pas assimilées à des dimensions CSS mobiles. L01–L07 proviennent de la première session ; L08–L20 de la reprise.

### Ce qui a été vérifié et ce qui reste ouvert

- Parcours D1 bloquée → recherche ciblée C1 ; consultation des tuiles et de la position de recherche.
- Achat du Réseau ferroviaire en C1 : trésorerie 400 → 300 €, actions 2 → 1, déblocage de D1/D2.
- Clic sur le disque 3 : pollution 8 → 7, retrait du disque 8, actions 1 → 0.
- Après redémarrage du scénario : avancement Énergie de niveau 2 case 3/3 à niveau 3 case 1/4 ; Écologie inchangée ; une action consommée.
- Comparaison, sélection Pollution, détail des décomptes et fin de scénario accessibles.

**Limites :** pas de nouvelle capture sur téléphone, pas de validation de sauvegarde, de multijoueur réel, de double clic concurrent ou de fin de piste. La campagne de la section 12 reste à exécuter dans le projet cible. L’aspect très atténué des cartes incompatibles est visible sur les captures : vérifier leur lisibilité lors de l’intégration. Les illustrations du prototype sont différentes des rendus isométriques des références originales ; conserver les assets définitifs choisis pour le projet. Ne pas prendre le prototype comme preuve que chaque exigence est satisfaite.

### L01 — Nation initiale

![L01 — Nation initiale](images/prosperity-live-01-nation.jpg)

État initial du scénario : 400 €, 12 PP, pollution 8, décompte écologie à résoudre. Vue générale conservée telle que capturée ; elle ne sert pas à mesurer le responsive.

### L02 — Case D1 bloquée

![L02 — Case D1 bloquée](images/prosperity-live-02-case-bloquee.jpg)

Clic sur D1 : popup « Transport requis en C1 » et bouton vers la recherche du prérequis.

### L03 — Recherche ciblée sur C1

![L03 — Recherche ciblée sur C1](images/prosperity-live-03-recherche-ciblee.jpg)

Après « Trouver un transport en C1 » : contexte C1 et code de compatibilité. Les cartes incompatibles restent présentes.

### L04 — Recherche, milieu du catalogue

![L04 — Recherche, milieu du catalogue](images/prosperity-live-04-recherche-milieu.jpg)

Défilement dans les niveaux 4 et 3. Les pistes centrales continuent le long des groupes de cartes et les options compatibles ressortent.

### L05 — Position avant avancement

![L05 — Position avant avancement](images/prosperity-live-05-popup-position.jpg)

Clic sur le jeton Énergie : niveau 2, case 3/3. La popup propose une seule case d’avancement.

### L06 — Deux jetons au niveau 2

![L06 — Deux jetons au niveau 2](images/prosperity-live-06-jetons-niveau-deux.jpg)

Les deux jetons sont chacun sur leur piste. Les étapes franchies sont colorées. Référence de position avant avancement.

### L07 — Achat bloqué par la phase

![L07 — Achat bloqué par la phase](images/prosperity-live-07-tuile-phase-bloquee.jpg)

Réseau ferroviaire compatible et finançable à 100 €, mais bouton désactivé tant que le décompte n’est pas résolu. Ne pas confondre financement et autorisation d’agir.

### L08 — Nation après décompte

![L08 — Nation après décompte](images/prosperity-live-08-actions.jpg)

Le décompte écologie est marqué effectué et la barre indique deux actions disponibles.

### L09 — Détail de la tuile installée

![L09 — Détail de la tuile installée](images/prosperity-live-09-tuile-installee.jpg)

Popup de C1, Ceinture verte : illustration, effet +1 écologie et accès aux achats pour cette case.

### L10 — Achat disponible

![L10 — Achat disponible](images/prosperity-live-10-achat-disponible.jpg)

Après décompte : détail du Réseau ferroviaire et prix de 100 €. Le choix d’emplacement est actif.

### L11 — Confirmation du remplacement

![L11 — Confirmation du remplacement](images/prosperity-live-11-confirmation.jpg)

Le contexte C1 est conservé. La popup nomme la tuile remplacée et prévisualise la trésorerie 400 → 300 €. Dans ce cas les effets écologiques sont identiques ; aucun delta de production non nul n’est montré.

### L12 — Transport posé et cases débloquées

![L12 — Transport posé et cases débloquées](images/prosperity-live-12-cases-debloquees.jpg)

Après confirmation : C1 contient Réseau ferroviaire, D1 et D2 sont libres, trésorerie 300 €, une action restante. La pollution est encore à 8.

### L13 — Dépollution par clic sur un disque

![L13 — Dépollution par clic sur un disque](images/prosperity-live-13-depollution.jpg)

Clic sur le disque de la case 3 : le disque 8 disparaît, la case 3 reste occupée, la pollution passe à 7 et les actions sont terminées. Pas de trou au milieu de la piste.

### L14 — Comparaison des nations

![L14 — Comparaison des nations](images/prosperity-live-14-comparaison.jpg)

Classement, comparaison et tableau des équilibres. Les autres joueurs sont explicitement simulés.

### L15 — Comparaison par pollution

![L15 — Comparaison par pollution](images/prosperity-live-15-comparaison-pollution.jpg)

Le sélecteur Pollution modifie la série du graphique ; le tableau indique 7 pour le joueur courant.

### L16 — Popup des décomptes

![L16 — Popup des décomptes](images/prosperity-live-16-decomptes.jpg)

Détail de la décennie et historique des deux actions. Les explications restent dans une popup.

### L17 — Fin du scénario

![L17 — Fin du scénario](images/prosperity-live-17-fin-demo.jpg)

Le scénario s’arrête après le tour. Cette restriction de démo ne doit pas être copiée dans un moteur de partie complète.

### L18 — Recherche sans filtre

![L18 — Recherche sans filtre](images/prosperity-live-18-recherche-sans-filtre.jpg)

Après « Rejouer le scénario », résolution du décompte puis vue Recherche : deux domaines, en-têtes avec sous-étapes, niveaux et cartes non filtrées.

### L19 — Position après avancement

![L19 — Position après avancement](images/prosperity-live-19-progression.jpg)

Clic sur l’en-tête Énergie, puis sur son jeton : niveau 3, case 1/4. Le niveau 2, case 3/3 est donc suivi de cette case précise.

### L20 — Jetons à des positions différentes

![L20 — Jetons à des positions différentes](images/prosperity-live-20-jetons-distincts.jpg)

Énergie est au niveau 3, première case ; Écologie reste au niveau 2, troisième case. La barre indique une action restante. Les hauteurs des niveaux suivent les lignes de cartes.

## 2. Audit initial obligatoire

Lire les instructions du dépôt, identifier la commande de lancement, les tests et les composants concernés. Relever les chemins réels dans un court tableau de travail :

| Élément | À identifier dans le dépôt | À préserver |
|---|---|---|
| Navigation | Routes, vues, sélection active | Liens et historique utiles |
| État de partie | Store, services, API, événements | Source de vérité et synchronisation |
| Nation | Modèle des cases, catégories, dépendances | Coordonnées et règles de placement |
| Recherche | Niveaux, cases, progression, catalogue | Progression réelle et disponibilité |
| Pollution | Jetons, seuils, effets | Calculs du moteur |
| Achats | Prix, remplacement, validation | Transaction et budget d’actions |
| Sauvegarde | Format, chargement, migrations | Compatibilité des parties |
| Assets | Tuiles, icônes, textures, polices | Identité et qualité des illustrations |

Lancer les contrôles déjà prévus et noter les erreurs préexistantes. Photographier l’état initial avec les outils autorisés. Créer une liste d’écarts avec les statuts « conforme », « à corriger », « non vérifié ». Ne pas déduire une conformité visuelle d’un build réussi.

Éviter une migration de framework, un nouveau moteur de règles, une nouvelle bibliothèque graphique ou un nouveau système de stockage pour cette seule refonte. Réutiliser les composants accessibles et les styles du projet lorsqu’ils conviennent.

## 3. Direction artistique et structure

### À conserver

Fond ivoire légèrement texturé, verts doux et profonds, touches dorées discrètes, énergie bleue, écologie verte, recherche violette. Conserver les illustrations de bâtiments sur socles isométriques, leurs proportions et leur cadrage. Les niveaux et titres peuvent utiliser la typographie à empattements du jeu ; les informations opérationnelles doivent rester très lisibles.

Ne pas inventer de valeurs hexadécimales prétendument officielles à partir d’une capture compressée : récupérer les tokens du projet ou les définir explicitement comme choix d’intégration. Centraliser couleurs, espacements et ombres au lieu d’empiler des surcharges CSS contradictoires.

### À supprimer ou éviter

Vue immersive, navigation 3D, caméra libre, inspecteur latéral permanent, paragraphes pédagogiques répétés, cartes de statistiques disproportionnées, texte décoratif et informations dupliquées. La perspective vient des illustrations ; elle ne nécessite pas un moteur 3D.

![Référence originale : nation et direction artistique](images/01-nation-originale.jpg)

*Figure 1 — Capture fournie. Référence de matière, de couleurs, de tuiles et de cases. Les valeurs visibles sont celles de cette capture.*

### Coquille commune aux trois vues

Une navigation courte permet de passer entre Nation, Recherche et Comparaison. Un bandeau compact conserve l’année ou décennie, le tour lorsque pertinent, les décomptes effectués et restants, la dernière tuile révélée et les ressources nécessaires aux actions. Montrer clairement le budget d’actions restant.

Sur mobile, répartir ce bandeau sur des lignes compactes si nécessaire ; ne pas tout réduire jusqu’à rendre le texte illisible. La dernière tuile peut être une miniature ouvrant son détail. Les décomptes utilisent une suite d’icônes avec états distincts et libellés accessibles. Leur nombre et leur ordre viennent de la partie, jamais d’un tableau décoratif figé.

![Détail des indicateurs de nation](images/07-nation-indicateurs.jpg)

*Figure 2 — Recadrage de la figure 1. Garder l’association valeur, icône et couleur. Distinguer une production ou un effet d’un stock disponible.*

## 4. Vue Ma nation

### Plateau et cases

Conserver une grille spatiale stable. Dans la référence, les coordonnées vont de A1 à D3 ; C2 est une zone de signature, pas une case de construction ordinaire. Si le projet prend en charge plusieurs plateaux, lire cette disposition dans leurs données plutôt que coder cette seule nation en dur.

Une case occupée montre sa tuile et ses effets essentiels. Une case libre montre sa catégorie. Une case bloquée reste visible avec cadenas et prérequis court. Les cases ne disparaissent pas lorsqu’elles sont indisponibles.

![Cases occupées et catégories](images/08-nation-types-de-cases.jpg)

*Figure 3 — Recadrage. Trois états doivent être visuellement compréhensibles : tuile construite, emplacement libre, catégorie de construction.*

![Cases bloquées par un transport requis](images/09-nation-verrouillages.jpg)

*Figure 4 — Recadrage. D1 et D2 indiquent « Transport en C1 ». Ne pas effacer cette information pour simplifier la vue.*

![Cases C1 et C3](images/10-nation-transport.jpg)

*Figure 5 — Recadrage. La présence d’une tuile sur une case de transport ne prouve pas que le prérequis est satisfait : vérifier le type de la tuile.*

### Interactions

| Clic | Popup attendue | Suite possible |
|---|---|---|
| Case occupée | Coordonnée, tuile actuelle, effets | Rechercher un remplacement |
| Case libre | Catégorie acceptée | Rechercher une tuile compatible |
| Case bloquée | Prérequis et case qui le satisfait | Aller chercher le transport nécessaire |
| Tuile dans la recherche | Détail, coût, contraintes | Choisir ou confirmer le placement |

Cliquer D1 ou D2 doit expliquer la dépendance à C1. Si l’utilisateur choisit de satisfaire cette dépendance, la recherche cible **C1**, pas D1. Un espace vert installé en C1 ne doit pas débloquer ces cases si le moteur exige une tuile de transport.

La transition conserve un contexte explicite, par exemple `{ targetSlotId, originView }`. Ce contexte est un état d’interface ; ne pas le mélanger avec les ressources de la partie. Afficher un petit rappel « Pour C1 » avec une action d’effacement. Le retour à la nation et l’annulation ne doivent pas acheter une tuile.

## 5. Recherche : priorité de fidélité

La vue Recherche est dédiée et aérée. Les deux domaines restent identifiables côte à côte : **Énergie à gauche, Écologie à droite**. Les niveaux sont présentés du plus élevé en haut au niveau 1 en bas, comme sur la référence. Le défilement vertical est normal : il n’est pas nécessaire de faire tenir les six niveaux dans un seul écran.

![En-têtes de la recherche et niveau 6](images/04-recherche-entetes-originale.jpg)

*Figure 6 — Capture fournie. Couleurs des domaines, niveau et sous-étape dans les en-têtes.*

![En-têtes agrandis](images/14-recherche-entetes.jpg)

*Figure 7 — Recadrage. « Niv. 1 · case 1/2 » est une information essentielle, pas une décoration.*

### Deux tuiles au maximum par ligne et par domaine

À chaque niveau, chaque domaine contient une grille de **deux colonnes maximum**. Trois tuiles occupent deux lignes ; cinq tuiles occupent trois lignes. Ne jamais ajouter une troisième colonne ou un carrousel horizontal pour absorber le catalogue.

À petite largeur, une seule colonne par domaine est acceptable si elle est nécessaire à la lisibilité : « deux maximum » n’impose pas deux partout. Conserver les deux domaines et les pistes clairement associés. La hauteur d’un niveau correspond au contenu le plus haut des deux domaines ; les niveaux gauche et droite restent alignés.

![Deux tuiles par domaine au niveau 6](images/15-recherche-niveau-six.jpg)

*Figure 8 — Recadrage. Référence du couple de cartes ; les lignes supplémentaires doivent conserver cette organisation.*

### Pistes, sous-étapes et jetons

Afficher deux pistes verticales, une pour chaque domaine, de part et d’autre des numéros de niveau. Toutes les sous-étapes existent visuellement : petits cercles reliés par une ligne fine. Chaque domaine possède son propre jeton coloré, placé sur **la sous-étape exacte** de sa progression.

![Référence des pistes et jetons](images/05-recherche-pistes-originale.jpg)

*Figure 9 — Capture fournie. Les niveaux, points intermédiaires et jetons doivent être lisibles ensemble.*

![Sous-étapes agrandies](images/16-recherche-sous-etapes.jpg)

*Figure 10 — Recadrage. Ne pas remplacer les pistes par un simple badge de niveau ou une barre de progression globale.*

![Jetons de position](images/17-recherche-jetons.jpg)

*Figure 11 — Recadrage. Le jeton bleu et le jeton vert indiquent deux positions indépendantes.*

Le nombre de sous-étapes provient du modèle métier. Ne pas le déduire de la hauteur des cartes, du nombre de tuiles ou de pixels dans une image. Le retour à la ligne des cartes agrandit la rangée ; il ne crée pas de nouvelles étapes.

**Exemple de correspondance à utiliser uniquement si ces données correspondent au modèle vérifié :** pour `[2, 3, 4, 5, 6, 7]`, une piste a 27 positions. Avec un index global commençant à zéro : 0 → niveau 1, case 1/2 ; 1 → niveau 1, case 2/2 ; 2 → niveau 2, case 1/3 ; 4 → niveau 2, case 3/3 ; 5 → niveau 3, case 1/4 ; 26 → niveau 6, case 7/7. Les deux conventions d’index doivent être documentées pour éviter les décalages.

La position du jeton est liée à l’identifiant de son étape. Préférer son rendu directement dans l’élément représentant cette étape, plutôt qu’un `top` global calculé avec une hauteur de niveau supposée fixe.

Cliquer l’en-tête Énergie ou Écologie déclenche l’avancement d’une case lorsque l’action est autorisée. Au dernier point d’un niveau, passer au premier point du suivant. À la dernière case de la piste, ne pas boucler. Consommer le coût défini par le moteur. Si le produit expose une popup sur le jeton, y rappeler « Niveau N · case X/Y » et proposer la même commande d’avancement, sans créer une seconde logique métier.

### Squelette de mise en page indicatif

L’exemple ci-dessous décrit la structure, pas un remplacement imposé des composants existants. Tester le seuil de passage à une colonne avec les assets et textes réels.

```css
.research-level {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem minmax(0, 1fr);
  align-items: stretch;
}
.research-cards {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem;
  align-content: center;
}
.research-card { min-width: 0; }
.research-card img { display: block; width: 100%; height: auto; }
/* Une seule colonne par domaine si deux rendraient les cartes illisibles. */
@media (max-width: 420px) {
  .research-cards { grid-template-columns: minmax(0, 1fr); }
}
```

La colonne centrale contient les deux pistes et le numéro du niveau. Répartir ses points selon le nombre d’étapes du niveau, du bas vers le haut. Garder la continuité de chaque piste entre les rangées. Vérifier que jetons, chiffres et zones cliquables ne se chevauchent pas.

## 6. Tuiles éligibles, achat et remplacement

Depuis une case de nation, la recherche met en évidence les tuiles **compatibles et achetables**. Une bordure verte et un indicateur explicite conviennent. Le code couleur seul ne suffit pas. La sélection actuelle utilise un traitement différent, par exemple un contour doré.

![Exemple de sélection d’une tuile](images/18-recherche-selection.jpg)

*Figure 12 — Recadrage. Exemple de contour de sélection ; ne pas le confondre avec la compatibilité métier.*

![Groupe de tuiles de niveau 3](images/19-recherche-niveau-trois.jpg)

*Figure 13 — Recadrage. Le nombre de cartes peut varier ; l’alignement des niveaux doit rester stable.*

Calculer séparément : compatibilité avec la case, déverrouillage, accès technologique, coût, fonds suffisants et autorisation d’agir. Une tuile peut être compatible mais trop chère, ou achetable en principe mais indisponible durant cette phase. Utiliser les règles existantes pour trancher et présenter une raison courte.

Toutes les tuiles restent inspectables, y compris celles indisponibles. Ne pas faire disparaître les options au point d’empêcher de comprendre ce qu’il manque. Ne jamais surligner uniquement le premier résultat par commodité.

Avant confirmation, la popup réunit : tuile choisie, case cible, tuile remplacée éventuelle, prix exact, effets gagnés et perdus, budget après achat. La prévisualisation ne modifie pas la partie.

À la confirmation, revalider sur l’état courant puis appliquer une seule commande atomique : paiement, placement, effets, consommation d’action et dépendances. Une double pression ne doit pas appliquer deux achats. En cas de refus du moteur ou du serveur, conserver un état cohérent et expliquer brièvement la raison. Ne pas implémenter une formule de prix supposée uniquement à partir des montants des captures.

## 7. Pollution et prospérité cachée

![Piste de pollution originale](images/02-pollution-originale.jpg)

*Figure 14 — Capture fournie. Disques en relief, emplacements libres, PP et limite critique.*

Les disques doivent rester tactiles et clairement détachés du fond. Afficher la quantité de pollution et les PP découverts sans recopier un paragraphe explicatif permanent.

![Disques de pollution](images/11-pollution-jetons.jpg)

*Figure 15 — Recadrage. Le relief aide à identifier les jetons cliquables.*

Cliquer un disque lance une dépollution si elle est autorisée. Si le modèle représente une pile ou une quantité contiguë, enlever le dernier jeton occupé, quel que soit le disque pressé ; ne pas créer un trou au milieu de la piste. La consommation d’action et les effets viennent du moteur, et doivent être identiques à ceux du bouton de dépollution s’il existe.

Les emplacements portant potentiellement des PP doivent rester repérables lorsqu’ils sont couverts : repère périphérique, petit symbole ou contour discret visible autour du disque. Un PP couvert n’est pas un PP gagné. La piste doit distinguer le potentiel, l’emplacement découvert et les points déjà crédités selon les règles.

![Emplacement PP découvert](images/12-pollution-pp-decouvert.jpg)

*Figure 16 — Recadrage. Référence de l’emplacement découvert. Le traitement du potentiel couvert est à implémenter ; il n’est pas démontré par cette image.*

![Limite critique](images/13-pollution-limite.jpg)

*Figure 17 — Recadrage. Garder le marqueur de limite spécifique ; son effet doit être lu dans les règles.*

Lire les seuils dans les données. Pour un jeu de test utilisant des seuils 1, 6 et 11 et une occupation contiguë des positions 1 à P, un seuil s est découvert lorsque `P < s`. Par exemple, P=8 expose le seuil 11 ; passer de P=6 à P=5 découvre aussi le seuil 6. Cet exemple valide une représentation, il ne remplace pas la règle d’attribution des points.

## 8. Popups et interactions communes

Une popup courte remplace les détails persistants sur le côté. Elle doit pouvoir se fermer avec la croix, Échap et un clic sur l’arrière-plan lorsque cela ne provoque pas une perte ambiguë de saisie. L’annulation ne modifie pas la partie.

À l’ouverture, déplacer le focus dans la popup ; conserver la navigation clavier à l’intérieur ; au retour, rendre le focus au déclencheur. Donner un titre accessible. Sur mobile, prévoir une hauteur maximale liée à la zone visible et un défilement interne si nécessaire. La croix et l’action principale doivent rester accessibles.

Conserver les détails indispensables : effets de tuile, motif de blocage, prix et delta avant confirmation. Supprimer le texte qui répète le titre ou explique continuellement un contrôle déjà clair. Les infobulles peuvent aider, mais aucune action essentielle ne dépend du survol.

Éviter qu’un clic sur la fermeture ou un bouton interne déclenche aussi le clic de la carte située dessous. Après une opération, conserver autant que possible le niveau de recherche et la position de défilement consultés.

## 9. Comparaison et informations de partie

La vue Comparaison présente les statistiques utiles entre joueurs, avec les mêmes noms, icônes, unités et couleurs que la nation. Un tableau compact ou quelques lignes comparables suffisent. Identifier clairement le joueur courant.

Ne pas inventer d’historique, de courbes de progression ou de recommandations automatiques si les données n’existent pas. Dans une démonstration, identifier les données simulées ; dans le jeu existant, utiliser l’état réel.

Les décomptes, l’année et la dernière tuile doivent être actualisés par les événements de partie. Ne pas figer un tour, une année ou un nombre d’actions observé sur une capture. Changer de vue ne réinitialise rien. Les éventuelles règles de fin de partie restent celles du moteur.

## 10. Responsive : corriger la cause du débordement

![Ancienne capture mobile](images/03-recherche-mobile-originale.jpg)

*Figure 18 — Capture fournie avec interface du navigateur. Référence historique de densité et de recherche ; ses éléments coupés ne sont pas un comportement à reproduire.*

![Commandes dans l’ancienne vue mobile](images/20-mobile-commandes.jpg)

*Figure 19 — Recadrage. Les commandes doivent rester accessibles sans couvrir les dernières tuiles.*

Prévoir un défilement vertical naturel, des enfants de grilles avec `min-width: 0`, des images bornées par leur conteneur et des textes qui peuvent revenir à la ligne. Auditer les largeurs fixes, `min-content`, paddings cumulés et boutons trop larges. Ne pas se contenter d’un `overflow-x: hidden` global qui masque le défaut et coupe les contrôles.

Si une barre d’actions est fixe, réserver réellement son espace et tenir compte de la zone sûre du téléphone. Ne pas empiler plusieurs bandeaux collants jusqu’à supprimer la zone de jeu. Préférer des contrôles tactiles confortables, avec un objectif de 44 × 44 pixels CSS pour les actions principales ; c’est une cible de conception de ce guide, pas une mesure tirée des captures.

Vérifier les largeurs 360, 390, 768, 1366 et 1920 pixels CSS. Tester également un agrandissement du texte. Un screenshot de téléphone mesure des pixels d’image, pas nécessairement la largeur CSS de la page.

## 11. Plan d’implémentation incrémental

| Étape | Travail | Validation avant suite |
|---|---|---|
| 1 | Audit et inventaire des règles/assets | Chemins, commandes et écarts documentés |
| 2 | Navigation, thème, bandeau compact | Trois vues et état conservé |
| 3 | Nation, cases, dépendances, popups | Cases bloquées et route vers prérequis |
| 4 | Recherche, rangées, pistes et jetons | Toutes les étapes et retour à la ligne |
| 5 | Éligibilité, prévisualisation, achat | Aucun calcul métier divergent |
| 6 | Pollution et PP couverts | Quantité et seuils cohérents |
| 7 | Comparaison et informations persistantes | Données réelles ou simulation identifiée |
| 8 | Mobile, clavier, captures et régressions | Critères ci-dessous satisfaits |

Conserver une source de vérité métier. Les sélecteurs d’affichage dérivent les états visuels ; les commandes métier appliquent les changements. Les noms de composants éventuels — NationBoard, ResearchTrack, TileDialog — sont des suggestions, pas une architecture à imposer.

Ne pas copier les restrictions d’une démo à un seul tour dans une partie complète. Ne pas recopier une cascade de CSS accumulée si les règles peuvent être consolidées. Préserver les identifiants de tuiles et les formats de sauvegarde.

### Tests d’acceptation prioritaires

| Cas | Résultat attendu |
|---|---|
| 0, 1, 2, 3 puis 5 cartes dans un domaine/niveau | 2 colonnes maximum, aucune carte perdue |
| Volumes différents à gauche et à droite | Même niveau aligné, aucune superposition |
| Première et dernière sous-étape de chaque niveau | Jeton placé sur le bon point |
| Avancement à une frontière de niveau | Une case et un coût, pas un niveau entier |
| Dernière case de piste | Pas de dépassement ni de boucle |
| C1 occupée par une tuile non transport | Dépendance transport non satisfaite |
| Recherche ouverte depuis D1 bloquée | Contexte orienté vers le prérequis C1 |
| Tuile compatible mais fonds insuffisants | Motif visible, confirmation indisponible |
| Remplacement annulé | Argent, tuile et actions inchangés |
| Achat confirmé deux fois rapidement | Une transaction au maximum |
| Dépollution depuis un disque intermédiaire | Quantité contiguë, dernier disque retiré |
| Franchissement d’un seuil PP | État couvert/découvert exact |
| Action interdite par la phase ou le budget | Refus cohérent dans toutes les entrées UI |
| Navigation puis retour | Même état de partie, contexte maîtrisé |
| Sauvegarde existante rechargée | Pas de perte ou réinitialisation |
| Popup au clavier | Focus contenu, Échap, retour au déclencheur |
| Largeur 360 pixels CSS | Aucun défilement horizontal du document |

Tester la logique avec les outils existants et les parcours critiques dans un navigateur autorisé. Ne pas multiplier les tests qui ne font que recopier le code. Un contrôle DOM peut vérifier `scrollWidth <= clientWidth` à l’arrondi près, mais doit être complété par une inspection : du contenu masqué peut passer ce contrôle.

## 12. Campagne de screenshots à produire dans le projet cible

**Campagne à reproduire dans le projet cible.** Plusieurs parcours sont désormais illustrés par les captures L01–L20 du prototype ; cela ne valide pas les viewports et états encore non testés du projet cible. Utiliser une fixture reproductible sans données personnelles. Noter viewport CSS, état initial, action, état attendu et nom de fichier. Ne pas maquiller les captures, ni remplacer une capture manquante par une image générée.

| ID | État à capturer | Format conseillé |
|---|---|---|
| C01 | Nation complète avec cases libres, construites et bloquées | 1366 × 768 |
| C02 | Nation sur petit écran | 360 × 800 |
| C03 | Popup d’une tuile installée | 390 × 844 |
| C04 | Popup d’une case libre | 1366 × 768 |
| C05 | Popup D1 bloquée, prérequis C1 | 390 × 844 |
| C06 | Recherche ouverte depuis C1 avec contexte | 1366 × 768 |
| C07 | Recherche complète, niveaux visibles par capture pleine page | 1920 × 1080 |
| C08 | Recherche avec 3 cartes dans un groupe | 1366 × 768 |
| C09 | Recherche avec 5 cartes dans un groupe | 390 × 844 |
| C10 | Recherche avec groupes asymétriques | 768 × 1024 |
| C11 | Deux jetons à des positions différentes | 1366 × 768 |
| C12 | Dernière case d’un niveau avant avancement | 390 × 844 |
| C13 | Première case suivante après avancement | Même viewport que C12 |
| C14 | Fin de piste et action indisponible | 390 × 844 |
| C15 | Tuile compatible et abordable | 1366 × 768 |
| C16 | Tuile compatible mais trop chère, détail ouvert | 390 × 844 |
| C17 | Prévisualisation d’un remplacement | 1366 × 768 |
| C18 | Nation après transport débloquant D1/D2 | 1366 × 768 |
| C19 | Pollution avec PP encore couverts | 390 × 844 |
| C20 | Pollution après découverte d’un seuil | Même viewport que C19 |
| C21 | Popup ouverte sur écran étroit | 360 × 800 |
| C22 | Comparaison des joueurs | 1366 × 768 |
| C23 | Comparaison sur mobile | 390 × 844 |
| C24 | Bandeau après un décompte et nouvelle tuile | 1366 × 768 |
| C25 | Focus clavier visible et popup | 1366 × 768 |
| C26 | Interface avec texte agrandi | 390 × 844 |

Associer aux captures avant/après une preuve d’état lorsque pertinent : position de recherche, argent, pollution, actions restantes. Une image seule ne prouve pas qu’un clic consomme correctement une action ou que les données persistent.

## 13. Définition de terminé et compte rendu de l’agent

- [ ] La charte originale est conservée et la vue immersive supprimée.
- [ ] Les vues sont distinctes, courtes en texte et sans inspecteur latéral permanent.
- [ ] Les cases bloquées et leurs prérequis restent visibles.
- [ ] Le chemin nation → recherche → prévisualisation → placement fonctionne.
- [ ] La recherche montre ses sous-étapes et deux jetons précisément positionnés.
- [ ] Chaque groupe a au plus deux tuiles par ligne et peut avoir plusieurs lignes.
- [ ] Les niveaux restent alignés lorsque les groupes grandissent.
- [ ] Les disques de pollution sont interactifs et les PP potentiels repérables.
- [ ] Les popups se ferment facilement et sont utilisables au clavier et au toucher.
- [ ] Le document ne déborde pas horizontalement sur mobile.
- [ ] Les règles, sauvegardes et flux existants ne régressent pas.
- [ ] Les tests exécutés et les captures réelles sont fournis ; les contrôles non réalisés sont signalés.

Dans le compte rendu, donner les fichiers modifiés, les comportements obtenus, les commandes de vérification et leurs résultats, l’index des captures et les limitations restantes. Ne pas annoncer « conforme » pour un point non vérifié. Si une contradiction métier reste ouverte, la décrire avec ses sources et les conséquences concrètes.

## 14. Références et traçabilité

**Source principale :** demandes et captures de l’utilisateur dans la présente conversation, disponibles lors de la rédaction du 20 septembre 2026. La date originale de prise de chaque capture n’est pas vérifiée. Les références servent à spécifier l’interface, pas à authentifier toutes les règles du jeu.

**Prototype de travail associé :** [Prosperity Nations](https://prosperity-nations.deboveq.chatgpt.site). Son accès peut être restreint. L’accès par cette URL a fonctionné. Les captures L01–L20 documentent le rendu et les interactions observés durant cette session, sans audit du code ni validation exhaustive des règles.

Le fichier `manifest-images.json` fournit le nom source, la nature de chaque illustration et les coordonnées de recadrage. Les figures 1, 6, 9, 14, 18 et 20 sont les six captures fournies ; les autres sont des agrandissements de détail.

![Ancienne organisation globale](images/06-ancienne-vue-globale.png)

*Figure 20 — Capture fournie, référence historique. Cette organisation globale ne doit pas faire réapparaître une interface surchargée ou un inspecteur permanent. Les demandes les plus récentes priment.*

### Transmission à l’agent

Transmettre le dossier entier, pas seulement le Markdown. Instruction de démarrage :

> Lis `guide-implementation.md` et les illustrations associées. Audite le projet existant, liste les écarts vérifiés puis réalise la mise en conformité par étapes. Conserve sa stack et son moteur métier. Donne priorité à la recherche avec sous-étapes et jetons, au maximum de deux tuiles par ligne et par domaine, aux popups, aux cases bloquées et au responsive. Produis les tests et captures réelles demandés. Distingue toujours les exigences, les résultats vérifiés et les points non vérifiés.
