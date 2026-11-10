# ![Atziri](./logo-atziri.png) Atziri Exchange

Overlay de prix pour **Path of Exile 2** : version personnelle d'[Exiled Exchange 2](https://github.com/Kvan7/Exiled-Exchange-2) de Kvan7 (licence MIT, voir [LICENSE](LICENSE)), habillée avec le thème Atziri Regex et enrichie d'une page Shift+Espace (Economy poe.ninja, PoEDB, Craft of Exile, Trade, Regex, historique).

Outil de fan gratuit, non affilié à Grinding Gear Games. Les images d'Atziri appartiennent à Grinding Gear Games.

## Présentation

[![Présentation vidéo d'Atziri Exchange](docs-atziri/presentation.jpg)](https://youtu.be/GSPDDFeqdQ8)

## Fonctionnalités

### Prix d'un objet (Ctrl + D)
- La recherche part tout de suite, en achat instantané, avec un prix en Exalté ou en Divin.
- Un gros prix en haut, avec un indicateur de fiabilité (nombre d'annonces, écart entre les prix) et un prix conseillé « À vendre ≈ X ».
- Les annonces anormalement basses sont ignorées.
- Les mods sont cliquables en entier, rangés en groupes repliables, avec une case « Valeur exacte ». La recherche se relance toute seule.
- La langue du jeu est détectée toute seule.

### Page Atziri (Shift + Espace)
Un grand cadre redimensionnable. Ses onglets se rangent dans l'ordre que tu veux par glisser-déposer.
- **Economy** : prix poe.ninja en direct, catégories déplaçables, favoris, alertes de prix. Un convertisseur Divin / Chaos / Exalté est en haut à droite.
- **PoEDB**, **Craft** (Craft of Exile), **Regex ENG** (poe2.re) et **poe.ninja** : les sites ouverts directement dans l'overlay, sans pub. Chaque page a un bouton « Copier l'URL ».
- **Trade** : le site de trade avec un menu **Favoris**. L'étoile ajoute la recherche ouverte, et tu peux aussi coller un lien, le renommer et lui choisir une icône.
- **Suivi craft** :
  - Les cases sont placées comme l'onglet Currency du jeu, et tu peux en changer le contenu, avec toutes les catégories d'Economy.
  - Clique une case pour armer une currency : chaque **Shift + clic gauche** en jeu la compte. Un petit compteur s'affiche en jeu, et Ctrl + Alt + C le met en pause.
  - Tu vois le coût total de la session en divines. Les prix s'affichent en ex, puis en chaos, puis en div.
  - « Terminer » garde la session dans la liste et en commence une nouvelle.
  - **Bases à crafter** : tes liens trade, avec un nom et une icône.
- **Farm** :
  - Un journal de tes maps : divines investies et gagnées, profit, divines par heure, export Excel.
  - Le chrono automatique démarre à l'entrée d'une map et s'arrête au retour au repaire.
  - **Ctrl + T** ajoute l'objet survolé aux loots de la map.
- **Stats** : ton build calculé par Path of Building, comme sur poe.ninja (attributs, défenses, résistances, PV effectifs, coups max, récupération, compétences dépliables avec leurs gemmes).
  - Tu peux suivre ton personnage poe.ninja, relu toutes les 5 min, avec un bouton ↻ pour l'actualiser (option toutes les 15 min). Tu peux aussi suivre un build PoB sauvegardé.
- **Historique** : tes derniers Ctrl + D et le suivi de rentabilité.
- **Détacher** : la page s'ouvre dans sa propre fenêtre, par exemple sur un 2e écran.

### Comparer un objet à ton build (Ctrl + B)
L'objet survolé est comparé à ton équipement par le moteur de Path of Building. Tu vois l'effet sur le DPS de chaque compétence, le critique, la vitesse, les défenses et les résistances, ainsi que les mods de l'objet face à l'objet équipé. Il faut avoir Path of Building (PoE2) installé.

### Confort
- Paramètres regroupés dans « Atziri réglage » : ligue, raccourcis, thèmes (Temple, Rituel, Violet, et les tiens à enregistrer et renommer), 6 couleurs, images de fond (tes images importées restent dans la liste).
- Nom et icône de l'overlay au choix (icône près de l'horloge, fenêtre détachée, logo de Shift + Espace).
- Les onglets web ne se chargent qu'à leur première ouverture, pour garder l'overlay léger.
- Option « Lancer avec le jeu ». Sinon, l'overlay se ferme tout seul 5 s après le jeu.
- Toute l'interface ajoutée suit la langue choisie (français ou anglais).
- Les listes d'objets et de mods se mettent à jour toutes seules depuis GitHub.
- Un avis s'affiche quand une nouvelle version d'Atziri Exchange est publiée.
- Le serveur local refuse les requêtes des autres sites, et les pages web sont isolées de l'appli.

## Installer

1. Télécharge **Atziri Exchange Setup** dans la page [Releases](../../releases/latest).
2. Lance-le. Windows peut afficher « Windows a protégé votre ordinateur » (l'appli n'est pas signée) : « Informations complémentaires » puis « Exécuter quand même ».
3. Dans le jeu : Options > Graphismes > **Fenêtré plein écran**.
4. **Ctrl + D** sur un objet pour son prix, **Shift + Espace** pour la page Atziri. La langue du jeu est détectée toute seule.

N'utilise pas Exiled Exchange 2 et Atziri Exchange en même temps : les deux interceptent les mêmes raccourcis.

## Détails

Toutes les différences avec l'original et la compilation sont décrites dans [ATZIRI.md](ATZIRI.md). Le README d'origine est dans [README-exiled-exchange-2.md](README-exiled-exchange-2.md).
