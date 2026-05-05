import { appState } from '../state.js';
import { BATTLE_ITEMS_DATA, TECH_PARTS, STAT_PARTS, OPTION_PARTS } from '../data.js';
import { findTechPart, findStatPart, findOptionPart } from '../game.js';
import { renderGearDeck } from './gear-deck.js';

function _getPartName(partId) {
  return (findTechPart(partId) || findStatPart(partId) || findOptionPart(partId))?.name || partId;
}
import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';
import { isTutorialActive, isTutorialFullMode, hasShownStep, showTutorialStep, hideTutorialHint } from './tutorial.js';
import { playEffect } from './effects.js';
import {
  actionMenu, actionPhaseHeader, actionTabs,
  defendWrapper, btnDefendAction, btnSwapAction, swapSelectPanel,
  skillButtons, itemButtons, btnTabSkills, btnTabItems,
  itemCountBadge,
  timelineQueue, toastContainer, battleLog
} from './dom.js';

// ---- Battle Start Fanfare ----
export function playBattleStart(onDone) {
  const overlay = document.getElementById('battle-start-overlay');
  if (!overlay) { onDone?.(); return; }

  // アニメーションをリセットして再生
  overlay.classList.remove('bso-active');
  overlay.offsetHeight; // force reflow
  overlay.classList.add('bso-active');

  setTimeout(() => {
    overlay.classList.remove('bso-active');
    onDone?.();
  }, 1150);
}

// ---- UI Rendering Helpers ----
// トースト通知による簡易ログ
export function toast(htmlStr) {
  const entry = document.createElement('div');
  entry.className = 'toast';
  entry.innerHTML = htmlStr;
  toastContainer.appendChild(entry);

  // Clean up old toasts
  if (toastContainer.children.length > 5) {
    toastContainer.removeChild(toastContainer.firstChild);
  }

  setTimeout(() => {
    if (toastContainer.contains(entry)) {
      toastContainer.removeChild(entry);
    }
  }, 3000);
}

export function triggerDamageAnimation(side) {
    const card = document.getElementById(`${side}-active-card`);
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'shake 0.4s ease';

    // スプライトに hurt アニメーション
    const sprite = document.getElementById(`${side}-sprite`);
    if (sprite) {
      sprite.classList.remove('sprite-hurt');
      sprite.offsetHeight; // reflow
      sprite.classList.add('sprite-hurt');
      setTimeout(() => sprite.classList.remove('sprite-hurt'), 400);
    }
}

function showDamagePopup(side, hpDmg, stDmg, info = {}) {
  const card = document.getElementById(`${side}-active-card`);
  if (!card) return;
  const spawn = (html, cls, offsetPct) => {
    const el = document.createElement('div');
    el.className = `dmg-popup ${cls}`;
    el.innerHTML = html;
    el.style.top = `${offsetPct}%`;
    card.appendChild(el);
    setTimeout(() => el.remove(), 900);
  };
  const { aff = 1, is_stab = false } = info;
  const affBadge = aff >= 4.0 ? `<span class="dmg-badge dmg-badge-weakness">バツグン ×${aff}</span>`
                 : aff >= 3.0 ? `<span class="dmg-badge dmg-badge-weakness">バツグン ×${aff}</span>`
                 : aff > 1.0  ? `<span class="dmg-badge dmg-badge-weakness">バツグン ×${aff}</span>`
                 : aff < 1.0  ? `<span class="dmg-badge dmg-badge-resist">いまいち ×${aff}</span>`
                 : '';
  const stabBadge = is_stab ? `<span class="dmg-badge dmg-badge-stab">STAB</span>` : '';
  const overflowBadge = `<span class="dmg-badge dmg-badge-overflow">HP直撃</span>`;
  if (hpDmg > 0) spawn(`-${hpDmg} HP${overflowBadge}`, 'dmg-popup-hp', 30);
  if (stDmg > 0) spawn(`-${stDmg} EN${affBadge}${stabBadge}`, 'dmg-popup-st', 50);
}

// 行動順シミュレーション
export function calculateQueue(turnsToPredict = 6) {
  if (!appState.timeline || !appState.timeline.p1_active || !appState.timeline.p2_active) return [];

  let g1 = appState.timeline.p1_active.gauge;
  let s1 = appState.timeline.p1_active.stats.spd || 10;
  let g2 = appState.timeline.p2_active.gauge;
  let s2 = appState.timeline.p2_active.stats.spd || 10;

  let queue = [];
  let failSafe = 0;

  while (queue.length < turnsToPredict && failSafe < 1000) {
    failSafe++;
    if (g1 >= appState.timeline.GAUGE_MAX) {
      queue.push({ player: 1, monster: appState.timeline.p1_active });
      g1 -= appState.timeline.GAUGE_MAX;
      continue;
    }
    if (g2 >= appState.timeline.GAUGE_MAX) {
      queue.push({ player: 2, monster: appState.timeline.p2_active });
      g2 -= appState.timeline.GAUGE_MAX;
      continue;
    }
    g1 += s1;
    g2 += s2;
  }
  return queue;
}

export function renderTimelineQueue() {
  timelineQueue.innerHTML = '';
  const queue = calculateQueue();

  queue.forEach((item, index) => {
    const isP1 = item.player === 1;
    const el = document.createElement('div');
    el.className = `queue-item ${isP1 ? 'p1' : 'p2'} ${index === 0 ? 'next-up' : ''}`;

    // アイコンや簡易表示
    const badge = isP1 ? '🔵 P1' : '🔴 P2';
    el.innerHTML = `<span>${badge}</span> <span>${item.monster.name}</span>`;

    timelineQueue.appendChild(el);
  });
}

