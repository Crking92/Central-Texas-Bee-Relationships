# Texas Specialist Bees & Pollen Hosts — v0.2

A static GitHub Pages/PWA preview modeled after the workflow of the Texas Lepidoptera Dashboard.

## Source rule
- **Bee ↔ pollen-host relationships:** Jarrod Fowler only: https://jarrodfowler.com/bees_pollen.html
- **Optional live sightings:** iNaturalist only: https://www.inaturalist.org/
- No GloBI, UDELep, Wildflower Center, or other interaction/taxonomic database is used to add biological relationships or fill missing plant families in this release.

## Public biological fields
The bundled CSV/JSON contains exactly four fields:
- `bee_name`
- `bee_family`
- `plant_name`
- `plant_family`

Blank plant-family values are intentional when the captured Fowler-derived source rows did not state that family anywhere that could be propagated within the same source.

## Snapshot limitation
The build input contains 321 Texas Fowler-derived bee rows. Fowler's current page reports 329 Texas species, so v0.2 is explicitly an incomplete snapshot. It also contains one captured pollen-host name per bee rather than Fowler's full host breadth.

## GitHub Pages
Upload every file and folder from this directory to the root of a GitHub repository, then enable **Settings → Pages → Deploy from a branch → main → /(root)**.

The iNaturalist sighting button uses the visitor's browser geolocation only after they click it and grant permission.
