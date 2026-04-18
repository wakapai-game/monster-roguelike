import { MONSTERS_DATA, ENEMY_DATA, TUTORIAL_ENEMY, EGG_DATA } from './data.js';
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
import { toast, updateUI, resumeLoop, playBattleStart } from './ui/battle.js';
import { openEncyclopedia } from './ui/encyclopedia.js';
import { saveGame, loadGame, deleteSave } from './persistence.js';
import { openHelp, openHelpTab, initHelp } from './ui/help.js';
import { generateNPCSprite, generateUIIcon, generateEggSprite } from './ui/sprite-generator.js';
import { initDevOverlay } from './ui/dev-overlay.js';
import { initStartScene } from './ui/start-scene.js';
import { play, stop, setVolume, getVolume, initBgmObserver, TRACKS, screenToBgm } from './ui/bgm.js';

// ---- ボタンアイコン（マップ画面・ハブ画面共通） ----
[
  ['icon-map-party',      'party'],
  ['icon-map-inventory',  'inventory'],
  ['icon-hub-party',      'party'],
  ['icon-hub-inventory',  'inventory'],
  ['icon-hub-save',       'save'],
].forEach(([id, type]) => {
  const c = document.getElementById(id);
  if (c) generateUIIcon(c, type);
});

// ---- Dev Overlay (?dev で有効化) ----
initDevOverlay();

// ---- スタート画面モンスターパレード ----
initStartScene();

// ---- BGM: 最初のインタラクションでタイトルBGM開始 + 画面切替で自動切替 ----
initBgmObserver();
document.addEventListener('click', () => {
  const active = document.querySelector('.screen.active');
  const trackId = active ? screenToBgm(active.id) : 'title';
  play(trackId || 'title');
}, { once: true });

// ---- サウンドテスト ----
(function initSoundTest() {
  const btnOpen = document.getElementById('btn-sound-test');
  const btnBack = document.getElementById('btn-sound-test-back');
  const screenST = document.getElementById('screen-sound-test');
  const list = document.getElementById('sound-test-list');
  const slider = document.getElementById('bgm-volume-slider');
  const volLabel = document.getElementById('bgm-volume-label');

  if (!btnOpen || !btnBack || !screenST) return;

  // 音量スライダー
  slider.addEventListener('input', () => {
    const v = slider.value / 100;
    setVolume(v);
    volLabel.textContent = `${slider.value}%`;
  });

  // サウンドテスト画面を開く
  btnOpen.addEventListener('click', () => {
    play('title'); // BGM起動（最初のインタラクション対応）
    screenStart.classList.remove('active');
    screenStart.classList.add('hide');
    screenST.classList.remove('hide');
    screenST.classList.add('active');
    renderSoundTestList();
  });

  // タイトルへ戻る
  btnBack.addEventListener('click', () => {
    stop();
    screenST.classList.remove('active');
    screenST.classList.add('hide');
    screenStart.classList.remove('hide');
    screenStart.classList.add('active');
    play('title');
  });

  function renderSoundTestList() {
    list.innerHTML = '';
    let playingBtn = null;

    for (const [trackId, track] of Object.entries(TRACKS)) {
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex',
        'justify-content:space-between',
        'align-items:center',
        'padding:10px 14px',
        'background:rgba(0,0,0,0.3)',
        'border-radius:8px',
        'border:1px solid rgba(255,255,255,0.08)',
        'gap:12px',
      ].join(';');

      const name = document.createElement('span');
      name.textContent = track.name;
      name.style.cssText = 'font-size:0.85rem; flex:1; color:#e2e8f0;';

      const btn = document.createElement('button');
      btn.className = 'btn skill-btn';
      btn.style.cssText = 'font-size:0.75rem; padding:4px 12px; white-space:nowrap; flex-shrink:0;';
      btn.textContent = '▶ 再生';

      btn.addEventListener('click', () => {
        if (playingBtn && playingBtn !== btn) {
          playingBtn.textContent = '▶ 再生';
          playingBtn.style.background = '';
        }
        if (btn.textContent === '▶ 再生') {
          play(trackId);
          btn.textContent = '■ 停止';
          btn.style.background = 'rgba(0,255,136,0.15)';
          playingBtn = btn;
        } else {
          stop();
          btn.textContent = '▶ 再生';
          btn.style.background = '';
          playingBtn = null;
        }
      });

      row.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
})();

// ---- Help System ----
initHelp();
const _btnHelp = document.getElementById('btn-help-global');
if (_btnHelp) _btnHelp.onclick = openHelp;
const _btnAffinity = document.getElementById('btn-affinity-global');
if (_btnAffinity) _btnAffinity.onclick = () => openHelpTab('affinity');
const _btnMonsters = document.getElementById('btn-monsters-global');
if (_btnMonsters) _btnMonsters.onclick = () => openEncyclopedia();

const _btnGotoTitle = document.getElementById('btn-goto-title');
if (_btnGotoTitle) _btnGotoTitle.onclick = () => {
  if (!confirm('タイトルへ戻りますか？\n（セーブしていない進行状況は失われます）')) return;
  const active = document.querySelector('.screen.active');
  if (active) {
    active.classList.remove('active');
    active.classList.add('hide');
  }
  screenStart.classList.remove('hide');
  screenStart.classList.add('active');
  mainHeader.style.display = 'none';
  if (_floatMenuPanel) { _floatMenuPanel.classList.add('hide'); _btnMenuToggle.textContent = '☰'; }
};

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

// ---- サウンドON/OFFトグル ----
(function() {
  const btn = document.getElementById('btn-sound-toggle');
  if (!btn) return;
  const STORAGE_KEY = 'mrw_sound_muted';
  let muted = localStorage.getItem(STORAGE_KEY) === '1';
  let _savedVol = 0.4;

  function applyMute() {
    if (muted) {
      _savedVol = getVolume() || 0.4;
      setVolume(0);
      btn.textContent = '🔇';
      btn.classList.add('muted');
      btn.title = 'サウンドOFF（クリックでON）';
    } else {
      setVolume(_savedVol);
      btn.textContent = '🔊';
      btn.classList.remove('muted');
      btn.title = 'サウンドON（クリックでOFF）';
    }
  }

  applyMute();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted;
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    applyMute();
  });
})();

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

