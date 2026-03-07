// ======= DOM Elements =======
const gameSelectorEl = document.getElementById('game-selector');
const statusBadgeEl = document.getElementById('game-status-badge');

const scoreAwayEl = document.getElementById('score-away');
const scoreHomeEl = document.getElementById('score-home');

const nameAwayEnEl = document.getElementById('name-away-en');
const nameAwayTcEl = document.getElementById('name-away-tc');
const flagAwayEl = document.getElementById('flag-away');

const nameHomeEnEl = document.getElementById('name-home-en');
const nameHomeTcEl = document.getElementById('name-home-tc');
const flagHomeEl = document.getElementById('flag-home');

const inningHalfEl = document.getElementById('inning-half');
const inningNumEl = document.getElementById('inning-number');
const bases = {
  1: document.getElementById('base-1'),
  2: document.getElementById('base-2'),
  3: document.getElementById('base-3')
};
const indicators = {
  b: [document.getElementById('b-1'), document.getElementById('b-2'), document.getElementById('b-3')],
  s: [document.getElementById('s-1'), document.getElementById('s-2')],
  o: [document.getElementById('o-1'), document.getElementById('o-2')]
};
const playLogEl = document.getElementById('play-log');
const resultsContainer = document.getElementById('results-container');
const probsContainer = document.getElementById('probs-container');

// ======= Game State Data =======
let todayGames = [];     // Games happening today
let pastGames = [];      // Finished games
let teamRecords = {};    // Team win/loss records
let selectedGameId = null;
let lastUpdateStr = "";
const logs = [];

// Admin toggle hidden since we are autonomous
const adminToggleBtn = document.getElementById('toggle-admin');
if (adminToggleBtn) adminToggleBtn.style.display = 'none';

// ======= Utility Functions =======
// Get team initials/flags (Using flags for known WBC teams or initials for unknown)
const TEAM_FLAGS = {
  "Japan": "🇯🇵", "Chinese Taipei": "🇹🇼", "Korea": "🇰🇷", "Australia": "🇦🇺", "Cuba": "🇨🇺",
  "Dominican Republic": "🇩🇴", "Puerto Rico": "🇵🇷", "United States": "🇺🇸", "Venezuela": "🇻🇪",
  "Mexico": "🇲🇽", "Kingdom of the Netherlands": "🇳🇱", "Italy": "🇮🇹", "Canada": "🇨🇦",
  "Great Britain": "🇬🇧", "Czechia": "🇨🇿", "Czech Republic": "🇨🇿", "Panama": "🇵🇦",
  "Colombia": "🇨🇴", "Nicaragua": "🇳🇮", "Israel": "🇮🇱", "China": "🇨🇳", "Brazil": "🇧🇷"
};

const TEAM_NAMES_TC = {
  "Japan": "日本", "Chinese Taipei": "台灣", "Korea": "韓國", "Australia": "澳洲", "Cuba": "古巴",
  "Dominican Republic": "多明尼加", "Puerto Rico": "波多黎各", "United States": "美國", "Venezuela": "委內瑞拉",
  "Mexico": "墨西哥", "Kingdom of the Netherlands": "荷蘭", "Italy": "義大利", "Canada": "加拿大",
  "Great Britain": "英國", "Czechia": "捷克", "Czech Republic": "捷克", "Panama": "巴拿馬",
  "Colombia": "哥倫比亞", "Nicaragua": "尼加拉瓜", "Israel": "以色列", "China": "中國", "Brazil": "巴西"
};

