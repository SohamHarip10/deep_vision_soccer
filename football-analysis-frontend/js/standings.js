// ==================== STANDINGS PAGE JAVASCRIPT ====================

const leagueSelect = document.getElementById('leagueSelect');
const seasonSelect = document.getElementById('seasonSelect');
const refreshBtn = document.getElementById('refreshStandings');
const exportBtn = document.getElementById('exportStandings');
const tableTitle = document.getElementById('tableTitle');
const standingsBody = document.getElementById('standingsBody');
const lastUpdated = document.getElementById('lastUpdated');

const BACKEND_BASE = 'http://127.0.0.1:5000'; // Flask backend proxy

const LEAGUE_LABELS = {
  39: "Premier League",
  140: "La Liga",
  78: "Bundesliga",
  135: "Serie A",
  61: "Ligue 1",
  94: "Liga Portugal",
  325: "I-League",
  307: "Saudi Pro League",
  3: "Europa League",
  2: "Champions League"
};

function leagueLabel(code) {
  return LEAGUE_LABELS[code] || code;
}

// Fetch standings from backend
async function fetchStandings(leagueId, season) {
  try {
    const url = `${BACKEND_BASE}/api/get_standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) {
      console.error('Backend error:', data.error);
      return [];
    }
    return Array.isArray(data.standings) ? data.standings : [];
  } catch (err) {
    console.error('Error fetching standings:', err);
    return [];
  }
}

// Render the standings table
async function renderTable(leagueId, season) {
  tableTitle.textContent = `${leagueLabel(leagueId)} — ${season}`;
  standingsBody.innerHTML = '<tr><td colspan="14">Loading...</td></tr>';
  const rows = await fetchStandings(leagueId, season);
  standingsBody.innerHTML = '';
  if (!rows.length) {
    standingsBody.innerHTML = '<tr><td colspan="14">No data available.</td></tr>';
    lastUpdated.textContent = new Date().toLocaleString();
    return;
  }
  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    // Color code champions/relegation (optional: add classes based on row.description)
    // Read fields from API:
    const rank = row.rank ?? '-';
    const team = row.team?.name ?? '-';
    const teamLogo = row.team?.logo ?? '';
    const played = row.all?.played ?? '-';
    const win = row.all?.win ?? '-';
    const draw = row.all?.draw ?? '-';
    const lose = row.all?.lose ?? '-';
    const gf = row.all?.goals?.for ?? '-';
    const ga = row.all?.goals?.against ?? '-';
    const gdVal = row.goalsDiff;
    const gd = (gdVal || gdVal === 0) ? (gdVal >= 0 ? `+${gdVal}` : `${gdVal}`) : '-';
    const pts = row.points ?? '-';
    const form = row.form || '-';
    const status = row.status || '-';
    const desc = row.description || '-';

    tr.innerHTML = `
      <td>${rank}</td>
      <td><span class="team-name"><img src="${teamLogo}" alt="" style="height:22px;width:22px;object-fit:contain;vertical-align:middle;margin-right:6px;">${team}</span></td>
      <td><img src="${teamLogo}" alt="" style="height:22px;width:22px;object-fit:contain;"></td>
      <td>${played}</td>
      <td>${win}</td>
      <td>${draw}</td>
      <td>${lose}</td>
      <td>${gf}</td>
      <td>${ga}</td>
      <td>${gd}</td>
      <td><strong>${pts}</strong></td>
      <td class="form">${form}</td>
      <td>${status}</td>
      <td>${desc}</td>
    `;
    standingsBody.appendChild(tr);
  });
  lastUpdated.textContent = new Date().toLocaleString();
}

// Export the current table as CSV
function exportCSV() {
  const headers = [
    '#', 'Team', 'Logo', 'P', 'W', 'D', 'L',
    'GF', 'GA', 'GD', 'Pts', 'Form', 'Status', 'Description'
  ];
  const rows = [headers];
  document.querySelectorAll('#standingsBody tr').forEach(tr => {
    const cols = Array.from(tr.children).map(td => td.textContent.trim());
    rows.push(cols);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `standings_${leagueSelect.value}_${seasonSelect.value}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Events
refreshBtn.addEventListener('click', () => renderTable(leagueSelect.value, seasonSelect.value));
exportBtn.addEventListener('click', exportCSV);
document.addEventListener('DOMContentLoaded', () => renderTable(leagueSelect.value, seasonSelect.value));

