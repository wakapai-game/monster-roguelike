import { KARAKURI_DATA, JUMA_DATA, TUTORIAL_JUMA_1, TUTORIAL_JUMA_2, TUTORIAL_BOSS_JUMA,
         TECH_PARTS, MATERIAL_DATA, SYNTHESIS_RECIPES, QUEST_DATA,
         MONSTERS_DATA, ENEMY_DATA } from './data.js';
import { Karakuri, Timeline, BattleEngine, findTechPart } from './game.js';

const EGG_DATA = [];
const Monster  = Karakuri;
import { MapGenerator, TutorialMapGenerator } from './map.js';
import { appState } from './state.js';
import {
  screenStart, screenPresentation, screenEgg, screenMap, screenSelection,
  screenBattle, screenHub, screenReward,
  mainHeader, rosterGrid, btnStartBattle, battleLog,
  btnHubInventory, btnMapInventory, btnHubParty, btnMapParty,
  btnCollectReward,
  switchScreen
} from './ui/dom.js';
import { initTutorial, showTutorialStep } from './ui/tutorial.js';
import { openInventory, openParty } from './ui/inventory.js';
import { renderMap, generateRewards, collectPendingReward } from './ui/map-render.js';
import { toast, updateUI, resumeLoop, playBattleStart } from './ui/battle.js';
import { openEncyclopedia } from './ui/encyclopedia.js';
import { saveGame, loadGame, deleteSave } from './persistence.js';
import { openHelp, openHelpTab, initHelp, openGlossary, initGlossary } from './ui/help.js';
import { generateNPCSprite, generateUIIcon, generateEggSprite } from './ui/sprite-generator.js';
import { initDevOverlay } from './ui/dev-overlay.js';
import { initStartScene } from './ui/start-scene.js';
import { play, stop, setVolume, getVolume, initBgmObserver, TRACKS, screenToBgm } from './ui/bgm.js';
import { initPresentation } from './ui/presentation.js';

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
initGlossary();
const _btnHelp = document.getElementById('btn-help-global');
if (_btnHelp) _btnHelp.onclick = openHelp;
const _btnAffinity = document.getElementById('btn-affinity-global');
if (_btnAffinity) _btnAffinity.onclick = () => openHelpTab('affinity');
const _btnMonsters = document.getElementById('btn-monsters-global');
if (_btnMonsters) _btnMonsters.onclick = () => openEncyclopedia();
const _btnGlossary = document.getElementById('btn-glossary-global');
if (_btnGlossary) _btnGlossary.onclick = openGlossary;

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