function getTeamFlag(name) {
  if (TEAM_FLAGS[name]) return TEAM_FLAGS[name];
  if (!name) return "⚾";
  const words = name.split(' ');
  if (words.length > 1) return words[0][0].toUpperCase() + words[1][0].toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getTeamNameTc(name) {
  return TEAM_NAMES_TC[name] || name;
}

// ======= API Fetching =======
// Tournament dates for full fetch
const startDate = "2026-02-25";
const endDate = "2026-03-31";

// Fetch full tournament data once to populate Results and Probabilities
async function fetchFullTournament() {
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=51&startDate=${startDate}&endDate=${endDate}&hydrate=linescore,team`;
    const res = await fetch(url);
    const data = await res.json();

    let fetchedPast = [];
    let records = {};

    if (data.dates) {
      data.dates.forEach(dateObj => {
        dateObj.games.forEach(g => {
          const awayTeamName = g.teams.away.team.name;
          const homeTeamName = g.teams.home.team.name;

          // Update team records
          if (g.teams.away.leagueRecord) records[awayTeamName] = g.teams.away.leagueRecord;
          if (g.teams.home.leagueRecord) records[homeTeamName] = g.teams.home.leagueRecord;

          const gameData = formatGameData(g, dateObj.date);

          // Categorize games
          if (g.status.statusCode === 'F' || g.status.statusCode === 'C' || g.status.statusCode === 'O') {
            fetchedPast.push(gameData);
          }
        });
      });
    }

    // Sort past games descending by date, then render
    pastGames = fetchedPast.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    renderResults();

    teamRecords = records;
    calculateAndRenderProbs();

    // Use fetchLiveData to specifically populate the active/upcoming games dropdown
    await fetchLiveData();

  } catch (err) {
    console.error("Error fetching full tournament:", err);
  }
}

// Fetch just live/today data rapidly
async function fetchLiveData() {
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=51&hydrate=linescore,team`;
    const res = await fetch(url);
    const data = await res.json();

    let fetchedToday = [];
    if (data.dates) {
      data.dates.forEach(dateObj => {
        dateObj.games.forEach(g => {
          fetchedToday.push(formatGameData(g, dateObj.date));
        });
      });
    }

    if (fetchedToday.length > 0) {
      todayGames = fetchedToday;
      updateSelector();
      updateUI();
    }
  } catch (err) {
    console.error("Error fetching live data:", err);
  }
}

function formatGameData(g, dateStr) {
  return {
    id: g.gamePk,
    rawDate: g.gameDate,
    displayDate: dateStr,
    description: g.description || "World Baseball Classic",
    awayTeam: g.teams.away.team.name,
    homeTeam: g.teams.home.team.name,
    awayScore: g.teams.away.score || 0,
    homeScore: g.teams.home.score || 0,
    status: g.status.detailedState,
    statusCode: g.status.statusCode,
    inning: g.linescore ? g.linescore.currentInning : 1,
    isTopHalf: g.linescore ? (g.linescore.inningHalf === 'Top') : true,
    balls: g.linescore ? g.linescore.balls : 0,
    strikes: g.linescore ? g.linescore.strikes : 0,
    outs: g.linescore ? g.linescore.outs : 0,
    bases: {
      1: g.linescore?.offense ? !!g.linescore.offense.first : false,
      2: g.linescore?.offense ? !!g.linescore.offense.second : false,
      3: g.linescore?.offense ? !!g.linescore.offense.third : false
    }
  };
}

// ======= UI Updaters =======

function updateSelector() {
  const currentVal = gameSelectorEl.value;
  gameSelectorEl.innerHTML = '';

  if (todayGames.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.text = "今日無賽事或資料讀取中...";
    gameSelectorEl.appendChild(opt);
    return;
  }

  todayGames.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.text = `${getTeamNameTc(g.awayTeam)} vs ${getTeamNameTc(g.homeTeam)} (${g.status})`;
    gameSelectorEl.appendChild(opt);
  });

  if (selectedGameId && todayGames.find(g => g.id === selectedGameId)) {
    gameSelectorEl.value = selectedGameId;
  } else {
    const liveGame = todayGames.find(g => g.statusCode === 'I' || g.status.includes('In Progress'));
    if (liveGame) {
      selectedGameId = liveGame.id;
      gameSelectorEl.value = liveGame.id;
    } else {
      selectedGameId = todayGames[0].id;
      gameSelectorEl.value = todayGames[0].id;
    }
  }
}

gameSelectorEl.addEventListener('change', (e) => {
  selectedGameId = parseInt(e.target.value, 10);
  updateUI();
});

