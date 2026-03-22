import { appState } from '../state.js';
import { SKILLS, BATTLE_ITEMS_DATA, MAP_ITEMS_DATA } from '../data.js';
import { mapNodesContainer, mapLinesContainer, rosterGrid, screenMap, screenSelection, switchScreen } from './dom.js';

export function generateRewards() {
    const rBoxes = document.getElementById('reward-boxes');
    rBoxes.innerHTML = '';

    const pools = [
       { type: 'skill', data: SKILLS },
       { type: 'battleItem', data: BATTLE_ITEMS_DATA },
       { type: 'mapItem', data: MAP_ITEMS_DATA }
    ];

    // Give 2 random items
    for(let i=0; i<2; i++) {
        const pool = pools[Math.floor(Math.random() * pools.length)];
        const item = pool.data[Math.floor(Math.random() * pool.data.length)];

        if (pool.type === 'skill') appState.globalInventory.skills.push(item.id);
        if (pool.type === 'battleItem') appState.globalInventory.battleItems.push(item.id);
        if (pool.type === 'mapItem') appState.globalInventory.mapItems.push(item.id);

        const box = document.createElement('div');
        box.className = 'reward-box';
        let typeLabel = pool.type === 'skill' ? '技 (Skill)' : pool.type === 'battleItem' ? 'バトル用 (Battle)' : 'ステUP (Food)';
        box.innerHTML = `<h4>${item.name}</h4><p>${typeLabel}</p>`;
        rBoxes.appendChild(box);
    }
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
