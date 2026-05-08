import { appState } from '../state.js';
import { SKILLS, TECH_PARTS, STAT_PARTS, FOOD_DATA } from '../data.js';
import { Karakuri } from '../game.js';
import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';
import {
  switchScreen,
  screenInventory, screenParty, screenHub,
  invSkillsContent, invFoodContent,
  partyDetailsGrid, btnCloseInventory, btnCloseParty,
  btnMapParty
} from './dom.js';

let dragSrcIndex = -1;

// ---- ワザギア情報ツールチップ ----
const _techTooltip = document.getElementById('reward-tooltip');

function _buildTechTooltipHtml(info) {
    const catLabel = { attack: '攻撃', defense: '防御', support: 'サポート' }[info.category] || info.category;
    const elemLabel = info.element && info.element !== 'none' ? ` / ${info.element.toUpperCase()}` : '';
    return `<strong>${info.name}</strong>` +
        `<span style="color:#94a3b8;font-size:0.75rem;">${catLabel}${elemLabel}${info.cost_en != null ? `　EN消費: ${info.cost_en}` : ''}</span><br>` +
        (info.description || '');
}

function _showTechTooltip(el, info) {
    if (!_techTooltip) return;
    _techTooltip.innerHTML = _buildTechTooltipHtml(info);
    const rect = el.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    left = Math.max(120, Math.min(left, window.innerWidth - 120));
    _techTooltip.style.left = `${left}px`;
    _techTooltip.style.top = `${rect.top}px`;
    _techTooltip.classList.remove('hide');
}

function _hideTechTooltip() {
    _techTooltip?.classList.add('hide');
}

function _attachTechTooltip(el, info) {
    el.style.cursor = 'help';
    el.addEventListener('mouseenter', () => _showTechTooltip(el, info));
    el.addEventListener('mouseleave', _hideTechTooltip);
    // スマホ対応: タップで表示、外タップで非表示
    el.addEventListener('touchstart', (e) => { e.preventDefault(); _showTechTooltip(el, info); }, { passive: false });
    el.addEventListener('touchend', () => setTimeout(_hideTechTooltip, 1500));
}

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
    partySelectedIndex = 0;
    renderParty();
    switchScreen(fromScreen, screenParty);

    // チュートリアル：ボディギア確認待ち中ならパルスとバナーをクリア
    if (appState.tutorialAwaitStatView) {
        appState.tutorialAwaitStatView = false;
        btnMapParty?.classList.remove('tutorial-guide-pulse');
        document.getElementById('tutorial-stat-banner')?.remove();
    }

    // チュートリアル：技装備待ち中なら対象ボタンをパルス強調
    if (appState.tutorialAwaitEquip) {
        const targetSkillId = appState.tutorialAwaitEquipSkillId;
        requestAnimationFrame(() => {
            const learnSection = document.getElementById('party-learn-section');
            if (!learnSection) return;
            learnSection.querySelectorAll('.party-action-btn').forEach(btn => {
                const info = TECH_PARTS.find(p => p.id === targetSkillId) || SKILLS.find(s => s.id === targetSkillId);
                if (!targetSkillId || btn.textContent.trim() === (info?.name ?? '')) {
                    btn.classList.add('tutorial-guide-pulse');
                    document.addEventListener('tutorial-skill-equipped', () => {
                        btn.classList.remove('tutorial-guide-pulse');
                    }, { once: true });
                }
            });
        });
    }
}

export function renderInventory() {
    invSkillsContent.innerHTML = '';
    invFoodContent.innerHTML = '';

    if (appState.globalInventory.skills.length === 0) {
        invSkillsContent.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">なし</span>';
    }
    if (appState.globalInventory.mapItems.length === 0) {
        invFoodContent.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">なし</span>';
    }

    // ワザギア一覧（確認のみ）
    appState.globalInventory.skills.forEach(id => {
        const item = TECH_PARTS.find(p => p.id === id) || SKILLS.find(s => s.id === id);
        if (!item) return;
        const el = document.createElement('div');
        el.className = 'inv-item-row';
        el.style.cursor = 'default';
        el.innerHTML = `<span>${item.name}</span><span style="font-size:0.7em; color:#94a3b8;">ワザギア</span>`;
        invSkillsContent.appendChild(el);
    });

    // アイテム一覧（同種まとめ・確認のみ）
    const grouped = {};
    appState.globalInventory.mapItems.forEach(id => { grouped[id] = (grouped[id] || 0) + 1; });
    Object.entries(grouped).forEach(([id, count]) => {
        const item = FOOD_DATA.find(s => s.id === id);
        if (!item) return;
        const el = document.createElement('div');
        el.className = 'inv-item-row';
        el.style.cursor = 'default';
        el.innerHTML = `<span>${item.name}</span><span style="font-size:0.75em; color:#94a3b8;">×${count}</span>`;
        invFoodContent.appendChild(el);
    });
}

