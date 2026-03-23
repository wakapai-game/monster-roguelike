import { MONSTERS_DATA, ENEMY_DATA } from './data.js';
import { Monster, Timeline, BattleEngine } from './game.js';
import { MapGenerator } from './map.js';
import { appState } from './state.js';
import {
  screenStart, screenStory, screenEgg, screenMap, screenSelection,
  screenBattle, screenName, screenStarterEvent, screenHub, screenReward,
  mainHeader, rosterGrid, btnStartBattle, battleLog,
  btnHubInventory, btnMapInventory, btnHubParty, btnMapParty,
  btnSubmitName, inputPlayerName, starterEventGrid, btnStarterEventProceed,
  btnStage1, btnStage2, btnStage3, btnCollectReward,
  switchScreen
} from './ui/dom.js';
import { openInventory, openParty } from './ui/inventory.js';
import { renderMap, generateRewards } from './ui/map-render.js';
import { toast, updateUI, resumeLoop } from './ui/battle.js';
import { openEncyclopedia } from './ui/encyclopedia.js';
import { saveGame, loadGame, deleteSave } from './persistence.js';

// ---- Save / Load ----

document.getElementById('save-btn').onclick = () => {
  saveGame(appState);
  alert('セーブしました！');
};

document.getElementById('delete-save-btn').onclick = () => {
  if (confirm('セーブデータを削除しますか？')) {
    deleteSave();
    alert('セーブデータを削除しました。');
  }
};

// Restore save data on load
(function restoreSave() {
  const data = loadGame();
  if (!data) return;
  appState.playerName = data.playerName || 'ハンター';
  appState.unlockedStages = data.unlockedStages || 1;
  appState.currentStage = data.currentStage || 1;
  appState.hubVisited = data.hubVisited || false;
  appState.stageCleared = data.stageCleared || false;
  appState.currentNodeId = data.currentNodeId || null;
  appState.selectedIds = data.selectedIds || [];
  appState.monsterIdCounter = data.monsterIdCounter || 0;
  appState.globalInventory = data.globalInventory || { skills: [], battleItems: [], mapItems: [] };

  if (data.globalRoster && data.globalRoster.length > 0) {
    appState.globalRoster = (data.globalRoster || []).map(d => new Monster(d));
    // Skip start/story/name screens, go directly to hub
    switchScreen(screenStart, screenHub);
    rosterGrid.innerHTML = '';
    appState.globalRoster.forEach(data => {
      const card = document.createElement('div');
      card.className = 'roster-card glass-panel';
      card.dataset.id = data.id;
      card.innerHTML = `
        <h3>${data.name}</h3>
        <p style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">Elem: ${data.main_element.toUpperCase()}</p>
        <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">HP ${data.base_stats.hp}</span>
          <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">ST ${data.base_stats.max_st}</span>
        </div>
      `;
      card.onclick = () => toggleRosterSelection(card, data.id);
      rosterGrid.appendChild(card);
    });
    btnStartBattle.onclick = confirmBattleSetup;
    updateHubUI();
  }
})();

// ---- App Flow ----

document.getElementById('btn-begin').onclick = () => switchScreen(screenStart, screenStory);
document.getElementById('btn-encyclopedia').onclick = () => openEncyclopedia();


document.getElementById('btn-skip-story').onclick = () => switchScreen(screenStory, screenName);

btnSubmitName.onclick = () => {
  appState.playerName = inputPlayerName.value.trim() || 'ハンター';
  grantStarterMonsters();
  switchScreen(screenName, screenStarterEvent);
};

btnStarterEventProceed.onclick = () => {
  switchScreen(screenStarterEvent, screenHub);
};

function grantStarterMonsters() {
  const starterIds = ['m_001', 'm_002', 'm_003'];
  const granted = [];
  starterIds.forEach(id => {
    const baseData = MONSTERS_DATA.find(m => m.id === id);
    if (baseData) {
      const newMonster = new Monster(JSON.parse(JSON.stringify(baseData)));
      appState.monsterIdCounter = (appState.monsterIdCounter || 0) + 1;
      newMonster.id = newMonster.id + '_' + appState.monsterIdCounter;
      granted.push(newMonster);
    }
  });

  starterEventGrid.innerHTML = '';
  granted.forEach(data => {
    const card = document.createElement('div');
    card.className = 'roster-card glass-panel';
    card.style.pointerEvents = 'none';
    card.innerHTML = `
      <h3>${data.name}</h3>
      <p style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">Elem: ${data.main_element.toUpperCase()}</p>
      <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;">
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">HP ${data.base_stats.hp}</span>
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">ST ${data.base_stats.max_st}</span>
      </div>
    `;
    starterEventGrid.appendChild(card);
  });

  initGameSession(granted);
  appState.hubVisited = true;
  updateHubUI();
}

