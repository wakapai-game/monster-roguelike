const SAVE_KEY = 'monsterRogue_save';

const SERIALIZABLE_FIELDS = [
  'playerName', 'globalRoster', 'globalInventory', 'selectedIds',
  'unlockedStages', 'currentStage', 'hubVisited', 'stageCleared',
  'currentNodeId', 'monsterIdCounter'
];

export function saveGame(appState) {
  const data = { version: 1, savedAt: new Date().toISOString() };
  for (const key of SERIALIZABLE_FIELDS) {
    if (key === 'monsterIdCounter') {
      data[key] = appState.monsterIdCounter;
    } else {
      data[key] = appState[key];
    }
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Save failed (storage quota?):', e);
    return false;
  }
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSaveData() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