function _showPartyToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(30,41,59,0.95); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; font-size:0.82rem; padding:6px 16px; border-radius:20px; pointer-events:none; z-index:9999; white-space:nowrap; transition:opacity 0.3s;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 1800);
}

// ---- Party Screen ----

let partySelectedIndex = 0;

export function renderParty() {
    _hideTechTooltip();
    const roster = appState.globalRoster;
    partySelectedIndex = Math.max(0, Math.min(partySelectedIndex, roster.length - 1));
    _renderPartyRoster(roster);
    _renderPartyDetail(roster);
}

// ---- ロースター一覧（3×2固定グリッド） ----
let _rosterDragSrc = -1;

function _renderPartyRoster(roster) {
    const panel = document.getElementById('party-roster-list');
    if (!panel) return;
    panel.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        const data = roster[i];

        if (!data) {
            const empty = document.createElement('div');
            empty.className = 'party-mini-card-empty';
            empty.dataset.slot = i;
            _setupRosterDropTarget(empty, i, roster);
            panel.appendChild(empty);
            continue;
        }

        const mc = (data instanceof Karakuri) ? data : new Karakuri(data);
        const card = document.createElement('div');
        card.className = `party-mini-card${i === partySelectedIndex ? ' selected' : ''}`;
        card.dataset.slot = i;
        card.draggable = true;

        card.onclick = () => { partySelectedIndex = i; renderParty(); };

        card.addEventListener('dragstart', (e) => {
            _rosterDragSrc = i;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(i));
            setTimeout(() => card.style.opacity = '0.4', 0);
        });
        card.addEventListener('dragend', () => { card.style.opacity = ''; _rosterDragSrc = -1; });

        _setupRosterDropTarget(card, i, roster);

        try {
            const offscreen = document.createElement('canvas');
            generateMonsterSprite(offscreen, mc);
            const img = document.createElement('img');
            img.src = offscreen.toDataURL();
            card.appendChild(img);
        } catch(e) {}

        const info = document.createElement('div');
        info.className = 'party-mini-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'party-mini-name';
        nameEl.textContent = mc.name;
        info.appendChild(nameEl);

        if (i === 0) {
            const star = document.createElement('div');
            star.className = 'party-mini-pos';
            star.textContent = '★先頭';
            info.appendChild(star);
        }

        const maxHp = mc.stats.hp;
        const curHp = data.current_hp !== undefined ? Math.max(0, data.current_hp) : maxHp;
        const hpPct = maxHp > 0 ? (curHp / maxHp * 100) : 100;
        const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
        info.innerHTML += `<div class="party-mini-hp"><div class="party-mini-hp-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>`;

        card.appendChild(info);
        panel.appendChild(card);
    }

    _initRosterSwipe(panel, roster);
}

function _setupRosterDropTarget(el, targetIdx, roster) {
    el.addEventListener('dragover', (e) => {
        if (_rosterDragSrc === -1 || _rosterDragSrc === targetIdx) return;
        e.preventDefault();
        el.style.outline = '2px solid #3b82f6';
    });
    el.addEventListener('dragleave', () => { el.style.outline = ''; });
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.style.outline = '';
        if (_rosterDragSrc === -1 || _rosterDragSrc === targetIdx) return;
        const src = _rosterDragSrc;
        const tmp = roster[src];
        roster[src] = roster[targetIdx];
        if (roster[src] === undefined) roster.splice(src, 1);
        if (targetIdx < roster.length) {
            roster[targetIdx] = tmp;
        } else {
            roster.push(tmp);
        }
        const cleaned = roster.filter(Boolean);
        roster.length = 0;
        cleaned.forEach(m => roster.push(m));
        partySelectedIndex = roster.indexOf(tmp);
        if (partySelectedIndex < 0) partySelectedIndex = 0;
        renderParty();
    });
}

