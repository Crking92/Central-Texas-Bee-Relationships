let records = EMBEDDED_RECORDS, plants = [], bees = [], plantMap = new Map(), beeMap = new Map(), comparePlants = [];
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const norm = value => String(value ?? '').toLowerCase().trim();
// Common names are navigation aids for plant groups, never species-level host claims.
const COMMON_NAMES = {Helianthus:'Sunflowers',Solidago:'Goldenrods',Coreopsis:'Tickseeds',Salix:'Willows',Gaillardia:'Blanketflowers',Salvia:'Sages',Liatris:'Blazing stars',Rudbeckia:'Black-eyed Susans',Monarda:'Bee balms'};
const plantLabel = p => COMMON_NAMES[p.name] || p.name;
const plantMatches = (p,q) => norm(p.name + ' ' + (COMMON_NAMES[p.name] || '') + ' ' + p.family).includes(q);
function beeArt() {
  return '<svg viewBox="0 0 140 100" aria-hidden="true"><path d="M10 73Q45 30 77 55" fill="none" stroke="#91a07b" stroke-dasharray="3 6"/><g transform="translate(90 47) rotate(-13)"><ellipse cx="-4" cy="-14" rx="10" ry="16" fill="#fffdf2" stroke="#b4bfa0" transform="rotate(-20)"/><ellipse cx="14" cy="-14" rx="9" ry="16" fill="#fffdf2" stroke="#b4bfa0" transform="rotate(18)"/><ellipse rx="28" ry="18" fill="#e8b953"/><path d="M-13-16Q-6 0-13 16M3-18Q10 0 3 18M18-12Q23 0 18 12" fill="none" stroke="#46543c" stroke-width="6"/><circle cx="-28" cy="-2" r="12" fill="#46543c"/><circle cx="-31" cy="-5" r="2" fill="#fffdf2"/></g></svg>';
}
function flowerArt(name) {
  const colors = {Helianthus:['#f1ead2','#e6b64b'],Solidago:['#edf0d9','#d9b740'],Coreopsis:['#f4e5cf','#e4aa53'],Salvia:['#eee6ed','#a287b5'],Gaillardia:['#f2e2d5','#c57862'],Salix:['#e4ecdf','#a4b586']};
  const [bg,petal] = colors[name] || ['#e8eedf','#b8b68d'];
  const leaves = '<path d="M144 116Q101 81 107 110Q118 127 145 128M145 87Q178 62 179 87Q167 105 145 105" fill="#7e9665"/>';
  let flowers = '';
  if (name === 'Salix') {
    flowers = '<path d="M144 139Q133 62 161 19M144 96 113 62M148 73 181 42" fill="none" stroke="#667e55" stroke-width="4"/>' + [[150,51],[114,58],[181,39]].map(([x,y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="20" fill="${petal}" transform="rotate(20 ${x} ${y})"/>`).join('');
  } else if (name === 'Solidago' || name === 'Salvia') {
    flowers = '<path d="M145 145Q141 62 148 23" stroke="#6b8557" stroke-width="4" fill="none"/>' + leaves + Array.from({length:7},(_,i) => `<g transform="translate(147 ${28+i*9})"><ellipse cx="-${3+i}" rx="${5+i*1.5}" ry="5" fill="${petal}" transform="rotate(25)"/><ellipse cx="${3+i}" rx="${5+i*1.5}" ry="5" fill="${petal}" transform="rotate(-25)"/></g>`).join('');
  } else {
    flowers = '<path d="M145 66Q139 99 146 145" stroke="#6b8557" stroke-width="4" fill="none"/>' + leaves + `<g transform="translate(145 57)">${Array.from({length:10},(_,i)=>`<ellipse cy="-21" rx="8" ry="23" transform="rotate(${i*36})" fill="${petal}"/>`).join('')}<circle r="16" fill="#765138"/><circle r="9" fill="#aa7e49"/></g>`;
  }
  return {bg,svg:`<svg viewBox="0 0 300 150" aria-hidden="true"><circle cx="145" cy="77" r="63" fill="#ffffff" opacity=".32"/>${flowers}<path d="M219 57Q246 46 253 67" fill="none" stroke="#7e9665" stroke-dasharray="3 5"/><circle cx="226" cy="42" r="3" fill="${petal}"/><circle cx="82" cy="47" r="3" fill="${petal}"/><path d="m64 98 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#fffdf0"/></svg>`};
}
const famLabel = value => value || 'Plant group';
const sourceLink = '<a href="https://jarrodfowler.com/bees_pollen.html" target="_blank" rel="noopener">Jarrod Fowler · Central United States</a>';
const sourceCredit = () => `<p class="source-credit">Connections compiled by ${sourceLink}. Listed for bees found in Texas; a link does not confirm local use or every species in the plant group. <a href="#" data-source-notes>About the sources</a></p>`;
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
  const art = flowerArt(p.name), label = plantLabel(p);
  return `<article class="data-card"><button class="card-art" style="--art-bg:${art.bg}" data-open-plant="${esc(p.name)}" aria-label="Explore ${esc(label)}">${art.svg}</button><div class="card-content"><h3>${COMMON_NAMES[p.name] ? esc(label) : `<i>${esc(p.name)}</i>`}</h3>${COMMON_NAMES[p.name] ? `<div class="latin-name">${esc(p.name)}</div>` : ''}${p.rank === 'family' ? '<div class="family-label">Family-wide link · no particular plant specified</div>' : ''}</div><div class="card-foot"><span class="mini-count"><b>${p.bees.length}</b> bee connection${p.bees.length === 1 ? '' : 's'}${p.tentativeBees.length ? ` · ${p.tentativeBees.length} possible` : ''}</span><button class="open-btn" data-open-plant="${esc(p.name)}">Meet the bees <span aria-hidden="true">→</span></button></div></article>`;
}
function beeCard(b) {
  return `<article class="data-card"><div class="card-art" style="--art-bg:#e9eddc">${beeArt()}</div><div class="card-content"><div class="card-kicker">${esc(b.family)}</div><h3><i>${esc(b.name)}</i></h3></div><div class="card-foot"><span class="mini-count">${b.plants.length} plant group${b.plants.length === 1 ? '' : 's'}${b.familyHosts.length ? ` · ${b.familyHosts.length} family-wide` : ''}${b.tentativeHosts.length ? ` · ${b.tentativeHosts.length} possible` : ''}</span><button class="open-btn" data-open-bee="${esc(b.name)}">Explore <span aria-hidden="true">→</span></button></div></article>`;
}
function bindOpeners(root = document) {
  root.querySelectorAll('[data-open-plant]').forEach(button => button.onclick = () => openPlant(button.dataset.openPlant));
  root.querySelectorAll('[data-open-bee]').forEach(button => button.onclick = () => openBee(button.dataset.openBee));
}
function renderHome() {
  $('#stats').innerHTML = `<div class="stat"><strong>${bees.length}</strong><span>Texas-listed bees to meet</span></div><div class="stat"><strong>${EMBEDDED_DATA.counts.bee_families}</strong><span>bee families</span></div><div class="stat"><strong>${EMBEDDED_DATA.counts.listed_host_genera}</strong><span>plant groups with listed links</span></div>`;
  $('#featuredPlants').innerHTML = ['Helianthus','Solidago','Coreopsis','Salvia','Gaillardia','Salix'].map(name => plantMap.get(name)).filter(Boolean).map(plantCard).join('');
  bindOpeners($('#featuredPlants'));
  const families = Object.entries(bees.reduce((all,b) => { all[b.family] = (all[b.family] || 0) + 1; return all; }, {})).sort((a,b) => b[1]-a[1]);
  $('#familyStrip').innerHTML = families.map(([family,count]) => `<button class="family-pill" data-bee-family="${esc(family)}">${beeArt()}<div><strong>${esc(family)}</strong><span>${count} bees to discover →</span></div></button>`).join('');
  $$('#familyStrip [data-bee-family]').forEach(button => button.onclick = () => { setView('bees'); $('#beeFamilyFilter').value = button.dataset.beeFamily; renderBees(); });
}
function populateFilters() {
  $('#plantFamilyFilter').innerHTML = '<option value="">All plant families</option>' + [...new Set(plants.map(p => p.family).filter(Boolean))].sort().map(f => `<option>${esc(f)}</option>`).join('');
  $('#beeFamilyFilter').innerHTML = '<option value="">All bee families</option>' + [...new Set(bees.map(b => b.family))].sort().map(f => `<option>${esc(f)}</option>`).join('');
  $('#compareSelect').innerHTML = '<option value="">Choose a plant group…</option>' + plants.filter(p => p.rank === 'genus').sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${esc(p.name)}">${esc(plantLabel(p))} — ${esc(p.name)}</option>`).join('');
}
function renderPlants() {
  const q = norm($('#plantFilter').value), family = $('#plantFamilyFilter').value;
  const list = plants.filter(p => (!q || plantMatches(p,q)) && (!family || p.family === family));
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
  $('#modalBody').innerHTML = `<div class="eyebrow">${p.rank === 'genus' ? esc(COMMON_NAMES[p.name] || 'Explore a plant group') : 'A family-wide connection'}</div><h2 id="modalTitle" class="modal-title"><i>${esc(p.name)}</i></h2><div class="modal-family">${esc(famLabel(p.family))}</div>${p.rank === 'genus' || saved ? `<div class="modal-actions"><button id="modalGarden" class="garden-btn ${saved ? 'secondary' : ''}">${saved ? 'Remove from My Garden' : 'Add to My Garden'}</button></div>` : ''}${p.rank === 'family' ? '<p class="evidence-note">This record names a family only. It does not confirm any particular genus or species and is excluded from genus-based garden totals.</p>' : ''}<div class="relationship-list"><div class="card-kicker">${p.bees.length} listed bee connection${p.bees.length === 1 ? '' : 's'}</div>${p.bees.length ? beeRows(p.bees.slice(0,6)) + (p.bees.length > 6 ? `<details class="more-bees"><summary>Meet ${p.bees.length-6} more bees</summary>${beeRows(p.bees.slice(6))}</details>` : '') : '<p>No link without an uncertainty mark is listed for this plant group.</p>'}</div>${p.tentativeBees.length ? `<section class="evidence-note"><h3>Possible connections</h3><p>The source marks these links as uncertain, so they are kept outside the main count.</p>${beeRows(p.tentativeBees)}</section>` : ''}${sourceCredit()}`;
  showModal(); bindOpeners($('#modalBody'));
  const button = $('#modalGarden');
  if (button) button.onclick = () => { const set = getGarden(); set.has(name) ? set.delete(name) : set.add(name); saveGarden(set); if ($('#view-garden').classList.contains('active')) renderGarden(); openPlant(name); };
}
function hostRows(items) {
  return [...items].sort((a,b) => a.name.localeCompare(b.name)).map(p => `<button class="relationship" data-open-plant="${esc(p.name)}"><b><i>${esc(p.name)}</i></b><span>${p.rank === 'family' ? 'Family only' : 'Plant group'}${p.qualification === 'tentative' ? ' · possible' : ''}</span></button>`).join('');
}
function openBee(name) {
  const b = beeMap.get(name); if (!b) return;
  const reference = b.relationships.find(r => r.supporting_reference_url);
  $('#modalBody').innerHTML = `<div class="eyebrow">Texas-listed bee</div><h2 id="modalTitle" class="modal-title"><i>${esc(b.name)}</i></h2><div class="modal-family">${esc(b.family)}</div><div class="relationship-list"><div class="card-kicker">Its listed pollen plants</div>${b.plants.length ? hostRows(b.plants) : '<p>The source does not name a plant group without an uncertainty mark for this bee.</p>'}</div>${b.familyHosts.length ? `<section class="evidence-note"><h3>Family-wide connections</h3><p>No particular genus or species is established by these entries.</p>${hostRows(b.familyHosts)}</section>` : ''}${b.tentativeHosts.length ? `<section class="evidence-note"><h3>Possible connections</h3><p>These uncertain links stay outside the main count.</p>${hostRows(b.tentativeHosts)}</section>` : ''}${sourceCredit()}${reference ? `<p class="source-credit">Additional research: <a href="${esc(reference.supporting_reference_url)}" target="_blank" rel="noopener">Bossert, Zabinski &amp; Neff (2026)</a> documents pollen specialization on <i>Leucophyllum frutescens</i>. This does not establish Hays County occurrence.</p>` : ''}<div class="inat-box"><div class="card-kicker">iNaturalist sightings</div><p class="family-label">Optional live occurrence check. Observations do not establish the pollen-host relationship.</p><button id="inatNearMe" class="garden-btn">Check sightings near me</button><div id="inatResult"></div></div>`;
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
  $('#gardenEmpty').innerHTML = !names.length ? 'Your garden starts with a little curiosity. Explore a plant and choose <b>Add to My Garden</b> to save your first favorite.' : unsupported.length ? `<strong>Saved names needing review:</strong> ${unsupported.map(esc).join(', ')}. These are preserved but excluded from genus-based bee totals.` : '';
  $('#gardenEmpty').style.display = $('#gardenEmpty').innerHTML ? 'block' : 'none';
  $('#gardenPlants').innerHTML = ps.map(plantCard).join(''); bindOpeners($('#gardenPlants'));
  const unique = new Map(); ps.filter(p => p.rank === 'genus').forEach(p => p.bees.forEach(b => unique.set(b.name,b)));
  const bs = [...unique.values()].sort((a,b) => a.name.localeCompare(b.name));
  $('#gardenBeePanel').style.display = names.length ? 'block' : 'none';
  $('#gardenBeeTotal').textContent = `${bs.length} different bees linked to your plant groups`;
  $('#gardenBees').innerHTML = bs.map(b => `<button class="compact-row" data-open-bee="${esc(b.name)}"><b><i>${esc(b.name)}</i></b><span>${esc(b.family)}</span></button>`).join('');
  bindOpeners($('#gardenBees'));
}
function renderCompare() {
  $('#compareChips').innerHTML = comparePlants.map(name => `<span class="selected-chip"><i>${esc(name)}</i><button data-remove-compare="${esc(name)}" aria-label="Remove ${esc(name)}">×</button></span>`).join('');
  $$('[data-remove-compare]').forEach(button => button.onclick = () => { comparePlants = comparePlants.filter(name => name !== button.dataset.removeCompare); renderCompare(); });
  if (!comparePlants.length) { $('#compareResult').innerHTML = '<div class="empty-state">Choose host genera to compare their source-linked bees.</div>'; return; }
  const ps = comparePlants.map(name => plantMap.get(name)), sets = ps.map(p => new Set(p.bees.map(b => b.name)));
  const union = new Set(sets.flatMap(set => [...set])), shared = [...sets[0]].filter(name => sets.every(set => set.has(name)));
  $('#compareResult').innerHTML = `<p class="evidence-note">${union.size} different bees across these plant groups · ${shared.length} connected to every group you chose. Possible and family-wide links stay outside these counts.</p><div class="comparison-scroll"><table class="compare-table"><thead><tr>${ps.map(p => `<th scope="col">${esc(plantLabel(p))}<br><span class="latin-name">${esc(p.name)}</span></th>`).join('')}</tr></thead><tbody><tr>${ps.map(p => `<td><div class="card-kicker">${p.bees.length} listed bee connections</div><details class="more-bees"><summary>Meet the bees</summary><ul class="compare-list">${[...p.bees].sort((a,b) => a.name.localeCompare(b.name)).map(b => `<li><i>${esc(b.name)}</i> <span class="family-label">${esc(b.family)}</span></li>`).join('')}</ul></details></td>`).join('')}</tr></tbody></table></div>`;
}
function setupSearch() {
  const input = $('#mainSearch'), box = $('#suggestions'); let active = -1;
  function draw() {
    const q = norm(input.value); active = -1;
    const pp = q ? plants.filter(p => plantMatches(p,q)).sort((a,b) => (norm(a.name) === q ? -1 : norm(b.name) === q ? 1 : 0)).slice(0,6).map(p => ({type:'plant', name:p.name, label:plantLabel(p), family:p.family})) : [];
    const bb = q ? bees.filter(b => norm(b.name).includes(q) || norm(b.family).includes(q)).slice(0,6).map(b => ({type:'bee', name:b.name, family:b.family})) : [];
    const choices = [...pp,...bb].slice(0,10);
    box.innerHTML = choices.map((choice,i) => `<button class="suggestion" data-type="${choice.type}" data-name="${esc(choice.name)}"><span><b><i>${esc(choice.label || choice.name)}</i></b><br><small>${esc(famLabel(choice.family))}</small></span><small>${choice.type}</small></button>`).join('');
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
  $('.brand').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setView('home'); } });
  $('#surprisePlant').onclick = () => { const pool = plants.filter(p => p.rank === 'genus' && p.bees.length); openPlant(pool[Math.floor(Math.random()*pool.length)].name); };
  document.addEventListener('click', event => { if (event.target.closest('[data-source-notes]')) { event.preventDefault(); closeModal(); setView('about'); } });
  $('#themeBtn').onclick = () => { document.body.classList.toggle('dark'); try { localStorage.setItem('beeTheme',document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {} };
  if (location.protocol !== 'file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
init();
