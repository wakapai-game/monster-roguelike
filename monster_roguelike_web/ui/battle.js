import { appState } from '../state.js';
import { BATTLE_ITEMS_DATA } from '../data.js';
import {
  actionMenu, actionPhaseHeader, actionTabs,
  defendWrapper, btnDefendAction, swapWrapper, btnSwapAction, swapSelectPanel,
  skillButtons, itemButtons, btnTabSkills, btnTabItems,
  itemCountBadge, resultMenu, resultText,
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

export function triggerDamageAnimation(side, isBreak) {
    const card = document.getElementById(`${side}-active-card`);
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'shake 0.4s ease';
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
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    el.style.width = `${pct}%`;
  };

  const setCard = (side, activeMonster) => {
      document.getElementById(`${side}-name`).innerText = activeMonster.name;

      const elemBadge = document.getElementById(`${side}-elem`);
      if (elemBadge) {
          elemBadge.innerText = activeMonster.main_element.toUpperCase();
          elemBadge.className = `elem-badge elem-${activeMonster.main_element}`;
      }

      setBar(document.getElementById(`${side}-hp-fill`), activeMonster.current_hp, activeMonster.stats.hp);

      const stBar = document.getElementById(`${side}-st-fill`);
      if (side === 'p2' && !activeMonster.is_break) {
          setBar(stBar, 100, 100);
      } else if (side === 'p2' && activeMonster.is_break) {
          setBar(stBar, 0, 100);
      } else {
          setBar(stBar, activeMonster.current_st, activeMonster.stats.max_st);
      }

      setBar(document.getElementById(`${side}-atb-fill`), activeMonster.gauge, appState.timeline.GAUGE_MAX);

      const cardEl = document.getElementById(`${side}-active-card`);
      if(!onlyGauges) {
          cardEl.classList.toggle('is-broken', activeMonster.is_break);
          if(side==='p2') document.getElementById('p2-break-text').classList.toggle('hide', !activeMonster.is_break);
      }
  };

  if (appState.timeline.p1_active) setCard('p1', appState.timeline.p1_active);
  if (appState.timeline.p2_active) setCard('p2', appState.timeline.p2_active);

  if(!appState.timeline.p1_active || !appState.timeline.p2_active || actionMenu.classList.contains('hide')) {
      renderTimelineQueue();
  }
}

// ---- Battle Flow ----
export function resumeLoop() {
  if (appState.loopInterval) clearInterval(appState.loopInterval);
  actionMenu.classList.add('hide');
  swapSelectPanel.classList.add('hide');

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
};

export function showAttackPhase(monster) {
  actionPhaseHeader.innerText = "ATTACK PHASE (自分のターン)";
  actionPhaseHeader.style.background = "rgba(59, 130, 246, 0.2)";
  actionPhaseHeader.style.borderColor = "#3b82f6";
  actionPhaseHeader.style.color = "#bfdbfe";

  btnTabItems.style.display = "none";
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
    let isBrokeWarn = (monster.is_break && skillData.cost_st > 0) ? ' <span style="color:#ef4444;">★HP自傷</span>' : '';
    
    let affinityBadge = '';
    if (skillData.category === "attack" || skillData.category === "trap") {
        const defender = appState.timeline.p2_active;
        if (defender) {
            const s_elem = skillData.element || "none";
            const multi_main = appState.engine.getAffinityMultiplier(s_elem, defender.main_element);
            const multi_sub = appState.engine.getAffinityMultiplier(s_elem, defender.sub_element);
            let affinity_mult = multi_main * multi_sub;
            if (multi_main > 1.0 && multi_sub > 1.0) affinity_mult = 4.0;

            if (affinity_mult > 1.0) {
                affinityBadge = ' <span style="color:#ef4444; font-size:0.7rem; border:1px solid #ef4444; padding:0 3px; border-radius:3px; margin-left:5px;">バツグン</span>';
            } else if (affinity_mult < 1.0) {
                affinityBadge = ' <span style="color:#94a3b8; font-size:0.7rem; border:1px solid #94a3b8; padding:0 3px; border-radius:3px; margin-left:5px;">いまいち</span>';
            }
        }
    }
    
    btn.innerHTML = `${skillData.name}${affinityBadge}${stCostTxt}${isBrokeWarn}`;
    btn.onclick = () => {
        actionMenu.classList.add('hide');
        executeAction(1, monster, appState.timeline.p2_active, skillId);
    };
    skillButtons.appendChild(btn);
  });

  setupSwapButton(1, monster, null, null);
}

