# Captures de la refonte

Captures réelles de Chrome, sans retouche. Pour les vues complètes, la hauteur du navigateur est agrandie pour que les commandes collantes ne recouvrent pas le contenu. Les fichiers « viewport » conservent aussi le rendu aux dimensions de test originales. Chaque JSON indique les deux viewports et les preuves d’état.

[Ouvrir la galerie](../.artifacts/guide/index.html) · [Ancienne interface](../.artifacts/guide/before-desktop.png) · [État avant](../.artifacts/guide/before-desktop.json)

L'ancienne interface est rendue à partir du commit précédant les modifications, dans une copie isolée, avec la même fixture que C01. Cette copie temporaire a ensuite été supprimée.

| ID | État | Viewport de test (CSS) | Fichiers |
|---|---|---|---|
| C01 | Nation complète : construites, libres et bloquées | 1366 × 768 | [Capture](../.artifacts/guide/C01.png) · [Viewport](../.artifacts/guide/C01-viewport.png) · [État](../.artifacts/guide/C01.json) |
| C02 | Nation mobile | 360 × 800 | [Capture](../.artifacts/guide/C02.png) · [Viewport](../.artifacts/guide/C02-viewport.png) · [État](../.artifacts/guide/C02.json) |
| C03 | Tuile installée | 390 × 844 | [Capture](../.artifacts/guide/C03.png) · [État](../.artifacts/guide/C03.json) |
| C04 | Case libre | 1366 × 768 | [Capture](../.artifacts/guide/C04.png) · [État](../.artifacts/guide/C04.json) |
| C05 | D1 bloquée, prérequis C1 | 390 × 844 | [Capture](../.artifacts/guide/C05.png) · [État](../.artifacts/guide/C05.json) |
| C06 | Recherche ciblée sur C1 | 1366 × 768 | [Capture](../.artifacts/guide/C06.png) · [État](../.artifacts/guide/C06.json) |
| C07 | Catalogue complet ; six niveaux | 1920 × 1080 | [Capture](../.artifacts/guide/C07.png) · [Viewport](../.artifacts/guide/C07-viewport.png) · [État](../.artifacts/guide/C07.json) |
| C08 | Groupe écologie 3 : 3 cartes ; groupes asymétriques | 1366 × 768 | [Capture](../.artifacts/guide/C08.png) · [Viewport](../.artifacts/guide/C08-viewport.png) · [État](../.artifacts/guide/C08.json) |
| C09 | Groupe écologie 3 : 5 cartes ; groupes asymétriques | 390 × 844 | [Capture](../.artifacts/guide/C09.png) · [Viewport](../.artifacts/guide/C09-viewport.png) · [État](../.artifacts/guide/C09.json) |
| C10 | Groupe écologie 3 : 5 cartes ; groupes asymétriques | 768 × 1024 | [Capture](../.artifacts/guide/C10.png) · [Viewport](../.artifacts/guide/C10-viewport.png) · [État](../.artifacts/guide/C10.json) |
| C11 | Énergie niveau 3 ; écologie niveau 2 | 1366 × 768 | [Capture](../.artifacts/guide/C11.png) · [État](../.artifacts/guide/C11.json) |
| C12 | Dernière case du niveau 2 | 390 × 844 | [Capture](../.artifacts/guide/C12.png) · [État](../.artifacts/guide/C12.json) |
| C13 | Première case du niveau 3 après une action | 390 × 844 | [Capture](../.artifacts/guide/C13.png) · [État](../.artifacts/guide/C13.json) |
| C14 | Dernière case, avancement indisponible | 390 × 844 | [Capture](../.artifacts/guide/C14.png) · [État](../.artifacts/guide/C14.json) |
| C15 | Transport compatible et abordable | 1366 × 768 | [Capture](../.artifacts/guide/C15.png) · [État](../.artifacts/guide/C15.json) |
| C16 | Compatible, mais trésorerie insuffisante | 390 × 844 | [Capture](../.artifacts/guide/C16.png) · [État](../.artifacts/guide/C16.json) |
| C17 | Prévisualisation du remplacement de C1 | 1366 × 768 | [Capture](../.artifacts/guide/C17.png) · [État](../.artifacts/guide/C17.json) |
| C18 | Transport posé ; deux cases débloquées | 1366 × 768 | [Capture](../.artifacts/guide/C18.png) · [Viewport](../.artifacts/guide/C18-viewport.png) · [État](../.artifacts/guide/C18.json) |
| C19 | Six pollutions ; PP en case 6 couvert | 390 × 844 | [Capture](../.artifacts/guide/C19.png) · [État](../.artifacts/guide/C19.json) |
| C20 | Seuil 6 découvert ; aucun PP crédité avant décompte | 390 × 844 | [Capture](../.artifacts/guide/C20.png) · [État](../.artifacts/guide/C20.json) |
| C21 | Fenêtre sur écran étroit | 360 × 800 | [Capture](../.artifacts/guide/C21.png) · [État](../.artifacts/guide/C21.json) |
| C22 | Comparaison de trois nations réelles : Alice, Bob et Charlie | 1366 × 768 | [Capture](../.artifacts/guide/C22.png) · [Viewport](../.artifacts/guide/C22-viewport.png) · [État](../.artifacts/guide/C22.json) |
| C23 | Comparaison de trois nations réelles : Alice, Bob et Charlie | 390 × 844 | [Capture](../.artifacts/guide/C23.png) · [Viewport](../.artifacts/guide/C23-viewport.png) · [État](../.artifacts/guide/C23.json) |
| C24 | Nouvelle tuile et résultat du décompte | 1366 × 768 | [Capture](../.artifacts/guide/C24.png) · [État](../.artifacts/guide/C24.json) |
| C25 | Focus clavier contenu dans la fenêtre | 1366 × 768 | [Capture](../.artifacts/guide/C25.png) · [État](../.artifacts/guide/C25.json) |
| C26 | Textes agrandis à 130 % | 390 × 844 | [Capture](../.artifacts/guide/C26.png) · [Viewport](../.artifacts/guide/C26-viewport.png) · [État](../.artifacts/guide/C26.json) |

C22 et C23 proviennent de trois vrais clients réseau locaux (Alice, Bob et Charlie). Les autres scénarios utilisent la fixture reproductible de tests/guide.pw.ts. [Comparaison solo](../.artifacts/guide/comparison-solo.png).