// ---- Inventory / Party ----
btnHubInventory.onclick = () => openInventory(screenHub);
btnMapInventory.onclick = () => openInventory(screenMap);
btnHubParty.onclick = () => openParty(screenHub);
btnMapParty.onclick = () => openParty(screenMap);

// ---- Stage Selection ----
function startStage(stageNum, floors) {
  if (appState.unlockedStages < stageNum) {
    alert('このステージはまだ解放されていません！');
    return;
  }
  appState.currentStage = stageNum;
  appState.stageCleared = false;
  appState.currentNodeId = null;

  appState.mapGenerator = new MapGenerator(floors);
  appState.mapGenerator.generate();
  renderMap(confirmBattleSetup);
  switchScreen(screenHub, screenMap);
}

btnStage1.onclick = () => startStage(1, 3);
btnStage2.onclick = () => startStage(2, 5);
btnStage3.onclick = () => startStage(3, 7);

function updateHubUI() {
  if (appState.unlockedStages >= 2) {
    btnStage2.classList.remove('locked');
    btnStage2.querySelector('.lock-icon').style.display = 'none';
  }
  if (appState.unlockedStages >= 3) {
    btnStage3.classList.remove('locked');
    btnStage3.querySelector('.lock-icon').style.display = 'none';
  }
}

// ---- Battle Setup ----
function confirmBattleSetup() {
  screenSelection.classList.remove('active');
  screenSelection.classList.add('hide');
  screenMap.classList.remove('active');
  screenMap.classList.add('hide');

  screenBattle.classList.remove('hide');
  screenBattle.classList.add('active');
  mainHeader.style.display = 'block';

  if (battleLog) battleLog.innerHTML = '';

  appState.engine = new BattleEngine();
  const rosterOrder = appState.globalRoster.map(m => m.id);
  appState.p1Team = [...appState.selectedIds]
    .sort((a, b) => rosterOrder.indexOf(a) - rosterOrder.indexOf(b))
    .map(id => new Monster(JSON.parse(JSON.stringify(appState.globalRoster.find(m => m.id === id)))));

  const currentNode = appState.mapGenerator?.getNodes().find(n => n.id === appState.currentNodeId);
  if (!currentNode) { console.warn('Node not found:', appState.currentNodeId); return; }
  const shuffled = [...ENEMY_DATA].sort(() => 0.5 - Math.random());

  let p2Count = 1;
  const floor = currentNode.floor || 1;
  if (floor >= 2) p2Count = 2;
  if (floor >= 4) p2Count = 3;
  if (currentNode.type === 'elite') p2Count += 1;
  if (currentNode.type === 'boss') p2Count = 4;

  appState.p2Team = shuffled.slice(0, p2Count).map(data => {
    const m = new Monster(JSON.parse(JSON.stringify(data)));
    const scale = 1.0 + (floor * 0.1);
    m.stats.hp = Math.floor(m.stats.hp * scale);
    m.stats.atk = Math.floor(m.stats.atk * scale);
    if (currentNode.type === 'boss') m.stats.hp *= 2;
    m.current_hp = m.stats.hp;
    return m;
  });

  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
  toast(`<span class="log-system">【${currentNode.type.toUpperCase()} ENCOUNTER】 BATTLE START!</span>`);
  updateUI();
  resumeLoop();
}

// ---- Map / Reward Flow ----
document.addEventListener('battle-end', (e) => {
  if (!e.detail.win) {
    window.location.reload();
    return;
  }

  appState.mapGenerator.unlockNextNodes(appState.currentNodeId);
  renderMap(confirmBattleSetup);

  const currentNode = appState.mapGenerator.getNodes().find(n => n.id === appState.currentNodeId);
  if (currentNode && currentNode.floor === appState.mapGenerator.totalFloors - 1) {
    appState.stageCleared = true;
    appState.unlockedStages = Math.max(appState.unlockedStages, appState.currentStage + 1);
  }

  generateRewards();
  switchScreen(screenBattle, screenReward);
});