export function updateUI(onlyGauges = false) {
  const setBar = (el, current, max) => {
    if (!el) return;
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    el.style.width = `${pct}%`;
  };

  // ループ内の高頻度呼び出し: バーのみ更新してDOMの再構築をスキップ
  if (onlyGauges) {
    const p1 = appState.timeline.p1_active;
    const p2 = appState.timeline.p2_active;
    if (p1) {
      setBar(document.getElementById('p1-hp-fill'), p1.current_hp, p1.stats.hp);
      setBar(document.getElementById('p1-st-fill'), p1.current_st, p1.stats.max_st);
    }
    if (p2) {
      setBar(document.getElementById('p2-hp-fill'), p2.current_hp, p2.stats.hp);
      setBar(document.getElementById('p2-st-fill'), p2.current_st, p2.stats.max_st);
    }
    return;
  }

  const setCard = (side, activeMonster) => {
      // スプライト描画
      const spriteCanvas = document.getElementById(`${side}-sprite`);
      if (spriteCanvas) {
        spriteCanvas.classList.remove('sprite-hurt');
        generateMonsterSprite(spriteCanvas, activeMonster);
      }

      document.getElementById(`${side}-name`).innerText = activeMonster.name;

      const elemBadge = document.getElementById(`${side}-elem`);
      if (elemBadge) {
          elemBadge.innerHTML = '';
          elemBadge.className = '';
          elemBadge.appendChild(createElementBadge(activeMonster.main_element));
      }

      setBar(document.getElementById(`${side}-hp-fill`), activeMonster.current_hp, activeMonster.stats.hp);
      setBar(document.getElementById(`${side}-st-fill`), activeMonster.current_st, activeMonster.stats.max_st);

      // バフ/デバフバッジ表示
      const buffContainerId = `${side}-buff-badges`;
      let buffEl = document.getElementById(buffContainerId);
      if (!buffEl) {
        buffEl = document.createElement('div');
        buffEl.id = buffContainerId;
        buffEl.style.cssText = 'display:flex; flex-wrap:wrap; gap:3px; margin-top:4px; min-height:14px;';
        document.getElementById(`${side}-active-card`).appendChild(buffEl);
      }
      const STAT_LABEL = { atk:'ATK', def:'DEF', mag:'MAG', spd:'SPD' };
      buffEl.innerHTML = Object.entries(activeMonster.buffs || {}).map(([stat, b]) => {
        const isUp = b.mult >= 1;
        const col = isUp ? '#6ee7b7' : '#fca5a5';
        const arrow = isUp ? '▲' : '▼';
        return `<span style="font-size:0.65rem; background:rgba(0,0,0,0.4); border:1px solid ${col}; color:${col}; border-radius:3px; padding:1px 4px;">${arrow}${STAT_LABEL[stat]||stat} ×${b.mult} (${b.turns}T)</span>`;
      }).join('');

      const cardEl = document.getElementById(`${side}-active-card`);
      if (side === 'p1') {
        cardEl.style.cursor = 'pointer';
        cardEl.onclick = () => showMonsterDetail(appState.timeline.p1_active);
      }
  };

  if (appState.timeline.p1_active) setCard('p1', appState.timeline.p1_active);
  if (appState.timeline.p2_active) setCard('p2', appState.timeline.p2_active);

  renderEnemyRoster();
  renderP1Reserves();
  updatePartsDeck(appState.timeline.p1_active);

  if(!appState.timeline.p1_active || !appState.timeline.p2_active || actionMenu.classList.contains('hide')) {
      renderTimelineQueue();
  }
}

const ELEM_ICON = {
  fire:'🔥', water:'💧', thunder:'⚡', wind:'🌀',
  earth:'🪨', light:'✨', dark:'🌑', none:'⚙️'
};
const CAT_ICON = { attack:'⚔️', defense:'🛡️', support:'💫', trap:'🕸️', heal:'💉' };
const STAT_ICON = {
  hp:'❤️', atk:'⚔️', def:'🛡️', mag:'✨', spd:'💨', max_en:'🔋', en_rec:'⚡'
};

