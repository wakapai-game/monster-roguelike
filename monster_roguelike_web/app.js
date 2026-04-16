import { MONSTERS_DATA, ENEMY_DATA, TUTORIAL_ENEMY } from './data.js';
import { Monster, Timeline, BattleEngine } from './game.js';
import { MapGenerator } from './map.js';
import { appState } from './state.js';
import {
  screenStart, screenStory, screenEgg, screenMap, screenSelection,
  screenBattle, screenName, screenStarterEvent, screenTutorialSelect, screenHub, screenReward,
  mainHeader, rosterGrid, btnStartBattle, battleLog,
  btnHubInventory, btnMapInventory, btnHubParty, btnMapParty,
  btnSubmitName, inputPlayerName, starterEventGrid, btnStarterEventProceed,
  btnStage1, btnStage2, btnStage3, btnCollectReward,
  switchScreen
} from './ui/dom.js';
import { initTutorial, showTutorialStep } from './ui/tutorial.js';
import { openInventory, openParty } from './ui/inventory.js';
import { renderMap, generateRewards, collectPendingReward } from './ui/map-render.js';
import { toast, updateUI, resumeLoop } from './ui/battle.js';
import { openEncyclopedia } from './ui/encyclopedia.js';
import { saveGame, loadGame, deleteSave } from './persistence.js';
import { openHelp, openHelpTab, initHelp } from './ui/help.js';
import { generateNPCSprite } from './ui/sprite-generator.js';

// ---- Help System ----
initHelp();
const _btnHelp = document.getElementById('btn-help-global');
if (_btnHelp) _btnHelp.onclick = openHelp;
const _btnAffinity = document.getElementById('btn-affinity-global');
if (_btnAffinity) _btnAffinity.onclick = () => openHelpTab('affinity');
const _btnMonsters = document.getElementById('btn-monsters-global');
if (_btnMonsters) _btnMonsters.onclick = () => openEncyclopedia();

// ---- フロートメニュー トグル ----
const _btnMenuToggle = document.getElementById('btn-float-menu-toggle');
const _floatMenuPanel = document.getElementById('float-menu-panel');
if (_btnMenuToggle && _floatMenuPanel) {
  _btnMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = _floatMenuPanel.classList.toggle('hide');
    _btnMenuToggle.textContent = isHidden ? '☰' : '✕';
  });
  document.addEventListener('click', () => {
    if (!_floatMenuPanel.classList.contains('hide')) {
      _floatMenuPanel.classList.add('hide');
      _btnMenuToggle.textContent = '☰';
    }
  });
}

// ---- Cork NPC Portraits ----
function initCorkPortraits() {
  document.querySelectorAll('.screen').forEach(screen => {
    let inserted = false;
    screen.querySelectorAll('p').forEach(p => {
      if (p.closest('.story-content')) return;
      if (p.textContent.startsWith('コルク') && !inserted) {
        if (!p.previousElementSibling?.classList.contains('cork-portrait-wrap')) {
          const wrap = document.createElement('div');
          wrap.className = 'cork-portrait-wrap';
          const c = document.createElement('canvas');
          c.width = 32;
          c.height = 32;
          c.className = 'cork-portrait';
          generateNPCSprite(c, 'cork');
          wrap.appendChild(c);
          const label = document.createElement('span');
          label.className = 'cork-name-label';
          label.textContent = 'コルク';
          wrap.appendChild(label);
          p.parentNode.insertBefore(wrap, p);
          inserted = true;
        }
      }
    });
  });
}
initCorkPortraits();

// ---- Save / Load ----

const _saveModal       = document.getElementById('save-modal');
const _saveModalClose  = document.getElementById('save-modal-close');
const _saveModalDo     = document.getElementById('save-modal-do');
const _saveModalMsg    = _saveModal?.querySelector('.save-modal-msg');

function openSaveModal() { _saveModal?.classList.remove('hide'); }
function closeSaveModal() { _saveModal?.classList.add('hide'); }

document.getElementById('save-btn').onclick = openSaveModal;

if (_saveModalClose) _saveModalClose.onclick = closeSaveModal;

if (_saveModalDo) _saveModalDo.onclick = () => {
  saveGame(appState);
  if (_saveModalMsg) _saveModalMsg.textContent = 'コルク：「記録した。問題ない。」';
  setTimeout(closeSaveModal, 1200);
};