btnCollectReward.onclick = () => {
  if (appState.stageCleared) {
    resetEggScreen();
    switchScreen(screenReward, screenEgg);
  } else {
    switchScreen(screenReward, screenMap);
  }
};

// ---- Game Session Setup ----
function initGameSession(initialParty) {
  appState.globalRoster = initialParty;
  rosterGrid.innerHTML = '';
  appendRosterUI(appState.globalRoster);
  btnStartBattle.onclick = confirmBattleSetup;
}

function appendRosterUI(newMonsters) {
  newMonsters.forEach(data => {
    const card = document.createElement('div');
    card.className = 'roster-card glass-panel';
    card.dataset.id = data.id;
    card.innerHTML = `
      <h3>${data.name}</h3>
      <p style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">Elem: ${data.main_element.toUpperCase()}</p>
      <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">HP ${data.base_stats.hp}</span>
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">ST ${data.base_stats.max_st}</span>
      </div>
    `;
    card.onclick = () => toggleRosterSelection(card, data.id);
    rosterGrid.appendChild(card);
  });
}

function toggleRosterSelection(card, id) {
  if (appState.selectedIds.includes(id)) {
    appState.selectedIds = appState.selectedIds.filter(i => i !== id);
    card.classList.remove('selected');
  } else {
    if (appState.selectedIds.length < 3) {
      appState.selectedIds.push(id);
      card.classList.add('selected');
    }
  }
  btnStartBattle.disabled = appState.selectedIds.length !== 3;
}

// ---- Egg Selection ----
const eggs = document.querySelectorAll('.egg');
const eggText = document.getElementById('egg-hatch-text');
const btnEggProceed = document.getElementById('btn-egg-proceed');
let generatedRoster = [];
let instCount = 0;

eggs.forEach(egg => {
  egg.onclick = () => {
    eggs.forEach(e => e.style.pointerEvents = 'none');
    egg.classList.add('hatching');
    setTimeout(() => {
      const type = egg.dataset.type;
      generatedRoster = generateRosterFromEgg(type);
      const names = generatedRoster.map(m => m.name).join(', ');
      eggText.innerHTML = `孵化した！<br><span style="color:#fbbf24;">${names}</span> が仲間になった！`;
      eggText.classList.remove('hide');
      btnEggProceed.classList.remove('hide');
      egg.classList.remove('hatching');
      egg.style.transform = 'scale(0)';
    }, 1500);
  };
});

function generateRosterFromEgg(type) {
  const roster = [];
  const biasMap = {
    'red': ['fire', 'earth', 'light'],
    'blue': ['water', 'ice', 'dark'],
    'green': ['wind', 'thunder', 'none']
  };
  const biases = biasMap[type];
  let pool = MONSTERS_DATA;
  if (Math.random() < 0.5) {
    pool = MONSTERS_DATA.filter(m => biases.includes(m.main_element));
    if (pool.length === 0) pool = MONSTERS_DATA;
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  const monsterData = JSON.parse(JSON.stringify(picked));
  monsterData.id = monsterData.id + '_inst' + (instCount++);
  roster.push(new Monster(monsterData));
  return roster;
}

function resetEggScreen() {
  eggs.forEach(egg => {
    egg.style.pointerEvents = 'auto';
    egg.style.transform = 'scale(1)';
    egg.classList.remove('hatching');
  });
  eggText.classList.add('hide');
  btnEggProceed.classList.add('hide');
  generatedRoster = [];
}

btnEggProceed.onclick = () => {
  if (!appState.hubVisited) {
    initGameSession(generatedRoster);
    appState.hubVisited = true;
    updateHubUI();
    switchScreen(screenEgg, screenHub);
  } else {
    appState.globalRoster.push(...generatedRoster);
    appendRosterUI(generatedRoster);
    if (appState.stageCleared) {
      appState.stageCleared = false;
      appState.mapGenerator = null;
      updateHubUI();
      switchScreen(screenEgg, screenHub);
    } else {
      switchScreen(screenEgg, screenMap);
    }
  }
};