export function updatePartsDeck(monster, mode = 'idle') {
  const techRow    = document.getElementById('parts-deck-tech-row');
  const statOptRow = document.getElementById('parts-deck-stat-opt');
  if (!techRow) return;
  if (statOptRow) statOptRow.innerHTML = '';

  if (!monster) {
    if (techRow._gdCleanup) { techRow._gdCleanup(); techRow._gdCleanup = null; }
    techRow.innerHTML = '';
    return;
  }

  const allCards = [];

  // ── TECH cards (4 slots) ──
  for (let i = 0; i < 4; i++) {
    const partId = monster.tech_parts[i];
    if (!partId) continue;
    const skill = findTechPart(partId);
    if (!skill) continue;
    const isPurged = !!monster.purged_tech.has(partId);

    let affinity = null;
    if (mode === 'attack' && !isPurged && (skill.category === 'attack' || skill.category === 'trap')) {
      const defender = appState.timeline?.p2_active;
      if (defender) {
        const aff = appState.engine?.calcAffinity(skill.element || 'none', defender);
        if (aff > 1) affinity = 'strong';
        else if (aff < 1) affinity = 'weak';
      }
    }

    allCards.push({
      cardType: 'tech',
      id:       partId,
      name:     skill.name,
      elem:     skill.element || 'none',
      en:       skill.cost_en ?? skill.cost_st ?? 0,
      desc:     skill.description || '',
      isPurged,
      affinity,
    });
  }

  // ── BODY cards (5 slots) ──
  for (let i = 0; i < 5; i++) {
    const partId = monster.stat_parts[i];
    if (!partId) continue;
    const part = findStatPart(partId);
    if (!part) continue;
    const isPurged = !!monster.purged_stats.has(partId);
    const primaryStat = Object.keys(part.bonus || {})[0] || 'def';

    allCards.push({
      cardType:    'body',
      id:          partId,
      name:        part.name,
      primaryStat,
      bonus:       part.bonus   || {},
      penalty:     part.penalty || {},
      desc:        part.description || '',
      isPurged,
      affinity:    null,
    });
  }

  // ── CORE card (1 slot) ──
  {
    const partId = monster.option_part;
    if (partId) {
      const part     = findOptionPart(partId);
      const isPurged = !!monster.purged_option;
      allCards.push({
        cardType:   'core',
        id:         partId,
        name:       part?.name || partId,
        effectType: part?.effect?.type || '',
        desc:       part?.description || '',
        isPurged,
        affinity:   null,
      });
    }
  }

  renderGearDeck(techRow, allCards, mode, (partId) => {
    actionMenu.classList.add('hide');
    updatePartsDeck(monster, 'idle');
    executeAction(1, monster, appState.timeline.p2_active, partId);
  });
}

function renderP1Reserves() {
  const container = document.getElementById('p1-reserves');
  if (!container || !appState.p1Team) return;

  container.innerHTML = '';
  appState.p1Team.forEach(m => {
    if (m.id === appState.timeline?.p1_active?.id) return;

    const isDead = m.current_hp <= 0;
    const hpPct = Math.max(0, Math.round((m.current_hp / m.stats.hp) * 100));

    const div = document.createElement('div');
    div.className = 'p1-reserve-card' + (isDead ? ' p1-reserve-dead' : '');
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
        <span style="font-size:0.75rem; font-weight:bold;">${m.name}</span>
        <span class="p1-reserve-elem-placeholder"></span>
      </div>
      <div style="height:3px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:3px;">
        <div style="width:${hpPct}%; height:100%; background:${isDead ? '#475569' : hpPct < 30 ? '#ef4444' : '#10b981'}; border-radius:2px; transition:width 0.3s;"></div>
      </div>
    `;
    const reserveElemPlaceholder = div.querySelector('.p1-reserve-elem-placeholder');
    if (reserveElemPlaceholder) reserveElemPlaceholder.replaceWith(createElementBadge(m.main_element));
    div.onclick = () => showMonsterDetail(m);
    container.appendChild(div);
  });
}

function showMonsterDetail(monster) {
  const wasRunning = !!appState.loopInterval;
  if (wasRunning) {
    clearInterval(appState.loopInterval);
    appState.loopInterval = null;
  }

  document.getElementById('md-name').textContent = monster.name;
  const elemEl = document.getElementById('md-elem');
  elemEl.innerHTML = '';
  elemEl.className = '';
  elemEl.appendChild(createElementBadge(monster.main_element));

  const s = monster.stats;
  document.getElementById('md-stats').innerHTML = `
    <div class="md-stats-grid">
      <span class="md-label">HP</span><span>${monster.current_hp} / ${s.hp}</span>
      <span class="md-label">EN</span><span>${monster.current_st} / ${s.max_st}</span>
      <span class="md-label">ATK</span><span>${s.atk}</span>
      <span class="md-label">DEF</span><span>${s.def}</span>
      <span class="md-label">MAG</span><span>${s.mag}</span>
      <span class="md-label">SPD</span><span>${s.spd}</span>
    </div>
  `;

  const mdSkillsEl = document.getElementById('md-skills');
  mdSkillsEl.innerHTML = `<p style="font-size:0.8rem; color:#94a3b8; margin:0 0 8px;">セット中の技</p>`;
  const skillsContainer = document.createElement('div');
  skillsContainer.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

  const monsterSkills = monster.skills || [];
  if (monsterSkills.length === 0) {
    skillsContainer.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem; margin:0;">技なし</p>';
  } else {
    monsterSkills.forEach(skillId => {
      const sk = appState.engine.getSkill(skillId);
      if (!sk) return;
      const skillCard = document.createElement('div');
      skillCard.className = 'md-skill-card';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:6px; flex-wrap:wrap;';
      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = 'bold';
      nameSpan.textContent = sk.name;
      row.appendChild(nameSpan);
      if (sk.element !== 'none') {
        row.appendChild(createElementBadge(sk.element));
      }
      const costSpan = document.createElement('span');
      costSpan.style.cssText = 'font-size:0.75rem; color:#94a3b8;';
      costSpan.textContent = `EN:${sk.cost_en||sk.cost_st}`;
      row.appendChild(costSpan);
      skillCard.appendChild(row);
      if (sk.description) {
        const desc = document.createElement('p');
        desc.style.cssText = 'font-size:0.8rem; color:#94a3b8; margin:4px 0 0;';
        desc.textContent = sk.description;
        skillCard.appendChild(desc);
      }
      skillsContainer.appendChild(skillCard);
    });
  }
  mdSkillsEl.appendChild(skillsContainer);

  const overlay = document.getElementById('monster-detail-overlay');
  overlay.classList.remove('hide');

  document.getElementById('btn-md-close').onclick = () => {
    overlay.classList.add('hide');
    if (wasRunning) resumeLoop();
  };
}

function renderEnemyRoster() {
  const container = document.getElementById('p2-reserves');
  if (!container || !appState.p2Team) return;

  container.innerHTML = '';
  appState.p2Team.forEach(m => {
    const isActive = appState.timeline?.p2_active?.id === m.id;
    if (isActive) return;
    const isDead = m.current_hp <= 0;
    const hpPct = Math.max(0, Math.round((m.current_hp / m.stats.hp) * 100));

    const div = document.createElement('div');
    div.className = 'enemy-roster-card' + (isActive ? ' enemy-roster-active' : '') + (isDead ? ' enemy-roster-dead' : '');
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
        <span style="font-size:0.75rem; font-weight:bold;">${isActive ? '▶ ' : ''}${m.name}</span>
        <span class="enemy-roster-elem-placeholder"></span>
      </div>
      <div style="height:3px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:3px;">
        <div style="width:${hpPct}%; height:100%; background:${isDead ? '#475569' : hpPct < 30 ? '#ef4444' : '#10b981'}; border-radius:2px; transition:width 0.3s;"></div>
      </div>
    `;
    const enemyElemPlaceholder = div.querySelector('.enemy-roster-elem-placeholder');
    if (enemyElemPlaceholder) enemyElemPlaceholder.replaceWith(createElementBadge(m.main_element));
    container.appendChild(div);
  });
}

