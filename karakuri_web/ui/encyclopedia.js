import { MONSTERS_DATA, ENEMY_DATA, SKILLS, BATTLE_ITEMS_DATA, TUTORIAL_ENEMY } from '../data.js';
import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';

const overlay = document.getElementById('screen-encyclopedia');
const content = document.getElementById('enc-content');
const tabBtns = document.querySelectorAll('[data-enc-tab]');

export function openEncyclopedia() {
  overlay.classList.remove('hide');
  renderTab('monsters');
}

document.getElementById('btn-close-encyclopedia').onclick = () => {
  overlay.classList.add('hide');
};

tabBtns.forEach(btn => {
  btn.onclick = () => {
    tabBtns.forEach(b => b.className = 'btn skill-btn inactive-tab');
    btn.className = 'btn skill-btn active-tab';
    renderTab(btn.dataset.encTab);
  };
});

function renderTab(tab) {
  content.innerHTML = '';

  if (tab === 'monsters') {
    renderMonsters();
  } else if (tab === 'enemies') {
    renderEnemies();
  } else if (tab === 'skills') {
    renderSkills();
  } else if (tab === 'items') {
    renderItems();
  }
}

function _monsterCard(m) {
  const card = document.createElement('div');
  card.className = 'enc-card';
  const skillNames = m.skills.map(sid => {
    const s = SKILLS.find(sk => sk.id === sid);
    return s ? s.name : sid;
  }).join(' / ');

  // スプライト（offscreenで描画→img要素に変換）
  try {
    const offscreen = document.createElement('canvas');
    generateMonsterSprite(offscreen, m);
    const img = document.createElement('img');
    img.src = offscreen.toDataURL();
    img.style.cssText = 'display:block; width:64px; height:64px; margin:0 auto 8px; image-rendering:pixelated; image-rendering:crisp-edges;';
    card.appendChild(img);
  } catch(e) {
    console.warn('sprite error:', m.id, e);
  }

  // テキスト情報
  const header = document.createElement('div');
  header.className = 'enc-card-header';
  header.appendChild(createElementBadge(m.main_element));
  if (m.sub_element !== 'none') {
    header.appendChild(createElementBadge(m.sub_element));
  }
  const nameStrong = document.createElement('strong');
  nameStrong.textContent = m.name;
  header.appendChild(nameStrong);
  card.appendChild(header);

  card.insertAdjacentHTML('beforeend', `
    <div class="enc-stats">
      <span>HP: ${m.base_stats.hp}</span>
      <span>ST: ${m.base_stats.max_st}</span>
      <span>ATK: ${m.base_stats.atk}</span>
      <span>DEF: ${m.base_stats.def}</span>
      <span>MAG: ${m.base_stats.mag}</span>
      <span>SPD: ${m.base_stats.spd}</span>
    </div>
    <div class="enc-skills">技: ${skillNames}</div>
  `);
  return card;
}

function renderMonsters() {
  MONSTERS_DATA.forEach(m => content.appendChild(_monsterCard(m)));
}

function renderEnemies() {
  const allEnemies = [...ENEMY_DATA, TUTORIAL_ENEMY];
  allEnemies.forEach(m => content.appendChild(_monsterCard(m)));
}

function renderSkills() {
  const catColor = { attack: '#ef4444', defense: '#3b82f6', trap: '#eab308' };
  SKILLS.forEach(s => {
    const card = document.createElement('div');
    card.className = 'enc-card';
    const color = catColor[s.category] || '#64748b';
    card.innerHTML = `
      <div class="enc-card-header">
        <span class="enc-badge" style="background:${color};">${s.category.toUpperCase()}</span>
        <strong>${s.name}</strong>
        <span style="margin-left:auto; color:#94a3b8; font-size:0.85rem;">EN コスト: ${s.cost_en || s.cost_st}</span>
      </div>
      <div class="enc-skill-type-row" style="font-size:0.85rem; color:#cbd5e1; margin-top:6px;">
        タイプ: ${s.type}
      </div>
    `;
    if (s.element !== 'none') {
      const typeRow = card.querySelector('.enc-skill-type-row');
      const elemLabel = document.createTextNode('\u3000属性: ');
      typeRow.appendChild(elemLabel);
      typeRow.appendChild(createElementBadge(s.element));
    }
    content.appendChild(card);
  });
}

function renderItems() {
  BATTLE_ITEMS_DATA.forEach(item => {
    const card = document.createElement('div');
    card.className = 'enc-card';
    card.innerHTML = `
      <div class="enc-card-header">
        <span class="enc-badge" style="background:#7c3aed;">BATTLE ITEM</span>
        <strong>${item.name}</strong>
      </div>
      <div style="font-size:0.85rem; color:#94a3b8; margin-top:6px;">${item.description}</div>
    `;
    content.appendChild(card);
  });
}

