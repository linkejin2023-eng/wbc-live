import { io } from "socket.io-client";

// Connect to socket
const socket = io();

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

// Admin Password & Toggle
let adminPassword = "";
const adminToggleBtn = document.getElementById('toggle-admin');
const adminModal = document.getElementById('admin-modal');
const adminPwInput = document.getElementById('admin-pw-input');
const btnSubmitPw = document.getElementById('btn-submit-pw');

const adminPanel = document.getElementById('admin-panel');
const closeAdminBtn = document.getElementById('close-admin');

adminToggleBtn.addEventListener('click', () => {
  if (adminPanel.classList.contains('hidden') && adminModal.classList.contains('hidden')) {
    adminModal.classList.remove('hidden');
    adminPwInput.value = '';
    adminPwInput.focus();
  } else {
    adminPanel.classList.add('hidden');
    adminModal.classList.add('hidden');
    adminPassword = "";
  }
});

btnSubmitPw.addEventListener('click', () => {
  const pw = adminPwInput.value;
  if (pw) {
    adminPassword = pw;
    adminModal.classList.add('hidden');
    adminPanel.classList.remove('hidden');
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminPanel.classList.add('hidden');
  adminModal.classList.add('hidden');
  adminPassword = "";
});

// Game State (Local copy synced from server)
let state = {
  tpe: 0,
  jpn: 0,
  inning: 1,
  isTopHalf: true,
  balls: 0,
  strikes: 0,
  outs: 0,
  bases: { 1: false, 2: false, 3: false },
  logs: []
};

// -- Socket Client Listeners --
socket.on('state-updated', (newState) => {
  state = newState;
  updateUI();
  renderLogs();
});

socket.on('error', (err) => {
  alert(err.message || 'Error communicating with server');
});

// Wrapper to send state update to server
function emitUpdate() {
  socket.emit('update-state', {
    password: adminPassword,
    newState: state
  });
}

function updateUI() {
  if (scoreTpeEl.innerText !== state.tpe.toString()) {
    scoreTpeEl.innerText = state.tpe;
    animateUpdate(scoreTpeEl);
  }
  if (scoreJpnEl.innerText !== state.jpn.toString()) {
    scoreJpnEl.innerText = state.jpn;
    animateUpdate(scoreJpnEl);
  }

  inningHalfEl.innerText = state.isTopHalf ? '▲' : '▼';
  inningNumEl.innerText = state.inning;

  Object.keys(state.bases).forEach(base => {
    if (state.bases[base]) {
      bases[base].classList.add('active');
    } else {
      bases[base].classList.remove('active');
    }
  });

  document.getElementById('chk-base-1').checked = state.bases[1];
  document.getElementById('chk-base-2').checked = state.bases[2];
  document.getElementById('chk-base-3').checked = state.bases[3];

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

function renderLogs() {
  playLogEl.innerHTML = '';
  state.logs.forEach(logText => {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.innerText = logText;
    playLogEl.appendChild(li);
  });
  // Highlight the top one (latest)
  if (playLogEl.firstChild) {
    playLogEl.firstChild.classList.add('highlight');
  }
}

function addLog(message) {
  const currentInningStr = `${state.isTopHalf ? '上' : '下'}半局`;
  const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const prefix = `[${state.inning}${currentInningStr} | ${timeStr}]`;
  const fullMessage = `${prefix} ${message}`;

  state.logs.unshift(fullMessage);
  if (state.logs.length > 20) {
    state.logs.pop();
  }
}

function resetCount() {
  state.balls = 0;
  state.strikes = 0;
}

// Logic Actions (Modifiers before Emit)
function recordBall() {
  if (state.balls >= 3) {
    addLog('四壞球保送上壘！');
    state.bases[1] = true;
    resetCount();
  } else {
    state.balls++;
    addLog(`壞球 (目前球數: ${state.balls}B ${state.strikes}S)`);
  }
  emitUpdate();
}

function recordStrike() {
  if (state.strikes >= 2) {
    addLog('三振出局！ (Strikeout)');
    recordOut();
  } else {
    state.strikes++;
    addLog(`好球 (目前球數: ${state.balls}B ${state.strikes}S)`);
    emitUpdate();
  }
}

function recordFoul() {
  if (state.strikes < 2) {
    state.strikes++;
    addLog(`界外球 (目前球數: ${state.balls}B ${state.strikes}S)`);
  } else {
    addLog('界外球');
  }
  emitUpdate();
}

function recordOut() {
  state.outs++;
  resetCount();

  if (state.outs >= 3) {
    addLog('三人出局，半局結束！');
    state.outs = 0;
    state.bases = { 1: false, 2: false, 3: false };

    if (state.isTopHalf) {
      state.isTopHalf = false;
    } else {
      state.isTopHalf = true;
      state.inning++;
    }

    addLog(`第 ${state.inning} 局${state.isTopHalf ? '上' : '下'}半局即將開始`);
  } else {
    addLog(`${state.outs} 人出局`);
  }

  emitUpdate();
}

// Controllers Binding
document.getElementById('btn-ball').addEventListener('click', recordBall);
document.getElementById('btn-strike').addEventListener('click', recordStrike);
document.getElementById('btn-foul').addEventListener('click', recordFoul);

document.getElementById('btn-hit').addEventListener('click', () => {
  addLog('擊出安打上壘！');
  state.bases[1] = true;
  resetCount();
  emitUpdate();
});

document.getElementById('btn-out').addEventListener('click', () => {
  addLog('打擊出局 / 刺殺出局');
  recordOut();
});

document.getElementById('btn-score-tpe').addEventListener('click', () => {
  state.tpe++;
  addLog('台灣隊拿下 1 分！ (TPE 得分)');
  emitUpdate();
});

document.getElementById('btn-score-jpn').addEventListener('click', () => {
  state.jpn++;
  addLog('日本隊拿下 1 分！ (JPN 得分)');
  emitUpdate();
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
      bases: { 1: false, 2: false, 3: false },
      logs: []
    };
    addLog('比賽已重設。');
    emitUpdate();
  }
});