// ---- Battle Flow ----
export function resumeLoop() {
  if (appState.loopInterval) clearInterval(appState.loopInterval);
  actionMenu.classList.add('hide');
  swapSelectPanel.classList.add('hide');
  document.getElementById('purge-select-panel')?.classList.add('hide');
  updatePartsDeck(appState.timeline?.p1_active, 'idle');

  // チュートリアル: バトル番号に応じた pre-battle ステップ → action-queue（Battle1のみ）
  if (isTutorialActive()) {
    const idx = Math.max(0, (appState.tutorialBattleIndex ?? 1) - 1);
    const preBattleId = idx === 0 ? 'pre-battle-1' : idx === 1 ? 'pre-battle-2' : 'pre-battle-boss';
    if (!hasShownStep(preBattleId)) {
      showTutorialStep(preBattleId, () => {
        if (idx === 0 && !hasShownStep('action-queue')) {
          showTutorialStep('action-queue', () => _startLoop());
        } else {
          _startLoop();
        }
      });
      return;
    }
    if (idx === 0 && !hasShownStep('action-queue')) {
      showTutorialStep('action-queue', () => _startLoop());
      return;
    }
  }
  _startLoop();
}

function _startLoop() {
  appState.loopInterval = setInterval(() => {
    updateUI(true);
    const result = appState.timeline.tick();

    if (result) {
      clearInterval(appState.loopInterval);
      updateUI();
      handleTurn(result.player, result.active);
    }
  }, 100);
}

export function handleTurn(player, activeMonster) {
  if (player === 1) {
    showAttackPhase(activeMonster);
  } else {
    // Enemy Turn: immediately lock player input, then show defense UI
    actionMenu.classList.add('hide');
    setTimeout(() => {
      const target = appState.timeline.p1_active;
      const skillId = _selectEnemySkill(activeMonster, target);
      if (!skillId) {
        appState.timeline.onActionCompleted(2);
        updateUI();
        setTimeout(() => resumeLoop(), 200);
        return;
      }
      showDefensePhase(target, activeMonster, skillId);
    }, 400);
  }
}

// ---- Battle UI Tabs ----
btnTabSkills.onclick = () => {
    btnTabSkills.className = 'btn skill-btn active-tab';
    btnTabItems.className = 'btn skill-btn inactive-tab';
    skillButtons.classList.remove('hide');
    itemButtons.classList.add('hide');
};

btnTabItems.onclick = () => {
    btnTabItems.className = 'btn skill-btn active-tab';
    btnTabSkills.className = 'btn skill-btn inactive-tab';
    itemButtons.classList.remove('hide');
    skillButtons.classList.add('hide');

    // チュートリアルフック: アイテムタブを初めて開いたとき
    if (isTutorialActive()) showTutorialStep('item-use', null);
};

export function selectEnemySkill(attacker, defender, engine = appState.engine) {
  const skills = attacker.skills;
  if (!skills || skills.length === 0) return null;

  const hpRatio = attacker.current_hp / attacker.stats.hp;

  // HP30%以下: 回復・防御技を優先
  if (hpRatio < 0.3) {
    const healSkill = skills.find(id => {
      const s = engine.getSkill(id);
      return s && (s.category === 'defense' || s.effects?.some(e =>
        e.type === 'recover_st_direct' || e.type === 'recover_hp' || e.type === 'recover_en_direct'
      ));
    });
    if (healSkill) return healSkill;
  }

  // 攻撃スキルの中からバツグン優先・バフ次点・ランダムフォールバック
  const attackSkills = skills.filter(id => {
    const s = engine.getSkill(id);
    return s && (s.category === 'attack' || s.category === 'trap');
  });
  const buffSkills = skills.filter(id => {
    const s = engine.getSkill(id);
    return s && s.category === 'support';
  });

  // バツグン属性スキルを探す
  const weaknessSkill = attackSkills.find(id => {
    const s = engine.getSkill(id);
    const aff = engine.calcAffinity(s.element || 'none', defender);
    return aff > 1.0;
  });
  if (weaknessSkill) return weaknessSkill;

  // HP高め(70%以上)ならバフ技を30%の確率で使う
  if (hpRatio > 0.7 && buffSkills.length > 0 && Math.random() < 0.3) {
    return buffSkills[Math.floor(Math.random() * buffSkills.length)];
  }

  // 攻撃スキルからランダム
  if (attackSkills.length > 0) return attackSkills[Math.floor(Math.random() * attackSkills.length)];
  return skills[Math.floor(Math.random() * skills.length)];
}

