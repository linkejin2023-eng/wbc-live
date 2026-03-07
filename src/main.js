import { io } from "socket.io-client";

// Connect to socket
const socket = io();

// DOM Elements
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

// Game State
let games = [];
let selectedGameId = null;
let lastUpdateStr = "";

// Helper to determine team letter/flag
function getTeamInitials(name) {
  if (!name) return "⚾";
  const words = name.split(' ');
  if (words.length > 1) {
    return words[0][0].toUpperCase() + words[1][0].toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// -- Socket Client Listeners --
socket.on('games-updated', (gamesList) => {
  games = gamesList || [];
  updateSelector();
  updateUI();
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

// Selector logic
gameSelectorEl.addEventListener('change', (e) => {
  selectedGameId = parseInt(e.target.value, 10);
  updateUI();
});

function updateSelector() {
  // Save current selection if valid
  const currentVal = gameSelectorEl.value;
  gameSelectorEl.innerHTML = '';

  if (games.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.text = "今日無賽事或資料讀取中...";
    gameSelectorEl.appendChild(opt);
    return;
  }

  games.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.text = `${g.awayTeam} vs ${g.homeTeam}`;
    gameSelectorEl.appendChild(opt);
  });

  // Auto select logic
  if (selectedGameId && games.find(g => g.id === selectedGameId)) {
    gameSelectorEl.value = selectedGameId;
  } else {
    // Try to find a live game
    const liveGame = games.find(g => g.statusCode === 'I' || g.status.includes('In Progress'));
    if (liveGame) {
      selectedGameId = liveGame.id;
      gameSelectorEl.value = liveGame.id;
    } else {
      // Default to first game
      selectedGameId = games[0].id;
      gameSelectorEl.value = games[0].id;
    }
  }
}

function updateUI() {
  if (games.length === 0 || !selectedGameId) return;

  const state = games.find(g => g.id === selectedGameId);
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
  nameAwayEnEl.innerText = "AWAY";
  nameAwayTcEl.innerText = state.awayTeam;
  flagAwayEl.innerText = getTeamInitials(state.awayTeam);

  nameHomeEnEl.innerText = "HOME";
  nameHomeTcEl.innerText = state.homeTeam;
  flagHomeEl.innerText = getTeamInitials(state.homeTeam);

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
  updateIndicators('b', state.balls, 4);  // sometimes 4 dots logic, but we only have 3 dots in CSS
  updateIndicators('s', state.strikes, 3);
  updateIndicators('o', state.outs, 3);

  // Log fake entry based on status (since MLB schedule API doesn't give PBP text easily)
  const currentUpdateStr = `${state.inning}${state.isTopHalf ? '上' : '下'} - ${state.awayScore}:${state.homeScore} - ${state.status}`;
  if (lastUpdateStr !== currentUpdateStr) {
    addLog(`賽況更新：${state.awayTeam} ${state.awayScore} - ${state.homeScore} ${state.homeTeam} (${state.status})`);
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

// Simple Log System
const logs = [];
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

// Initial fake log
addLog('載入即時賽況連線中...');

// ============================================
// Tabs, Results and Probabilities (No manual logic needed)
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
  });
});

// Since Admin panel is no longer needed for manual entry, we can hide the toggle totally.
const adminToggleBtn = document.getElementById('toggle-admin');
if (adminToggleBtn) adminToggleBtn.style.display = 'none';