export function showDefensePhase(playerTarget, enemyAttacker, enemySkillId) {
  const enemySkillData = appState.engine.getSkill(enemySkillId);
  
  let affinityBadge = '';
  if (enemySkillData.category === "attack" || enemySkillData.category === "trap") {
      const s_elem = enemySkillData.element || "none";
      const multi_main = appState.engine.getAffinityMultiplier(s_elem, playerTarget.main_element);
      const multi_sub = appState.engine.getAffinityMultiplier(s_elem, playerTarget.sub_element);
      let affinity_mult = multi_main * multi_sub;
      if (multi_main > 1.0 && multi_sub > 1.0) affinity_mult = 4.0;

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
    let isBrokeWarn = (playerTarget.is_break && skillData.cost_st > 0) ? ' <span style="color:#ef4444;">★HP自傷</span>' : '';
    btn.innerHTML = `${skillData.name}${stCostTxt}${isBrokeWarn}`;
    btn.onclick = () => resolveDefensePhase(playerTarget, skillId, enemyAttacker, enemySkillId, false);
    skillButtons.appendChild(btn);
  });

  if (!hasDefSkill) {
      skillButtons.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem; grid-column:span 2; text-align:center;">防御系の技がセットされていません。</span>';
  }

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
          btn.onclick = () => {
              const idx = appState.globalInventory.battleItems.indexOf(itemId);
              if (idx > -1) appState.globalInventory.battleItems.splice(idx, 1);
              resolveDefensePhase(playerTarget, itemId, enemyAttacker, enemySkillId, true);
          };
          itemButtons.appendChild(btn);
      });
  }

  setupSwapButton(2, playerTarget, enemyAttacker, enemySkillId);
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
                        <span class="swap-bench-elem elem-badge elem-${m.main_element}">${m.main_element.toUpperCase()}</span>
                        <span class="swap-bench-hp">HP ${m.current_hp}/${m.stats.hp} (${hpPct}%)</span>
                    `;
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
        let target = BATTLE_ITEMS_DATA.find(i => i.id === reactId).effect.type.includes('recover') ? defender : appState.timeline.p2_active;
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

  let msg = `<b>${attacker.name}</b> の <b>${result.skill}</b>! `;
  if (result.st_damage > 0) msg += ` <span class="st-dmg">(${result.st_damage} ST DMG)</span>`;
  if (result.hp_damage > 0) msg += ` <span class="dmg">(${result.hp_damage} HP DMG)</span>`;

  if (result.armor_crush) msg += ` <span style="color:#eab308; font-weight:bold;">[ARMOR CRUSH]</span>`;
  if (result.is_break && result.st_damage > 0) msg += ` <span style="color:#ef4444; font-weight:bold;">★BROKEN!</span>`;
  if (result.self_damage > 0) msg += ` <br><span style="color:#f97316;">${attacker.name}は疲労で ${result.self_damage} DMGを受けた！</span>`;

  toast(msg);
  triggerDamageAnimation(targetSide, result.is_break);

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

  setTimeout(() => { resumeLoop(); }, 1200);
}

export function endBattle(isPlayerWin) {
    updateUI();
    actionMenu.classList.add('hide');
    resultMenu.classList.remove('hide');

    if (isPlayerWin) {
        toast(`<span style="font-size:1.5rem; color:#10b981; font-weight:bold;">VICTORY!</span>`);
        resultText.innerText = "戦闘に勝利した！";
        resultText.style.color = "#10b981";

        const currentNode = appState.mapGenerator.getNodes().find(n => n.id === appState.currentNodeId);
        if(currentNode.type === 'boss') {
            resultText.innerText = "STAGE CLEAR! ボスを撃破した！";
        }
        document.getElementById('btn-return-map').innerText = "マップへ戻る";
        // Do NOT overwrite onclick here; the global handler manages rewards and hub-routing!
    } else {
        toast(`<span style="font-size:1.5rem; color:#ef4444; font-weight:bold;">PARTY ANNIHILATED...</span>`);
        resultText.innerText = "全滅した... GAME OVER";
        resultText.style.color = "#ef4444";
        document.getElementById('btn-return-map').innerText = "タイトルに戻る";
        document.getElementById('btn-return-map').onclick = () => window.location.reload();
    }
}