function updateUI() {
  if (todayGames.length === 0 || !selectedGameId) return;

  const state = todayGames.find(g => g.id === selectedGameId);
  if (!state) return;

  // Status
  statusBadgeEl.innerText = state.status.toUpperCase();
  if (state.statusCode === 'I') {
    statusBadgeEl.classList.add('pulse');
    statusBadgeEl.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
  } else {
    statusBadgeEl.classList.remove('pulse');
    statusBadgeEl.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
  }

  // Names & Logos
  nameAwayEnEl.innerText = state.awayTeam.toUpperCase();
  nameAwayTcEl.innerText = getTeamNameTc(state.awayTeam);
  flagAwayEl.innerText = getTeamFlag(state.awayTeam);

  nameHomeEnEl.innerText = state.homeTeam.toUpperCase();
  nameHomeTcEl.innerText = getTeamNameTc(state.homeTeam);
  flagHomeEl.innerText = getTeamFlag(state.homeTeam);

  // Scores
  if (scoreAwayEl.innerText !== state.awayScore.toString()) {
    scoreAwayEl.innerText = state.awayScore;
    animateUpdate(scoreAwayEl);
  }
  if (scoreHomeEl.innerText !== state.homeScore.toString()) {
    scoreHomeEl.innerText = state.homeScore;
    animateUpdate(scoreHomeEl);
  }

  // Inning
  inningHalfEl.innerText = state.isTopHalf ? '▲' : '▼';
  inningNumEl.innerText = state.inning;

  // Bases
  Object.keys(state.bases).forEach(base => {
    if (state.bases[base]) {
      bases[base].classList.add('active');
    } else {
      bases[base].classList.remove('active');
    }
  });

  // Count
  updateIndicators('b', state.balls, 4);
  updateIndicators('s', state.strikes, 3);
  updateIndicators('o', state.outs, 3);

  // Log fake entry based on status
  const currentUpdateStr = `${state.inning}${state.isTopHalf ? '上' : '下'} - ${state.awayScore}:${state.homeScore} - ${state.status}`;
  if (lastUpdateStr !== currentUpdateStr) {
    addLog(`賽況更新：${getTeamNameTc(state.awayTeam)} ${state.awayScore} - ${state.homeScore} ${getTeamNameTc(state.homeTeam)} (${state.status})`);
    lastUpdateStr = currentUpdateStr;
  }
}

function updateIndicators(type, count, max) {
  for (let i = 0; i < max; i++) {
    if (indicators[type][i]) {
      if (i < count) {
        indicators[type][i].classList.add('active');
      } else {
        indicators[type][i].classList.remove('active');
      }
    }
  }
}

function animateUpdate(el) {
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 300);
}

function addLog(message) {
  const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fullMessage = `[${timeStr}] ${message}`;

  logs.unshift(fullMessage);
  if (logs.length > 20) {
    logs.pop();
  }
  renderLogs();
}

function renderLogs() {
  playLogEl.innerHTML = '';
  logs.forEach(logText => {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerText = logText;
    playLogEl.appendChild(li);
  });
  if (playLogEl.firstChild) {
    playLogEl.firstChild.classList.add('highlight');
  }
}

// ======= Tabs and Component Renderers =======
const tabBtns = document.querySelectorAll('.tab-btn');
const viewSections = document.querySelectorAll('.view-section');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(t => t.classList.remove('active'));
    viewSections.forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const targetView = document.getElementById(btn.getAttribute('data-target'));
    if (targetView) targetView.classList.add('active');
  });
});

