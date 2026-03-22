// 8属性の相性表: 攻撃側(キー) -> 防御側(内部キー): ダメージ倍率
const AFFINITY = {
  "fire": { "fire": 1.0, "water": 0.5, "ice": 2.0, "thunder": 1.0, "earth": 1.0, "wind": 2.0, "light": 1.0, "dark": 1.0 },
  "water": { "fire": 2.0, "water": 1.0, "ice": 1.0, "thunder": 0.5, "earth": 2.0, "wind": 1.0, "light": 1.0, "dark": 1.0 },
  "ice": { "fire": 0.5, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 2.0, "wind": 2.0, "light": 1.0, "dark": 1.0 },
  "thunder": { "fire": 1.0, "water": 2.0, "ice": 2.0, "thunder": 1.0, "earth": 0.5, "wind": 1.0, "light": 1.0, "dark": 1.0 },
  "earth": { "fire": 2.0, "water": 0.5, "ice": 0.5, "thunder": 2.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0 },
  "wind": { "fire": 0.5, "water": 2.0, "ice": 0.5, "thunder": 2.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0 },
  "light": { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 2.0 },
  "dark": { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 2.0, "dark": 1.0 },
  "none": { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 }
};

// 技リスト
const SKILLS = [
  { id: "strike", name: "たいあたり", category: "attack", type: "physical", element: "none", cost_st: 10, effects: [{ type: "damage_st", base_power: 50 }] },
  { id: "fireball", name: "ファイアボール", category: "attack", type: "magic", element: "fire", cost_st: 15, effects: [{ type: "damage_st", base_power: 80 }] },
  { id: "water_gun", name: "みずでっぽう", category: "attack", type: "magic", element: "water", cost_st: 15, effects: [{ type: "damage_st", base_power: 80 }] },
  { id: "smash", name: "フルスイング", category: "attack", type: "physical", element: "none", cost_st: 20, effects: [{ type: "damage_st", base_power: 120 }, { type: "delay_gauge", value: 20 }] },
  { id: "pierce_needle", name: "どくばり（貫通）", category: "attack", type: "pierce", element: "none", cost_st: 30, effects: [{ type: "damage_hp_direct", base_power: 20 }] },
  { id: "fire_trap", name: "じらい（罠）", category: "trap", type: "trap", element: "fire", cost_st: 25, effects: [{ type: "add_status", status: "trap_fire" }] },
  { id: "def_shield", name: "シールド張", category: "defense", type: "buff", element: "none", cost_st: 15, effects: [{ type: "add_status", status: "buff_def_50" }] },
  { id: "def_heal_st", name: "深呼吸", category: "defense", type: "heal", element: "none", cost_st: 10, effects: [{ type: "recover_st_direct", value: 40 }] }
];

// モンスターベースデータ（味方用）
const MONSTERS_DATA = [
  { id: "m_001", name: "フレイムパピー", main_element: "fire", sub_element: "none", base_stats: {hp: 200, atk: 40, def: 30, mag: 20, spd: 25, max_st: 80, st_rec: 5}, skills: ["strike", "fireball"] },
  { id: "m_002", name: "アクアタートル", main_element: "water", sub_element: "earth", base_stats: {hp: 250, atk: 25, def: 50, mag: 15, spd: 10, max_st: 120, st_rec: 5}, skills: ["strike", "water_gun", "def_shield"] },
  { id: "m_003", name: "サンダーバード", main_element: "thunder", sub_element: "wind", base_stats: {hp: 150, atk: 30, def: 20, mag: 45, spd: 40, max_st: 70, st_rec: 15}, skills: ["strike", "smash"] },
  { id: "m_004", name: "ゴーレム", main_element: "earth", sub_element: "none", base_stats: {hp: 300, atk: 50, def: 60, mag: 5, spd: 5, max_st: 150, st_rec: 0}, skills: ["smash"] },
  { id: "m_005", name: "シャドウアサシン", main_element: "dark", sub_element: "none", base_stats: {hp: 120, atk: 60, def: 15, mag: 10, spd: 50, max_st: 50, st_rec: 10}, skills: ["strike", "pierce_needle"] },
  { id: "m_006", name: "ホーリーナイト", main_element: "light", sub_element: "fire", base_stats: {hp: 220, atk: 35, def: 40, mag: 30, spd: 20, max_st: 100, st_rec: 10}, skills: ["strike", "def_heal_st", "def_shield"] }
];

// 敵専用モンスターデータ（序盤向けにステータス低下・野生化）
const ENEMY_DATA = [
  { id: "e_001", name: "野生のパピー", main_element: "fire", sub_element: "none", base_stats: {hp: 60, atk: 20, def: 10, mag: 10, spd: 15, max_st: 30, st_rec: 5}, skills: ["strike"] },
  { id: "e_002", name: "野生のタートル", main_element: "water", sub_element: "earth", base_stats: {hp: 100, atk: 15, def: 30, mag: 5, spd: 5, max_st: 50, st_rec: 5}, skills: ["strike", "water_gun"] },
  { id: "e_003", name: "野生のバード", main_element: "thunder", sub_element: "wind", base_stats: {hp: 50, atk: 25, def: 10, mag: 20, spd: 30, max_st: 40, st_rec: 10}, skills: ["strike"] },
  { id: "e_boss_01", name: "【ボス】暴走ゴーレム", main_element: "earth", sub_element: "none", base_stats: {hp: 300, atk: 40, def: 50, mag: 5, spd: 10, max_st: 150, st_rec: 0}, skills: ["smash"] }
];

// バトル中に使用可能なアイテム（Inventoryから消費）
const BATTLE_ITEMS_DATA = [
  { id: "bitem_hp_potion", name: "キズぐすり", type: "item_battle", description: "味方のHPを50回復", effect: { type: "recover_hp", value: 50 } },
  { id: "bitem_st_potion", name: "スタミナドリンク", type: "item_battle", description: "味方のSTを50回復", effect: { type: "recover_st_direct", value: 50 } },
  { id: "bitem_bomb", name: "バクダン", type: "item_battle", description: "敵に30の防御無視ダメージ", effect: { type: "damage_hp_direct", value: 30 } }
];

// マップ画面で使用可能なアイテム（餌による恒久的なステータスアップ）
const MAP_ITEMS_DATA = [
  { id: "mitem_size_meat", name: "巨大な肉", type: "item_map", description: "大きさを+3（HP・ST大アップ、SPDダウン）", effect: { target_stat: "size", value: 3 } },
  { id: "mitem_hard_shell", name: "硬化の甲羅", type: "item_map", description: "硬さを+3（DEF・STアップ、SPD微減）", effect: { target_stat: "hardness", value: 3 } },
  { id: "mitem_weight_stone", name: "重力石", type: "item_map", description: "重さを+3（ATK・DEFアップ、SPDダウン）", effect: { target_stat: "weight", value: 3 } },
  { id: "mitem_smart_nut", name: "賢者の木の実", type: "item_map", description: "賢さを+3（MAG・SPDアップ、HPダウン）", effect: { target_stat: "smartness", value: 3 } }
];

export { AFFINITY, SKILLS, MONSTERS_DATA, ENEMY_DATA, BATTLE_ITEMS_DATA, MAP_ITEMS_DATA };
