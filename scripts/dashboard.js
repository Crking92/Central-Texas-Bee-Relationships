let records = EMBEDDED_RECORDS, plants = [], bees = [], plantMap = new Map(), beeMap = new Map(), comparePlants = [];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const norm = value => String(value ?? '').toLowerCase().trim();
const famLabel = value => value || 'Family not explicitly stated';
const sourceLink = '<a href="https://jarrodfowler.com/bees_pollen.html" target="_blank" rel="noopener">Jarrod Fowler · Central United States</a>';
const sourceCredit = () => `<p class="source-credit">Relationship compilation: ${sourceLink}. Accessed ${esc(EMBEDDED_DATA.retrieved)}. Source-listed links do not establish local occurrence or use of every species in a genus.</p>`;
function getGarden() { try { const saved = JSON.parse(localStorage.getItem('beeGarden') || '[]'); return new Set(Array.isArray(saved) ? saved.filter(value => typeof value === 'string') : []); } catch { return new Set(); } }
function saveGarden(set) { try { localStorage.setItem('beeGarden', JSON.stringify([...set])); } catch {} updateGardenCount(); }
function updateGardenCount() { $('#gardenCount').textContent = getGarden().size; }

function buildIndexes() {
  const pm = new Map(), bm = new Map();
  for (const r of records) {
    if (!pm.has(r.plant_name)) pm.set(r.plant_name, {name:r.plant_name, rank:r.plant_rank, family:'', families:new Set(), bees:[], tentativeBees:[], relationships:[]});
    if (!bm.has(r.bee_name)) bm.set(r.bee_name, {name:r.bee_name, family:r.bee_family, plants:[], familyHosts:[], tentativeHosts:[], relationships:[]});
    const p = pm.get(r.plant_name), b = bm.get(r.bee_name);
    if (r.plant_family) p.families.add(r.plant_family);
    p.relationships.push(r); b.relationships.push(r);
    const bee = {name:r.bee_name, family:r.bee_family};
    const target = {name:r.plant_name, family:r.plant_family, rank:r.plant_rank, qualification:r.qualification};
    if (r.qualification === 'tentative') { p.tentativeBees.push(bee); b.tentativeHosts.push(target); }
    else { p.bees.push(bee); (r.plant_rank === 'family' ? b.familyHosts : b.plants).push(target); }
  }
  for (const p of pm.values()) {
    p.family = p.families.size === 1 ? [...p.families][0] : '';
    p.bees = [...new Map(p.bees.map(b => [b.name, b])).values()];
    p.tentativeBees = [...new Map(p.tentativeBees.map(b => [b.name, b])).values()];
  }
  plantMap = pm; beeMap = bm;
  plants = [...pm.values()].sort((a,b) => b.bees.length-a.bees.length || a.name.localeCompare(b.name));
  bees = [...bm.values()].sort((a,b) => a.name.localeCompare(b.name));
}
function setView(name) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  window.scrollTo({top:0, behavior:'smooth'}); $('#app').focus({preventScroll:true});
  if (name === 'plants') renderPlants();
  if (name === 'bees') renderBees();
  if (name === 'garden') renderGarden();
  if (name === 'compare') renderCompare();
}
function plantCard(p) {
  return `<article class="data-card"><div><div class="card-kicker">${esc(famLabel(p.family))}</div><h3><i>${esc(p.name)}</i></h3><div class="family-label">${p.rank === 'family' ? 'Family-level record · no genus implied' : 'Host genus · source family above'}</div></div><div class="card-foot"><span class="mini-count">${p.bees.length} source-listed bee${p.bees.length === 1 ? '' : 's'}${p.tentativeBees.length ? ` · ${p.tentativeBees.length} tentative` : ''}</span><button class="open-btn" data-open-plant="${esc(p.name)}">Open</button></div></article>`;
}
function beeCard(b) {
  return `<article class="data-card"><div><div class="card-kicker">${esc(b.family)}</div><h3><i>${esc(b.name)}</i></h3><div class="family-label">Bee family</div></div><div class="card-foot"><span class="mini-count">${b.plants.length} listed host genera${b.familyHosts.length ? ` · ${b.familyHosts.length} family-level` : ''}${b.tentativeHosts.length ? ` · ${b.tentativeHosts.length} tentative` : ''}</span><button class="open-btn" data-open-bee="${esc(b.name)}">Open</button></div></article>`;
}
function bindOpeners(root = document) {
  root.querySelectorAll('[data-open-plant]').forEach(button => button.onclick = () => openPlant(button.dataset.openPlant));
  root.querySelectorAll('[data-open-bee]').forEach(button => button.onclick = () => openBee(button.dataset.openBee));
}
function renderHome() {
  $('#stats').innerHTML = `<div class="stat"><strong>${bees.length}</strong><span>Texas-listed specialist bee names</span></div><div class="stat"><strong>${EMBEDDED_DATA.counts.bee_families}</strong><span>Bee families</span></div><div class="stat"><strong>${EMBEDDED_DATA.counts.listed_host_genera}</strong><span>Host genera with unqualified source links</span></div>`;
  $('#featuredPlants').innerHTML = plants.filter(p => p.rank === 'genus' && p.bees.length).slice(0,9).map(plantCard).join('');
  bindOpeners($('#featuredPlants'));
  const families = Object.entries(bees.reduce((all,b) => { all[b.family] = (all[b.family] || 0) + 1; return all; }, {})).sort((a,b) => b[1]-a[1]);
  $('#familyStrip').innerHTML = families.map(([family,count]) => `<button class="family-pill" data-bee-family="${esc(family)}"><strong>${esc(family)}</strong><span>${count} bee names</span></button>`).join('');
  $$('#familyStrip [data-bee-family]').forEach(button => button.onclick = () => { setView('bees'); $('#beeFamilyFilter').value = button.dataset.beeFamily; renderBees(); });
}
function populateFilters() {
  $('#plantFamilyFilter').innerHTML = '<option value="">All source plant families</option>' + [...new Set(plants.map(p => p.family).filter(Boolean))].sort().map(f => `<option>${esc(f)}</option>`).join('');
  $('#beeFamilyFilter').innerHTML = '<option value="">All bee families</option>' + [...new Set(bees.map(b => b.family))].sort().map(f => `<option>${esc(f)}</option>`).join('');
  $('#compareSelect').innerHTML = '<option value="">Choose a host genus...</option>' + plants.filter(p => p.rank === 'genus').sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${esc(p.name)}">${esc(p.name)} — ${esc(famLabel(p.family))}</option>`).join('');
}
function renderPlants() {
  const q = norm($('#plantFilter').value), family = $('#plantFamilyFilter').value;
  const list = plants.filter(p => (!q || norm(p.name).includes(q) || norm(p.family).includes(q)) && (!family || p.family === family));
  $('#plantList').innerHTML = list.length ? list.map(plantCard).join('') : '<div class="empty-state">No matching source host names.</div>';
  bindOpeners($('#plantList'));
}
function renderBees() {
  const q = norm($('#beeFilter').value), family = $('#beeFamilyFilter').value;
  const list = bees.filter(b => (!q || norm(b.name).includes(q) || norm(b.family).includes(q)) && (!family || b.family === family));
  $('#beeList').innerHTML = list.length ? list.map(beeCard).join('') : '<div class="empty-state">No matching bee names.</div>';
  bindOpeners($('#beeList'));
}
function beeRows(items) {
  return [...items].sort((a,b) => a.name.localeCompare(b.name)).map(b => `<button class="relationship" data-open-bee="${esc(b.name)}"><b><i>${esc(b.name)}</i></b><span>${esc(b.family)}</span></button>`).join('');
}
function openPlant(name) {
  const p = plantMap.get(name); if (!p) return;
  const saved = getGarden().has(name);
  $('#modalBody').innerHTML = `<div class="eyebrow">${p.rank === 'genus' ? 'Host genus' : 'Family-level source record'}</div><h2 id="modalTitle" class="modal-title"><i>${esc(p.name)}</i></h2><div class="modal-family">${esc(famLabel(p.family))}</div>${p.rank === 'family' ? '<p class="evidence-note">This record names a family only. It does not confirm any particular genus or species and is excluded from genus-based garden totals.</p>' : ''}<div class="relationship-list"><div class="card-kicker">${p.bees.length} unqualified source-listed bee${p.bees.length === 1 ? '' : 's'}</div>${p.bees.length ? beeRows(p.bees) : '<p>No unqualified relationship is listed for this target.</p>'}</div>${p.tentativeBees.length ? `<section class="evidence-note"><h3>Tentative source entries</h3><p>Question-marked relationships are shown here and excluded from the ordinary count.</p>${beeRows(p.tentativeBees)}</section>` : ''}${sourceCredit()}${p.rank === 'genus' || saved ? `<div class="modal-actions"><button id="modalGarden" class="garden-btn ${saved ? 'secondary' : ''}">${saved ? 'Remove from My Garden' : 'Add to My Garden'}</button></div>` : ''}`;
  showModal(); bindOpeners($('#modalBody'));
  const button = $('#modalGarden');
  if (button) button.onclick = () => { const set = getGarden(); set.has(name) ? set.delete(name) : set.add(name); saveGarden(set); openPlant(name); };
}
function hostRows(items) {
  return [...items].sort((a,b) => a.name.localeCompare(b.name)).map(p => `<button class="relationship" data-open-plant="${esc(p.name)}"><b><i>${esc(p.name)}</i></b><span>${p.rank === 'family' ? 'Family only' : 'Genus'}${p.qualification === 'tentative' ? ' · tentative' : ''}</span></button>`).join('');
}
function openBee(name) {
  const b = beeMap.get(name); if (!b) return;
  const reference = b.relationships.find(r => r.supporting_reference_url);
  $('#modalBody').innerHTML = `<div class="eyebrow">Texas-listed bee</div><h2 id="modalTitle" class="modal-title"><i>${esc(b.name)}</i></h2><div class="modal-family">${esc(b.family)}</div><div class="relationship-list"><div class="card-kicker">Unqualified source-listed host genera</div>${b.plants.length ? hostRows(b.plants) : '<p>No unqualified genus-level host is specified.</p>'}</div>${b.familyHosts.length ? `<section class="evidence-note"><h3>Family-level records</h3><p>No particular genus or species is established by these entries.</p>${hostRows(b.familyHosts)}</section>` : ''}${b.tentativeHosts.length ? `<section class="evidence-note"><h3>Tentative source entries</h3><p>Excluded from ordinary host counts.</p>${hostRows(b.tentativeHosts)}</section>` : ''}${sourceCredit()}${reference ? `<p class="source-credit">Additional research: <a href="${esc(reference.supporting_reference_url)}" target="_blank" rel="noopener">Bossert, Zabinski &amp; Neff (2026)</a> documents pollen specialization on <i>Leucophyllum frutescens</i>. This does not establish Hays County occurrence.</p>` : ''}<div class="inat-box"><div class="card-kicker">iNaturalist sightings</div><p class="family-label">Optional live occurrence check. Observations do not establish the pollen-host relationship.</p><button id="inatNearMe" class="garden-btn">Check sightings near me</button><div id="inatResult"></div></div>`;
  showModal(); bindOpeners($('#modalBody')); $('#inatNearMe').onclick = () => checkINatNearMe(b);
}
async function checkINatNearMe(b) {
  const box = $('#inatResult'); if (!box) return;
  box.innerHTML = '<p>Requesting your location…</p>';
  if (!navigator.geolocation) { box.textContent = 'Location is unavailable in this browser.'; return; }
  navigator.geolocation.getCurrentPosition(async position => {
    if (!box.isConnected) return;
    box.textContent = 'Checking iNaturalist within 50 km…';
    try {
      const params = new URLSearchParams({taxon_name:b.name, lat:position.coords.latitude, lng:position.coords.longitude, radius:50, quality_grade:'research,needs_id', order_by:'observed_on', order:'desc', per_page:10});
      const response = await fetch('https://api.inaturalist.org/v1/observations?' + params);
      if (!response.ok) throw Error('iNaturalist request failed. Please try again.');
      const data = await response.json(); if (!box.isConnected) return;
      const count = Number(data.total_results || 0);
      box.innerHTML = `<p><strong>${count}</strong> matching observation${count === 1 ? '' : 's'} within 50 km. An absence of records does not establish absence of the bee.</p>` + (data.results || []).slice(0,5).map(observation => `<a class="compact-row" href="https://www.inaturalist.org/observations/${encodeURIComponent(observation.id)}" target="_blank" rel="noopener"><b>${esc(observation.observed_on || 'Date not listed')}</b><span>Open observation</span></a>`).join('');
    } catch (error) { if (box.isConnected) box.textContent = error.message; }
  }, () => { if (box.isConnected) box.textContent = 'Location permission was not granted or a location could not be obtained.'; }, {enableHighAccuracy:false, timeout:10000, maximumAge:300000});
}
let modalReturnFocus = null;
function showModal() {
  if (!$('#modal').classList.contains('open')) modalReturnFocus = document.activeElement;
  $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden','false'); $('.modal-close').focus();
}
function closeModal() {
  $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden','true');
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
function renderGarden() {
  const names = [...getGarden()], ps = names.map(n => plantMap.get(n)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
  const unsupported = names.filter(n => !plantMap.has(n) || plantMap.get(n).rank !== 'genus');
  $('#gardenEmpty').innerHTML = !names.length ? 'Your garden is empty. Open a host genus and choose <b>Add to My Garden</b>.' : unsupported.length ? `<strong>Saved names needing review:</strong> ${unsupported.map(esc).join(', ')}. These are preserved but excluded from genus-based bee totals.` : '';
  $('#gardenEmpty').style.display = $('#gardenEmpty').innerHTML ? 'block' : 'none';
  $('#gardenPlants').innerHTML = ps.map(plantCard).join(''); bindOpeners($('#gardenPlants'));
  const unique = new Map(); ps.filter(p => p.rank === 'genus').forEach(p => p.bees.forEach(b => unique.set(b.name,b)));
  const bs = [...unique.values()].sort((a,b) => a.name.localeCompare(b.name));
  $('#gardenBeePanel').style.display = names.length ? 'block' : 'none';
  $('#gardenBeeTotal').textContent = `${bs.length} unique source-linked bees`;
  $('#gardenBees').innerHTML = bs.map(b => `<button class="compact-row" data-open-bee="${esc(b.name)}"><b><i>${esc(b.name)}</i></b><span>${esc(b.family)}</span></button>`).join('');
  bindOpeners($('#gardenBees'));
}
function renderCompare() {
  $('#compareChips').innerHTML = comparePlants.map(name => `<span class="selected-chip"><i>${esc(name)}</i><button data-remove-compare="${esc(name)}" aria-label="Remove ${esc(name)}">×</button></span>`).join('');
  $$('[data-remove-compare]').forEach(button => button.onclick = () => { comparePlants = comparePlants.filter(name => name !== button.dataset.removeCompare); renderCompare(); });
  if (!comparePlants.length) { $('#compareResult').innerHTML = '<div class="empty-state">Choose host genera to compare their source-linked bees.</div>'; return; }
  const ps = comparePlants.map(name => plantMap.get(name)), sets = ps.map(p => new Set(p.bees.map(b => b.name)));
  const union = new Set(sets.flatMap(set => [...set])), shared = [...sets[0]].filter(name => sets.every(set => set.has(name)));
  $('#compareResult').innerHTML = `<p class="evidence-note">${union.size} unique source-linked bees across these genera · ${shared.length} shared by every selected genus. Tentative and family-only entries are excluded.</p><div class="comparison-scroll"><table class="compare-table"><thead><tr>${ps.map(p => `<th scope="col"><i>${esc(p.name)}</i><br><span class="family-label">${esc(famLabel(p.family))}</span></th>`).join('')}</tr></thead><tbody><tr>${ps.map(p => `<td><div class="card-kicker">${p.bees.length} source-linked bees</div><ul class="compare-list">${[...p.bees].sort((a,b) => a.name.localeCompare(b.name)).map(b => `<li><i>${esc(b.name)}</i> <span class="family-label">${esc(b.family)}</span></li>`).join('')}</ul></td>`).join('')}</tr></tbody></table></div>`;
}
function setupSearch() {
  const input = $('#mainSearch'), box = $('#suggestions'); let active = -1;
  function draw() {
    const q = norm(input.value); active = -1;
    const pp = q ? plants.filter(p => norm(p.name).includes(q) || norm(p.family).includes(q)).sort((a,b) => (norm(a.name) === q ? -1 : norm(b.name) === q ? 1 : 0)).slice(0,6).map(p => ({type:'plant', name:p.name, family:p.family})) : [];
    const bb = q ? bees.filter(b => norm(b.name).includes(q) || norm(b.family).includes(q)).slice(0,6).map(b => ({type:'bee', name:b.name, family:b.family})) : [];
    const choices = [...pp,...bb].slice(0,10);
    box.innerHTML = choices.map((choice,i) => `<button class="suggestion" data-type="${choice.type}" data-name="${esc(choice.name)}"><span><b><i>${esc(choice.name)}</i></b><br><small>${esc(famLabel(choice.family))}</small></span><small>${choice.type}</small></button>`).join('');
    box.hidden = !choices.length;
    box.querySelectorAll('.suggestion').forEach(button => button.onclick = () => { box.hidden = true; input.value = button.dataset.name; button.dataset.type === 'plant' ? openPlant(button.dataset.name) : openBee(button.dataset.name); });
  }
  input.addEventListener('input',draw);
  input.addEventListener('keydown', event => {
    const choices = box.hidden ? [] : [...box.querySelectorAll('.suggestion')];
    if (event.key === 'Escape') { box.hidden = true; return; }
    if (!choices.length) return;
    if (event.key === 'ArrowDown') active = (active+1)%choices.length;
    else if (event.key === 'ArrowUp') active = (active-1+choices.length)%choices.length;
    else if (event.key === 'Enter') { event.preventDefault(); choices[Math.max(active,0)].click(); return; }
    else return;
    event.preventDefault(); choices.forEach((choice,i) => choice.classList.toggle('active',i === active));
  });
  $('#clearSearch').onclick = () => { input.value = ''; box.hidden = true; input.focus(); };
  $$('[data-query]').forEach(button => button.onclick = () => { input.value = button.dataset.query; draw(); input.focus(); });
  document.addEventListener('click', event => { if (!event.target.closest('.search-shell')) box.hidden = true; });
}
function init() {
  buildIndexes(); populateFilters(); renderHome(); updateGardenCount(); setupSearch();
  $$('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#plantFilter').addEventListener('input',renderPlants); $('#plantFamilyFilter').addEventListener('change',renderPlants);
  $('#beeFilter').addEventListener('input',renderBees); $('#beeFamilyFilter').addEventListener('change',renderBees);
  $('#clearGarden').onclick = () => { if (confirm('Remove all saved plants from My Garden?')) { saveGarden(new Set()); renderGarden(); } };
  $('#addCompare').onclick = () => { const name = $('#compareSelect').value; if (name && !comparePlants.includes(name) && comparePlants.length < 4) { comparePlants.push(name); renderCompare(); } else if (comparePlants.length >= 4) alert('Compare supports up to four plants at a time.'); };
  $$('[data-close-modal]').forEach(button => button.onclick = closeModal);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab' && $('#modal').classList.contains('open')) {
      const focusable = [...$('#modal').querySelectorAll('button, a[href]')].filter(element => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  try { if (localStorage.getItem('beeTheme') === 'dark') document.body.classList.add('dark'); } catch {}
  $('#themeBtn').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('beeTheme',document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };
  if (location.protocol !== 'file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
init();