function _selectEnemySkill(attacker, defender) {
  return selectEnemySkill(attacker, defender, appState.engine);
}

export function showAttackPhase(monster) {
  // デッキのTECHカードをアタックボタンとして活性化
  updatePartsDeck(monster, 'attack');

  // ヘッダーを攻撃フェーズ表示にリセット
  actionPhaseHeader.innerHTML = `<span style="color:#93c5fd; font-size:1.1em;">⚔ 攻撃フェーズ — 技を選べ！</span>`;
  actionPhaseHeader.style.background = "rgba(59, 130, 246, 0.2)";
  actionPhaseHeader.style.borderColor = "#3b82f6";
  actionPhaseHeader.style.color = "white";

  // action-menu はアイテムのみ（スキルボタン不要）
  actionTabs.style.display = 'flex';
  btnTabItems.style.display = '';
  skillButtons.innerHTML = '';
  skillButtons.classList.add('hide');
  btnTabSkills.style.display = 'none';
  defendWrapper.classList.add('hide');

  // アイテムセットアップ
  itemButtons.innerHTML = '';
  const battleItems = appState.globalInventory?.battleItems || [];
  const itemCount = battleItems.length;
  if (itemCountBadge) itemCountBadge.textContent = itemCount;

  if (itemCount > 0) {
    actionMenu.classList.remove('hide');
    // アイテムタブは自動選択しない。GearDeckがデフォルト表示
  } else {
    actionMenu.classList.add('hide');
  }

  setupSwapButton(1, monster, null, null);
  setupPurgeButton(monster);

  // チュートリアルフック（affinity は event_item ノードで表示するためここでは attack-phase のみ）
  if (isTutorialActive() && !hasShownStep('attack-phase')) {
    showTutorialStep('attack-phase', null);
  }
}

export function showDefensePhase(playerTarget, enemyAttacker, enemySkillId) {
  const enemySkillData = appState.engine.getSkill(enemySkillId);
  
  let affinityBadge = '';
  if (enemySkillData.category === "attack" || enemySkillData.category === "trap") {
      const s_elem = enemySkillData.element || "none";
      const affinity_mult = appState.engine.calcAffinity(s_elem, playerTarget);

      if (affinity_mult > 1.0) {
          affinityBadge = ' <span style="color:#ef4444; font-weight:bold; font-size:0.9rem;">[バツグン]</span>';
      } else if (affinity_mult < 1.0) {
          affinityBadge = ' <span style="color:#94a3b8; font-weight:bold; font-size:0.9rem;">[いまいち]</span>';
      }
  }

  updatePartsDeck(appState.timeline.p1_active, 'idle');

  actionPhaseHeader.innerHTML = `<span style="color:#fca5a5; font-size:1.1em;">⚠ 防御フェーズ — 敵の攻撃が来る！</span><br><span style="font-size:0.85rem; font-weight:normal;">${enemyAttacker.name} の ${enemySkillData.name}${affinityBadge}</span>`;
  actionPhaseHeader.style.background = "rgba(239, 68, 68, 0.2)";
  actionPhaseHeader.style.borderColor = "#ef4444";
  actionPhaseHeader.style.color = "white";

  skillButtons.classList.remove('hide');
  btnTabSkills.style.display = '';
  btnTabItems.style.display = "block";
  actionTabs.style.display = "flex";
  defendWrapper.classList.remove('hide');

  skillButtons.innerHTML = '';
  itemButtons.innerHTML = '';
  actionMenu.classList.remove('hide');
  btnTabSkills.onclick();
  itemCountBadge.innerText = appState.globalInventory.battleItems.length;

  let hasDefSkill = false;
  playerTarget.skills.forEach(skillId => {
    const skillData = appState.engine.getSkill(skillId);
    if (!skillData || skillData.category !== "defense") return;
    hasDefSkill = true;
    const btn = document.createElement('button');
    btn.className = 'btn skill-btn';
    let stCostTxt = (skillData.cost_en ?? skillData.cost_st ?? 0) > 0 ? ` [EN:${skillData.cost_en ?? skillData.cost_st}]` : '';
    btn.innerHTML = `${skillData.name}${stCostTxt}`;
    if (skillData.description) btn.dataset.tooltip = skillData.description;
    btn.onclick = () => resolveDefensePhase(playerTarget, skillId, enemyAttacker, enemySkillId, false);
    skillButtons.appendChild(btn);
  });

  if (!hasDefSkill) {
      skillButtons.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; grid-column:span 2; text-align:center;">防御系の技がセットされていません。</span>';
  }

  btnDefendAction.dataset.tooltip = "HPへの溢れダメージを半減する。ENを消費しない。";
  btnDefendAction.onclick = () => resolveDefensePhase(playerTarget, "default_defend", enemyAttacker, enemySkillId, false);

  const uniqueItems = [...new Set(appState.globalInventory.battleItems)];
  if(uniqueItems.length === 0) {
      itemButtons.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; grid-column:span 2; text-align:center;">No items available.</span>';
  } else {
      uniqueItems.forEach(itemId => {
          const itemData = BATTLE_ITEMS_DATA.find(i => i.id === itemId);
          const count = appState.globalInventory.battleItems.filter(id => id === itemId).length;
          const btn = document.createElement('button');
          btn.className = 'btn skill-btn';
          btn.innerHTML = `${itemData.name} <span style="font-size:0.7em; color:#ef4444;">x${count}</span>`;
          if (itemData.description) btn.dataset.tooltip = itemData.description;
          btn.onclick = () => {
              const idx = appState.globalInventory.battleItems.indexOf(itemId);
              if (idx > -1) appState.globalInventory.battleItems.splice(idx, 1);
              resolveDefensePhase(playerTarget, itemId, enemyAttacker, enemySkillId, true);
          };
          itemButtons.appendChild(btn);
      });
  }

  setupSwapButton(2, playerTarget, enemyAttacker, enemySkillId);

  // チュートリアルフック（防御フェーズ説明後にアイテム説明も案内）
  if (isTutorialActive()) {
    if (!hasShownStep('defense-phase')) {
      showTutorialStep('defense-phase', null);
    }
  }
}