// Admin Checkbox bindings
document.getElementById('chk-base-1').addEventListener('change', (e) => { state.bases[1] = e.target.checked; emitUpdate(); });
document.getElementById('chk-base-2').addEventListener('change', (e) => { state.bases[2] = e.target.checked; emitUpdate(); });
document.getElementById('chk-base-3').addEventListener('change', (e) => { state.bases[3] = e.target.checked; emitUpdate(); });

// ============================================
// Tabs, Results and Probabilities
// ============================================

const tabBtns = document.querySelectorAll('.tab-btn');
const viewSections = document.querySelectorAll('.view-section');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(t => t.classList.remove('active'));
    viewSections.forEach(v => v.classList.remove('active'));

    btn.classList.add('active');
    const targetView = document.getElementById(btn.getAttribute('data-target'));
    if (targetView) targetView.classList.add('active');

    if (btn.getAttribute('data-target') === 'view-probs') {
      calculateAndRenderProbs();
    }
  });
});

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

const teamsPower = {
  '日本 🇯🇵': 95,
  '美國 🇺🇸': 92,
  '多明尼加 ��🇴': 90,
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

  let dynamicPower = { ...teamsPower };

  const scoreDiffTaiwan = state.tpe - state.jpn;
  if (scoreDiffTaiwan > 0) {
    dynamicPower['台灣 🇹🇼'] += (scoreDiffTaiwan * 2);
    dynamicPower['日本 🇯🇵'] -= scoreDiffTaiwan;
  } else if (scoreDiffTaiwan < 0) {
    dynamicPower['日本 🇯🇵'] += (Math.abs(scoreDiffTaiwan) * 1.5);
    dynamicPower['台灣 🇹🇼'] -= Math.abs(scoreDiffTaiwan);
  }

  const entries = Object.entries(dynamicPower);
  entries.sort((a, b) => b[1] - a[1]);

  const totalPower = entries.reduce((sum, [_, power]) => sum + Math.max(0, power), 0);
  const displayTeams = entries.slice(0, 8);

  const teamProbs = displayTeams.map(([team, power]) => {
    let rawProb = (Math.max(0, power) / totalPower) * 100;
    let finalProb = Math.pow(rawProb, 1.2);
    return { team, prob: finalProb };
  });

  const sumFinalProbs = teamProbs.reduce((sum, t) => sum + t.prob, 0);
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

  setTimeout(() => {
    const bars = document.querySelectorAll('.prob-bar-fill');
    bars.forEach(bar => {
      bar.style.width = bar.getAttribute('data-target-width');
    });
  }, 50);
}

const originalUpdateUI = updateUI;
updateUI = function () {
  originalUpdateUI();
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && activeTab.getAttribute('data-target') === 'view-probs') {
    calculateAndRenderProbs();
  }
};

// Initial state wait for socket
