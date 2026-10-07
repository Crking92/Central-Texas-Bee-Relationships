// Run against python3 -m http.server 8765. Requires Playwright.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let server;
let base = process.env.BEE_TEST_URL;
(async () => {
  if (!base) {
    server = require('node:http').createServer((req,res) => {
      const target = path.join(root, new URL(req.url,'http://localhost').pathname === '/' ? 'index.html' : decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const types = {'.html':'text/html','.js':'application/javascript','.json':'application/json','.csv':'text/csv','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
      fs.readFile(target,(error,content) => { if(error) res.writeHead(404).end(); else { res.setHeader('Content-Type',types[path.extname(target)] || 'application/octet-stream'); res.end(content); } });
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    base = `http://127.0.0.1:${server.address().port}/`;
  }
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/bee_relationships.json')));
  assert.equal(data.records.length, 1114);
  assert.equal(new Set(data.records.map(r => r.bee_name)).size, 329);
  assert.equal(new Set(data.records.map(r => `${r.bee_name}|${r.plant_rank}|${r.plant_name}`)).size, 1114);
  assert.equal(data.records.filter(r => r.qualification === 'tentative').length, 4);
  assert.equal(data.records.filter(r => r.plant_rank === 'family').length, 5);
  assert(data.records.every(r => r.source_url && r.source_accessed && r.bee_texas_listed));
  const csv = fs.readFileSync(path.join(root, 'data/bee_plant_names_families.csv'), 'utf8').trim().split(/\r?\n/);
  assert.equal(csv.length, 1115);
  assert.equal(csv[0].split(',').slice(0,4).join(','), 'bee_name,bee_family,plant_name,plant_family');
  const browser = await chromium.launch({headless:true, ...(process.env.BEE_CHROMIUM_PATH ? {executablePath:process.env.BEE_CHROMIUM_PATH} : {})});
  try {
    const context = await browser.newContext({viewport:{width:1280,height:900}, geolocation:{latitude:30.01,longitude:-98.08},permissions:['geolocation']});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { if (!localStorage.getItem('beeGarden')) localStorage.setItem('beeGarden', JSON.stringify(['Helianthus','Asteraceae','Legacy unknown'])); });
    await page.goto(base);
    assert.deepEqual(await page.locator('#stats strong').allTextContents(), ['329','6','178']);
    assert.deepEqual(await page.evaluate(() => EMBEDDED_DATA), data);
    const expected = {Helianthus:72,Solidago:26,Heterotheca:51,Verbesina:46,Grindelia:39,Coreopsis:22};
    for (const [name,count] of Object.entries(expected)) assert.equal(await page.evaluate(n => plantMap.get(n).bees.length,name),count);
    for (const name of ['Andrena brevipalpis','Andrena cenizophila','Anthidium psoraleae','Hylaeus sparsus','Lasioglossum nelumbonis','Megachile campanulae','Megachile frugalis','Nomia universitatis']) assert(await page.evaluate(n => beeMap.has(n),name));
    assert.deepEqual(await page.evaluate(() => [plantMap.get('Enceliopsis').bees.length,plantMap.get('Enceliopsis').tentativeBees.length]), [0,1]);
    assert.deepEqual(await page.evaluate(() => [beeMap.get('Megachile perihirta').plants.length,beeMap.get('Megachile perihirta').tentativeHosts.length]), [0,2]);
    await page.locator('#mainSearch').fill('Solidago');
    await page.locator('#mainSearch').press('Enter');
    assert.equal(await page.locator('#modalTitle').innerText(),'Solidago');
    assert.equal(await page.locator('#modalBody [data-open-bee]').count(),26);
    assert(await page.locator('#modalBody').innerText().then(t => t.includes('Jarrod Fowler')));
    await page.locator('#modalGarden').click();
    await page.locator('.modal-close').click();
    await page.locator('[data-view="garden"]').click();
    const unique = await page.evaluate(() => new Set(['Helianthus','Solidago'].flatMap(n => plantMap.get(n).bees.map(b => b.name))).size);
    assert.equal(await page.locator('#gardenBeeTotal').innerText(), `${unique} unique source-linked bees`);
    assert(await page.locator('#gardenEmpty').innerText().then(t => t.includes('Asteraceae') && t.includes('Legacy unknown')));
    assert.deepEqual(await page.evaluate(() => [...getGarden()].sort()),['Asteraceae','Helianthus','Legacy unknown','Solidago']);
    await page.locator('[data-view="compare"]').click();
    for(const name of ['Helianthus','Solidago']) { await page.locator('#compareSelect').selectOption(name); await page.locator('#addCompare').click(); }
    const shared = await page.evaluate(() => plantMap.get('Helianthus').bees.filter(b => plantMap.get('Solidago').bees.some(c => c.name === b.name)).length);
    assert(await page.locator('#compareResult').innerText().then(t => t.includes(`${unique} unique`) && t.includes(`${shared} shared`)));
    assert.equal(await page.locator('#compareSelect option[value="Asteraceae"]').count(),0);
    await page.evaluate(() => openBee('Andrena cenizophila'));
    assert.equal(await page.locator('#modalBody a[href="https://doi.org/10.17161/jom.vi141.24606"]').count(),1);
    await page.route('https://api.inaturalist.org/**', async route => {
      const url = new URL(route.request().url());
      assert.equal(url.searchParams.get('taxon_name'),'Andrena cenizophila');
      assert.equal(url.searchParams.get('radius'),'50');
      await route.fulfill({json:{total_results:1,results:[{id:123,observed_on:'2026-05-01'}]}});
    });
    await page.locator('#inatNearMe').click();
    await page.locator('#inatResult a').waitFor();
    assert.equal(await page.locator('#inatResult a').getAttribute('href'),'https://www.inaturalist.org/observations/123');
    await page.locator('.modal-close').click();
    await page.locator('#themeBtn').click();
    assert(await page.locator('body').evaluate(el => el.classList.contains('dark')));
    await page.locator('#themeBtn').click();
    await page.locator('[data-view="home"]').first().click();
    if (process.env.BEE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.BEE_SCREENSHOTS,'bee-desktop.png'),fullPage:true});
    await page.setViewportSize({width:375,height:812});
    for (const view of ['home','plants','bees','garden','compare','about']) {
      await page.evaluate(name => setView(name),view);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`Mobile overflow: ${view}`);
    }
    if (process.env.BEE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.BEE_SCREENSHOTS,'bee-mobile.png'),fullPage:true});
    await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})); });
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.locator('#stats strong').first().innerText(),'329');
    assert.equal(await page.evaluate(async () => (await (await fetch('data/bee_relationships.json')).json()).records.length),1114);
    await context.setOffline(false);
    assert.deepEqual(errors,[]);
    await context.close();
    const direct = await browser.newPage();
    await direct.goto('file://' + path.join(root,'index.html'));
    assert.equal(await direct.locator('#stats strong').first().innerText(),'329');
    await direct.close();
    console.log(`PASS: integrity, 8 restored bees, host counts, qualifiers, search, garden (${unique} unique), comparison (${shared} shared), mocked sightings, theme, mobile overflow, offline exports, direct-file load.`);
  } finally { await browser.close(); if(server) server.close(); }
})().catch(error => { console.error(error); if(server) server.close(); process.exitCode=1; });
