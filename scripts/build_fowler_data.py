#!/usr/bin/env python3
"""Build factual Texas relationships from Fowler's Central table.

Usage: python3 scripts/build_fowler_data.py --source /path/to/bees_pollen.html
The downloaded HTML stays outside the repository; no source prose is reproduced.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

SOURCE_URL = 'https://jarrodfowler.com/bees_pollen.html'
ROOT = Path(__file__).resolve().parents[1]


class SourceTable(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.done = False
        self.rows = []
        self.row = None
        self.cell = None
        self.link = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'table' and not self.done:
            self.depth += 1
        if self.depth != 1 or self.done:
            return
        if tag == 'tr':
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            if self.cell is not None:
                self.row.append(self.cell)
            self.cell = {'parts': [], 'links': []}
        elif tag == 'a' and self.cell is not None:
            self.link = {'parts': [], 'url': attrs.get('href', '')}

    def handle_data(self, data):
        if self.cell is not None:
            self.cell['parts'].append(data)
        if self.link is not None:
            self.link['parts'].append(data)

    def handle_endtag(self, tag):
        if self.depth != 1 or self.done:
            return
        if tag == 'a' and self.link is not None:
            self.cell['links'].append(self.link)
            self.link = None
        elif tag in ('td', 'th') and self.cell is not None:
            self.row.append(self.cell)
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            if self.cell is not None:
                self.row.append(self.cell)
                self.cell = None
            self.rows.append(self.row)
            self.row = None
        elif tag == 'table':
            self.depth = 0
            self.done = True


def text(cell):
    return ' '.join(''.join(cell['parts']).split())


def build(source_bytes, retrieved):
    parser = SourceTable()
    parser.feed(source_bytes.decode('utf-8'))
    if not parser.rows or len(parser.rows[0]) != 18:
        raise ValueError('Source table structure changed; review before import.')
    records = []
    family = ''
    bee_names = set()
    all_bees = set()
    for row_number, cells in enumerate(parser.rows[1:], 1):
        if len(cells) != 18:
            raise ValueError(f'Source row {row_number} has {len(cells)} cells, expected 18.')
        if text(cells[0]):
            family = text(cells[0]).split(':')[0].strip()
        bee = re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', text(cells[1]))).strip()
        if not re.fullmatch(r'[A-Z][a-z]+ [a-z][a-z-]+', bee):
            raise ValueError(f'Unexpected bee name: {bee}')
        if bee in all_bees:
            raise ValueError(f'Duplicate bee identity: {bee}')
        all_bees.add(bee)
        if 'TX' not in re.findall(r'\b[A-Z]{2}\b', text(cells[3])):
            continue
        bee_names.add(bee)
        host = cells[17]
        host_text = text(host)
        # Plant-family metadata is explicitly source-labelled, not modern taxonomy.
        stated_families = set(re.findall(r'\b[A-Z][a-z]+aceae\b', host_text))
        source_family = next(iter(stated_families)) if len(stated_families) == 1 else ''
        bee_links = cells[1]['links']
        bee_url = bee_links[0]['url'] if bee_links else ''
        genera = {}
        family_links = {}
        for link in host['links']:
            label = text(link)
            m = re.match(r'([A-Z][a-z]+)\b', label)
            if not m:
                continue
            plant = m[1]
            if plant.endswith('aceae'):
                family_links[plant] = link['url']
                continue
            if plant.endswith('eae'):
                continue  # A tribe is not a family or genus.
            # A question mark directly follows these source labels; never promote it.
            position = host_text.find(label)
            tentative = position >= 0 and bool(re.match(r'\s*\?', host_text[position + len(label):]))
            info = {'name': plant, 'url': link['url'], 'tentative': tentative}
            if plant in genera and genera[plant] != info:
                raise ValueError(f'Conflicting duplicate host for {bee}: {plant}')
            genera[plant] = info
        targets = []
        if genera:
            for plant, info in genera.items():
                targets.append((plant, 'genus', 'tentative' if info['tentative'] else 'listed',
                                '' if info['tentative'] else source_family, info['url']))
        else:
            for plant in sorted(stated_families):
                tentative = bool(re.search(re.escape(plant) + r'\s*\?', host_text))
                targets.append((plant, 'family', 'tentative' if tentative else 'listed', plant,
                                family_links.get(plant, '')))
        if not targets:
            raise ValueError(f'No host target identified for {bee}; manual review required.')
        for plant, rank, qualification, plant_family, plant_url in targets:
            record = {
                'bee_name': bee, 'bee_family': family, 'plant_name': plant,
                'plant_family': plant_family, 'plant_rank': rank,
                'qualification': qualification, 'relationship_type': 'pollen_host',
                'source_id': 'fowler-central-2020', 'source_url': SOURCE_URL,
                'source_accessed': retrieved, 'source_row': row_number,
                'bee_texas_listed': True, 'bee_profile_url': bee_url,
                'plant_profile_url': plant_url,
                'plant_family_basis': 'explicit_source_label' if plant_family else 'not_stated',
            }
            if bee == 'Andrena cenizophila':
                record['supporting_reference_url'] = 'https://doi.org/10.17161/jom.vi141.24606'
            records.append(record)
    records.sort(key=lambda r: (r['bee_name'], r['plant_rank'], r['plant_name']))
    keys = {(r['bee_name'], r['plant_name'], r['plant_rank']) for r in records}
    if len(keys) != len(records):
        raise ValueError('Duplicate bee–host relationships.')
    counts = {
        'bees': len(bee_names),
        'bee_families': len({r['bee_family'] for r in records}),
        'relationships': len(records),
        'listed_genus_relationships': sum(r['plant_rank'] == 'genus' and r['qualification'] == 'listed' for r in records),
        'tentative_genus_relationships': sum(r['plant_rank'] == 'genus' and r['qualification'] == 'tentative' for r in records),
        'listed_family_relationships': sum(r['plant_rank'] == 'family' and r['qualification'] == 'listed' for r in records),
        'tentative_family_relationships': sum(r['plant_rank'] == 'family' and r['qualification'] == 'tentative' for r in records),
        'host_genera': len({r['plant_name'] for r in records if r['plant_rank'] == 'genus'}),
        'listed_host_genera': len({r['plant_name'] for r in records if r['plant_rank'] == 'genus' and r['qualification'] == 'listed'}),
    }
    return {
        'version': '0.4.0', 'retrieved': retrieved,
        'source_sha256': hashlib.sha256(source_bytes).hexdigest(),
        'sources': [{'id': 'fowler-central-2020', 'author': 'Jarrod Fowler',
                     'title': 'Pollen Specialist Bees of the Central United States',
                     'year': 2020, 'url': SOURCE_URL, 'accessed': retrieved,
                     'license': 'No explicit reuse license located; no license is granted by this dashboard.'}],
        'scope': 'Bees with TX in the Central source States cell; source-listed host targets across the source region, not county-confirmed interactions.',
        'counts': counts, 'records': records,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', type=Path, help='Downloaded source HTML; otherwise fetch the source URL.')
    ap.add_argument('--retrieved', default=date.today().isoformat())
    args = ap.parse_args()
    data = args.source.read_bytes() if args.source else urllib.request.urlopen(SOURCE_URL, timeout=30).read()
    bundle = build(data, args.retrieved)
    (ROOT / 'data').mkdir(exist_ok=True)
    (ROOT / 'data/bee_relationships.json').write_text(json.dumps(bundle, indent=2) + '\n', encoding='utf-8')
    fields = list(bundle['records'][0])
    if 'supporting_reference_url' not in fields:
        fields.append('supporting_reference_url')
    with (ROOT / 'data/bee_plant_names_families.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(bundle['records'])
    page = ROOT / 'index.html'
    markup = page.read_text(encoding='utf-8')
    payload = json.dumps(bundle, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    if 'const EMBEDDED_DATA=' in markup:
        markup, count = re.subn(r'const EMBEDDED_DATA=.*?;\n', lambda _: 'const EMBEDDED_DATA=' + payload + ';\n', markup, count=1)
    else:
        markup, count = re.subn(r'const EMBEDDED_RECORDS=.*?;\n', lambda _: 'const EMBEDDED_DATA=' + payload + ';\nconst EMBEDDED_RECORDS=EMBEDDED_DATA.records;\n', markup, count=1)
    if count != 1:
        raise ValueError('Could not replace the embedded dataset exactly once.')
    app_source = ROOT / 'scripts/dashboard.js'
    if app_source.exists():
        marker = 'const EMBEDDED_RECORDS=EMBEDDED_DATA.records;'
        before, after = markup.split(marker, 1)
        _, suffix = after.split('</script>', 1)
        markup = before + marker + '\n' + app_source.read_text(encoding='utf-8') + '\n</script>' + suffix
    css_source = ROOT / 'scripts/dashboard.css'
    if css_source.exists():
        markup = re.sub(r'<style>.*?</style>', lambda _: '<style>\n' + css_source.read_text(encoding='utf-8') + '</style>', markup, count=1, flags=re.S)
    page.write_text(markup, encoding='utf-8')
    print(json.dumps(bundle['counts'], indent=2))


if __name__ == '__main__':
    main()
