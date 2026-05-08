import { appState } from '../DATA_App_State.js';
import { SKILLS, BATTLE_ITEMS_DATA, FOOD_DATA } from '../DATA_Game_Master.js';
import { mapNodesContainer, mapLinesContainer, rosterGrid, screenMap, screenSelection, switchScreen } from './UI_Dom_Elements.js';
import { generateItemIcon } from '../LOGIC_Sprite_Generator.js';

// ---- 戦利品ツールチップ ----
const _tooltip = document.getElementById('reward-tooltip');
let _longPressTimer = null;

function showRewardTooltip(box, item) {
  if (!_tooltip) return;
  _tooltip.innerHTML = `<strong>${item.name}</strong>${item.description || ''}`;
  const rect = box.getBoundingClientRect();
  // ボックス中央上に配置、画面端でクランプ
  let left = rect.left + rect.width / 2;
  left = Math.max(120, Math.min(left, window.innerWidth - 120));
  _tooltip.style.left = `${left}px`;
  _tooltip.style.top = `${rect.top + window.scrollY}px`;
  _tooltip.classList.remove('hide');
}

function hideRewardTooltip() {
  if (_tooltip) _tooltip.classList.add('hide');
}

export function generateRewards() {
    const rBoxes = document.getElementById('reward-boxes');
    const btnCollect = document.getElementById('btn-collect-reward');
    rBoxes.innerHTML = '';
    btnCollect.disabled = true;

    const pools = [
       { type: 'skill',      data: SKILLS,            label: '技' },
       { type: 'battleItem', data: BATTLE_ITEMS_DATA,  label: 'バトルアイテム' },
       { type: 'food',       data: FOOD_DATA,          label: 'えさ' },
    ];
    const validPools = pools.filter(p => p.data.length > 0);

    // 3候補をランダム生成（重複なし、未選択はインベントリに追加しない）
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
        let pool, item, key;
        let tries = 0;
        do {
            pool = validPools[Math.floor(Math.random() * validPools.length)];
            item = pool.data[Math.floor(Math.random() * pool.data.length)];
            key = `${pool.type}:${item.id}`;
            tries++;
        } while (seen.has(key) && tries < 30);
        seen.add(key);

        const box = document.createElement('div');
        box.className = 'reward-box reward-box-selectable';

        const typeDiv = document.createElement('div');
        typeDiv.className = 'reward-box-type';
        typeDiv.textContent = pool.label;

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 24;
        iconCanvas.height = 24;
        iconCanvas.style.cssText = 'display:block;margin:8px auto 4px;image-rendering:pixelated;image-rendering:crisp-edges;width:48px;height:48px;';
        generateItemIcon(iconCanvas, item.id, pool.type, item.element || 'none');

        const nameH4 = document.createElement('h4');
        nameH4.textContent = item.name;

        box.appendChild(typeDiv);
        box.appendChild(iconCanvas);
        box.appendChild(nameH4);
        box.onclick = () => {
            rBoxes.querySelectorAll('.reward-box-selectable').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            btnCollect.disabled = false;
            appState.globalInventory._pendingReward = { type: pool.type, id: item.id, element: item.element };
        };

        // PCホバー
        box.addEventListener('mouseenter', () => showRewardTooltip(box, item));
        box.addEventListener('mouseleave', hideRewardTooltip);

        // スマホ長押し（400ms）
        box.addEventListener('touchstart', (e) => {
            _longPressTimer = setTimeout(() => {
                showRewardTooltip(box, item);
            }, 400);
        }, { passive: true });
        box.addEventListener('touchend', () => {
            clearTimeout(_longPressTimer);
            setTimeout(hideRewardTooltip, 1200);
        });
        box.addEventListener('touchmove', () => {
            clearTimeout(_longPressTimer);
            hideRewardTooltip();
        });

        rBoxes.appendChild(box);
    }
}

export function collectPendingReward() {
    const pending = appState.globalInventory._pendingReward;
    if (!pending) return;
    if (pending.type === 'skill')      appState.globalInventory.skills.push(pending.id);
    if (pending.type === 'battleItem') appState.globalInventory.battleItems.push(pending.id);
    if (pending.type === 'food')       appState.globalInventory.mapItems.push(pending.id);
    delete appState.globalInventory._pendingReward;
}

export function handleNodeClick(node, onBattleStart) {
  if (node.state !== 'available') return;
  appState.currentNodeId = node.id;

  if (node.type === 'event_story' || node.type === 'event_item' || node.type === 'event_equip' || node.type === 'event_stat') {
    document.dispatchEvent(new CustomEvent('tutorial-node-event', {
      detail: { nodeId: node.id, type: node.type }
    }));
    return;
  }

  if (node.type === 'rest') {
      // Resting heals global roster (mocked here, then immediately unlocks)
      alert("キャンプでジュウマの負傷が癒えた！（演出省略）");
      appState.mapGenerator.unlockNextNodes(node.id);
      renderMap(onBattleStart);
      return;
  }

  // Proceed to Battle Selection
  appState.selectedIds = [];
  Array.from(rosterGrid.children).forEach(c => c.classList.remove('selected'));

  if (appState.globalRoster.length < 4) {
      appState.globalRoster.forEach(m => {
          appState.selectedIds.push(m.id);
          const card = Array.from(rosterGrid.children).find(c => c.dataset.id === m.id);
          if (card) card.classList.add('selected');
      });
      onBattleStart();
      return;
  }

  const btnStartBattle = document.getElementById('btn-start-battle');
  if (btnStartBattle) btnStartBattle.disabled = true;

  switchScreen(screenMap, screenSelection);
}

export function renderMap(onBattleStart) {
  mapNodesContainer.innerHTML = '';
  mapLinesContainer.innerHTML = '';

  const nodes = appState.mapGenerator.getNodes();

  // Draw Lines
  nodes.forEach(node => {
     node.next.forEach(nextId => {
        const nextNode = nodes.find(n => n.id === nextId);

        // coordinates (0~1) to percentage string
        const x1 = node.x * 100;
        const y1 = 100 - (node.floor / (appState.mapGenerator.totalFloors)) * 100 - 10; // y from bottom

        const x2 = nextNode.x * 100;
        const y2 = 100 - (nextNode.floor / (appState.mapGenerator.totalFloors)) * 100 - 10;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", `${x1}%`);
        line.setAttribute("y1", `${y1}%`);
        line.setAttribute("x2", `${x2}%`);
        line.setAttribute("y2", `${y2}%`);

        let lineClass = "map-line";
        if (node.state === 'cleared' && (nextNode.state === 'cleared' || nextNode.state === 'available')) {
            lineClass += " active";
        }
        line.setAttribute("class", lineClass);
        mapLinesContainer.appendChild(line);
     });
  });

  // Draw Nodes
  nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = `node ${node.type} ${node.state}`;
    el.style.left = `${node.x * 100}%`;
    el.style.bottom = `${(node.floor / appState.mapGenerator.totalFloors) * 100 + 5}%`;

    // Label
    let icon = "⚔️";
    if (node.type === 'elite')       icon = "💀";
    if (node.type === 'boss')        icon = "👑";
    if (node.type === 'rest')        icon = "⛺";
    if (node.type === 'event_story') icon = "📜";
    if (node.type === 'event_item')  icon = "📦";
    if (node.type === 'event_equip') icon = "⚙️";
    if (node.type === 'event_stat')  icon = "🔩";
    el.innerText = icon;

    if (node.state === 'available') {
      el.onclick = () => handleNodeClick(node, onBattleStart);
    }

    mapNodesContainer.appendChild(el);
  });
}
