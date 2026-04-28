export class TutorialMapGenerator {
  constructor() {
    this.totalFloors = 6;
    this.nodes = [
      { id: 'f0_n0', floor: 0, x: 0.5, type: 'event_story', next: ['f1_n0'], state: 'available' },
      { id: 'f1_n0', floor: 1, x: 0.2, type: 'battle',      next: ['f2_n0'], state: 'hidden'    },
      { id: 'f2_n0', floor: 2, x: 0.8, type: 'event_item',  next: ['f3_n0'], state: 'hidden'    },
      { id: 'f3_n0', floor: 3, x: 0.2, type: 'battle',      next: ['f4_n0'], state: 'hidden'    },
      { id: 'f4_n0', floor: 4, x: 0.8, type: 'event_stat',  next: ['f5_n0'], state: 'hidden'    },
      { id: 'f5_n0', floor: 5, x: 0.2, type: 'boss',        next: [],        state: 'hidden'    },
    ];
  }
  generate() {}
  getNodes() { return this.nodes; }
  unlockNextNodes(clearedNodeId) {
    const cleared = this.nodes.find(n => n.id === clearedNodeId);
    if (!cleared) return;
    cleared.state = 'cleared';
    this.nodes.filter(n => n.floor === cleared.floor && n.id !== clearedNodeId)
      .forEach(n => n.state = 'locked');
    cleared.next.forEach(nextId => {
      const next = this.nodes.find(n => n.id === nextId);
      if (next) next.state = 'available';
    });
  }
}

export class MapGenerator {
  constructor(totalFloors = 5) {
    this.totalFloors = totalFloors;
    // node: { id, floor, x, type, next: [], state: 'hidden' | 'available' | 'cleared' }
    this.nodes = [];
  }

  generate() {
    this.nodes = [];
    let currentFloorNodes = [];
    
    // Bottom to Top generation
    for (let floor = 0; floor < this.totalFloors; floor++) {
      let nodeCount = floor === this.totalFloors - 1 ? 1 : Math.floor(Math.random() * 2) + 2; // 2~3 nodes per floor, Boss is 1.
      let nextFloorNodes = [];

      for (let i = 0; i < nodeCount; i++) {
        const type = this._getRandomType(floor);
        const node = {
          id: `f${floor}_n${i}`,
          floor: floor,
          x: (i + 1) / (nodeCount + 1), // 0.0 ~ 1.0 rel position
          type: type,
          next: [],
          state: floor === 0 ? 'available' : 'hidden'
        };
        nextFloorNodes.push(node);
        this.nodes.push(node);
      }

      // Connect previous floor to this floor
      if (currentFloorNodes.length > 0) {
        currentFloorNodes.forEach((prevNode, idx) => {
          // Connect to at least 1 node above
          let targetIdx = Math.min(idx, nextFloorNodes.length - 1);
          prevNode.next.push(nextFloorNodes[targetIdx].id);

          // Random chance to connect to another adjacent branch
          if (nextFloorNodes.length > 1 && Math.random() > 0.5) {
             let altIdx = targetIdx === 0 ? 1 : targetIdx - 1;
             if (!prevNode.next.includes(nextFloorNodes[altIdx].id)) {
                 prevNode.next.push(nextFloorNodes[altIdx].id);
             }
          }
        });
        
        // Ensure all next nodes have at least 1 incoming edge
        nextFloorNodes.forEach(nNode => {
            const hasIncoming = currentFloorNodes.some(p => p.next.includes(nNode.id));
            if (!hasIncoming) {
                const randomPrev = currentFloorNodes[Math.floor(Math.random() * currentFloorNodes.length)];
                randomPrev.next.push(nNode.id);
            }
        });
      }

      currentFloorNodes = nextFloorNodes;
    }
  }

  _getRandomType(floor) {
    if (floor === this.totalFloors - 1) return 'boss';
    if (floor === 0) return 'battle';
    const r = Math.random();
    if (r < 0.2) return 'elite';
    if (r < 0.3) return 'rest';
    return 'battle';
  }

  getNodes() {
    return this.nodes;
  }

  unlockNextNodes(clearedNodeId) {
    const cleared = this.nodes.find(n => n.id === clearedNodeId);
    if (!cleared) return;
    
    // Set cleared
    cleared.state = 'cleared';
    
    // Lock all other nodes on the same floor
    this.nodes.filter(n => n.floor === cleared.floor && n.id !== clearedNodeId)
        .forEach(n => n.state = 'locked');

    // Unlock connected next nodes
    cleared.next.forEach(nextId => {
      const nextNode = this.nodes.find(n => n.id === nextId);
      if (nextNode) nextNode.state = 'available';
    });
  }
}
