import { appState } from '../state.js';
import { SKILLS, FOOD_DATA } from '../data.js';
import { Monster } from '../game.js';
import { generateMonsterSprite } from './sprite-generator.js';
import {
  switchScreen,
  screenInventory, screenParty, screenHub,
  invSkillsContent, invFoodContent, invTargetSelection,
  invRosterGrid, invTargetMsg, btnCancelUse,
  partyDetailsGrid, btnCloseInventory, btnCloseParty
} from './dom.js';

let activeInvItem = null;
let dragSrcIndex = -1;

// 技設定モーダルの状態
let skillEditModal = null;
let skillEditMonster = null;
let skillDragSrcZone = null;
let skillDragSrcIdx = -1;

btnCloseInventory.onclick = () => switchScreen(screenInventory, appState.returnScreen || screenHub);
btnCloseParty.onclick = () => switchScreen(screenParty, appState.returnScreen || screenHub);

export function openInventory(fromScreen) {
    appState.returnScreen = fromScreen;
    switchScreen(fromScreen, screenInventory);
    renderInventory();
}

export function openParty(fromScreen) {
    appState.returnScreen = fromScreen;
    renderParty();
    switchScreen(fromScreen, screenParty);
}

export function renderInventory() {
    invSkillsContent.innerHTML = '';
    invFoodContent.innerHTML = '';

    if(appState.globalInventory.skills.length === 0) invSkillsContent.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No Skills Available</span>';
    if(appState.globalInventory.mapItems.length === 0) invFoodContent.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No Food Available</span>';

    appState.globalInventory.skills.forEach((id, index) => {
        const item = SKILLS.find(s => s.id === id);
        if(!item) return;
        const el = document.createElement('div');
        el.className = 'inv-item-row';
        el.innerHTML = `<span>${item.name}</span> <span style="font-size:0.7em;">技</span>`;
        el.onclick = () => selectInvItem(el, 'skill', index, item.name);
        invSkillsContent.appendChild(el);
    });

    appState.globalInventory.mapItems.forEach((id, index) => {
        const item = FOOD_DATA.find(s => s.id === id);
        if(!item) return;
        const el = document.createElement('div');
        el.className = 'inv-item-row';
        el.innerHTML = `<span>${item.name}</span> <span style="font-size:0.7em; color:#10b981;">${item.description}</span>`;
        el.onclick = () => selectInvItem(el, 'mapItem', index, item.name);
        invFoodContent.appendChild(el);
    });
}

export function selectInvItem(element, type, index, name) {
    document.querySelectorAll('.inv-item-row').forEach(e => e.classList.remove('selected'));
    element.classList.add('selected');
    activeInvItem = { type, index, name };

    invTargetSelection.classList.remove('hide');
    invTargetMsg.innerText = `「${name}」を誰に使いますか？`;

    invRosterGrid.innerHTML = '';
    appState.globalRoster.forEach(m => {
        const card = document.createElement('div');
        card.className = 'roster-card';
        try {
          const offscreen = document.createElement('canvas');
          generateMonsterSprite(offscreen, m);
          const spriteImg = document.createElement('img');
          spriteImg.src = offscreen.toDataURL();
          spriteImg.style.cssText = 'display:block; width:48px; height:48px; margin:0 auto 4px; image-rendering:pixelated; image-rendering:crisp-edges;';
          card.appendChild(spriteImg);
        } catch(e) {
          console.warn('sprite error:', m.id, e);
        }
        const info = document.createElement('div');
        info.innerHTML = `<h4>${m.name}</h4><p style="font-size:0.75rem; color:#94a3b8; margin-top:5px;">HP:${m.base_stats.hp} ST:${m.base_stats.max_st}</p>`;
        card.appendChild(info);
        card.onclick = () => applyItemToMonster(m);
        invRosterGrid.appendChild(card);
    });
}

