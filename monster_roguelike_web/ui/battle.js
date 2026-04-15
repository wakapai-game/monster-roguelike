import { appState } from '../state.js';
import { BATTLE_ITEMS_DATA } from '../data.js';
import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';
import { isTutorialActive, isTutorialFullMode, hasShownStep, showTutorialStep, hideTutorialHint } from './tutorial.js';
import { playEffect } from './effects.js';
import {
  actionMenu, actionPhaseHeader, actionTabs,
  defendWrapper, btnDefendAction, swapWrapper, btnSwapAction, swapSelectPanel,
  skillButtons, itemButtons, btnTabSkills, btnTabItems,
  itemCountBadge,
  timelineQueue, toastContainer, battleLog
} from './dom.js';

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
  const overflowBadge = `<span class="dmg-badge dmg-badge-overflow">溢れ</span>`;
  if (hpDmg > 0) spawn(`-${hpDmg} HP${overflowBadge}`, 'dmg-popup-hp', 30);
  if (stDmg > 0) spawn(`-${stDmg} ST${affBadge}${stabBadge}`, 'dmg-popup-st', 50);
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

      if (side === 'p1') {
          setBar(document.getElementById('p1-st-fill'), activeMonster.current_st, activeMonster.stats.max_st);
      }

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

  if(!appState.timeline.p1_active || !appState.timeline.p2_active || actionMenu.classList.contains('hide')) {
      renderTimelineQueue();
  }
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
      <span class="md-label">ST</span><span>${monster.current_st} / ${s.max_st}</span>
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
      costSpan.textContent = `ST:${sk.cost_st}`;
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

  // チュートリアル: ACTION QUEUEステップ（フル版は表示後にループ開始）
  if (isTutorialActive() && !hasShownStep('action-queue')) {
    showTutorialStep('action-queue', () => _startLoop());
    return;
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
    // Enemy Turn - Prompt Defense Phase
    setTimeout(() => {
      const target = appState.timeline.p1_active;
      const skills = activeMonster.skills;
      const skillId = skills.length > 0 ? skills[Math.floor(Math.random() * skills.length)] : "strike";
      showDefensePhase(target, activeMonster, skillId);
    }, 1000);
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

export function showAttackPhase(monster) {
  actionPhaseHeader.innerText = "ATTACK PHASE (自分のターン)";
  actionPhaseHeader.style.background = "rgba(59, 130, 246, 0.2)";
  actionPhaseHeader.style.borderColor = "#3b82f6";
  actionPhaseHeader.style.color = "#bfdbfe";

  btnTabItems.style.display = "none";
  actionTabs.style.display = "none";
  defendWrapper.classList.add('hide');

  skillButtons.innerHTML = '';
  itemButtons.innerHTML = '';
  actionMenu.classList.remove('hide');
  btnTabSkills.onclick();

  monster.skills.forEach(skillId => {
    const skillData = appState.engine.getSkill(skillId);
    if (!skillData || skillData.category === "defense") return;

    const btn = document.createElement('button');
    btn.className = 'btn skill-btn';
    let stCostTxt = skillData.cost_st > 0 ? ` [ST:${skillData.cost_st}]` : '';
    let affinityBadge = '';
    if (skillData.category === "attack" || skillData.category === "trap") {
        const defender = appState.timeline.p2_active;
        if (defender) {
            const s_elem = skillData.element || "none";
            const affinity_mult = appState.engine.calcAffinity(s_elem, defender);

            if (affinity_mult > 1.0) {
                affinityBadge = ' <span style="color:#ef4444; font-size:0.7rem; border:1px solid #ef4444; padding:0 3px; border-radius:3px; margin-left:5px;">バツグン</span>';
            } else if (affinity_mult < 1.0) {
                affinityBadge = ' <span style="color:#94a3b8; font-size:0.7rem; border:1px solid #94a3b8; padding:0 3px; border-radius:3px; margin-left:5px;">いまいち</span>';
            }
        }
    }
    
    btn.innerHTML = `${skillData.name}${affinityBadge}${stCostTxt}`;
    if (skillData.description) btn.dataset.tooltip = skillData.description;
    btn.onclick = () => {
        actionMenu.classList.add('hide');
        executeAction(1, monster, appState.timeline.p2_active, skillId);
    };
    skillButtons.appendChild(btn);
  });

  setupSwapButton(1, monster, null, null);

  // チュートリアルフック（表示順: attack-phase → player-break(条件) → swap → affinity）
  if (isTutorialActive()) {
    if (!hasShownStep('attack-phase')) {
      showTutorialStep('attack-phase', null);
    } else if (hasShownStep('st-chip') && !hasShownStep('swap')) {
      showTutorialStep('swap', null);
    } else if (hasShownStep('swap') && !hasShownStep('affinity')) {
      showTutorialStep('affinity', null);
    }
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

  actionPhaseHeader.innerHTML = `<span style="color:#fca5a5; font-size:1.1em;">DEFENSE PHASE (敵の攻撃が来る！)</span><br><span style="font-size:0.85rem; font-weight:normal;">${enemyAttacker.name} の ${enemySkillData.name}${affinityBadge}</span>`;
  actionPhaseHeader.style.background = "rgba(239, 68, 68, 0.2)";
  actionPhaseHeader.style.borderColor = "#ef4444";
  actionPhaseHeader.style.color = "white";

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
    let stCostTxt = skillData.cost_st > 0 ? ` [ST:${skillData.cost_st}]` : '';
    btn.innerHTML = `${skillData.name}${stCostTxt}`;
    if (skillData.description) btn.dataset.tooltip = skillData.description;
    btn.onclick = () => resolveDefensePhase(playerTarget, skillId, enemyAttacker, enemySkillId, false);
    skillButtons.appendChild(btn);
  });

  if (!hasDefSkill) {
      skillButtons.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; grid-column:span 2; text-align:center;">防御系の技がセットされていません。</span>';
  }

  btnDefendAction.dataset.tooltip = "HPへの溢れダメージを半減する。STを消費しない。";
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
    if (!hasShownStep('swap') && !hasShownStep('defense-phase')) {
      showTutorialStep('defense-phase', null);
    } else if (!hasShownStep('swap')) {
      showTutorialStep('swap', null);
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
                            setTimeout(() => { resumeLoop(); }, 1000);
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
    }, 1200);
}

