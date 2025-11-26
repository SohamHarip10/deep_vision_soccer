// ==================== STATISTICS PAGE JAVASCRIPT ====================

// ---------- Constants ----------
const BACKEND_BASE = 'http://127.0.0.1:5000';

// Common helpers
const byId = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function formatNumber(n) {
  if (n === null || n === undefined || n === '-') return '-';
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString() : n;
}

function setLoading(el, state, text = 'Loading...') {
  if (!el) return;
  if (state) {
    el.dataset.prevText = el.textContent;
    el.disabled = true;
    el.textContent = `⏳ ${text}`;
  } else {
    el.disabled = false;
    el.textContent = el.dataset.prevText || el.textContent.replace(/^⏳\s*/, '');
  }
}

// ---------- Existing filters / cards UI ----------
const filterButtons = document.querySelectorAll('.filter-btn');
const statCards = document.querySelectorAll('.stat-card');

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const filter = button.getAttribute('data-filter');
    if (filter !== 'all') showFilterMessage(filter);
  });
});

function showFilterMessage(filter) {
  console.log(`Showing ${filter} statistics`);
}

// ---------- Export sample table (kept) ----------
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', exportStatistics);
}

function exportStatistics() {
  const table = document.querySelector('.stats-table');
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');

  let csvContent = "data:text/csv;charset=utf-8,";
  const headers = ['Player Name', 'Goals', 'Assists', 'Passes', 'Accuracy', 'Distance (km)', 'Rating'];
  csvContent += headers.join(',') + '\n';

  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const rowData = [];
    cols.forEach((col, index) => {
      if (index === cols.length - 1) {
        const ratingEl = col.querySelector('.rating');
        const rating = ratingEl ? ratingEl.textContent.trim() : '';
        rowData.push(rating);
      } else {
        rowData.push(col.textContent.trim());
      }
    });
    csvContent += rowData.join(',') + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'player_statistics.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log('Statistics exported successfully!');
}

// ---------- Refresh sample (kept) ----------
const refreshBtn = document.getElementById('refreshStats');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    refreshBtn.innerHTML = '<span>⏳</span> Refreshing...';
    refreshBtn.disabled = true;
    setTimeout(() => {
      refreshBtn.innerHTML = '<span>🔄</span> Refresh Statistics';
      refreshBtn.disabled = false;
      console.log('Statistics refreshed!');
      // fetchStatisticsFromBackend(); // optional
    }, 1500);
  });
}

// ---------- Appear on scroll (kept) ----------
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.stat-card, .stats-table-card, .team-comparison-card, .tactical-insights-card');
  elements.forEach((element, index) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(element);
  });
});

// ---------- Row hover micro‑interaction (kept) ----------
const tableRows = document.querySelectorAll('.stats-table tbody tr');
tableRows.forEach(row => {
  row.addEventListener('mouseenter', () => { row.style.transform = 'scale(1.02)'; });
  row.addEventListener('mouseleave', () => { row.style.transform = 'scale(1)'; });
});

// ---------- API-FOOTBALL INTEGRATION ----------

