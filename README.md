# Texas Specialist Bees & Pollen Hosts — 0.4.0

A self-contained, GitHub Pages-ready dashboard with Fowler-derived source relationships and separate optional iNaturalist sightings.

## Corrected data

The October 7, 2026 Central-source snapshot contains 329 Texas-listed bee names across six families. Its 1,114 relationships comprise 1,107 unqualified genus entries, two tentative genus entries, three unqualified family entries, and two tentative family entries. There are 179 source genus names; 178 have an unqualified link.

The previous 321-row preview retained the first linked genus for each bee. This release restores multiple hosts per bee, adds eight omitted bee names, and preserves uncertainty and target rank. Genus, garden, and comparison counts exclude tentative and family-only entries. Garden totals count each bee once.

Source-listed associations are not independently verified local interactions. TX qualifies the bee's source distribution, not every host association as observed in Texas. Genus entries do not establish all constituent species as hosts. Source names remain available pending taxonomic reconciliation; family labels are not a complete modern taxonomy reference.

## Source boundary and credit

Relationship compilation: Jarrod Fowler (2020), [Pollen Specialist Bees of the Central United States](https://jarrodfowler.com/bees_pollen.html), accessed October 7, 2026. Interface and aggregation: Glass Root Garden. Sources appear in details, Data Notes, and exports. An original-paper link accompanies the cenizo-associated bee.

iNaturalist supplies optional sightings only; it does not create or verify host relationships. Western, Eastern, and cuckoo-bee records are outside this release. No explicit source reuse license was located. This repository grants no license to source material; author prose and photographs are not bundled. See CREDITS_AND_DATA_USE.txt.

## Files and rebuilding

- index.html embeds the application and qualified dataset for direct opening or GitHub Pages.
- data/bee_relationships.json contains source metadata, counts, and qualified relationships.
- data/bee_plant_names_families.csv retains the original first four columns and adds rank, qualification, source, and provenance columns.
- scripts/dashboard.js is the editable application source, embedded during rebuilding.
- scripts/build_fowler_data.py imports the source with the Python standard library, validates table structure and identity uniqueness, preserves question marks, and regenerates HTML and exports.

```sh
python3 scripts/build_fowler_data.py --source /path/to/bees_pollen.html --retrieved YYYY-MM-DD
```

Omit --source to retrieve the live page. Review changed counts and qualifications before publishing. Source HTML is not committed. Structural changes stop the importer rather than silently dropping rows.

Browser verification starts its own local server and requires Playwright with an installed Chromium browser available to Node:

```sh
node tests/dashboard-smoke.cjs
```

Saved names retain the beeGarden key. Legacy family-level and unknown names remain saved with a review notice and are excluded from genus totals.

GitHub Pages publishes main at the repository root. The versioned service worker caches HTML and exports, removes only this app's older caches, and preserves offline use. Live sightings require internet and explicit location permission.
