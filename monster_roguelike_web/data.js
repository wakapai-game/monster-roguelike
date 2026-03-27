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
  { id: "m_001", name: "フレイムパピー", main_element: "fire", sub_element: "none", base_stats: {hp: 2000, atk: 40, def: 30, mag: 20, spd: 25, max_st: 100, st_rec: 5}, skills: ["strike", "fireball"] },
  { id: "m_002", name: "アクアタートル", main_element: "water", sub_element: "earth", base_stats: {hp: 2500, atk: 25, def: 50, mag: 15, spd: 10, max_st: 100, st_rec: 5}, skills: ["strike", "water_gun", "def_shield"] },
  { id: "m_003", name: "サンダーバード", main_element: "thunder", sub_element: "wind", base_stats: {hp: 1500, atk: 30, def: 20, mag: 45, spd: 40, max_st: 100, st_rec: 15}, skills: ["strike", "smash"] },
  { id: "m_004", name: "ゴーレム", main_element: "earth", sub_element: "none", base_stats: {hp: 3000, atk: 50, def: 60, mag: 5, spd: 30, max_st: 100, st_rec: 0}, skills: ["smash"] },
  { id: "m_005", name: "シャドウアサシン", main_element: "dark", sub_element: "none", base_stats: {hp: 1200, atk: 80, def: 50, mag: 10, spd: 50, max_st: 100, st_rec: 10}, skills: ["strike", "pierce_needle"] },
  { id: "m_006", name: "ホーリーナイト", main_element: "light", sub_element: "fire", base_stats: {hp: 2200, atk: 35, def: 40, mag: 30, spd: 20, max_st: 100, st_rec: 10}, skills: ["strike", "def_heal_st", "def_shield"] }
];

// 敵専用モンスターデータ（序盤向けにステータス低下・野生化）
const ENEMY_DATA = [
  { id: "e_001", name: "野生のパピー", main_element: "fire", sub_element: "none", base_stats: {hp: 600, atk: 20, def: 10, mag: 10, spd: 15, max_st: 100, st_rec: 5}, skills: ["strike"] },
  { id: "e_002", name: "野生のタートル", main_element: "water", sub_element: "earth", base_stats: {hp: 1000, atk: 15, def: 30, mag: 5, spd: 5, max_st: 100, st_rec: 5}, skills: ["strike", "water_gun"] },
  { id: "e_003", name: "野生のバード", main_element: "thunder", sub_element: "wind", base_stats: {hp: 500, atk: 25, def: 10, mag: 20, spd: 30, max_st: 100, st_rec: 10}, skills: ["strike"] },
  { id: "e_boss_01", name: "【ボス】暴走ゴーレム", main_element: "earth", sub_element: "none", base_stats: {hp: 3000, atk: 40, def: 50, mag: 5, spd: 30, max_st: 100, st_rec: 0}, skills: ["smash"] }
];

// チュートリアル専用敵（ice属性でfireballがバツグン、ST高めでST削り体験用、st_rec:0でブレイクしやすい）
const TUTORIAL_ENEMY = { id: "e_tutorial", name: "修行用ダミー", main_element: "ice", sub_element: "none", base_stats: {hp: 3000, atk: 12, def: 45, mag: 55, spd: 8, max_st: 100, st_rec: 0}, skills: ["strike"] };

// バトル中に使用可能なアイテム（Inventoryから消費）
const BATTLE_ITEMS_DATA = [
  { id: "bitem_hp_potion", name: "キズぐすり", type: "item_battle", description: "味方のHPを50回復", effect: { type: "recover_hp", value: 50 } },
  { id: "bitem_st_potion", name: "スタミナドリンク", type: "item_battle", description: "味方のSTを50回復", effect: { type: "recover_st_direct", value: 50 } },
  { id: "bitem_bomb", name: "バクダン", type: "item_battle", description: "敵に30の防御無視ダメージ", effect: { type: "damage_hp_direct", value: 30 } }
];

// えさ（モンスターに与えられる、最大10回まで。ベースステータスと大きさ・賢さを直接変動させる）
// effect.base_stats: ベースステータスへの加算値
// effect.params: params（size / intelligence）への加算値
const FOOD_DATA = [
  {
    id: "food_01", name: "たっぷりの肉", type: "food",
    description: "HP+2 ST+10 攻+1 防+1 大きさ+1 速-1",
    effect: { base_stats: { hp: 2, max_st: 10, atk: 1, def: 1, spd: -1 }, params: { size: 1 } }
  },
  {
    id: "food_02", name: "巨大な肉", type: "food",
    description: "HP+1 ST+20 攻+1 防+1 大きさ+1 速-1",
    effect: { base_stats: { hp: 1, max_st: 20, atk: 1, def: 1, spd: -1 }, params: { size: 1 } }
  },
  {
    id: "food_03", name: "戦士の肉", type: "food",
    description: "HP+1 ST+10 攻+2 防+1 大きさ+1 速-1",
    effect: { base_stats: { hp: 1, max_st: 10, atk: 2, def: 1, spd: -1 }, params: { size: 1 } }
  },
  {
    id: "food_04", name: "鎧の肉", type: "food",
    description: "HP+1 ST+10 攻+1 防+2 大きさ+1 速-1",
    effect: { base_stats: { hp: 1, max_st: 10, atk: 1, def: 2, spd: -1 }, params: { size: 1 } }
  },
  {
    id: "food_05", name: "賢者のキノコ", type: "food",
    description: "魔力+2 速-1 賢さ+1",
    effect: { base_stats: { mag: 2, spd: -1 }, params: { intelligence: 1 } }
  },
  {
    id: "food_06", name: "軽量フルーツ", type: "food",
    description: "HP-2 ST-5 攻-1 防-1 大きさ-1 速+1",
    effect: { base_stats: { hp: -2, max_st: -5, atk: -1, def: -1, spd: 1 }, params: { size: -1 } }
  },
  {
    id: "food_07", name: "絞りジュース", type: "food",
    description: "HP-1 ST-10 攻-1 防-1 大きさ-1 速+1",
    effect: { base_stats: { hp: -1, max_st: -10, atk: -1, def: -1, spd: 1 }, params: { size: -1 } }
  },
  {
    id: "food_08", name: "研ぎすまし果実", type: "food",
    description: "HP-1 ST-5 攻-2 防-1 大きさ-1 速+1",
    effect: { base_stats: { hp: -1, max_st: -5, atk: -2, def: -1, spd: 1 }, params: { size: -1 } }
  },
  {
    id: "food_09", name: "機動の実", type: "food",
    description: "HP-1 ST-5 攻-1 防-2 大きさ-1 速+1",
    effect: { base_stats: { hp: -1, max_st: -5, atk: -1, def: -2, spd: 1 }, params: { size: -1 } }
  }
];

export { AFFINITY, SKILLS, MONSTERS_DATA, ENEMY_DATA, BATTLE_ITEMS_DATA, FOOD_DATA, TUTORIAL_ENEMY };
