import { appState } from '../state.js';
import { SKILLS, BATTLE_ITEMS_DATA, FOOD_DATA } from '../data.js';
import { mapNodesContainer, mapLinesContainer, rosterGrid, screenMap, screenSelection, switchScreen } from './dom.js';

export function generateRewards() {
    const rBoxes = document.getElementById('reward-boxes');
    const btnCollect = document.getElementById('btn-collect-reward');
    rBoxes.innerHTML = '';
    btnCollect.disabled = true;

    const pools = [
       { type: 'skill',      data: SKILLS,            label: '技' },
       { type: 'battleItem', data: BATTLE_ITEMS_DATA,  label: 'バトルアイテム' },
       { type: 'food',       data: FOOD_DATA,          label: 'えさ' }
    ];

    // 3候補をランダム生成（未選択はインベントリに追加しない）
    for (let i = 0; i < 3; i++) {
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const item = pool.data[Math.floor(Math.random() * pool.data.length)];

        const box = document.createElement('div');
        box.className = 'reward-box reward-box-selectable';
        box.innerHTML = `<div class="reward-box-type">${pool.label}</div><h4>${item.name}</h4>`;
        box.onclick = () => {
            // 選択済みを解除してこのboxを選択
            rBoxes.querySelectorAll('.reward-box-selectable').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            btnCollect.disabled = false;

            // 選択されたアイテムをインベントリに反映（以前の選択分をクリアして再登録）
            appState.globalInventory._pendingReward = { type: pool.type, id: item.id };
        };
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

  if (node.type === 'rest') {
      // Resting heals global roster (mocked here, then immediately unlocks)
      alert("キャンプでモンスターの負傷が癒えた！（演出省略）");
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
    if(node.type === 'elite') icon = "💀";
    if(node.type === 'boss') icon = "👑";
    if(node.type === 'rest') icon = "⛺";
    el.innerText = icon;

    if (node.state === 'available') {
      el.onclick = () => handleNodeClick(node, onBattleStart);
    }

    mapNodesContainer.appendChild(el);
  });
}
