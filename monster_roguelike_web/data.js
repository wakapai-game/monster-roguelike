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
  { id: "strike", name: "たいあたり", description: "物理攻撃。敵のSTを削る基本技。", category: "attack", type: "physical", element: "none", cost_st: 10, effects: [{ type: "damage_st", base_power: 50 }] },
  { id: "fireball", name: "ファイアボール", description: "炎属性の魔法。弱点の敵にはSTもHPへの溢れも大ダメージ。", category: "attack", type: "magic", element: "fire", cost_st: 15, effects: [{ type: "damage_st", base_power: 80 }] },
  { id: "water_gun", name: "みずでっぽう", description: "水属性の魔法。弱点の敵にはSTもHPへの溢れも大ダメージ。", category: "attack", type: "magic", element: "water", cost_st: 15, effects: [{ type: "damage_st", base_power: 80 }] },
  { id: "thunder_bolt", name: "サンダーボルト", description: "雷属性の魔法。弱点の敵にはSTもHPへの溢れも大ダメージ。", category: "attack", type: "magic", element: "thunder", cost_st: 15, effects: [{ type: "damage_st", base_power: 80 }] },
  { id: "smash", name: "フルスイング", description: "強力な物理攻撃。STを大きく削るが、次の行動が遅れる。", category: "attack", type: "physical", element: "none", cost_st: 20, effects: [{ type: "damage_st", base_power: 120 }, { type: "delay_gauge", value: 20 }] },
  { id: "pierce_needle", name: "どくばり（貫通）", description: "STを無視して敵HPに直接20ダメージを与える貫通攻撃。", category: "attack", type: "pierce", element: "none", cost_st: 30, effects: [{ type: "damage_hp_direct", base_power: 20 }] },
  { id: "fire_trap", name: "じらい（罠）", description: "炎の罠を仕掛ける。敵の次の攻撃時に発動する。", category: "trap", type: "trap", element: "fire", cost_st: 25, effects: [{ type: "add_status", status: "trap_fire" }] },
  { id: "def_shield", name: "シールド張", description: "DEFを高めるバフを自身に付与する防御技。", category: "defense", type: "buff", element: "none", cost_st: 15, effects: [{ type: "add_status", status: "buff_def_50" }] },
  { id: "def_heal_st", name: "深呼吸", description: "自分のSTを40回復。ST切れを防ぎHPへの溢れを抑える。", category: "defense", type: "heal", element: "none", cost_st: 10, effects: [{ type: "recover_st_direct", value: 40 }] },
  // バフ技（自分強化）
  { id: "power_up", name: "気合い", description: "自分のATKを1.5倍に強化（2ターン）。攻撃前に使うと効果的。", category: "support", type: "buff", element: "none", cost_st: 15, effects: [{ type: "buff_stat", stat: "atk", mult: 1.5, target: "self", turns: 2 }] },
  { id: "guard_up", name: "硬化", description: "自分のDEFを1.5倍に強化（2ターン）。被ダメージを抑えられる。", category: "support", type: "buff", element: "none", cost_st: 15, effects: [{ type: "buff_stat", stat: "def", mult: 1.5, target: "self", turns: 2 }] },
  // デバフ技（敵弱体化）
  { id: "weaken", name: "弱体化", description: "敵のDEFを0.6倍に低下（2ターン）。攻撃ダメージが増える。", category: "attack", type: "magic", element: "none", cost_st: 15, effects: [{ type: "buff_stat", stat: "def", mult: 0.6, target: "enemy", turns: 2 }] },
  { id: "slow", name: "スロウ", description: "敵の行動ゲージを50削り、ATKを0.7倍に低下（2ターン）。", category: "attack", type: "magic", element: "none", cost_st: 20, effects: [{ type: "delay_gauge", value: 50 }, { type: "buff_stat", stat: "atk", mult: 0.7, target: "enemy", turns: 2 }] }
];

// モンスターベースデータ（味方用）
const MONSTERS_DATA = [
  { id: "m_001", name: "ランタン", main_element: "fire", sub_element: "none", base_stats: {hp: 2000, atk: 40, def: 35, mag: 20, spd: 30, max_st: 150, st_rec: 5}, skills: ["strike", "fireball"] },
  { id: "m_002", name: "マッド", main_element: "water", sub_element: "earth", base_stats: {hp: 2500, atk: 35, def: 100, mag: 15, spd: 26, max_st: 150, st_rec: 5}, skills: ["strike", "water_gun", "def_shield"] },
  { id: "m_003", name: "サニー", main_element: "thunder", sub_element: "wind", base_stats: {hp: 1500, atk: 30, def: 35, mag: 45, spd: 40, max_st: 150, st_rec: 15}, skills: ["strike", "thunder_bolt"] },
  { id: "m_004", name: "タロ", main_element: "earth", sub_element: "none", base_stats: {hp: 3000, atk: 50, def: 60, mag: 5, spd: 30, max_st: 150, st_rec: 0}, skills: ["smash"] },
  { id: "m_005", name: "ミスト", main_element: "dark", sub_element: "none", base_stats: {hp: 1200, atk: 80, def: 50, mag: 10, spd: 50, max_st: 150, st_rec: 10}, skills: ["strike", "pierce_needle"] },
  { id: "m_006", name: "あかり", main_element: "light", sub_element: "fire", base_stats: {hp: 2200, atk: 40, def: 45, mag: 30, spd: 20, max_st: 150, st_rec: 10}, skills: ["strike", "def_heal_st", "def_shield"] }
];

// 敵専用モンスターデータ（序盤向けにステータス低下・野生化）
const ENEMY_DATA = [
  { id: "e_001", name: "ヒカラ", main_element: "fire", sub_element: "none", base_stats: {hp: 700, atk: 25, def: 15, mag: 10, spd: 20, max_st: 100, st_rec: 3}, skills: ["strike", "fireball"] },
  { id: "e_002", name: "ドロカラ", main_element: "water", sub_element: "earth", base_stats: {hp: 1200, atk: 18, def: 45, mag: 5, spd: 8, max_st: 100, st_rec: 5}, skills: ["strike", "water_gun"] },
  { id: "e_003", name: "ライカラ", main_element: "thunder", sub_element: "wind", base_stats: {hp: 480, atk: 28, def: 8, mag: 22, spd: 35, max_st: 100, st_rec: 8}, skills: ["strike", "thunder_bolt"] },
  { id: "e_boss_01", name: "ダイカラ", main_element: "earth", sub_element: "none", base_stats: {hp: 3500, atk: 45, def: 55, mag: 5, spd: 25, max_st: 120, st_rec: 0}, skills: ["smash"] }
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
