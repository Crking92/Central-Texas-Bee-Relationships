# Texas Specialist Bees & Pollen Hosts - v0.3

GitHub Pages-ready static dashboard.

## Source boundary

- Bee-plant pollen-specialist relationships: Jarrod Fowler only.
- iNaturalist: optional live bee sightings only; never used to add or alter host relationships.
- No GloBI, UDELep, Wildflower Center, or other interaction databases are used to create dashboard relationships.

## Why v0.3 is more robust

The core CSS, JavaScript, and 321-row Fowler-derived preview dataset are embedded directly in `index.html`. The dashboard therefore does not depend on a separate JSON or JavaScript file loading successfully before search works.

The separate `data/bee_plant_names_families.csv` file is included only for the Download CSV feature.

## GitHub Pages

Upload **everything inside this folder** to the root of the repository. Then set GitHub Pages to deploy from `main` and `/(root)`.

A fresh service-worker cache name (`texas-specialist-bees-v0-3`) is included so older dashboard caches are discarded after the new service worker activates.
