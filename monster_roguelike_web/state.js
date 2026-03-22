// ---- App State ----
export let monsterIdCounter = 0;

export const appState = {
  playerName: "ハンター",
  mapGenerator: null,
  hubVisited: false,
  currentStage: 1,
  unlockedStages: 1,
  stageCleared: false,
  returnScreen: null,
  currentNodeId: null,
  globalRoster: [],
  globalInventory: { skills: [], battleItems: [], mapItems: [] },
  selectedIds: [],
  engine: null,
  timeline: null,
  loopInterval: null,
  p1Team: [],
  p2Team: []
};
