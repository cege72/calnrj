# WebApp Solaire (HP/HC & PV)

Application web 100% locale (HTML/CSS/JS) pour analyser votre consommation électrique, comparer l'option **Heures Creuses** à l'option **Base**, et visualiser la production photovoltaïque (réelle et théorique).

- Aucune donnée envoyée sur Internet.
- Import CSV ou Excel (.xls/.xlsx).
- Détection automatique du pas (15 ou 30 min) et de l'unité (W/Wh/kWh). Par défaut, l'unité est **W** si non trouvée.
- Interface responsive, **dark mode** automatique + bascule manuelle.
- Visualisations SVG légères, sans dépendances externes.

## Fonctionnalités

### Paramètres
- Saisissez les tarifs (€/kWh) pour **Base**, **HP**, **HC**.
- Saisissez les coûts d'abonnement mensuels (Base vs HP/HC).
- Définissez les créneaux **HC** (ex: `22:00-06:00`, multiples autorisés).
- Importez vos fichiers de **consommation** et (optionnel) **production réelle**.

### Synthèse
- Camembert % HP vs % HC.
- Total kWh.
- Simulation facture pour la période sélectionnée (toutes données / année / mois).
- **Signal** vert/orange/rouge selon économies (>10€, 0-10€, <0€).

### Consommation
- Histogramme **mensuel** (empilé HP/HC + PV autoconsommée si production importée).
- Clic sur un mois ⇒ **détail jour par jour** + bouton retour.
- Sélection d'année/mois synchronise les calculs de la synthèse.

### Production
- Graphique **production réelle** (kWh/jour).
- Graphique **théorique**: durée du jour (h), heure de lever & coucher (double échelle), basé sur un modèle astronomique offline.
- Entrées: **inclinaison** (°), **puissance crête** (W), **géolocalisation** (navigateur) ou **ville** (liste fournie) ou **lat/lon**.
- Option pour **superposer** la production réelle et théorique.

## Format des fichiers
- Colonnes attendues (noms flexibles):
  - `horodatage`/`date`/`datetime`/`timestamp`
  - `valeur`/`consommation`/`puissance`/`energy` (`W`/`Wh`/`kWh`)
  - `unité` (optionnel)
- Si l'unité est absente, conversion supposée depuis **W** via le pas détecté.

## Utilisation
1. Ouvrez `index.html` dans votre navigateur.
2. Dans **Paramètres**, saisissez tarifs/abonnements et créneaux HC.
3. Importez vos CSV/XLS de consommation (et production optionnelle).
4. Explorez **Synthèse**, **Consommation**, **Production**.

## Licence
- Code: CC BY 4.0 (voir `LICENSE.txt`).

## Remarques techniques
- Les graphiques sont dessinés en **SVG** pour la réactivité et l'exécution offline.
- Le calcul solaire utilise une approximation NOAA (équation du temps + déclinaison), suffisante pour donner la **tendance journalière**.