export function executeAction(playerNum, attacker, defender, skillId) {
  const result = appState.engine.executeSkill(attacker, defender, skillId);
  const targetSide = playerNum === 1 ? 'p2' : 'p1';

  // Determine skill element for effect
  const skillData = appState.engine.getSkill(skillId);
  const skillElement = skillData?.element || 'none';

  // Play attack effect, then show damage
  playEffect(skillElement, targetSide, () => {
    let msg = `<b>${attacker.name}</b> の <b>${result.skill}</b>! `;
    if (result.st_damage > 0) msg += ` <span class="st-dmg">(${result.st_damage} ST DMG)</span>`;
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

    setTimeout(() => { resumeLoop(); }, 1200);
  });
}

export function endBattle(isPlayerWin) {
    updateUI();
    actionMenu.classList.add('hide');

    if (isPlayerWin) {
        const currentNode = appState.mapGenerator?.getNodes().find(n => n.id === appState.currentNodeId);
        const isBoss = currentNode?.type === 'boss';
        toast(`<span style="font-size:1.5rem; color:#10b981; font-weight:bold;">${isBoss ? 'STAGE CLEAR!' : 'VICTORY!'}</span>`);
    } else {
        toast(`<span style="font-size:1.5rem; color:#ef4444; font-weight:bold;">PARTY ANNIHILATED...</span>`);
    }

    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('battle-end', { detail: { win: isPlayerWin } }));
    }, 1500);
}