function _initRosterSwipe(panel, roster) {
    let startX = 0, startY = 0, swipeSrcIdx = -1;
    panel.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.party-mini-card');
        if (!card) return;
        swipeSrcIdx = parseInt(card.dataset.slot);
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        if (swipeSrcIdx === -1) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) { swipeSrcIdx = -1; return; }

        const endEl = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        const destCard = endEl?.closest('[data-slot]');
        const destIdx = destCard ? parseInt(destCard.dataset.slot) : -1;

        if (destIdx >= 0 && destIdx !== swipeSrcIdx) {
            const a = roster[swipeSrcIdx], b = roster[destIdx];
            if (a) { roster[destIdx] = a; }
            if (b) { roster[swipeSrcIdx] = b; } else { roster.splice(swipeSrcIdx, 1); }
            const cleaned = roster.filter(Boolean);
            roster.length = 0;
            cleaned.forEach(m => roster.push(m));
            partySelectedIndex = 0;
            renderParty();
            _showPartyToast('隊列を入れ替えました');
        }
        swipeSrcIdx = -1;
    }, { passive: true });
}

// ---- 選択ビルガマタ詳細（右/下パネル） ----
function _renderPartyDetail(roster) {
    partyDetailsGrid.innerHTML = '';
    const index = partySelectedIndex;
    const data = roster[index];
    if (!data) return;

    const mc = (data instanceof Karakuri) ? data : new Karakuri(data);

    // 名前 + 属性バッジ
    const nameRow = document.createElement('div');
    nameRow.className = 'party-single-name-row';
    const nameH = document.createElement('h3');
    nameH.textContent = mc.name;
    nameRow.appendChild(nameH);
    nameRow.appendChild(createElementBadge(mc.main_element));
    if (mc.sub_element && mc.sub_element !== 'none') {
        const subL = document.createElement('span');
        subL.style.cssText = 'font-size:0.72rem; color:#64748b;';
        subL.textContent = 'Sub:';
        nameRow.appendChild(subL);
        nameRow.appendChild(createElementBadge(mc.sub_element));
    }
    partyDetailsGrid.appendChild(nameRow);

    // ステータスグリッド（Karakuri専用: HP/EN/ATK/DEF/MAG/SPD）
    const statsEl = document.createElement('div');
    statsEl.innerHTML = `
        <div class="party-stat-grid">
            <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${mc.stats.hp}</span></div>
            <div class="stat-row"><span class="stat-label">EN</span><span class="stat-val">${mc.stats.max_en}</span></div>
            <div class="stat-row"><span class="stat-label">ATK</span><span class="stat-val">${mc.stats.atk}</span></div>
            <div class="stat-row"><span class="stat-label">DEF</span><span class="stat-val">${mc.stats.def}</span></div>
            <div class="stat-row"><span class="stat-label">MAG</span><span class="stat-val">${mc.stats.mag}</span></div>
            <div class="stat-row"><span class="stat-label">SPD</span><span class="stat-val">${mc.stats.spd}</span></div>
        </div>
    `;
    partyDetailsGrid.appendChild(statsEl);

    // 装備中のワザギア
    const skillsDiv = document.createElement('div');
    const equipped = data.tech_parts || [];
    const skillsHeader = document.createElement('div');
    skillsHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';
    skillsHeader.innerHTML = `<span style="font-size:0.85rem; font-weight:bold; color:#cbd5e1;">ワザギア装備 (${equipped.length}/4)</span>`;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn skill-btn';
    editBtn.style.cssText = 'padding:3px 12px; font-size:0.75rem; color:#fbbf24; border-color:rgba(251,191,36,0.4);';
    editBtn.textContent = '技設定';
    editBtn.onclick = () => openSkillEdit(data);
    skillsHeader.appendChild(editBtn);
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'party-skills';
    if (equipped.length === 0) {
        badgesDiv.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">なし</span>';
    } else {
        equipped.forEach(sid => {
            const info = TECH_PARTS.find(p => p.id === sid) || SKILLS.find(s => s.id === sid);
            if (!info) return;
            const badge = document.createElement('span');
            badge.className = 'party-skill-badge';
            badge.textContent = info.name;
            _attachTechTooltip(badge, info);
            badgesDiv.appendChild(badge);
        });
    }
    skillsDiv.appendChild(skillsHeader);
    skillsDiv.appendChild(badgesDiv);
    partyDetailsGrid.appendChild(skillsDiv);

    // 装備中のボディギア（stat_parts）
    const statDiv = document.createElement('div');
    const equippedStat = data.stat_parts || [];
    const statHeader = document.createElement('div');
    statHeader.style.cssText = 'font-size:0.85rem; font-weight:bold; color:#34d399; margin-bottom:6px;';
    statHeader.textContent = `ボディギア (${equippedStat.length}/5)`;
    const statBadgesDiv = document.createElement('div');
    statBadgesDiv.className = 'party-skills';
    if (equippedStat.length === 0) {
        statBadgesDiv.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">なし</span>';
    } else {
        equippedStat.forEach(sid => {
            const sinfo = STAT_PARTS.find(p => p.id === sid);
            if (!sinfo) return;
            const sbadge = document.createElement('span');
            sbadge.className = 'party-skill-badge';
            sbadge.style.borderColor = 'rgba(52,211,153,0.4)';
            sbadge.textContent = sinfo.name;
            _attachTechTooltip(sbadge, {
                name: sinfo.name,
                category: 'ボディギア',
                element: null,
                cost_en: null,
                description: sinfo.description
            });
            statBadgesDiv.appendChild(sbadge);
        });
    }
    statDiv.appendChild(statHeader);
    statDiv.appendChild(statBadgesDiv);
    partyDetailsGrid.appendChild(statDiv);

    partyDetailsGrid.appendChild(_partyDivider());

    // インベントリからワザギアを装備
    partyDetailsGrid.appendChild(_renderEquipSection(data));

    partyDetailsGrid.appendChild(_partyDivider());

    // 隊列移動
    const orderSection = document.createElement('div');
    orderSection.className = 'party-order-controls';
    const orderLabel = document.createElement('span');
    orderLabel.style.cssText = 'font-size:0.78rem; color:#64748b;';
    orderLabel.textContent = '隊列を移動';
    const leftBtn = document.createElement('button');
    leftBtn.className = 'btn skill-btn';
    leftBtn.style.cssText = 'padding:4px 12px; font-size:0.8rem;';
    leftBtn.textContent = '◀ 前へ';
    leftBtn.disabled = index === 0;
    leftBtn.onclick = () => {
        [roster[index - 1], roster[index]] = [roster[index], roster[index - 1]];
        partySelectedIndex--;
        renderParty();
        _showPartyToast(`No.${partySelectedIndex + 1} に移動`);
    };
    const rightBtn = document.createElement('button');
    rightBtn.className = 'btn skill-btn';
    rightBtn.style.cssText = 'padding:4px 12px; font-size:0.8rem;';
    rightBtn.textContent = '後へ ▶';
    rightBtn.disabled = index >= roster.length - 1;
    rightBtn.onclick = () => {
        [roster[index], roster[index + 1]] = [roster[index + 1], roster[index]];
        partySelectedIndex++;
        renderParty();
        _showPartyToast(`No.${partySelectedIndex + 1} に移動`);
    };
    orderSection.appendChild(leftBtn);
    orderSection.appendChild(orderLabel);
    orderSection.appendChild(rightBtn);
    partyDetailsGrid.appendChild(orderSection);
}

