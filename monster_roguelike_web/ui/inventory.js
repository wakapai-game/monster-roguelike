import { appState } from '../state.js';
import { SKILLS, FOOD_DATA } from '../data.js';
import { Monster } from '../game.js';
import {
  switchScreen,
  screenInventory, screenParty, screenHub,
  invSkillsContent, invFoodContent, invTargetSelection,
  invRosterGrid, invTargetMsg, btnCancelUse,
  partyDetailsGrid, btnCloseInventory, btnCloseParty
} from './dom.js';

let activeInvItem = null;

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
        const MAX_FEED = 10;
        if ((m.feed_count || 0) >= MAX_FEED) {
            alert(`${m.name} はもうこれ以上えさを食べられない！（上限${MAX_FEED}回）`);
            return;
        }

        const itemId = appState.globalInventory.mapItems[activeInvItem.index];
        const itemData = FOOD_DATA.find(i => i.id === itemId);
        if (!itemData) return;

        if (!m.params) m.params = { size: 0, hardness: 0, weight: 0, intelligence: 0 };

        // Apply base_stats changes
        if (itemData.effect.base_stats) {
            for (const [stat, delta] of Object.entries(itemData.effect.base_stats)) {
                const before = m.base_stats[stat] || 0;
                m.base_stats[stat] = before + delta;
                if (typeof m.logGrowth === 'function') {
                    m.logGrowth(itemId, stat, before, m.base_stats[stat]);
                }
            }
        }

        // Apply params changes (size, intelligence)
        if (itemData.effect.params) {
            for (const [param, delta] of Object.entries(itemData.effect.params)) {
                const before = m.params[param] || 0;
                m.params[param] = before + delta;
                if (typeof m.logGrowth === 'function') {
                    m.logGrowth(itemId, param, before, m.params[param]);
                }
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

export function renderParty() {
    partyDetailsGrid.innerHTML = '';

    appState.globalRoster.forEach(data => {
        const mc = (data instanceof Monster) ? data : new Monster(data);

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
                <div class="stat-row"><span class="stat-label">大きさ</span> <span class="stat-val" style="color:#fde047;">${mc.getSizeLabel()} (${mc.params.size||0})</span></div>
                <div class="stat-row"><span class="stat-label">賢さランク</span> <span class="stat-val" style="color:#fde047;">Lv.${mc.getIntelligenceLevel()} (${mc.params.intelligence||0})</span></div>
                <div class="stat-row"><span class="stat-label">えさ回数</span> <span class="stat-val" style="color:${(mc.feed_count||0)>=10?'#ef4444':'#94a3b8'};">${mc.feed_count||0} / 10</span></div>
            </div>
            <div>
                <div style="font-size:0.85rem; font-weight:bold; color:#cbd5e1; margin-bottom:5px;">Equipped Skills</div>
                <div class="party-skills">${skillsHtml}</div>
            </div>
            ${renderGrowthLog(data)}
        `;
        partyDetailsGrid.appendChild(card);
    });
}