export function applyItemToMonster(m) {
    if(!activeInvItem) return;

    if(activeInvItem.type === 'skill') {
        const skillId = appState.globalInventory.skills[activeInvItem.index];
        if (!m.known_skills) m.known_skills = [...m.skills];

        if (m.known_skills.includes(skillId)) {
            alert(`${m.name} はすでに覚えている！`);
            return;
        }
        if (m.known_skills.length >= 10) {
            alert(`${m.name} はこれ以上技を覚えられない！（修得技の上限は10個）`);
            return;
        }
        m.known_skills.push(skillId);
        if (m.skills.length < 4) {
            m.skills.push(skillId);
        }
        appState.globalInventory.skills.splice(activeInvItem.index, 1);
        const autoMsg = m.skills.includes(skillId) ? '（バトルにセット済み）' : '（修得技に追加。技設定でセットしてください）';
        alert(`${m.name} は ${activeInvItem.name} を覚えた！${autoMsg}`);

    } else if (activeInvItem.type === 'mapItem') {
        const MAX_FEED = 10;
        if ((m.feed_count || 0) >= MAX_FEED) {
            alert(`${m.name} はもうこれ以上えさを食べられない！（上限${MAX_FEED}回）`);
            return;
        }

        const itemId = appState.globalInventory.mapItems[activeInvItem.index];
        const itemData = FOOD_DATA.find(i => i.id === itemId);
        if (!itemData) return;

        if (!m.params) m.params = { size: 0, hardness: 0, weight: 0, intelligence: 0 };

        if (itemData.effect.base_stats) {
            for (const [stat, delta] of Object.entries(itemData.effect.base_stats)) {
                const before = m.base_stats[stat] || 0;
                m.base_stats[stat] = before + delta;
                if (typeof m.logGrowth === 'function') m.logGrowth(itemId, stat, before, m.base_stats[stat]);
            }
        }
        if (itemData.effect.params) {
            for (const [param, delta] of Object.entries(itemData.effect.params)) {
                const before = m.params[param] || 0;
                m.params[param] = before + delta;
                if (typeof m.logGrowth === 'function') m.logGrowth(itemId, param, before, m.params[param]);
            }
        }

        m.feed_count = (m.feed_count || 0) + 1;
        if (typeof m.recalculateStats === 'function') {
            m.recalculateStats();
            m.current_hp = m.stats.hp;
        } else {
            const mc = new Monster(m);
            m.stats = mc.stats;
            m.current_hp = m.stats.hp;
        }

        appState.globalInventory.mapItems.splice(activeInvItem.index, 1);
        const remaining = MAX_FEED - m.feed_count;
        alert(`${m.name} は ${itemData.name} を食べた！（残り${remaining}回）`);
    }

    invTargetSelection.classList.add('hide');
    activeInvItem = null;
    renderInventory();
}

btnCancelUse.onclick = () => {
    invTargetSelection.classList.add('hide');
    document.querySelectorAll('.inv-item-row').forEach(e => e.classList.remove('selected'));
    activeInvItem = null;
};

function renderGrowthLog(monster) {
    const log = monster.growth_log;
    if (!log || log.length === 0) return '';
    const recent = log.slice(-5).reverse();
    const rows = recent.map(e => {
        const date = new Date(e.timestamp);
        const time = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
        return `<div style="font-size:0.7rem; color:#94a3b8; padding:2px 0;">${time} | ${e.param}: ${e.before} -> ${e.after}</div>`;
    }).join('');
    return `
        <div style="margin-top:10px; border-top:1px dashed #334155; padding-top:8px;">
            <div style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; margin-bottom:5px;">育成記録 (Growth Log)</div>
            ${rows}
        </div>
    `;
}

// ---- Party Screen ----

