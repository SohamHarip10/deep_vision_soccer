// ==================== FIXTURES PAGE JAVASCRIPT ====================

const leagueSelect = document.getElementById('leagueSelect');
const seasonSelect = document.getElementById('seasonSelect');
const refreshBtn = document.getElementById('refreshFixtures');
const fixturesBody = document.getElementById('fixturesBody');
const tableTitle = document.getElementById('tableTitle');

const BACKEND_BASE = 'http://127.0.0.1:5000'; // Backend proxy (recommend using backend proxy for API key security)

// Helper: Format date/time for table
function formatDate(dateString, zone='default') {
  const d = new Date(dateString);
  return d.toLocaleDateString(zone, {day: 'numeric', month: 'short', year: '2-digit'});
}
function formatTime(dateString, zone='default') {
  const d = new Date(dateString);
  return d.toLocaleTimeString(zone, {hour:'2-digit',minute:'2-digit'});
}

// Render status with tooltip/legend
function statusLong(short) {
  const map = {
    "TBD":"Time To Be Defined","NS":"Not Started","1H":"First Half",
    "HT":"Halftime","2H":"Second Half","ET":"Extra Time","BT":"Break Time","P":"Penalty",
    "SUSP":"Suspended","INT":"Interrupted","FT":"Finished","AET":"After Extra Time",
    "PEN":"Pen/Finished","PST":"Postponed","CANC":"Cancelled","ABD":"Abandoned",
    "AWD":"Awarded","WO":"WalkOver","LIVE":"Live"
  };
  return map[short] || short;
}

// Fetch fixtures from backend
async function fetchFixtures(leagueId, season) {
  try {
    // API supports additional query params for advanced use
    const url = `${BACKEND_BASE}/api/get_fixtures?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}&timezone=Asia/Kolkata`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) {
      console.error('Backend error:', data.error);
      return [];
    }
    return Array.isArray(data.fixtures) ? data.fixtures : [];
  } catch (err) {
    console.error('Error fetching fixtures:', err);
    return [];
  }
}

// Render the fixtures table
async function renderTable(leagueId, season) {
  tableTitle.textContent = `Fixtures ${leagueSelect.options[leagueSelect.selectedIndex].text} — ${season}`;
  fixturesBody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
  const rows = await fetchFixtures(leagueId, season);
  fixturesBody.innerHTML = '';
  if (!rows.length) {
    fixturesBody.innerHTML = '<tr><td colspan="9">No fixtures available.</td></tr>';
    return;
  }
  rows.forEach(fx => {
    const tr = document.createElement('tr');
    const fixture = fx.fixture || fx; // some backend proxies flatten, some nest
    const league = fx.league || {};
    const teams = fx.teams || {};
    const home = teams.home || {};
    const away = teams.away || {};
    const venue = fixture.venue || {};
    const round = league.round || fx.round || '-';

    tr.innerHTML = `
      <td>${formatDate(fixture.date, 'en-IN')}</td>
      <td>${formatTime(fixture.date, 'en-IN')}</td>
      <td><img src="${league.logo || ''}" alt="" height="18" style="vertical-align:middle;margin-right:5px;">${league.name || '-'}</td>
      <td title="${statusLong(fixture.status?.short)}">${fixture.status?.short || '-'}</td>
      <td><img src="${home.logo || ''}" alt="" height="18" style="vertical-align:middle;margin-right:5px;">${home.name || '-'}</td>
      <td style="font-weight:600; font-size:1.15em;">${fixture.goals?.home != null ? fixture.goals.home : '-'} : ${fixture.goals?.away != null ? fixture.goals.away : '-'}</td>
      <td><img src="${away.logo || ''}" alt="" height="18" style="vertical-align:middle;margin-right:5px;">${away.name || '-'}</td>
      <td>${venue.name || '-'}</td>
      <td>${round}</td>
    `;
    fixturesBody.appendChild(tr);
  });
}

// Events
refreshBtn.addEventListener('click', () => renderTable(leagueSelect.value, seasonSelect.value));
document.addEventListener('DOMContentLoaded', () => renderTable(leagueSelect.value, seasonSelect.value));
