import { appState } from '../state.js';
import { SKILLS, FOOD_DATA } from '../data.js';
import { Monster } from '../game.js';
import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';
import {
  switchScreen,
  screenInventory, screenParty, screenHub,
  invSkillsContent, invFoodContent,
  partyDetailsGrid, btnCloseInventory, btnCloseParty
} from './dom.js';

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
    partySelectedIndex = 0;
    renderParty();
    switchScreen(fromScreen, screenParty);
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

    // 技一覧（確認のみ）
    appState.globalInventory.skills.forEach(id => {
        const item = SKILLS.find(s => s.id === id);
        if (!item) return;
        const el = document.createElement('div');
        el.className = 'inv-item-row';
        el.style.cursor = 'default';
        el.innerHTML = `<span>${item.name}</span><span style="font-size:0.7em; color:#94a3b8;">技</span>`;
        invSkillsContent.appendChild(el);
    });

    // えさ一覧（同種まとめ・確認のみ）
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

let partySelectedIndex = 0;

function _showPartyToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(30,41,59,0.95); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; font-size:0.82rem; padding:6px 16px; border-radius:20px; pointer-events:none; z-index:9999; white-space:nowrap; transition:opacity 0.3s;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 1800);
}

export function renderParty() {
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
            // 空きスロット
            const empty = document.createElement('div');
            empty.className = 'party-mini-card-empty';
            empty.dataset.slot = i;
            _setupRosterDropTarget(empty, i, roster);
            panel.appendChild(empty);
            continue;
        }

        const mc = (data instanceof Monster) ? data : new Monster(data);
        const card = document.createElement('div');
        card.className = `party-mini-card${i === partySelectedIndex ? ' selected' : ''}`;
        card.dataset.slot = i;
        card.draggable = true;

        // タップで選択
        card.onclick = () => { partySelectedIndex = i; renderParty(); };

        // ドラッグ開始
        card.addEventListener('dragstart', (e) => {
            _rosterDragSrc = i;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(i));
            setTimeout(() => card.style.opacity = '0.4', 0);
        });
        card.addEventListener('dragend', () => { card.style.opacity = ''; _rosterDragSrc = -1; });

        _setupRosterDropTarget(card, i, roster);

        // スプライト
        try {
            const offscreen = document.createElement('canvas');
            generateMonsterSprite(offscreen, mc);
            const img = document.createElement('img');
            img.src = offscreen.toDataURL();
            card.appendChild(img);
        } catch(e) {}

        // 名前 + HPバー
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

    // スワイプで隊列入れ替え（スマホ）
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
        // src と target を入れ替え（空きスロットへのドロップも対応）
        const tmp = roster[src];
        roster[src] = roster[targetIdx]; // undefined の場合もある
        if (roster[src] === undefined) roster.splice(src, 1);
        if (targetIdx < roster.length) {
            roster[targetIdx] = tmp;
        } else {
            roster.push(tmp);
        }
        // undefined を詰める
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

        // スワイプ先のカードを特定
        const endEl = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        const destCard = endEl?.closest('[data-slot]');
        const destIdx = destCard ? parseInt(destCard.dataset.slot) : -1;

        if (destIdx >= 0 && destIdx !== swipeSrcIdx) {
            // 入れ替え
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

// ---- 選択モンスター詳細（右/下パネル） ----
function _renderPartyDetail(roster) {
    partyDetailsGrid.innerHTML = '';
    const index = partySelectedIndex;
    const data = roster[index];
    if (!data) return;

    const mc = (data instanceof Monster) ? data : new Monster(data);
    if (!data.known_skills) data.known_skills = [...data.skills];

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

    // ステータスグリッド
    const statsEl = document.createElement('div');
    statsEl.innerHTML = `
        <div class="party-stat-grid">
            <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${mc.stats.hp}</span></div>
            <div class="stat-row"><span class="stat-label">ST</span><span class="stat-val">${mc.stats.max_st}</span></div>
            <div class="stat-row"><span class="stat-label">ATK</span><span class="stat-val">${mc.stats.atk}</span></div>
            <div class="stat-row"><span class="stat-label">DEF</span><span class="stat-val">${mc.stats.def}</span></div>
            <div class="stat-row"><span class="stat-label">MAG</span><span class="stat-val">${mc.stats.mag}</span></div>
            <div class="stat-row"><span class="stat-label">SPD</span><span class="stat-val">${mc.stats.spd}</span></div>
        </div>
        <div class="party-stat-grid party-param-grid">
            <div class="stat-row"><span class="stat-label">大きさ</span><span class="stat-val" style="color:#fde047;">${mc.getSizeLabel()}</span></div>
            <div class="stat-row"><span class="stat-label">賢さ</span><span class="stat-val" style="color:#fde047;">Lv.${mc.getIntelligenceLevel()}</span></div>
            <div class="stat-row"><span class="stat-label">えさ</span><span class="stat-val" style="color:${(mc.feed_count||0)>=10?'#ef4444':'#94a3b8'};">${mc.feed_count||0}/10</span></div>
        </div>
    `;
    partyDetailsGrid.appendChild(statsEl);

    // バトル技
    const skillsDiv = document.createElement('div');
    const equipped = data.skills || [];
    const skillsHeader = document.createElement('div');
    skillsHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';
    skillsHeader.innerHTML = `<span style="font-size:0.85rem; font-weight:bold; color:#cbd5e1;">バトル技 (${equipped.length}/4)</span>`;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn skill-btn';
    editBtn.style.cssText = 'padding:3px 12px; font-size:0.75rem; color:#fbbf24; border-color:rgba(251,191,36,0.4);';
    editBtn.textContent = '技設定';
    editBtn.onclick = () => openSkillEdit(data);
    skillsHeader.appendChild(editBtn);
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'party-skills';
    badgesDiv.innerHTML = equipped.map(sid => {
        const info = SKILLS.find(s => s.id === sid);
        return info ? `<span class="party-skill-badge">${info.name}</span>` : '';
    }).join('') || '<span style="color:#64748b; font-size:0.8rem;">なし</span>';
    skillsDiv.appendChild(skillsHeader);
    skillsDiv.appendChild(badgesDiv);
    partyDetailsGrid.appendChild(skillsDiv);

    // 区切り
    partyDetailsGrid.appendChild(_partyDivider());

    // えさを与える
    partyDetailsGrid.appendChild(_renderFoodSection(data, mc));

    // 技を覚えさせる
    partyDetailsGrid.appendChild(_renderLearnSection(data));

    // 区切り
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

    // 育成記録
    const growthHtml = renderGrowthLog(data);
    if (growthHtml) {
        const growthDiv = document.createElement('div');
        growthDiv.innerHTML = growthHtml;
        partyDetailsGrid.appendChild(growthDiv);
    }
}

function _partyDivider() {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid rgba(255,255,255,0.1); margin:2px 0;';
    return d;
}

// ---- えさセクション ----
function _renderFoodSection(data, mc) {
    const section = document.createElement('div');
    section.className = 'party-action-section';

    const feedRemaining = 10 - (mc.feed_count || 0);
    const label = document.createElement('div');
    label.className = 'party-action-label';
    label.textContent = `えさを与える（残り${feedRemaining}回）`;
    section.appendChild(label);

    if (feedRemaining <= 0) {
        section.innerHTML += '<div style="font-size:0.78rem; color:#64748b;">これ以上食べられない</div>';
        return section;
    }

    const foodItems = appState.globalInventory.mapItems;
    if (foodItems.length === 0) {
        section.innerHTML += '<div style="font-size:0.78rem; color:#64748b;">えさがない</div>';
        return section;
    }

    // 同種まとめ表示
    const grouped = {};
    foodItems.forEach(id => {
        grouped[id] = (grouped[id] || 0) + 1;
    });

    const grid = document.createElement('div');
    grid.className = 'party-action-grid';

    Object.entries(grouped).forEach(([id, count]) => {
        const itemData = FOOD_DATA.find(f => f.id === id);
        if (!itemData) return;
        const btn = document.createElement('button');
        btn.className = 'btn skill-btn party-action-btn';
        btn.innerHTML = `${itemData.name}<span style="color:#64748b; font-size:0.7em; margin-left:4px;">×${count}</span>`;
        btn.onclick = () => {
            const idx = appState.globalInventory.mapItems.indexOf(id);
            if (idx === -1) return;
            _directApplyFood(data, mc, idx, itemData);
        };
        grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
}

// ---- 技を覚えさせるセクション ----
function _renderLearnSection(data) {
    const section = document.createElement('div');
    section.className = 'party-action-section';

    const known = data.known_skills || data.skills;
    const label = document.createElement('div');
    label.className = 'party-action-label';
    label.textContent = `技を覚えさせる（${known.length}/10）`;
    section.appendChild(label);

    const skillItems = appState.globalInventory.skills;
    if (skillItems.length === 0) {
        section.innerHTML += '<div style="font-size:0.78rem; color:#64748b;">覚えさせる技がない</div>';
        return section;
    }

    const grid = document.createElement('div');
    grid.className = 'party-action-grid';

    skillItems.forEach((sid, idx) => {
        const info = SKILLS.find(s => s.id === sid);
        if (!info) return;
        const alreadyKnows = known.includes(sid);
        const full = known.length >= 10;

        const btn = document.createElement('button');
        btn.className = 'btn skill-btn party-action-btn';
        btn.textContent = info.name;

        if (alreadyKnows) {
            btn.style.opacity = '0.4';
            btn.disabled = true;
            btn.title = 'すでに覚えている';
        } else if (full) {
            btn.style.opacity = '0.4';
            btn.disabled = true;
            btn.title = '修得技の上限（10）';
        } else {
            btn.onclick = () => _directApplySkill(data, idx, info);
        }
        grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
}

// ---- 直接適用ロジック ----
const _STAT_LABEL = { hp:'HP', max_st:'ST', atk:'ATK', def:'DEF', mag:'MAG', spd:'SPD', size:'大きさ', intelligence:'賢さ' };

function _directApplyFood(data, mc, itemIndex, itemData) {
    if ((data.feed_count || 0) >= 10) { _showPartyToast('もうえさを食べられない！'); return; }
    if (!data.params) data.params = { size: 0, hardness: 0, weight: 0, intelligence: 0 };

    const changes = [];

    if (itemData.effect.base_stats) {
        for (const [stat, delta] of Object.entries(itemData.effect.base_stats)) {
            const before = data.base_stats[stat] || 0;
            data.base_stats[stat] = before + delta;
            if (typeof data.logGrowth === 'function') data.logGrowth(itemData.id, stat, before, data.base_stats[stat]);
            if (delta !== 0) changes.push(`${_STAT_LABEL[stat] || stat}${delta > 0 ? '+' : ''}${delta}`);
        }
    }
    if (itemData.effect.params) {
        for (const [param, delta] of Object.entries(itemData.effect.params)) {
            const before = data.params[param] || 0;
            data.params[param] = before + delta;
            if (delta !== 0) changes.push(`${_STAT_LABEL[param] || param}${delta > 0 ? '+' : ''}${delta}`);
        }
    }
    data.feed_count = (data.feed_count || 0) + 1;

    if (typeof data.recalculateStats === 'function') {
        data.recalculateStats();
        data.current_hp = data.stats.hp;
    } else {
        const fresh = new Monster(data);
        data.stats = fresh.stats;
        data.current_hp = data.stats.hp;
    }

    appState.globalInventory.mapItems.splice(itemIndex, 1);
    const changeSummary = changes.length > 0 ? `  ${changes.join(' ')}` : '';
    _showPartyToast(`${data.name} が ${itemData.name} を食べた！${changeSummary}`);
    renderParty();
}

function _directApplySkill(data, skillIndex, info) {
    if (!data.known_skills) data.known_skills = [...data.skills];
    if (data.known_skills.includes(info.id)) { _showPartyToast('すでに覚えている！'); return; }
    if (data.known_skills.length >= 10) { _showPartyToast('技の上限（10）に達している！'); return; }

    data.known_skills.push(info.id);
    if (data.skills.length < 4) data.skills.push(info.id);
    appState.globalInventory.skills.splice(skillIndex, 1);

    _showPartyToast(`${data.name} が ${info.name} を覚えた！`);
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
        <span style="font-size:0.75rem; color:#64748b;">+セットボタン or ドラッグで追加</span>
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
