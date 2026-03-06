// DOM Elements
const scoreTpeEl = document.getElementById('score-tpe');
const scoreJpnEl = document.getElementById('score-jpn');
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

// Admin Panel Toggle
const adminToggleBtn = document.getElementById('toggle-admin');
const adminPanel = document.getElementById('admin-panel');
const closeAdminBtn = document.getElementById('close-admin');

adminToggleBtn.addEventListener('click', () => {
  adminPanel.classList.toggle('hidden');
});

closeAdminBtn.addEventListener('click', () => {
  adminPanel.classList.add('hidden');
});

// Game State
let state = {
  tpe: 0,
  jpn: 0,
  inning: 1,
  isTopHalf: true, // true = top (▲), false = bottom (▼)
  balls: 0,
  strikes: 0,
  outs: 0,
  bases: { 1: false, 2: false, 3: false }
};

// Update UI Function
function updateUI() {
  // Scores
  if (scoreTpeEl.innerText !== state.tpe.toString()) {
    scoreTpeEl.innerText = state.tpe;
    animateUpdate(scoreTpeEl);
  }
  if (scoreJpnEl.innerText !== state.jpn.toString()) {
    scoreJpnEl.innerText = state.jpn;
    animateUpdate(scoreJpnEl);
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

  // Sync admin base checkboxes
  document.getElementById('chk-base-1').checked = state.bases[1];
  document.getElementById('chk-base-2').checked = state.bases[2];
  document.getElementById('chk-base-3').checked = state.bases[3];

  // Indicators (Count Board)
  updateIndicators('b', state.balls, 3);
  updateIndicators('s', state.strikes, 2);
  updateIndicators('o', state.outs, 2);
}

function updateIndicators(type, count, max) {
  for (let i = 0; i < max; i++) {
    if (i < count) {
      indicators[type][i].classList.add('active');
    } else {
      indicators[type][i].classList.remove('active');
    }
  }
}

function animateUpdate(el) {
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 300);
}

// Logging System
function addLog(message) {
  const currentInningStr = `${state.isTopHalf ? '上' : '下'}半局`;
  const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const prefix = `[${state.inning}${currentInningStr} | ${timeStr}]`;

  const li = document.createElement('li');
  li.className = 'log-item highlight';
  li.innerText = `${prefix} ${message}`;

  // Remove highlight from previous items
  Array.from(playLogEl.children).forEach(child => child.classList.remove('highlight'));

  playLogEl.insertBefore(li, playLogEl.firstChild);

  // Keep max 20 logs
  if (playLogEl.children.length > 20) {
    playLogEl.removeChild(playLogEl.lastChild);
  }
}

function resetCount() {
  state.balls = 0;
  state.strikes = 0;
  updateUI();
}

// Logic Actions
function recordBall() {
  if (state.balls >= 3) {
    // Walk
    addLog('四壞球保送上壘！');
    state.bases[1] = true;
    resetCount();
  } else {
    state.balls++;
    addLog(`壞球 (目前球數: ${state.balls}B ${state.strikes}S)`);
    updateUI();
  }
}

function recordStrike() {
  if (state.strikes >= 2) {
    // Strike Out
    addLog('三振出局！ (Strikeout)');
    recordOut();
  } else {
    state.strikes++;
    addLog(`好球 (目前球數: ${state.balls}B ${state.strikes}S)`);
    updateUI();
  }
}

function recordFoul() {
  if (state.strikes < 2) {
    state.strikes++;
    addLog(`界外球 (目前球數: ${state.balls}B ${state.strikes}S)`);
  } else {
    addLog('界外球');
  }
  updateUI();
}

function recordOut() {
  state.outs++;
  resetCount();

  if (state.outs >= 3) {
    addLog('三人出局，半局結束！');
    state.outs = 0;
    state.bases = { 1: false, 2: false, 3: false };

    // Switch half / inning
    if (state.isTopHalf) {
      state.isTopHalf = false;
    } else {
      state.isTopHalf = true;
      state.inning++;
    }

    setTimeout(() => {
      addLog(`第 ${state.inning} 局${state.isTopHalf ? '上' : '下'}半局開始`);
    }, 1000);
  } else {
    addLog(`${state.outs} 人出局`);
  }

  updateUI();
}