async function getJSON(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const full = query ? `${url}?${query}` : url;
  const res = await fetch(full);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const LEAGUE_CODE_MAP = {
  EPL: 39, LL: 140, UCL: 2, SA: 135, BL: 78, L1: 61, PORTUGAL: 94, ILEAGUE: 325, SPL: 307, UEL: 3, CL: 2
};
function leagueToParam(v) {
  return LEAGUE_CODE_MAP[v] || v;
}

// ------------ UI bindings (IDs you should have in statistics.html) ------------
const leagueSelect = byId('statsLeague');       // e.g., values: 'EPL' or numeric
const seasonSelect = byId('statsSeason');       // e.g., '2024'
const searchInput = byId('playerSearch');       // text search for players
const teamInput = byId('teamId');               // numeric team id
const playerInput = byId('playerId');           // numeric player id

// Action buttons
const btnProfiles = byId('btnProfiles');        // fetch player profiles
const btnPlayerStats = byId('btnPlayerStats');  // fetch player stats
const btnSquad = byId('btnSquad');              // fetch team squad
const btnCoach = byId('btnCoach');              // fetch coaches
const btnTopScorers = byId('btnTopScorers');
const btnTopAssists = byId('btnTopAssists');
const btnTopYC = byId('btnTopYellow');
const btnTopRC = byId('btnTopRed');
const btnTransfers = byId('btnTransfers');

// Output containers (tables or lists)
const outProfiles = byId('outProfiles');
const outPlayerStats = byId('outPlayerStats');
const outSquad = byId('outSquad');
const outCoaches = byId('outCoaches');
const outLeaders = byId('outLeaders');
const outTransfers = byId('outTransfers');

// ------------- Render helpers -------------
function renderList(container, rows, columns) {
  if (!container) return;
  if (!rows || !rows.length) {
    container.innerHTML = `<div class="empty">No data</div>`;
    return;
  }
  const thead = `<thead><tr>${columns.map(c=>`<th>${c.header}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r=>{
    return `<tr>${columns.map(c=>{
      const v = typeof c.value === 'function' ? c.value(r) : r[c.value];
      return `<td>${v ?? '-'}</td>`;
    }).join('')}</tr>`;
  }).join('')}</tbody>`;
  container.innerHTML = `<table class="stats-table">${thead}${tbody}</table>`;
}

// ---------- Feature: Player Profiles ----------
async function loadProfiles() {
  if (!btnProfiles) return;
  try {
    setLoading(btnProfiles, true, 'Profiles');
    const params = {};
    if (searchInput && searchInput.value.trim()) params.search = searchInput.value.trim();
    if (playerInput && playerInput.value.trim()) params.id = playerInput.value.trim();
    if (seasonSelect && seasonSelect.value.trim()) params.season = seasonSelect.value.trim();
    if (leagueSelect && leagueSelect.value.trim()) params.league = leagueToParam(leagueSelect.value.trim());
    const data = await getJSON(`${BACKEND_BASE}/api/players`, params);
    const rows = (data.response || []).map(x => x.player || x).filter(Boolean);
    renderList(outProfiles, rows, [
      { header: 'Player', value: (r)=> `${r.name} (${r.nationality||'-'})` },
      { header: 'Age', value: 'age' },
      { header: 'Height', value: 'height' },
      { header: 'Weight', value: 'weight' }
    ]);
  } catch (e) {
    console.error(e);
    if (outProfiles) outProfiles.innerHTML = `<div class="error">Failed to load profiles</div>`;
  } finally {
    setLoading(btnProfiles, false);
  }
}

// ---------- Feature: Player Stats ----------
async function loadPlayerStats() {
  if (!btnPlayerStats) return;
  try {
    setLoading(btnPlayerStats, true, 'Stats');
    const params = {};
    const season = seasonSelect?.value?.trim();
    if (season) params.season = season;
    const league = leagueSelect?.value?.trim();
    if (league) params.league = leagueToParam(league);
    const pid = playerInput?.value?.trim();
    const tid = teamInput?.value?.trim();
    if (pid) params.id = pid;
    if (tid) params.team = tid;

    const data = await getJSON(`${BACKEND_BASE}/api/players`, params);
    // data.response is array; each has player and statistics[]
    const rows = (data.response || []).flatMap(item => {
      const p = item.player || {};
      const stats = item.statistics || [];
      return stats.map(s => ({
        name: p.name,
        team: s.team?.name,
        league: s.league?.name,
        season: s.league?.season,
        appearances: s.games?.appearences,
        minutes: s.games?.minutes,
        goals: s.goals?.total,
        assists: s.goals?.assists,
        shots: s.shots?.total,
        passes: s.passes?.total,
        keyPasses: s.passes?.key,
        yellow: s.cards?.yellow,
        red: s.cards?.red,
        rating: s.games?.rating
      }));
    });
    renderList(outPlayerStats, rows, [
      { header: 'Player', value: 'name' },
      { header: 'Team', value: 'team' },
      { header: 'League', value: 'league' },
      { header: 'Season', value: 'season' },
      { header: 'Apps', value: r => formatNumber(r.appearances) },
      { header: 'Min', value: r => formatNumber(r.minutes) },
      { header: 'G', value: r => formatNumber(r.goals) },
      { header: 'A', value: r => formatNumber(r.assists) },
      { header: 'Sh', value: r => formatNumber(r.shots) },
      { header: 'Pass', value: r => formatNumber(r.passes) },
      { header: 'KeyP', value: r => formatNumber(r.keyPasses) },
      { header: 'YC', value: r => formatNumber(r.yellow) },
      { header: 'RC', value: r => formatNumber(r.red) },
      { header: 'Rating', value: r => r.rating || '-' }
    ]);
  } catch (e) {
    console.error(e);
    if (outPlayerStats) outPlayerStats.innerHTML = `<div class="error">Failed to load player stats</div>`;
  } finally {
    setLoading(btnPlayerStats, false);
  }
}

// ---------- Feature: Team Squad ----------
async function loadSquad() {
  if (!btnSquad) return;
  try {
    setLoading(btnSquad, true, 'Squad');
    const params = {};
    const tid = teamInput?.value?.trim();
    const pid = playerInput?.value?.trim();
    if (tid) params.team = tid;
    if (pid) params.player = pid; // supports both
    const data = await getJSON(`${BACKEND_BASE}/api/players/squads`, params);
    // response is array of { team, players[] } or by player
    const first = (data.response || [])[0] || {};
    const rows = (first.players || []).map(p => ({
      name: p.name,
      number: p.number,
      position: p.position,
      age: p.age,
      nationality: p.nationality
    }));
    renderList(outSquad, rows, [
      { header: 'Name', value: 'name' },
      { header: 'No', value: r => formatNumber(r.number) },
      { header: 'Pos', value: 'position' },
      { header: 'Age', value: r => formatNumber(r.age) },
      { header: 'Nation', value: 'nationality' }
    ]);
  } catch (e) {
    console.error(e);
    if (outSquad) outSquad.innerHTML = `<div class="error">Failed to load squad</div>`;
  } finally {
    setLoading(btnSquad, false);
  }
}

// ---------- Feature: Coaches ----------
async function loadCoaches() {
  if (!btnCoach) return;
  try {
    setLoading(btnCoach, true, 'Coaches');
    const params = {};
    const tid = teamInput?.value?.trim();
    const search = searchInput?.value?.trim();
    if (tid) params.team = tid;
    if (search) params.search = search;
    const data = await getJSON(`${BACKEND_BASE}/api/coachs`, params);
    const rows = (data.response || []).map(c => {
      const coach = c || {};
      return {
        name: coach.name,
        age: coach.age,
        nationality: coach.nationality,
        team: (coach.team || {}).name || '-'
      };
    });
    renderList(outCoaches, rows, [
      { header: 'Coach', value: 'name' },
      { header: 'Age', value: r => formatNumber(r.age) },
      { header: 'Nation', value: 'nationality' },
      { header: 'Team', value: 'team' }
    ]);
  } catch (e) {
    console.error(e);
    if (outCoaches) outCoaches.innerHTML = `<div class="error">Failed to load coaches</div>`;
  } finally {
    setLoading(btnCoach, false);
  }
}

// ---------- Feature: Leaderboards ----------
async function loadLeaderboard(kind) {
  const btnMap = {
    topscorers: btnTopScorers,
    topassists: btnTopAssists,
    topyellowcards: btnTopYC,
    topredcards: btnTopRC
  };
  const btn = btnMap[kind];
  if (!btn) return;
  try {
    setLoading(btn, true, 'Loading');
    const params = {};
    const season = seasonSelect?.value?.trim();
    if (season) params.season = season;
    const league = leagueSelect?.value?.trim();
    if (league) params.league = leagueToParam(league);

    const data = await getJSON(`${BACKEND_BASE}/api/players/${kind}`, params);
    const rows = (data.response || []).map(x => {
      const p = x.player || {};
      const s = x.statistics?.[0] || {};
      const t = s.team || {};
      return {
        name: p.name,
        team: t.name,
        goals: s.goals?.total,
        assists: s.goals?.assists,
        yellow: s.cards?.yellow,
        red: s.cards?.red,
        rating: s.games?.rating
      };
    });

    const colsByKind = {
      topscorers: [
        { header: 'Player', value: 'name' },
        { header: 'Team', value: 'team' },
        { header: 'Goals', value: r => formatNumber(r.goals) },
        { header: 'Rating', value: r => r.rating || '-' }
      ],
      topassists: [
        { header: 'Player', value: 'name' },
        { header: 'Team', value: 'team' },
        { header: 'Assists', value: r => formatNumber(r.assists) },
        { header: 'Rating', value: r => r.rating || '-' }
      ],
      topyellowcards: [
        { header: 'Player', value: 'name' },
        { header: 'Team', value: 'team' },
        { header: 'Yellow', value: r => formatNumber(r.yellow) },
        { header: 'Rating', value: r => r.rating || '-' }
      ],
      topredcards: [
        { header: 'Player', value: 'name' },
        { header: 'Team', value: 'team' },
        { header: 'Red', value: r => formatNumber(r.red) },
        { header: 'Rating', value: r => r.rating || '-' }
      ]
    };

    renderList(outLeaders, rows, colsByKind[kind]);
  } catch (e) {
    console.error(e);
    if (outLeaders) outLeaders.innerHTML = `<div class="error">Failed to load leaderboard</div>`;
  } finally {
    setLoading(btn, false);
  }
}

// ---------- Feature: Transfers (not explicitly in API above, but included for completeness) ----------
async function loadTransfers() {
  if (!btnTransfers) return;
  try {
    setLoading(btnTransfers, true, 'Transfers');
    const params = {};
    const pid = playerInput?.value?.trim();
    const tid = teamInput?.value?.trim();
    if (pid) params.player = pid;
    if (tid) params.team = tid;

    const data = await getJSON(`${BACKEND_BASE}/api/transfers`, params);
    // response is array of { player, transfers: [] }
    const rows = (data.response || []).flatMap(item => {
      const p = item.player || {};
      return (item.transfers || []).map(tr => ({
        name: p.name,
        date: tr.date,
        type: tr.type,
        from: tr.teams?.out?.name,
        to: tr.teams?.in?.name
      }));
    });

    renderList(outTransfers, rows, [
      { header: 'Player', value: 'name' },
      { header: 'Date', value: 'date' },
      { header: 'Type', value: 'type' },
      { header: 'From', value: 'from' },
      { header: 'To', value: 'to' }
    ]);
  } catch (e) {
    console.error(e);
    if (outTransfers) outTransfers.innerHTML = `<div class="error">Failed to load transfers</div>`;
  } finally {
    setLoading(btnTransfers, false);
  }
}

// ---------- Wire buttons ----------
if (btnProfiles) btnProfiles.addEventListener('click', loadProfiles);
if (btnPlayerStats) btnPlayerStats.addEventListener('click', loadPlayerStats);
if (btnSquad) btnSquad.addEventListener('click', loadSquad);
if (btnCoach) btnCoach.addEventListener('click', loadCoaches);
if (btnTopScorers) btnTopScorers.addEventListener('click', () => loadLeaderboard('topscorers'));
if (btnTopAssists) btnTopAssists.addEventListener('click', () => loadLeaderboard('topassists'));
if (btnTopYC) btnTopYC.addEventListener('click', () => loadLeaderboard('topyellowcards'));
if (btnTopRC) btnTopRC.addEventListener('click', () => loadLeaderboard('topredcards'));
if (btnTransfers) btnTransfers.addEventListener('click', loadTransfers);

// Initial log
console.log('📊 Statistics page loaded successfully!');