export function setupSwapButton(phaseType, currentMonster, enemyAttacker, enemySkillId) {
    const benchCandidates = appState.p1Team
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m.current_hp > 0 && m.id !== currentMonster.id);

    swapSelectPanel.classList.add('hide');
    swapSelectPanel.innerHTML = '';

    if (benchCandidates.length > 0) {
        btnSwapAction.disabled = false;
        btnSwapAction.style.opacity = '1';
        btnSwapAction.onclick = () => {
            const isOpen = !swapSelectPanel.classList.contains('hide');
            swapSelectPanel.classList.toggle('hide', isOpen);
            if (!isOpen) {
                // Build bench selection cards
                swapSelectPanel.innerHTML = '';
                benchCandidates.forEach(({ m, idx }) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn swap-bench-btn';
                    const hpPct = Math.round((m.current_hp / m.stats.hp) * 100);
                    btn.innerHTML = `
                        <span class="swap-bench-name">${m.name}</span>
                        <span class="swap-bench-elem-placeholder"></span>
                        <span class="swap-bench-hp">HP ${m.current_hp}/${m.stats.hp} (${hpPct}%)</span>
                    `;
                    const swapElemPlaceholder = btn.querySelector('.swap-bench-elem-placeholder');
                    if (swapElemPlaceholder) swapElemPlaceholder.replaceWith(createElementBadge(m.main_element));
                    btn.onclick = () => {
                        swapSelectPanel.classList.add('hide');
                        appState.timeline.swapActive(1, idx);
                        toast(`<span class="log-system">控えの ${appState.timeline.p1_active.name} と交代した！</span>`);
                        updateUI();

                        if (phaseType === 1) {
                            actionMenu.classList.add('hide');
                            setTimeout(() => { resumeLoop(); }, 400);
                        } else {
                            resolveDefensePhase(appState.timeline.p1_active, "swapped", enemyAttacker, enemySkillId, false);
                        }
                    };
                    swapSelectPanel.appendChild(btn);
                });
            }
        };
    } else {
        btnSwapAction.disabled = true;
        btnSwapAction.style.opacity = '0.5';
        btnSwapAction.onclick = null;
    }
}

// ─── ギアパージUI ──────────────────────────────────────────────────
export function setupPurgeButton(monster) {
  const purgeWrapper = document.getElementById('purge-wrapper');
  const btnPurge     = document.getElementById('btn-purge-action');
  const purgePanel   = document.getElementById('purge-select-panel');
  const purgeList    = document.getElementById('purge-parts-list');
  if (!purgeWrapper || !btnPurge || !purgePanel || !purgeList) return;

  // パージ可能なギアがあれば表示
  if (!monster.hasPurgeable || !monster.hasPurgeable()) {
    purgeWrapper.classList.add('hide');
    return;
  }
  purgeWrapper.classList.remove('hide');
  purgePanel.classList.add('hide');
  purgeList.innerHTML = '';

  if (isTutorialActive()) {
    const tIdx = Math.max(0, (appState.tutorialBattleIndex ?? 1) - 1);
    if (tIdx >= 2) showTutorialStep('purge-intro', null);
  }

  btnPurge.onclick = () => {
    const isOpen = !purgePanel.classList.contains('hide');
    purgePanel.classList.toggle('hide', isOpen);
    if (!isOpen) _buildPurgeList(monster, purgeList, purgePanel);
  };
}