document.getElementById('save-btn')?.addEventListener('click', openSaveModal);

if (_saveModalClose) _saveModalClose.onclick = closeSaveModal;

if (_saveModalDo) _saveModalDo.onclick = () => {
  saveGame(appState);
  if (_saveModalMsg) _saveModalMsg.textContent = 'コルク：「記録した。問題ない。」';
  setTimeout(closeSaveModal, 1200);
};

document.getElementById('delete-save-btn')?.addEventListener('click', () => {
  if (confirm('コルク：「記録を消すぞ。本当にいいか？　俺はいいが。」')) {
    deleteSave();
    closeSaveModal();
    alert('コルク：「消した。問題ない。問題があっても問題ない。」');
  }
});

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
    appendRosterUI(appState.globalRoster);
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
  if (isBoss) p2Count = 1;

  // ボスノードはボス1体のみ
  const pool = isBoss
    ? [ENEMY_DATA.find(e => e.id === 'e_boss_01')]
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

  updateUI();
  playBattleStart(() => {
    toast(`<span class="log-system">【${encounterLabel}】地上が動き出した。</span>`);
    resumeLoop();
  });
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
  updateUI();
  playBattleStart(() => {
    toast(`<span class="log-system">コルク：「ダミーが相手だ。負けても問題ない。勝っても特に何もないが。」</span>`);
    resumeLoop();
  });
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
const eggText = document.getElementById('egg-hatch-text');
const btnEggProceed = document.getElementById('btn-egg-proceed');
let generatedRoster = [];
let instCount = 0;

function populateEggScreen(elements) {
  const container = document.getElementById('egg-container');
  container.innerHTML = '';
  elements.forEach(element => {
    const eggData = EGG_DATA.find(e => e.element === element) || { name: element + 'の卵' };

    const card = document.createElement('div');
    card.className = 'egg-card';
    card.dataset.element = element;

    const canvas = document.createElement('canvas');
    canvas.className = 'egg-canvas';
    generateEggSprite(canvas, element);

    const label = document.createElement('div');
    label.className = 'egg-label';
    label.textContent = eggData.name;

    card.appendChild(canvas);
    card.appendChild(label);
    container.appendChild(card);

    card.onclick = () => {
      container.querySelectorAll('.egg-card').forEach(c => { c.style.pointerEvents = 'none'; });
      card.classList.add('hatching');
      setTimeout(() => {
        generatedRoster = generateRosterFromEgg(element);
        const names = generatedRoster.map(m => m.name).join(', ');
        eggText.innerHTML = `孵化した。<br><span style="color:#fbbf24;">${names}</span> があなたを選んだ。<br><span style="color:#94a3b8; font-size:0.85rem;">コルク：「問題ない。」</span>`;
        eggText.classList.remove('hide');
        btnEggProceed.classList.remove('hide');
        card.classList.remove('hatching');
        card.style.transform = 'scale(0)';
      }, 1500);
    };
  });
}

function generateRosterFromEgg(element) {
  const ownedBaseIds = new Set(
    MONSTERS_DATA
      .filter(m => (appState.globalRoster || []).some(r => r.id.startsWith(m.id)))
      .map(m => m.id)
  );
  const unownedPool = MONSTERS_DATA.filter(m => !ownedBaseIds.has(m.id));
  const basePool = unownedPool.length > 0 ? unownedPool : MONSTERS_DATA;

  const elementPool = basePool.filter(m => m.main_element === element);
  const pool = elementPool.length > 0 ? elementPool : basePool;

  const picked = pool[Math.floor(Math.random() * pool.length)];
  const monsterData = JSON.parse(JSON.stringify(picked));
  monsterData.id = monsterData.id + '_inst' + (instCount++);
  return [new Monster(monsterData)];
}

function resetEggScreen() {
  const allElements = EGG_DATA.map(e => e.element);
  const shuffled = [...allElements].sort(() => 0.5 - Math.random());
  populateEggScreen(shuffled.slice(0, 3));
  eggText.classList.add('hide');
  btnEggProceed.classList.add('hide');
  generatedRoster = [];
}

// 初期卵画面を生成
resetEggScreen();

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