// ---- スクリーンショット ----
(function() {
  const btn = document.getElementById('btn-screenshot');
  if (!btn || typeof html2canvas === 'undefined') return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    btn.classList.add('capturing');
    btn.textContent = '⏳';

    // backdrop-filter は html2canvas 非対応のため一時無効化（パネルが透明になる問題の回避）
    const fix = document.createElement('style');
    fix.textContent = '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
    document.head.appendChild(fix);
    // フローティングボタン自体をスクショに写さない
    const floatBtns = document.getElementById('float-btns');
    if (floatBtns) floatBtns.style.visibility = 'hidden';

    try {
      // document.body を対象にすることで背景 canvas (#bg-pixel-canvas) も含める
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        scale: window.devicePixelRatio || 1,
        foreignObjectRendering: false,
      });
      const link = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `bilga-mata-${ts}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.warn('[screenshot] 失敗:', err);
    } finally {
      document.head.removeChild(fix);
      if (floatBtns) floatBtns.style.visibility = '';
      btn.classList.remove('capturing');
      btn.textContent = '📷';
    }
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
  appState.playerName = data.playerName || 'ビルガウィーラー';
  appState.unlockedStages = data.unlockedStages ?? 0;
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

document.getElementById('btn-begin').onclick = () => {
  switchScreen(screenStart, screenPresentation);
  initPresentation(() => {
    // ビルガマタはチュートリアルマップで入手するので、ここでは空セッションのみ初期化
    appState.globalRoster = [];
    appState.hubVisited = true;
    appState.currentQuestId = 'q_tutorial';
    rosterGrid.innerHTML = '';
    btnStartBattle.onclick = confirmBattleSetup;
    updateHubUI();
    switchScreen(screenPresentation, screenHub);
  });
};

// ---- Inventory / Party ----
btnHubInventory.onclick = () => openInventory(screenHub);
btnMapInventory.onclick = () => openInventory(screenMap);
btnHubParty.onclick = () => openParty(screenHub);
btnMapParty.onclick = () => openParty(screenMap);

// ---- Quest Selection ----
function startStage(stageNum, floors) {
  if (appState.unlockedStages < stageNum) {
    alert('コルク：「まだ早い。前のクエストを終わらせてこい。順番は守れ。」');
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

// ---- チュートリアルマップ イベントノード処理 ----
document.addEventListener('tutorial-node-event', (e) => {
  const { nodeId, type } = e.detail;
  const overlay  = document.getElementById('tutorial-event-overlay');
  const titleEl  = document.getElementById('tutorial-event-title');
  const npcEl    = document.getElementById('tutorial-event-npc');
  const rewardEl = document.getElementById('tutorial-event-reward');
  rewardEl.innerHTML = '';

  if (type === 'event_story') {
    // 初めての1体目（ガタ / k_001）を付与 — チュートリアルでワザギアを装備させるため空で渡す
    const baseData = JSON.parse(JSON.stringify(MONSTERS_DATA.find(m => m.id === 'k_001') || MONSTERS_DATA[0]));
    baseData.tech_parts = [];
    const newUnit  = new Monster(baseData);
    appState.karakuriIdCounter = (appState.karakuriIdCounter || 0) + 1;
    newUnit.uid = newUnit.id + '_' + appState.karakuriIdCounter;
    appState.globalRoster.push(newUnit);
    appendRosterUI([newUnit]);

    titleEl.textContent = 'ビルガマタ、入手';
    npcEl.innerHTML =
      '<p>コルク：「お前のビルガマタだ。<b>' + newUnit.name + '</b>という。」</p>' +
      '<p>コルク：「名前はもう決まってる。異議は受け付けない。問題ない。」</p>' +
      '<p>コルク：「今はワザギアがない。丸腰だ。次で調達する。」</p>';

    // ビルガマタカード表示
    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 16px;text-align:center;min-width:120px;';
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    canvas.style.cssText = 'display:block;margin:0 auto 6px;image-rendering:pixelated;width:64px;height:64px;';
    import('./ui/sprite-generator.js').then(({ generateMonsterSprite }) => generateMonsterSprite(canvas, newUnit));
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-weight:bold;font-size:0.9rem;margin-bottom:2px;';
    nameEl.textContent = newUnit.name;
    const elemEl = document.createElement('div');
    elemEl.style.cssText = 'font-size:0.75rem;color:#94a3b8;';
    elemEl.textContent = newUnit.main_element.toUpperCase();
    card.append(canvas, nameEl, elemEl);
    rewardEl.appendChild(card);

  } else if (type === 'event_item') {
    // 炎ワザギア + EN回復アイテムを付与
    if (!appState.tutorialSkillsGiven) {
      appState.globalInventory.skills.push('tp_fireball');
      appState.globalInventory.battleItems.push('bitem_en_potion');
      appState.tutorialSkillsGiven = true;
    }

    titleEl.textContent = '属性とワザギア';
    npcEl.innerHTML =
      '<p>コルク：「攻撃には"属性"がある。相手の弱点を突くと大ダメージになる。」</p>' +
      '<p>コルク：「風の相手には炎が刺さる。ファイアボールを装備していけ。」</p>' +
      '<p>コルク：「EN回復アイテムも渡す。バトル中にアイテムタブから使え。」</p>' +
      '<p>コルク：「パーティ画面でガタにワザギアを装備させろ。装備したら先へ進む。」</p>';

    const parts = [
      { name: 'ファイアボール・ノズル', sub: 'ワザギア / 炎攻撃', color: '#f97316', icon: '🔥' },
      { name: 'エネルギー缶',           sub: 'アイテム / EN回復', color: '#a78bfa', icon: '⚡' },
    ];
    parts.forEach(it => {
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 18px;text-align:center;min-width:140px;';
      card.innerHTML = `<div style="font-size:1.4rem;margin-bottom:6px;">${it.icon}</div><div style="font-weight:bold;font-size:0.85rem;color:${it.color};margin-bottom:2px;">${it.name}</div><div style="font-size:0.7rem;color:#94a3b8;">${it.sub}</div>`;
      rewardEl.appendChild(card);
    });

  } else if (type === 'event_stat') {
    // ステータスボディギアを直接ガタに装備
    const gata = appState.globalRoster.find(m => m.id === 'k_001');
    const statPartsToGive = ['sp_heavy_armor', 'sp_power_core'];
    if (gata) {
      statPartsToGive.forEach(id => {
        if (!gata.stat_parts.includes(id)) gata.stat_parts.push(id);
      });
      gata.recalculateStats?.();
    }

    titleEl.textContent = '機体強化';
    npcEl.innerHTML =
      '<p>コルク：「ボディギアをガタに組み込んだ。ボーナスがある代わりにデメリットもある。」</p>' +
      '<p>コルク：「HPが増えてもSPDが落ちる。ATKが上がればDEFが下がる。そういうもんだ。」</p>' +
      '<p>コルク：「取捨選択が腕の見せ所だ。」</p>';

    const statParts = [
      { name: 'ヘビーアーマー',  sub: 'HP+500 DEF+20 / SPD-10', color: '#34d399', icon: '🛡' },
      { name: 'パワーコア',      sub: 'ATK+20 / DEF-10',         color: '#f87171', icon: '⚙️' },
    ];
    statParts.forEach(it => {
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 18px;text-align:center;min-width:140px;';
      card.innerHTML = `<div style="font-size:1.4rem;margin-bottom:6px;">${it.icon}</div><div style="font-weight:bold;font-size:0.85rem;color:${it.color};margin-bottom:2px;">${it.name}</div><div style="font-size:0.7rem;color:#94a3b8;">${it.sub}</div>`;
      rewardEl.appendChild(card);
    });

  }

  overlay.classList.remove('hide');

  document.getElementById('btn-tutorial-event-close').onclick = () => {
    overlay.classList.add('hide');

    if (type === 'event_item') {
      // affinity ステップを表示してから技装備待機へ
      showTutorialStep('affinity', () => {
        // ノードはクリアせず、技を装備するまでここで待機
        appState.tutorialAwaitEquip = nodeId;
        appState.tutorialAwaitEquipSkillId = null;

        // パーティボタンをパルスで強調
        if (btnMapParty) {
          btnMapParty.classList.add('tutorial-guide-pulse');
          const r = btnMapParty.getBoundingClientRect();
          const banner = document.createElement('div');
          banner.id = 'tutorial-party-banner';
          banner.style.cssText = [
            'position:fixed',
            `top:${r.top - 28}px`,
            `left:${r.left + r.width / 2}px`,
            'transform:translateX(-50%)',
            'font-size:0.72rem',
            'color:#fbbf24',
            'white-space:nowrap',
            'pointer-events:none',
            'z-index:100',
          ].join(';');
          banner.textContent = '👆 パーティを開いてワザギアを装備しよう';
          document.body.appendChild(banner);
        }
      });
    } else if (type === 'event_stat') {
      // stat-parts-intro ステップを表示してからノードを進める（非ブロッキング）
      showTutorialStep('stat-parts-intro', () => {
        appState.mapGenerator.unlockNextNodes(nodeId);
        renderMap(confirmBattleSetup);
        // パーティボタンをパルスで強調してボディギア確認を促す
        if (btnMapParty) {
          btnMapParty.classList.add('tutorial-guide-pulse');
          const r = btnMapParty.getBoundingClientRect();
          const banner = document.createElement('div');
          banner.id = 'tutorial-stat-banner';
          banner.style.cssText = [
            'position:fixed',
            `top:${r.top - 28}px`,
            `left:${r.left + r.width / 2}px`,
            'transform:translateX(-50%)',
            'font-size:0.72rem',
            'color:#34d399',
            'white-space:nowrap',
            'pointer-events:none',
            'z-index:100',
          ].join(';');
          banner.textContent = '👆 パーティを開いてボディギアを確認しよう';
          document.body.appendChild(banner);
          appState.tutorialAwaitStatView = true;
        }
      });
    } else {
      appState.mapGenerator.unlockNextNodes(nodeId);
      renderMap(confirmBattleSetup);
    }
  };
});

// チュートリアル：技装備完了 → ノードを進める
document.addEventListener('tutorial-skill-equipped', () => {
  const nodeId = appState.tutorialAwaitEquip;
  appState.tutorialAwaitEquip = null;

  // バナーとパルスを除去
  document.getElementById('tutorial-party-banner')?.remove();
  btnMapParty?.classList.remove('tutorial-guide-pulse');

  if (nodeId) {
    appState.mapGenerator.unlockNextNodes(nodeId);
    renderMap(confirmBattleSetup);
  }
});

document.getElementById('btn-stage-tutorial').onclick = () => {
  document.getElementById('tutorial-intro-overlay').classList.remove('hide');
};

document.getElementById('btn-tutorial-intro-start').onclick = () => {
  document.getElementById('tutorial-intro-overlay').classList.add('hide');
  initTutorial('full');
  // チュートリアルアイテムを1回だけ付与
  if (!appState.tutorialItemsGiven) {
    appState.globalInventory.battleItems.push('bitem_hp_potion', 'bitem_hp_potion', 'bitem_en_potion');
    appState.tutorialItemsGiven = true;
  }
  appState.isTutorialMap = true;
  appState.tutorialBattleIndex = 0;
  appState.currentStage = 0;
  appState.stageCleared = false;
  appState.currentNodeId = null;
  appState.mapGenerator = new TutorialMapGenerator();
  appState.mapGenerator.generate();
  // マップタイトルをチュートリアル用に変更
  document.querySelector('#screen-map h2').textContent = '訓練場マップ';
  document.querySelector('#screen-map .map-desc').textContent = 'コルク：「先に進め。考えるな。」';
  renderMap(confirmBattleSetup);
  switchScreen(screenHub, screenMap);
};

// ---- クエスト定義 ----
const STAGE_DEFS = [
  { num: 1, label: 'Quest 1', name: '始まりの草原', floors: 3, color: '#fbbf24' },
  { num: 2, label: 'Quest 2', name: '迷いの森',     floors: 5, color: '#60a5fa' },
  { num: 3, label: 'Quest 3', name: '果ての荒野',   floors: 7, color: '#f472b6' },
];

function _createStageCard(def) {
  const card = document.createElement('div');
  card.id = `btn-stage-${def.num}`;
  card.className = 'stage-card stage-card--new';
  card.innerHTML = `
    <h3 style="color:${def.color}; margin-bottom:10px;">${def.label}</h3>
    <p style="font-size:1.1rem; font-weight:bold;">${def.name}</p>
    <p style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">階層: ${def.floors}F</p>
  `;
  card.onclick = () => startStage(def.num, def.floors);
  return card;
}

function updateHubUI() {
  const tutorialCleared = appState.unlockedStages >= 1;
  const container = document.querySelector('.stage-container');

  // コルクのセリフ
  document.querySelector('#screen-hub > p').textContent = tutorialCleared
    ? 'コルク：「準備ができたら出発しろ。準備ができてなくても行け。どうせ慣れる。」'
    : 'コルク：「まずは訓練場に行け。話はそれからだ。」';

  // パーティ/持ち物ボタン
  document.getElementById('btn-hub-party').disabled     = !tutorialCleared;
  document.getElementById('btn-hub-inventory').disabled = !tutorialCleared;

  // 解放済みクエストカードを追加（まだ存在しないものだけ）
  STAGE_DEFS.forEach(def => {
    if (appState.unlockedStages >= def.num && !document.getElementById(`btn-stage-${def.num}`)) {
      const card = _createStageCard(def);
      container.appendChild(card);
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }), 150);
    }
  });
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
  const rosterOrder = appState.globalRoster.map(m => m.uid || m.id);
  appState.p1Team = [...appState.selectedIds]
    .sort((a, b) => rosterOrder.indexOf(a) - rosterOrder.indexOf(b))
    .map(id => new Monster(JSON.parse(JSON.stringify(appState.globalRoster.find(m => m.uid === id || m.id === id)))));

  const currentNode = appState.mapGenerator?.getNodes().find(n => n.id === appState.currentNodeId);
  if (!currentNode) { console.warn('Node not found:', appState.currentNodeId); return; }
  const isBoss = currentNode.type === 'boss';
  const floor = currentNode.floor || 0;

  if (appState.isTutorialMap) {
    // チュートリアルマップ：バトルインデックスで敵を切り替え
    const idx = appState.tutorialBattleIndex ?? 0;
    const baseData = idx >= 2 ? TUTORIAL_BOSS_JUMA
      : idx === 1 ? TUTORIAL_JUMA_2
      : TUTORIAL_JUMA_1;
    const m = new Monster(JSON.parse(JSON.stringify(baseData)));
    m.current_hp = m.stats.hp;
    appState.p2Team = [m];
    appState.tutorialBattleIndex = idx + 1;
  } else {
    // 通常クエスト：クエストごとの敵プール
    const stage = appState.currentStage || 1;
    const stageEnemyIds = {
      1: ['e_001', 'e_002', 'e_003'],
      2: ['e_001', 'e_002', 'e_003', 'e_004', 'e_005'],
      3: ['e_002', 'e_003', 'e_004', 'e_005', 'e_006', 'e_007'],
    };
    const allowedIds = stageEnemyIds[stage] ?? stageEnemyIds[1];
    const normalPool = ENEMY_DATA.filter(e => allowedIds.includes(e.id));
    const shuffled = [...normalPool].sort(() => 0.5 - Math.random());

    let p2Count = 1;
    if (floor >= 2) p2Count = 2;
    if (floor >= 4) p2Count = 3;
    if (currentNode.type === 'elite') p2Count += 1;
    if (isBoss) p2Count = 1;

    const pool = isBoss
      ? [ENEMY_DATA.find(e => e.id === 'j_boss_01')]
      : shuffled.slice(0, p2Count);

    appState.p2Team = pool.map(data => {
      const m = new Monster(JSON.parse(JSON.stringify(data)));
      const scale = 1.0 + (floor * 0.25);
      m.stats.hp = Math.floor(m.stats.hp * scale);
      m.stats.atk = Math.floor(m.stats.atk * scale);
      if (isBoss) m.stats.hp *= 2;
      m.current_hp = m.stats.hp;
      return m;
    });
  }

  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
  const encounterLabel = { battle: '遭遇', elite: '強敵', boss: 'ボス', rest: '休憩' }[currentNode.type] ?? currentNode.type;

  updateUI();
  playBattleStart(() => {
    toast(`<span class="log-system">【${encounterLabel}】地上が動き出した。</span>`);
    resumeLoop();
  });
}

// ---- Map / Reward Flow ----
document.addEventListener('battle-end', (e) => {
  if (!e.detail.win) {
    setTimeout(() => {
      document.getElementById('beo-restart-btn')?.classList.remove('hide');
    }, 1200);
    return;
  }

  // チュートリアルマップ（isTutorialMap）は tutorialMode より優先
  if (appState.isTutorialMap) {
    appState.mapGenerator.unlockNextNodes(appState.currentNodeId);
    renderMap(confirmBattleSetup);
    const currentNode = appState.mapGenerator.getNodes().find(n => n.id === appState.currentNodeId);
    const isFinalFloor = currentNode && currentNode.floor === appState.mapGenerator.totalFloors - 1;

    if (isFinalFloor) {
      // チュートリアルマップクリア → STAGE 1 解放
      appState.isTutorialMap = false;
      appState.unlockedStages = Math.max(appState.unlockedStages, 1);
      appState.tutorialMapCleared = true;
    } else if (appState.tutorialMode && appState.tutorialMode !== 'none') {
      setTimeout(() => showTutorialStep('reward', null), 300);
    }
    generateRewards();
    switchScreen(screenBattle, screenReward);
    return;
  }

  // スタータークエスト等の tutorialMode（isTutorialMap でない）
  if (appState.tutorialMode && appState.tutorialMode !== 'none') {
    appState.tutorialReward = true;
    generateRewards();
    switchScreen(screenBattle, screenReward);
    setTimeout(() => showTutorialStep('reward', null), 300);
    return;
  }

  // 通常バトル終了
  appState.mapGenerator.unlockNextNodes(appState.currentNodeId);
  renderMap(confirmBattleSetup);

  const currentNode = appState.mapGenerator.getNodes().find(n => n.id === appState.currentNodeId);
  const isFinalFloor = currentNode && currentNode.floor === appState.mapGenerator.totalFloors - 1;

  if (isFinalFloor) {
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
  if (appState.tutorialMapCleared) {
    appState.tutorialMapCleared = false;
    // マップタイトルを通常に戻す
    document.querySelector('#screen-map h2').textContent = '探索マップ';
    document.querySelector('#screen-map .map-desc').textContent = '道を選べ。戻れない。';
    mainHeader.style.display = 'none';
    updateHubUI();
    switchScreen(screenReward, screenHub);
    setTimeout(() => toast('<span class="log-system">✨ STAGE 1 解放！草原への道が開けた。</span>'), 400);
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
    const cardKey = data.uid || data.id;
    const card = document.createElement('div');
    card.className = 'roster-card glass-panel';
    card.dataset.id = cardKey;
    card.innerHTML = `
      <h3>${data.name}</h3>
      <p style="font-size: 0.8rem; margin-top: 5px; color: #94a3b8;">Elem: ${data.main_element.toUpperCase()}</p>
      <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">HP ${data.base_stats.hp}</span>
        <span style="font-size: 0.75rem; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 10px;">EN ${data.base_stats.max_en || data.base_stats.max_st}</span>
      </div>
    `;
    card.onclick = () => toggleRosterSelection(card, cardKey);
    rosterGrid.appendChild(card);
  });
}

function toggleRosterSelection(card, id) {
  const maxParty = Math.min(3, appState.globalRoster.length);
  if (appState.selectedIds.includes(id)) {
    appState.selectedIds = appState.selectedIds.filter(i => i !== id);
    card.classList.remove('selected');
  } else {
    if (appState.selectedIds.length < maxParty) {
      appState.selectedIds.push(id);
      card.classList.add('selected');
    }
  }
  btnStartBattle.disabled = appState.selectedIds.length !== maxParty;
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