export function renderParty() {
    partyDetailsGrid.innerHTML = '';
    const roster = appState.globalRoster;

    roster.forEach((data, index) => {
        const mc = (data instanceof Monster) ? data : new Monster(data);
        if (!data.known_skills) data.known_skills = [...data.skills];

        const isFirst = index === 0;
        const isLast = index === roster.length - 1;

        const card = document.createElement('div');
        card.className = 'party-stat-card';
        card.draggable = true;
        card.dataset.index = index;

        // ドラッグ&ドロップ（隊列並べ替え）
        card.addEventListener('dragstart', (e) => {
            dragSrcIndex = index;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'party-card');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            partyDetailsGrid.querySelectorAll('.party-stat-card').forEach(c => c.classList.remove('drag-over'));
        });
        card.addEventListener('dragover', (e) => {
            if (e.dataTransfer.getData('text/plain') === 'party-card' || dragSrcIndex !== -1) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });
        card.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (dragSrcIndex !== index) card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const dropIndex = index;
            if (dragSrcIndex === -1 || dragSrcIndex === dropIndex) return;
            const moved = roster.splice(dragSrcIndex, 1)[0];
            roster.splice(dropIndex, 0, moved);
            dragSrcIndex = -1;
            renderParty();
        });

        // 隊列バー
        const orderBar = document.createElement('div');
        orderBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1);';

        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex; align-items:center; gap:6px;';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'party-drag-handle';
        dragHandle.textContent = '⠿';
        dragHandle.title = 'ドラッグして並べ替え';

        const posLabel = document.createElement('span');
        posLabel.style.cssText = `font-size:0.85rem; font-weight:bold; color:${isFirst ? '#fbbf24' : '#94a3b8'};`;
        posLabel.textContent = `No.${index + 1}${isFirst ? ' ★先頭' : ''}`;

        leftGroup.appendChild(dragHandle);
        leftGroup.appendChild(posLabel);

        const moveBtns = document.createElement('div');
        moveBtns.style.cssText = 'display:flex; gap:4px;';

        const leftBtn = document.createElement('button');
        leftBtn.className = 'btn skill-btn';
        leftBtn.style.cssText = 'padding:3px 8px; font-size:0.75rem;';
        leftBtn.textContent = '◀';
        leftBtn.disabled = isFirst;
        leftBtn.onclick = () => {
            [roster[index - 1], roster[index]] = [roster[index], roster[index - 1]];
            renderParty();
        };

        const rightBtn = document.createElement('button');
        rightBtn.className = 'btn skill-btn';
        rightBtn.style.cssText = 'padding:3px 8px; font-size:0.75rem;';
        rightBtn.textContent = '▶';
        rightBtn.disabled = isLast;
        rightBtn.onclick = () => {
            [roster[index], roster[index + 1]] = [roster[index + 1], roster[index]];
            renderParty();
        };

        moveBtns.appendChild(leftBtn);
        moveBtns.appendChild(rightBtn);
        orderBar.appendChild(leftGroup);
        orderBar.appendChild(moveBtns);
        card.appendChild(orderBar);

        // スプライト（offscreen→img）
        try {
          const offscreen = document.createElement('canvas');
          generateMonsterSprite(offscreen, mc);
          const spriteImg = document.createElement('img');
          spriteImg.src = offscreen.toDataURL();
          spriteImg.style.cssText = 'display:block; width:80px; height:80px; margin:0 auto 10px; image-rendering:pixelated; image-rendering:crisp-edges;';
          card.appendChild(spriteImg);
        } catch(e) {
          console.warn('sprite error:', mc.id, e);
        }

        // ステータス
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <div>
                <h3 style="margin-bottom:5px;">${mc.name} <span class="elem-badge elem-${mc.main_element}" style="float:right;">${mc.main_element.toUpperCase()}</span></h3>
                <p style="font-size:0.8rem; color:#94a3b8;">${mc.sub_element !== 'none' ? `Sub: ${mc.sub_element.toUpperCase()}` : ''}</p>
            </div>
            <div class="party-stat-grid">
                <div class="stat-row"><span class="stat-label">HP</span> <span class="stat-val">${mc.stats.hp}</span></div>
                <div class="stat-row"><span class="stat-label">ST (Armor)</span> <span class="stat-val">${mc.stats.max_st}</span></div>
                <div class="stat-row"><span class="stat-label">ATK</span> <span class="stat-val">${mc.stats.atk}</span></div>
                <div class="stat-row"><span class="stat-label">DEF</span> <span class="stat-val">${mc.stats.def}</span></div>
                <div class="stat-row"><span class="stat-label">MAG</span> <span class="stat-val">${mc.stats.mag}</span></div>
                <div class="stat-row"><span class="stat-label">SPD</span> <span class="stat-val">${mc.stats.spd}</span></div>
            </div>
            <div style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; margin-top:10px; margin-bottom:5px;">可変ステータス (Variable Extras)</div>
            <div class="party-stat-grid" style="border-top:1px dashed #334155; padding-top:10px; margin-bottom:10px;">
                <div class="stat-row"><span class="stat-label">大きさ</span> <span class="stat-val" style="color:#fde047;">${mc.getSizeLabel()} (${mc.params.size||0})</span></div>
                <div class="stat-row"><span class="stat-label">賢さランク</span> <span class="stat-val" style="color:#fde047;">Lv.${mc.getIntelligenceLevel()} (${mc.params.intelligence||0})</span></div>
                <div class="stat-row"><span class="stat-label">えさ回数</span> <span class="stat-val" style="color:${(mc.feed_count||0)>=10?'#ef4444':'#94a3b8'};">${mc.feed_count||0} / 10</span></div>
            </div>
        `;
        card.appendChild(statsDiv);

        // バトル技（読み取り専用 + 技設定ボタン）
        const skillsDiv = document.createElement('div');
        const equipped = data.skills || [];
        const skillBadges = equipped.map(sid => {
            const info = SKILLS.find(s => s.id === sid);
            return info ? `<span class="party-skill-badge">${info.name}</span>` : '';
        }).join('');

        const skillsHeader = document.createElement('div');
        skillsHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';
        skillsHeader.innerHTML = `
            <span style="font-size:0.85rem; font-weight:bold; color:#cbd5e1;">バトル技 (${equipped.length}/4)</span>
        `;
        const editBtn = document.createElement('button');
        editBtn.className = 'btn skill-btn';
        editBtn.style.cssText = 'padding:3px 12px; font-size:0.75rem; color:#fbbf24; border-color:rgba(251,191,36,0.4);';
        editBtn.textContent = '技設定';
        editBtn.onclick = () => openSkillEdit(data);
        skillsHeader.appendChild(editBtn);

        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'party-skills';
        badgesDiv.innerHTML = skillBadges || '<span style="color:#64748b; font-size:0.8rem;">なし</span>';

        skillsDiv.appendChild(skillsHeader);
        skillsDiv.appendChild(badgesDiv);
        card.appendChild(skillsDiv);

        // 育成記録
        const growthDiv = document.createElement('div');
        growthDiv.innerHTML = renderGrowthLog(data);
        card.appendChild(growthDiv);

        partyDetailsGrid.appendChild(card);
    });
}

// ---- 技設定モーダル ----

function getOrCreateSkillModal() {
    if (skillEditModal) return skillEditModal;

    skillEditModal = document.createElement('div');
    skillEditModal.id = 'skill-edit-overlay';
    skillEditModal.className = 'skill-edit-overlay hide';

    skillEditModal.innerHTML = `
        <div class="skill-edit-panel glass-panel">
            <div class="skill-edit-header">
                <h2 id="skill-edit-title" style="font-size:1.05rem; margin:0;"></h2>
                <button id="skill-edit-close" class="btn skill-btn">✕ 閉じる</button>
            </div>
            <div id="skill-edit-body"></div>
        </div>
    `;

    document.body.appendChild(skillEditModal);
    document.getElementById('skill-edit-close').onclick = closeSkillEdit;
    skillEditModal.addEventListener('click', (e) => {
        if (e.target === skillEditModal) closeSkillEdit();
    });

    return skillEditModal;
}

export function openSkillEdit(monster) {
    skillEditMonster = monster;
    if (!monster.known_skills) monster.known_skills = [...monster.skills];

    const modal = getOrCreateSkillModal();
    document.getElementById('skill-edit-title').textContent = `${monster.name} の技設定`;
    renderSkillEditBody();
    modal.classList.remove('hide');
}

function closeSkillEdit() {
    if (skillEditModal) skillEditModal.classList.add('hide');
    renderParty();
}

function renderSkillEditBody() {
    const monster = skillEditMonster;
    const body = document.getElementById('skill-edit-body');
    body.innerHTML = '';

    // ---- バトル技スロット（4枠） ----
    const battleHeader = document.createElement('div');
    battleHeader.className = 'skill-section-header';
    battleHeader.innerHTML = `
        <span class="skill-section-title" style="color:#fbbf24;">バトル技 <span style="font-size:0.8em; color:#94a3b8;">(${monster.skills.length}/4)</span></span>
        <span style="font-size:0.75rem; color:#64748b;">修得技からドラッグしてセット</span>
    `;
    body.appendChild(battleHeader);

    const battleZone = document.createElement('div');
    battleZone.className = 'skill-battle-zone';

    // ゾーン自体もドロップ受け付け（空きスロット全体）
    battleZone.addEventListener('dragover', (e) => {
        if (skillDragSrcZone === 'known') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });
    battleZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (skillDragSrcZone === 'known' && monster.skills.length < 4) {
            const skillId = e.dataTransfer.getData('skill-id');
            if (skillId && !monster.skills.includes(skillId)) {
                monster.skills.push(skillId);
                renderSkillEditBody();
            }
        }
    });

    for (let si = 0; si < 4; si++) {
        const slot = document.createElement('div');

        if (si < monster.skills.length) {
            const sid = monster.skills[si];
            const info = SKILLS.find(s => s.id === sid);
            if (!info) continue;

            slot.className = 'skill-slot skill-slot-filled';
            slot.draggable = true;

            slot.addEventListener('dragstart', (e) => {
                skillDragSrcZone = 'equipped';
                skillDragSrcIdx = si;
                e.dataTransfer.setData('skill-id', sid);
                e.dataTransfer.setData('text/plain', 'equipped');
                e.dataTransfer.effectAllowed = 'move';
                slot.classList.add('dragging');
            });
            slot.addEventListener('dragend', () => {
                slot.classList.remove('dragging');
                body.querySelectorAll('.skill-slot, .skill-known-row').forEach(el => el.classList.remove('drag-over'));
            });
            slot.addEventListener('dragover', (e) => {
                if (skillDragSrcZone === 'equipped') {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }
            });
            slot.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (skillDragSrcZone === 'equipped' && skillDragSrcIdx !== si) slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('drag-over');
                if (skillDragSrcZone === 'equipped' && skillDragSrcIdx !== si) {
                    const moved = monster.skills.splice(skillDragSrcIdx, 1)[0];
                    monster.skills.splice(si, 0, moved);
                    renderSkillEditBody();
                } else if (skillDragSrcZone === 'known') {
                    const skillId = e.dataTransfer.getData('skill-id');
                    if (skillId && !monster.skills.includes(skillId)) {
                        monster.skills.splice(si, 0, skillId);
                        if (monster.skills.length > 4) monster.skills.pop();
                        renderSkillEditBody();
                    }
                }
            });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'skill-slot-name';
            nameSpan.innerHTML = `<span class="party-drag-handle" style="margin-right:6px;">⠿</span>${info.name}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn skill-btn';
            removeBtn.style.cssText = 'padding:2px 8px; font-size:0.7rem; color:#ef4444; flex-shrink:0;';
            removeBtn.textContent = '✕外す';
            removeBtn.onclick = () => {
                if (monster.skills.length <= 1) {
                    alert('技は最低1つ必要です');
                    return;
                }
                monster.skills.splice(si, 1);
                renderSkillEditBody();
            };

            slot.appendChild(nameSpan);
            slot.appendChild(removeBtn);
        } else {
            slot.className = 'skill-slot skill-slot-empty';
            slot.textContent = `── 空きスロット ${si + 1} ──`;

            slot.addEventListener('dragover', (e) => {
                if (skillDragSrcZone === 'known') { e.preventDefault(); slot.classList.add('drag-over'); }
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('drag-over');
                if (skillDragSrcZone === 'known') {
                    const skillId = e.dataTransfer.getData('skill-id');
                    if (skillId && !monster.skills.includes(skillId) && monster.skills.length < 4) {
                        monster.skills.push(skillId);
                        renderSkillEditBody();
                    }
                }
            });
        }

        battleZone.appendChild(slot);
    }
    body.appendChild(battleZone);

    // ---- 修得技リスト ----
    const knownHeader = document.createElement('div');
    knownHeader.className = 'skill-section-header';
    knownHeader.style.marginTop = '16px';
    knownHeader.innerHTML = `
        <span class="skill-section-title" style="color:#94a3b8;">修得技 <span style="font-size:0.8em;">(${monster.known_skills.length}/10)</span></span>
        <span style="font-size:0.75rem; color:#64748b;">バトル技スロットにドラッグ</span>
    `;
    body.appendChild(knownHeader);

    const knownZone = document.createElement('div');
    knownZone.className = 'skill-known-zone';

    // 修得技ゾーンへのドロップ = 外す
    knownZone.addEventListener('dragover', (e) => {
        if (skillDragSrcZone === 'equipped') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    knownZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (skillDragSrcZone === 'equipped') {
            if (monster.skills.length <= 1) { alert('技は最低1つ必要です'); return; }
            monster.skills.splice(skillDragSrcIdx, 1);
            renderSkillEditBody();
        }
    });

    if (monster.known_skills.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#64748b; font-size:0.8rem; padding:12px; text-align:center;';
        empty.textContent = '修得技がありません';
        knownZone.appendChild(empty);
    }

    monster.known_skills.forEach((sid, ki) => {
        const info = SKILLS.find(s => s.id === sid);
        if (!info) return;

        const isEquipped = monster.skills.includes(sid);
        const row = document.createElement('div');
        row.className = `skill-known-row${isEquipped ? ' skill-known-equipped' : ''}`;

        if (!isEquipped) {
            row.draggable = true;
            row.addEventListener('dragstart', (e) => {
                skillDragSrcZone = 'known';
                skillDragSrcIdx = ki;
                e.dataTransfer.setData('skill-id', sid);
                e.dataTransfer.setData('text/plain', 'known');
                e.dataTransfer.effectAllowed = 'move';
                row.classList.add('dragging');
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                body.querySelectorAll('.skill-slot, .skill-known-row').forEach(el => el.classList.remove('drag-over'));
            });
        }

        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:8px;';

        const handle = document.createElement('span');
        handle.className = 'party-drag-handle';
        handle.textContent = isEquipped ? '' : '⠿';
        handle.style.width = '16px';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-size:0.85rem; color:${isEquipped ? '#64748b' : '#f8fafc'};`;
        nameSpan.textContent = info.name;

        if (isEquipped) {
            const badge = document.createElement('span');
            badge.style.cssText = 'font-size:0.65rem; color:#3b82f6; background:rgba(59,130,246,0.15); padding:1px 6px; border-radius:4px;';
            badge.textContent = 'セット中';
            left.appendChild(handle);
            left.appendChild(nameSpan);
            left.appendChild(badge);
        } else {
            left.appendChild(handle);
            left.appendChild(nameSpan);
        }

        const actionBtn = document.createElement('button');
        actionBtn.className = 'btn skill-btn';
        if (isEquipped) {
            actionBtn.style.cssText = 'padding:3px 10px; font-size:0.7rem; color:#64748b; flex-shrink:0;';
            actionBtn.textContent = 'セット済';
            actionBtn.disabled = true;
        } else {
            actionBtn.style.cssText = `padding:3px 10px; font-size:0.7rem; color:#10b981; flex-shrink:0; ${monster.skills.length >= 4 ? 'opacity:0.4;' : ''}`;
            actionBtn.textContent = '+セット';
            actionBtn.disabled = monster.skills.length >= 4;
            actionBtn.onclick = () => {
                if (monster.skills.length < 4) {
                    monster.skills.push(sid);
                    renderSkillEditBody();
                }
            };
        }

        row.appendChild(left);
        row.appendChild(actionBtn);
        knownZone.appendChild(row);
    });

    body.appendChild(knownZone);
}