function renderResults() {
  resultsContainer.innerHTML = '';

  if (pastGames.length === 0) {
    resultsContainer.innerHTML = '<p style="color:white; text-align:center; padding: 20px;">目前尚無已結束的賽事紀錄。</p>';
    return;
  }

  // Group by Pool / Description
  const grouped = {};
  pastGames.forEach(match => {
    const desc = match.description || "其他賽事";
    if (!grouped[desc]) grouped[desc] = [];
    grouped[desc].push(match);
  });

  Object.keys(grouped).sort().forEach(pool => {
    // Pool Header
    const poolHeader = document.createElement('h3');
    poolHeader.style.color = '#ffd700'; // Gold color for headers
    poolHeader.style.marginTop = '20px';
    poolHeader.style.marginBottom = '10px';
    poolHeader.style.borderBottom = '1px solid rgba(255,215,0,0.3)';
    poolHeader.style.paddingBottom = '5px';
    poolHeader.innerText = pool;
    resultsContainer.appendChild(poolHeader);

    const gamesInPool = grouped[pool];
    gamesInPool.forEach(match => {
      const dateObj = new Date(match.rawDate);
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      const card = document.createElement('div');
      card.className = 'result-card glass';
      card.innerHTML = `
            <div class="rc-date">${dateStr} | ${match.status}</div>
            <div class="rc-match">
                <div class="rc-team away">
                <span>${getTeamNameTc(match.awayTeam)}</span>
                <span>${getTeamFlag(match.awayTeam)}</span>
                </div>
                <div class="rc-score">${match.awayScore} - ${match.homeScore}</div>
                <div class="rc-team home">
                <span>${getTeamFlag(match.homeTeam)}</span>
                <span>${getTeamNameTc(match.homeTeam)}</span>
                </div>
            </div>
            `;
      resultsContainer.appendChild(card);
    });
  });
}

function calculateAndRenderProbs() {
  probsContainer.innerHTML = '';

  // Calculate dynamic power based on wins/losses from the API
  const entries = [];
  Object.keys(teamRecords).forEach(team => {
    const wins = parseInt(teamRecords[team].wins) || 0;
    const losses = parseInt(teamRecords[team].losses) || 0;
    const totalGames = wins + losses;

    // Base points + Win points Model for WBC
    let basePower = 50;
    if (TEAM_FLAGS[team]) {
      // Give known strong teams a slight inherent boost so ties are broken nicely
      const strongTeams = ["Japan", "United States", "Dominican Republic", "Puerto Rico", "Venezuela"];
      if (strongTeams.includes(team)) basePower += 15;
      const midTeams = ["Korea", "Mexico", "Chinese Taipei", "Cuba"];
      if (midTeams.includes(team)) basePower += 8;
    }

    const dynamicPower = basePower + (wins * 20) - (losses * 5);
    entries.push({ team, power: dynamicPower, wins, losses });
  });

  entries.sort((a, b) => b.power - a.power);

  // Only take top 10
  const displayTeams = entries.slice(0, 10);
  const totalPower = displayTeams.reduce((sum, t) => sum + Math.max(0, t.power), 0);

  if (totalPower === 0) {
    probsContainer.innerHTML = '<p style="color:white;text-align:center;">無足夠資料計算機率</p>';
    return;
  }

  let teamProbs = displayTeams.map(t => {
    let rawProb = (Math.max(0, t.power) / totalPower) * 100;
    let finalProb = Math.pow(rawProb, 1.2); // Emphasize difference
    return { ...t, prob: finalProb };
  });

  const sumFinalProbs = teamProbs.reduce((sum, t) => sum + t.prob, 0);
  const normalizingFactor = 100 / sumFinalProbs;

  teamProbs.forEach((t, index) => {
    let finalPercentage = (t.prob * normalizingFactor).toFixed(1);

    const row = document.createElement('div');
    row.className = 'prob-row';
    row.innerHTML = `
        <div class="prob-info">
            <div class="prob-team">
            <span class="rank">#${index + 1}</span>
            ${getTeamFlag(t.team)} ${getTeamNameTc(t.team)} <span style="font-size:0.8rem;opacity:0.7;margin-left:5px">(${t.wins}W-${t.losses}L)</span>
            </div>
            <div class="prob-value">${finalPercentage}%</div>
        </div>
        <div class="prob-bar-bg">
            <div class="prob-bar-fill" style="width: 0%" data-target-width="${finalPercentage}%"></div>
        </div>
        `;
    probsContainer.appendChild(row);
  });

  setTimeout(() => {
    const bars = document.querySelectorAll('.prob-bar-fill');
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute('data-target-width');
    });
  }, 50);
}


// ======= Initialization =======
addLog('初始化 WBC 賽事資料中...');

// initial fetch full tournament
fetchFullTournament().then(() => {
  addLog('✅ WBC 賽事資料已載入');
});

// then poll live data every 10 seconds
setInterval(fetchLiveData, 10000);
