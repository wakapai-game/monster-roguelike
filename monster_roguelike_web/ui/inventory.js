import { appState } from '../state.js';
import { SKILLS, MAP_ITEMS_DATA } from '../data.js';
import { Monster } from '../game.js';
import {
  switchScreen,
  screenInventory, screenParty, screenHub,
  invSkillsContent, invFoodContent, invTargetSelection,
  invRosterGrid, invTargetMsg, btnCancelUse,
  partyDetailsGrid
} from './dom.js';

let activeInvItem = null;

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
        const item = MAP_ITEMS_DATA.find(s => s.id === id);
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
        card.innerHTML = `<h4>${m.name}</h4><p style="font-size:0.75rem; color:#94a3b8; margin-top:5px;">HP:${m.base_stats.hp} ST:${m.base_stats.max_st}</p>`;

        card.onclick = () => applyItemToMonster(m);
        invRosterGrid.appendChild(card);
    });
}

export function applyItemToMonster(m) {
    if(!activeInvItem) return;

    if(activeInvItem.type === 'skill') {
        const skillId = appState.globalInventory.skills[activeInvItem.index];
        if(!m.skills.includes(skillId)) {
            m.skills.push(skillId);
            appState.globalInventory.skills.splice(activeInvItem.index, 1);
            alert(`${m.name} は ${activeInvItem.name} を覚えた！`);
        } else {
            alert(`${m.name} はすでに覚えている！`);
            return;
        }
    } else if (activeInvItem.type === 'mapItem') {
        const itemId = appState.globalInventory.mapItems[activeInvItem.index];
        const itemData = MAP_ITEMS_DATA.find(i => i.id === itemId);

        if (!m.params) m.params = { size:0, hardness:0, weight:0, smartness:0 };
        m.params[itemData.effect.target_stat] = (m.params[itemData.effect.target_stat] || 0) + itemData.effect.value;

        if (typeof m.recalculateStats === 'function') {
            m.recalculateStats();
            // Since food should heal them slightly as a bonus when max HP goes up, let's just maximize it
            m.current_hp = m.stats.hp;
        } else {
            const mc = new Monster(m);
            m.stats = mc.stats;
            m.current_hp = m.stats.hp;
        }

        appState.globalInventory.mapItems.splice(activeInvItem.index, 1);
        alert(`${m.name} は ${itemData.name} を食べて強くなった！`);
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

export function renderParty() {
    partyDetailsGrid.innerHTML = '';

    appState.globalRoster.forEach(data => {
        const mc = new Monster(JSON.parse(JSON.stringify(data)));

        let skillsHtml = mc.skills.map(sid => {
            const skillInfo = SKILLS.find(s => s.id === sid);
            return skillInfo ? `<span class="party-skill-badge">${skillInfo.name}</span>` : '';
        }).join('');
        if(!skillsHtml) skillsHtml = '<span style="color:#64748b; font-size:0.8rem;">なし</span>';

        const card = document.createElement('div');
        card.className = 'party-stat-card';
        card.innerHTML = `
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
                <div class="stat-row"><span class="stat-label">大きさ (Size)</span> <span class="stat-val" style="color:#fde047;">+${mc.params.size||0}</span></div>
                <div class="stat-row"><span class="stat-label">硬さ (Hard)</span> <span class="stat-val" style="color:#fde047;">+${mc.params.hardness||0}</span></div>
                <div class="stat-row"><span class="stat-label">重さ (Weight)</span> <span class="stat-val" style="color:#fde047;">+${mc.params.weight||0}</span></div>
                <div class="stat-row"><span class="stat-label">賢さ (Smart)</span> <span class="stat-val" style="color:#fde047;">+${mc.params.smartness||0}</span></div>
            </div>
            <div>
                <div style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; margin-bottom:5px;">Equipped Skills</div>
                <div class="party-skills">${skillsHtml}</div>
            </div>
        `;
        partyDetailsGrid.appendChild(card);
    });
}
