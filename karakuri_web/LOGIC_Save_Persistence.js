const SAVE_KEY = 'monsterRogue_save';

const SERIALIZABLE_FIELDS = [
  'playerName', 'globalRoster', 'globalInventory', 'selectedIds',
  'unlockedStages', 'currentStage', 'hubVisited', 'stageCleared',
  'currentNodeId', 'monsterIdCounter'
];

function serializeRoster(roster) {
  if (!Array.isArray(roster)) return roster;
  return roster.map(k => {
    const obj = { ...k };
    if (k.purged_tech  instanceof Set) obj.purged_tech  = [...k.purged_tech];
    if (k.purged_stats instanceof Set) obj.purged_stats = [...k.purged_stats];
    return obj;
  });
}

export function saveGame(appState) {
  if (appState.isTestMode) return false;
  const data = { version: 1, savedAt: new Date().toISOString() };
  for (const key of SERIALIZABLE_FIELDS) {
    if (key === 'monsterIdCounter') {
      data[key] = appState.monsterIdCounter;
    } else if (key === 'globalRoster') {
      data[key] = serializeRoster(appState[key]);
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
