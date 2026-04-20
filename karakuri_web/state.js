// ---- App State ----
export let karakuriIdCounter = 0;
export let monsterIdCounter  = 0; // 旧互換エイリアス

export const appState = {
  playerName: "カイト",       // デフォルト名（プレイヤーが変更可能）
  mapGenerator: null,
  hubVisited: false,
  currentStage: 1,
  unlockedStages: 0,
  stageCleared: false,
  returnScreen: null,
  currentNodeId: null,
  currentQuestId: null,       // 受注中クエストID
  completedQuests: [],        // クリア済みクエストIDリスト

  // カラクリ管理
  globalRoster: [],           // 手持ちカラクリ（最大6体）
  garage: [],                 // ガレージ（保管中カラクリ）

  // インベントリ
  globalInventory: {
    techParts:    [],         // 技パーツ在庫 [{ id, count }]
    statParts:    [],         // 強化パーツ在庫 [{ id, count }]
    optionParts:  [],         // オプションパーツ在庫 [{ id, count }]
    battleItems:  [],         // バトルアイテム在庫 [{ id, count }]
    materials:    [],         // 素材在庫 [{ id, count }]
    // 旧互換
    skills: [], battleItems_legacy: [], mapItems: []
  },

  selectedIds: [],
  engine:   null,
  timeline: null,
  loopInterval: null,
  p1Team: [],
  p2Team: [],
  tutorialMode: null,
  tutorialShownSteps: new Set(),
  tutorialReward: false
};