document.getElementById('delete-save-btn').onclick = () => {
  if (confirm('コルク：「記録を消すぞ。本当にいいか？　俺はいいが。」')) {
    deleteSave();
    closeSaveModal();
    alert('コルク：「消した。問題ない。問題があっても問題ない。」');
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


let storyPage = 1;

function showStoryPage(pageNum) {
  const btn = document.getElementById('btn-skip-story');
  btn.disabled = true;
  btn.classList.remove('pulse-glow');
  const lines = document.getElementById(`story-page-${pageNum}`).querySelectorAll('p');
  const totalMs = (0.5 + (lines.length - 1) * 1.5 + 1.0) * 1000;
  setTimeout(() => { btn.disabled = false; btn.classList.add('pulse-glow'); }, totalMs);
}

document.getElementById('btn-begin').onclick = () => {
  switchScreen(screenStart, screenStory);
  showStoryPage(1);
};

document.getElementById('btn-skip-all-story').onclick = () => {
  storyPage = 1;
  switchScreen(screenStory, screenName);
};

document.getElementById('btn-skip-story').onclick = () => {
  if (storyPage < 3) {
    document.getElementById(`story-page-${storyPage}`).classList.add('hide');
    storyPage++;
    const nextPage = document.getElementById(`story-page-${storyPage}`);
    nextPage.classList.remove('hide');
    nextPage.querySelectorAll('p').forEach(p => {
      p.style.animation = 'none';
      p.offsetHeight;
      p.style.animation = '';
    });
    showStoryPage(storyPage);
  } else {
    storyPage = 1;
    switchScreen(screenStory, screenName);
  }
};

btnSubmitName.onclick = () => {
  appState.playerName = inputPlayerName.value.trim() || 'ハンター';
  grantStarterMonsters();
  switchScreen(screenName, screenStarterEvent);
};

btnStarterEventProceed.onclick = () => {
  switchScreen(screenStarterEvent, screenTutorialSelect);
};

document.getElementById('btn-tutorial-full').onclick = () => {
  initTutorial('full');
  startTutorialBattle();
};
document.getElementById('btn-tutorial-simple').onclick = () => {
  initTutorial('simple');
  startTutorialBattle();
};
document.getElementById('btn-tutorial-skip').onclick = () => {
  switchScreen(screenTutorialSelect, screenHub);
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
    alert('コルク：「まだ早い。前のステージを終わらせてこい。順番は守れ。」');
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
  const isBoss = currentNode.type === 'boss';
  const normalPool = ENEMY_DATA.filter(e => e.id !== 'e_boss_01');
  const shuffled = [...normalPool].sort(() => 0.5 - Math.random());

  let p2Count = 1;
  const floor = currentNode.floor || 1;
  if (floor >= 2) p2Count = 2;
  if (floor >= 4) p2Count = 3;
  if (currentNode.type === 'elite') p2Count += 1;
  if (isBoss) p2Count = 4;

  // ボスノードは弱い敵を先に出し、ダイカラを最後に固定
  const pool = isBoss
    ? [...shuffled.slice(0, p2Count - 1), ENEMY_DATA.find(e => e.id === 'e_boss_01')]
    : shuffled.slice(0, p2Count);

  appState.p2Team = pool.map(data => {
    const m = new Monster(JSON.parse(JSON.stringify(data)));
    const scale = 1.0 + (floor * 0.1);
    m.stats.hp = Math.floor(m.stats.hp * scale);
    m.stats.atk = Math.floor(m.stats.atk * scale);
    if (isBoss) m.stats.hp *= 2;
    m.current_hp = m.stats.hp;
    return m;
  });

  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
  const encounterLabel = { battle: '遭遇', elite: '強敵', boss: 'ボス', rest: '休憩' }[currentNode.type] ?? currentNode.type;
  toast(`<span class="log-system">【${encounterLabel}】地上が動き出した。</span>`);
  updateUI();
  resumeLoop();
}

// ---- Tutorial Battle ----
function startTutorialBattle() {
  switchScreen(screenTutorialSelect, screenBattle);
  mainHeader.style.display = 'block';

  if (battleLog) battleLog.innerHTML = '';

  // チュートリアル用アイテムをインベントリに追加（キズぐすり×2、スタミナドリンク×1）
  appState.globalInventory.battleItems.push('bitem_hp_potion', 'bitem_hp_potion', 'bitem_st_potion');

  appState.engine = new BattleEngine();
  appState.p1Team = appState.globalRoster.map(d => new Monster(JSON.parse(JSON.stringify(d))));

  const enemyData = JSON.parse(JSON.stringify(TUTORIAL_ENEMY));
  appState.p2Team = [new Monster(enemyData)];

  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
  toast(`<span class="log-system">コルク：「ダミーが相手だ。負けても問題ない。勝っても特に何もないが。」</span>`);
  updateUI();
  resumeLoop();
}

// ---- Map / Reward Flow ----
document.addEventListener('battle-end', (e) => {
  if (!e.detail.win) {
    window.location.reload();
    return;
  }

  // チュートリアル終了：報酬画面を経由して拠点へ
  if (appState.tutorialMode && appState.tutorialMode !== 'none') {
    appState.tutorialReward = true;
    generateRewards();
    switchScreen(screenBattle, screenReward);
    setTimeout(() => showTutorialStep('reward', null), 300);
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
  collectPendingReward();
  if (appState.tutorialReward) {
    appState.tutorialReward = false;
    appState.tutorialMode = null;
    appState.tutorialShownSteps = new Set();
    mainHeader.style.display = 'none';
    switchScreen(screenReward, screenHub);
    return;
  }
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
      eggText.innerHTML = `孵化した。<br><span style="color:#fbbf24;">${names}</span> があなたを選んだ。<br><span style="color:#94a3b8; font-size:0.85rem;">コルク：「問題ない。」</span>`;
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

  // 手持ちに既にいるジュウマの base ID を除外
  const ownedBaseIds = new Set(
    MONSTERS_DATA
      .filter(m => (appState.globalRoster || []).some(r => r.id.startsWith(m.id)))
      .map(m => m.id)
  );
  const unownedPool = MONSTERS_DATA.filter(m => !ownedBaseIds.has(m.id));
  // 全種類所持済みの場合はフルプールにフォールバック
  const basePool = unownedPool.length > 0 ? unownedPool : MONSTERS_DATA;

  let pool = basePool;
  if (Math.random() < 0.5) {
    const biasedPool = basePool.filter(m => biases.includes(m.main_element));
    if (biasedPool.length > 0) pool = biasedPool;
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