function _buildPurgeList(monster, purgeList, purgePanel) {
  purgeList.innerHTML = '';
  const active = monster.getActiveParts();

  const addPurgeBtn = (label, partId, partType, detail) => {
    const btn = document.createElement('button');
    btn.className = 'btn skill-btn';
    btn.style.cssText = 'width:100%; margin-bottom:6px; text-align:left; padding:6px 10px;';
    btn.innerHTML = `<span style="color:#c4b5fd;">💥 ${label}</span><span style="color:#64748b; font-size:0.75rem; margin-left:8px;">${detail}</span>`;
    btn.onclick = () => {
      monster.manualPurge(partId, partType);
      const partName = label;
      toast(`<span class="log-system">${monster.name} は ${partName} をパージした！</span>`);
      updateUI();
      purgePanel.classList.add('hide');
      // パージ後にスキルボタンを再描画
      showAttackPhase(monster);
    };
    purgeList.appendChild(btn);
  };

  if (active.tech.length === 0 && active.stats.length === 0 && !active.option) {
    purgeList.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">パージできるギアがありません。</span>';
    return;
  }

  active.tech.forEach(id => {
    const p = findTechPart(id);
    if (p) addPurgeBtn(p.name, id, 'tech', `ワザギア / EN:${p.cost_en||p.cost_st}`);
  });
  active.stats.forEach(id => {
    const p = findStatPart(id);
    if (p) addPurgeBtn(p.name, id, 'stat', `ボディギア / ${p.description}`);
  });
  if (active.option) {
    const p = findOptionPart(active.option);
    if (p) addPurgeBtn(p.name, active.option, 'option', `コアギア / ${p.description}`);
  }
}

export function resolveDefensePhase(defender, reactId, attacker, attackSkillId, isItem) {
    actionMenu.classList.add('hide');

    if (reactId === "swapped") {
        // proceed directly to enemy attack against the new defender
    } else if (reactId === "default_defend") {
        toast(`🛡 <b>${defender.name}</b> は身を守っている！`);
        defender.is_defending = true;
    } else if (isItem) {
        toast(`🎒 アイテムを使用した！`);
        const reactItemData = BATTLE_ITEMS_DATA.find(i => i.id === reactId);
        let target = reactItemData?.effect?.type?.includes('recover') ? defender : appState.timeline.p2_active;
        appState.engine.executeSkill(defender, target, reactId);
    } else {
        toast(`🛡 <b>${defender.name}</b> の <b>${appState.engine.getSkill(reactId).name}</b>!`);
        appState.engine.executeSkill(defender, defender, reactId);
    }

    updateUI();

    setTimeout(() => {
        const currentDefender = appState.timeline.p1_active;
        executeAction(2, attacker, currentDefender, attackSkillId);
        if (currentDefender) currentDefender.is_defending = false;
    }, 800);
}

export function executeAction(playerNum, attacker, defender, skillId) {
  if (!attacker || !defender) {
    console.warn('[battle] executeAction: attacker/defender が null のため resumeLoop にフォールバック');
    setTimeout(() => resumeLoop(), 200);
    return;
  }
  // 連続行動カウンタ管理（同じプレイヤーが連続攻撃するほどST消費増）
  const skillData0 = appState.engine.getSkill(skillId);
  if (skillData0?.category === 'attack') {
    if (playerNum === appState._lastAttackPlayer) {
      attacker.consecutive_count = (attacker.consecutive_count || 0) + 1;
    } else {
      attacker.consecutive_count = 1;
    }
    appState._lastAttackPlayer = playerNum;
  } else {
    attacker.consecutive_count = 0;
    appState._lastAttackPlayer = null;
  }
  const result = appState.engine.executeSkill(attacker, defender, skillId);
  if (appState.isTestMode) {
    document.dispatchEvent(new CustomEvent('battle-attack-resolved', {
      detail: { result, attacker, defender, playerNum, defender_was_defending: defender.is_defending }
    }));
  }
  const targetSide = playerNum === 1 ? 'p2' : 'p1';

  // Determine skill element for effect
  const skillData = appState.engine.getSkill(skillId);
  const skillElement = skillData?.element || 'none';

  // Play attack effect, then show damage
  playEffect(skillElement, targetSide, () => {
    let msg = `<b>${attacker.name}</b> の <b>${result.skill}</b>! `;
    if (result.st_damage > 0) msg += ` <span class="st-dmg">(${result.en_damage||result.st_damage} EN DMG)</span>`;
    if (result.hp_damage > 0) msg += ` <span class="dmg">(${result.hp_damage} HP DMG)</span>`;

    if (result.is_weakness) msg += ` <span style="color:#ef4444; font-weight:bold;">★バツグン！</span>`;
    if (result.self_damage > 0) msg += ` <br><span style="color:#f97316;">${attacker.name}は疲労で ${result.self_damage} DMGを受けた！</span>`;
    if (result.buffs_applied) {
      const STAT_LABEL = { atk:'ATK', def:'DEF', mag:'MAG', spd:'SPD' };
      result.buffs_applied.forEach(b => {
        const who = b.who === 'self' ? attacker.name : defender.name;
        const stat = STAT_LABEL[b.stat] || b.stat;
        const dir = b.mult >= 1 ? `<span style="color:#6ee7b7;">▲${stat}UP</span>` : `<span style="color:#fca5a5;">▼${stat}DOWN</span>`;
        msg += ` <br>${who} ${dir}`;
      });
    }

    toast(msg);

    // パージイベントのトースト表示
    if (result.purge_event) {
      const pe = result.purge_event;
      if (pe.guarded) {
        toast(`<span style="color:#a78bfa;">⚡ ${attacker.name} のパージガードが発動！ EN+${pe.recovered_en}</span>`);
      } else if (pe.shutdown) {
        toast(`<span style="color:#ef4444;">💥 ${attacker.name} は全ギアを失い、シャットダウン状態に！</span>`);
      } else if (pe.purged) {
        const partName = _getPartName(pe.partId);
        toast(`<span style="color:#c4b5fd;">💥 ${attacker.name} の EN切れ！ ${partName} が自動パージ → EN+${pe.recovered_en}</span>`);
      }
    }
    if (result.defender_purge_event) {
      const pe = result.defender_purge_event;
      if (pe.guarded) {
        toast(`<span style="color:#a78bfa;">⚡ ${defender.name} のパージガードが発動！ EN+${pe.recovered_en}</span>`);
      } else if (pe.shutdown) {
        toast(`<span style="color:#ef4444;">💥 ${defender.name} は全ギアを失い、シャットダウン状態に！</span>`);
      } else if (pe.purged) {
        const partName = _getPartName(pe.partId);
        toast(`<span style="color:#c4b5fd;">💥 ${defender.name} の EN切れ！ ${partName} が自動パージ → EN+${pe.recovered_en}</span>`);
      }
    }

    triggerDamageAnimation(targetSide);
    const dmgInfo = { aff: result.calc?.aff ?? 1, is_stab: result.calc?.is_stab ?? false };
    showDamagePopup(targetSide, result.hp_damage, result.st_damage, dmgInfo);
    if (result.self_damage > 0) showDamagePopup(playerNum === 1 ? 'p1' : 'p2', result.self_damage, 0);

    // Check Death
    if (defender.current_hp <= 0) {
      toast(`<span style="color:#ef4444;">${defender.name} was defeated!</span>`);

      const defTeam = playerNum === 1 ? appState.p2Team : appState.p1Team;
      const nextAliveIdx = defTeam.findIndex(m => m.current_hp > 0);

      if (nextAliveIdx !== -1) {
        const swapped = appState.timeline.swapActive(playerNum === 1 ? 2 : 1, nextAliveIdx);
        if(swapped) toast(`<span class="log-system">次の個体 ${defTeam[nextAliveIdx].name} が出撃！</span>`);
      } else {
        endBattle(playerNum === 1);
        return;
      }
    }

    appState.timeline.onActionCompleted(playerNum);
    updateUI();

    // チュートリアル: ST削り説明（プレイヤー攻撃でSTダメージを与えた場合）
    if (isTutorialActive() && !hasShownStep('st-chip') && playerNum === 1 && result.st_damage > 0) {
      showTutorialStep('st-chip', null);
    }

    setTimeout(() => { resumeLoop(); }, 700);
  });
}