function _partyDivider() {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid rgba(255,255,255,0.1); margin:2px 0;';
    return d;
}

// ---- インベントリからワザギアを装備するセクション ----
function _renderEquipSection(data) {
    const section = document.createElement('div');
    section.className = 'party-action-section';
    section.id = 'party-learn-section';

    const equipped = data.tech_parts || [];
    const label = document.createElement('div');
    label.className = 'party-action-label';
    label.textContent = `インベントリから装備（${equipped.length}/4）`;
    section.appendChild(label);

    const skillItems = appState.globalInventory.skills;
    if (skillItems.length === 0) {
        section.innerHTML += '<div style="font-size:0.78rem; color:#64748b;">装備できるワザギアがない</div>';
        return section;
    }

    const grid = document.createElement('div');
    grid.className = 'party-action-grid';

    skillItems.forEach((sid, idx) => {
        const info = TECH_PARTS.find(p => p.id === sid) || SKILLS.find(s => s.id === sid);
        if (!info) return;
        const alreadyEquipped = equipped.includes(sid);
        const full = equipped.length >= 4;

        const btn = document.createElement('button');
        btn.className = 'btn skill-btn party-action-btn';
        btn.textContent = info.name;

        if (alreadyEquipped) {
            btn.style.opacity = '0.4';
            btn.disabled = true;
        } else if (full) {
            btn.style.opacity = '0.4';
            btn.disabled = true;
        } else {
            btn.onclick = () => _equipTechPart(data, idx, info);
        }
        _attachTechTooltip(btn, info);
        grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
}

// ---- ワザギア装備ロジック ----
function _equipTechPart(data, skillIndex, info) {
    if (!data.tech_parts) data.tech_parts = [];
    if (data.tech_parts.includes(info.id)) { _showPartyToast('すでに装備している！'); return; }
    if (data.tech_parts.length >= 4) { _showPartyToast('装備スロットが満杯（最大4）'); return; }

    data.tech_parts.push(info.id);
    appState.globalInventory.skills.splice(skillIndex, 1);

    _showPartyToast(`${data.name} に ${info.name} を装備！`);

    // チュートリアルフック
    const targetSkill = appState.tutorialAwaitEquipSkillId;
    if (appState.tutorialAwaitEquip && (!targetSkill || targetSkill === info.id)) {
        document.dispatchEvent(new CustomEvent('tutorial-skill-equipped', {
            detail: { skillId: info.id, monster: data }
        }));
        appState.tutorialAwaitEquip = null;
        appState.tutorialAwaitEquipSkillId = null;
    }

    renderParty();
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
    if (!monster.tech_parts) monster.tech_parts = [];

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
    _hideTechTooltip();
    const monster = skillEditMonster;
    const body = document.getElementById('skill-edit-body');
    body.innerHTML = '';

    // ---- バトル技スロット（4枠） ----
    const battleHeader = document.createElement('div');
    battleHeader.className = 'skill-section-header';
    battleHeader.innerHTML = `
        <span class="skill-section-title" style="color:#fbbf24;">装備中ギア <span style="font-size:0.8em; color:#94a3b8;">(${monster.tech_parts.length}/4)</span></span>
        <span style="font-size:0.75rem; color:#64748b;">ドラッグで並び替え・✕で外す</span>
    `;
    body.appendChild(battleHeader);

    const battleZone = document.createElement('div');
    battleZone.className = 'skill-battle-zone';

    battleZone.addEventListener('dragover', (e) => {
        if (skillDragSrcZone === 'inventory') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });
    battleZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (skillDragSrcZone === 'inventory' && monster.tech_parts.length < 4) {
            const skillId = e.dataTransfer.getData('skill-id');
            if (skillId && !monster.tech_parts.includes(skillId)) {
                const idx = appState.globalInventory.skills.indexOf(skillId);
                if (idx !== -1) appState.globalInventory.skills.splice(idx, 1);
                monster.tech_parts.push(skillId);
                renderSkillEditBody();
            }
        }
    });

    for (let si = 0; si < 4; si++) {
        const slot = document.createElement('div');

        if (si < monster.tech_parts.length) {
            const sid = monster.tech_parts[si];
            const info = TECH_PARTS.find(p => p.id === sid) || SKILLS.find(s => s.id === sid);
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
                    const moved = monster.tech_parts.splice(skillDragSrcIdx, 1)[0];
                    monster.tech_parts.splice(si, 0, moved);
                    renderSkillEditBody();
                } else if (skillDragSrcZone === 'inventory') {
                    const skillId = e.dataTransfer.getData('skill-id');
                    if (skillId && !monster.tech_parts.includes(skillId)) {
                        const idx = appState.globalInventory.skills.indexOf(skillId);
                        if (idx !== -1) appState.globalInventory.skills.splice(idx, 1);
                        monster.tech_parts.splice(si, 0, skillId);
                        if (monster.tech_parts.length > 4) monster.tech_parts.pop();
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
                if (monster.tech_parts.length <= 1) {
                    alert('ワザギアは最低1つ必要です');
                    return;
                }
                monster.tech_parts.splice(si, 1);
                // 外したギアをインベントリに戻す
                appState.globalInventory.skills.push(sid);
                renderSkillEditBody();
            };

            slot.appendChild(nameSpan);
            slot.appendChild(removeBtn);
        } else {
            slot.className = 'skill-slot skill-slot-empty';
            slot.textContent = `── 空きスロット ${si + 1} ──`;

            slot.addEventListener('dragover', (e) => {
                if (skillDragSrcZone === 'inventory') { e.preventDefault(); slot.classList.add('drag-over'); }
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('drag-over');
                if (skillDragSrcZone === 'inventory') {
                    const skillId = e.dataTransfer.getData('skill-id');
                    if (skillId && !monster.tech_parts.includes(skillId) && monster.tech_parts.length < 4) {
                        const idx = appState.globalInventory.skills.indexOf(skillId);
                        if (idx !== -1) appState.globalInventory.skills.splice(idx, 1);
                        monster.tech_parts.push(skillId);
                        renderSkillEditBody();
                    }
                }
            });
        }

        battleZone.appendChild(slot);
    }
    body.appendChild(battleZone);

    // ---- インベントリの未装備ギア ----
    const invHeader = document.createElement('div');
    invHeader.className = 'skill-section-header';
    invHeader.style.marginTop = '16px';
    invHeader.innerHTML = `
        <span class="skill-section-title" style="color:#94a3b8;">インベントリ <span style="font-size:0.8em;">(${appState.globalInventory.skills.length}個)</span></span>
        <span style="font-size:0.75rem; color:#64748b;">上のスロットにドラッグ or +セット</span>
    `;
    body.appendChild(invHeader);

    const invZone = document.createElement('div');
    invZone.className = 'skill-known-zone';

    if (appState.globalInventory.skills.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#64748b; font-size:0.8rem; padding:12px; text-align:center;';
        empty.textContent = '装備できるワザギアがありません';
        invZone.appendChild(empty);
    }

    appState.globalInventory.skills.forEach((sid, ki) => {
        const info = TECH_PARTS.find(p => p.id === sid) || SKILLS.find(s => s.id === sid);
        if (!info) return;

        const row = document.createElement('div');
        row.className = 'skill-known-row';
        row.draggable = true;

        row.addEventListener('dragstart', (e) => {
            skillDragSrcZone = 'inventory';
            skillDragSrcIdx = ki;
            e.dataTransfer.setData('skill-id', sid);
            e.dataTransfer.setData('text/plain', 'inventory');
            e.dataTransfer.effectAllowed = 'move';
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            body.querySelectorAll('.skill-slot, .skill-known-row').forEach(el => el.classList.remove('drag-over'));
        });

        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:8px;';

        const handle = document.createElement('span');
        handle.className = 'party-drag-handle';
        handle.textContent = '⠿';
        handle.style.width = '16px';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-size:0.85rem; color:#f8fafc;';
        nameSpan.textContent = info.name;

        left.appendChild(handle);
        left.appendChild(nameSpan);

        const actionBtn = document.createElement('button');
        actionBtn.className = 'btn skill-btn';
        actionBtn.style.cssText = `padding:3px 10px; font-size:0.7rem; color:#10b981; flex-shrink:0; ${monster.tech_parts.length >= 4 ? 'opacity:0.4;' : ''}`;
        actionBtn.textContent = '+セット';
        actionBtn.disabled = monster.tech_parts.length >= 4;
        actionBtn.onclick = () => {
            if (monster.tech_parts.length < 4) {
                appState.globalInventory.skills.splice(ki, 1);
                monster.tech_parts.push(sid);
                renderSkillEditBody();
            }
        };

        row.appendChild(left);
        row.appendChild(actionBtn);
        invZone.appendChild(row);
    });

    body.appendChild(invZone);
}