// Controllers Binding
document.getElementById('btn-ball').addEventListener('click', recordBall);
document.getElementById('btn-strike').addEventListener('click', recordStrike);
document.getElementById('btn-foul').addEventListener('click', recordFoul);

document.getElementById('btn-hit').addEventListener('click', () => {
  addLog('擊出安打上壘！');
  state.bases[1] = true;
  resetCount();
});

document.getElementById('btn-out').addEventListener('click', () => {
  addLog('打擊出局 / 刺殺出局');
  recordOut();
});

document.getElementById('btn-score-tpe').addEventListener('click', () => {
  state.tpe++;
  addLog('台灣隊拿下 1 分！ (TPE 得分)');
  updateUI();
});

document.getElementById('btn-score-jpn').addEventListener('click', () => {
  state.jpn++;
  addLog('日本隊拿下 1 分！ (JPN 得分)');
  updateUI();
});

document.getElementById('btn-next-inning').addEventListener('click', () => {
  state.outs = 3;
  recordOut();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('確定要重設比賽嗎？')) {
    state = {
      tpe: 0,
      jpn: 0,
      inning: 1,
      isTopHalf: true,
      balls: 0,
      strikes: 0,
      outs: 0,
      bases: { 1: false, 2: false, 3: false }
    };
    playLogEl.innerHTML = '<li class="log-item highlight">比賽即將於 18:00 開始，目前為賽前練習。</li>';
    addLog('比賽已重設。');
    updateUI();
  }
});

// Admin Checkbox bindings
document.getElementById('chk-base-1').addEventListener('change', (e) => { state.bases[1] = e.target.checked; updateUI(); });
document.getElementById('chk-base-2').addEventListener('change', (e) => { state.bases[2] = e.target.checked; updateUI(); });
document.getElementById('chk-base-3').addEventListener('change', (e) => { state.bases[3] = e.target.checked; updateUI(); });

// Initial Update
updateUI();

// If current time is past 18:00, simulate start
const now = new Date();
if (now.getHours() >= 18) {
  addLog('比賽正式開打！雙方先發投手已就位。');
}

// ============================================
// NEW FEATURES: Tabs, Results and Probabilities
// ============================================

// --- Tab Navigation ---
const tabBtns = document.querySelectorAll('.tab-btn');
const viewSections = document.querySelectorAll('.view-section');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from all tabs
    tabBtns.forEach(t => t.classList.remove('active'));
    viewSections.forEach(v => v.classList.remove('active'));

    // Add active to clicked tab
    btn.classList.add('active');
    const targetView = document.getElementById(btn.getAttribute('data-target'));
    if (targetView) targetView.classList.add('active');

    // If probs view is opened, trigger probability calculation/animation
    if (btn.getAttribute('data-target') === 'view-probs') {
      calculateAndRenderProbs();
    }
  });
});


// --- Past Results Data (2026 WBC Pool C) ---
const pastResults = [
  { date: '2026-03-04', home: { name: '澳洲', flag: '🇦🇺', score: 3 }, away: { name: '台灣', flag: '🇹🇼', score: 0 } },
  { date: '2026-03-05', home: { name: '韓國', flag: '🇰🇷', score: 11 }, away: { name: '捷克', flag: '🇨🇿', score: 4 } },
  { date: '2026-03-06', home: { name: '澳洲', flag: '🇦🇺', score: 5 }, away: { name: '捷克', flag: '🇨🇿', score: 1 } }
];

const resultsContainer = document.getElementById('results-container');

function renderResults() {
  resultsContainer.innerHTML = '';
  pastResults.forEach(match => {
    const card = document.createElement('div');
    card.className = 'result-card glass';
    card.innerHTML = `
      <div class="rc-date">${match.date}</div>
      <div class="rc-match">
        <div class="rc-team away">
          <span>${match.away.name}</span>
          <span>${match.away.flag}</span>
        </div>
        <div class="rc-score">${match.away.score} - ${match.home.score}</div>
        <div class="rc-team home">
          <span>${match.home.flag}</span>
          <span>${match.home.name}</span>
        </div>
      </div>
    `;
    resultsContainer.appendChild(card);
  });
}
renderResults();