function _showEndOverlay(isPlayerWin, isBoss) {
    const overlay = document.getElementById('battle-end-overlay');
    const mainEl  = document.getElementById('beo-main');
    const subEl   = document.getElementById('beo-sub');

    if (overlay && mainEl && subEl) {
        overlay.classList.remove('beo-win', 'beo-lose', 'beo-active', 'beo-boss');
        if (isPlayerWin) {
            mainEl.textContent = isBoss ? 'STAGE CLEAR!' : 'VICTORY!';
            subEl.textContent  = isBoss ? '— STAGE COMPLETE —' : '— BATTLE OVER —';
            overlay.classList.add('beo-win');
            if (isBoss) overlay.classList.add('beo-boss');
        } else {
            mainEl.textContent = 'DEFEAT...';
            subEl.textContent  = '— PARTY ANNIHILATED —';
            overlay.classList.add('beo-lose');
        }
        overlay.offsetHeight; // force reflow
        overlay.classList.add('beo-active');
    }

    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('battle-end', { detail: { win: isPlayerWin } }));
    }, isTutorialActive() ? 1000 : 1900);
}

let _endBattleAbort = null;

export function endBattle(isPlayerWin) {
    updateUI();
    actionMenu.classList.add('hide');

    // 前回の endBattle リスナーをキャンセル（二重呼び出し防止）
    if (_endBattleAbort) { _endBattleAbort.abort(); _endBattleAbort = null; }

    const currentNode = appState.mapGenerator?.getNodes().find(n => n.id === appState.currentNodeId);
    const isBoss = currentNode?.type === 'boss';

    if (!isPlayerWin) {
        _showEndOverlay(false, false);
        return;
    }

    // 勝利：オーバーレイで「ジュウマを倒した。」を表示してからVICTORY演出
    const overlay = document.getElementById('battle-end-overlay');
    const mainEl  = document.getElementById('beo-main');
    const subEl   = document.getElementById('beo-sub');

    if (overlay && mainEl && subEl) {
        overlay.classList.remove('beo-win', 'beo-lose', 'beo-active', 'beo-boss');
        mainEl.textContent = 'ジュウマを倒した。';
        subEl.textContent  = '';
        overlay.classList.add('beo-pre');
    }

    let triggered = false;
    const trigger = () => {
        if (triggered) return;
        triggered = true;
        if (overlay) overlay.classList.remove('beo-pre');
        _showEndOverlay(true, isBoss);
    };

    const abort = new AbortController();
    _endBattleAbort = abort;
    const timer = setTimeout(trigger, isTutorialActive() ? 400 : 800);
    setTimeout(() => {
        document.addEventListener('touchstart', () => { clearTimeout(timer); trigger(); }, { once: true, passive: true, signal: abort.signal });
        document.addEventListener('mousedown',  () => { clearTimeout(timer); trigger(); }, { once: true, signal: abort.signal });
    }, 200);
}