// --- Championship Probabilities Calculation ---
// Base arbitrary power strength (1-100)
const teamsPower = {
  '日本 🇯🇵': 95,
  '美國 🇺🇸': 92,
  '多明尼加 🇩🇴': 90,
  '委內瑞拉 🇻🇪': 88,
  '波多黎各 🇵🇷': 85,
  '韓國 🇰🇷': 82,
  '台灣 🇹🇼': 78,
  '古巴 🇨🇺': 75,
  '澳洲 🇦🇺': 70,
  '荷蘭 🇳🇱': 72
};

const probsContainer = document.getElementById('probs-container');

function calculateAndRenderProbs() {
  probsContainer.innerHTML = '';

  // Calculate dynamic probability based on live score effect on Taiwan and Japan
  // This makes the chart change dynamically if the user updates the live score
  let dynamicPower = { ...teamsPower };

  // Example live effect: If Taiwan is winning by a lot, their probability goes up
  const scoreDiffTaiwan = state.tpe - state.jpn;
  if (scoreDiffTaiwan > 0) {
    dynamicPower['台灣 🇹🇼'] += (scoreDiffTaiwan * 2);
    dynamicPower['日本 🇯🇵'] -= scoreDiffTaiwan;
  } else if (scoreDiffTaiwan < 0) {
    dynamicPower['日本 🇯🇵'] += (Math.abs(scoreDiffTaiwan) * 1.5);
    dynamicPower['台灣 🇹🇼'] -= Math.abs(scoreDiffTaiwan);
  }

  // Normalize mathematically to get percentage
  const entries = Object.entries(dynamicPower);
  entries.sort((a, b) => b[1] - a[1]); // Sort by power descending

  // Calculate total power
  const totalPower = entries.reduce((sum, [_, power]) => sum + Math.max(0, power), 0);

  // Take top 8 for display to keep UI clean
  const displayTeams = entries.slice(0, 8);

  // Re-normalize top 8 relative to all teams
  const teamProbs = displayTeams.map(([team, power]) => {
    let rawProb = (Math.max(0, power) / totalPower) * 100;
    // Exponentiate slightly to make top teams stand out more
    let finalProb = Math.pow(rawProb, 1.2);
    return { team, prob: finalProb };
  });

  // Re-normalize sum to exactly 100% distribution for visual accuracy among top contenders (relative prob)
  // Actually, standardizing back so the display looks realistic
  const sumFinalProbs = teamProbs.reduce((sum, t) => sum + t.prob, 0);
  // Add a fake "Others" to make the top 8 sum to ~90%
  const normalizingFactor = 90 / sumFinalProbs;

  teamProbs.forEach(({ team, prob }, index) => {
    let finalPercentage = (prob * normalizingFactor).toFixed(1);

    const row = document.createElement('div');
    row.className = 'prob-row';
    row.innerHTML = `
      <div class="prob-info">
        <div class="prob-team">
          <span class="rank">#${index + 1}</span>
          ${team}
        </div>
        <div class="prob-value">${finalPercentage}%</div>
      </div>
      <div class="prob-bar-bg">
        <div class="prob-bar-fill" style="width: 0%" data-target-width="${finalPercentage}%"></div>
      </div>
    `;
    probsContainer.appendChild(row);
  });

  // Trigger animation after render
  setTimeout(() => {
    const bars = document.querySelectorAll('.prob-bar-fill');
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute('data-target-width');
    });
  }, 50);
}

// Initial calculation is not needed immediately, it renders when the tab is clicked.
// But we bind an event to updateUI so IF the user is ON the probs tab and scores change, it updates live.
const originalUpdateUI = updateUI;
updateUI = function () {
  originalUpdateUI();
  // If Probabilities tab is active, recalculate live
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && activeTab.getAttribute('data-target') === 'view-probs') {
    calculateAndRenderProbs();
  }
};

