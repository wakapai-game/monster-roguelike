// 8属性の相性表
const AFFINITY = {
  "fire":    { "fire": 1.0, "water": 0.5, "ice": 2.0, "thunder": 1.0, "earth": 1.0, "wind": 2.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "water":   { "fire": 2.0, "water": 1.0, "ice": 1.0, "thunder": 0.5, "earth": 2.0, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "ice":     { "fire": 0.5, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 2.0, "wind": 2.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "thunder": { "fire": 1.0, "water": 2.0, "ice": 2.0, "thunder": 1.0, "earth": 0.5, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "earth":   { "fire": 2.0, "water": 0.5, "ice": 0.5, "thunder": 2.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "wind":    { "fire": 0.5, "water": 2.0, "ice": 0.5, "thunder": 2.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 },
  "light":   { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 2.0, "none": 1.0 },
  "dark":    { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 2.0, "dark": 1.0, "none": 1.0 },
  "none":    { "fire": 1.0, "water": 1.0, "ice": 1.0, "thunder": 1.0, "earth": 1.0, "wind": 1.0, "light": 1.0, "dark": 1.0, "none": 1.0 }
};

// ─── ワザギア（スキル）定義 ───────────────────────────────────────────
const TECH_PARTS = [
  { id: "tp_strike",       name: "タイアタリ・ユニット",    element: "none",    category: "attack",  type: "physical", cost_en: 10, effects: [{ type: "damage_en", base_power: 50 }],   description: "基本物理攻撃ユニット。敵のENを削る。" },
  { id: "tp_fireball",     name: "ファイアボール・ノズル",  element: "fire",    category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "damage_en", base_power: 80 }],   description: "炎属性の魔法砲。弱点の敵に大ダメージ。" },
  { id: "tp_water_gun",    name: "ウォーターガン・ポンプ",  element: "water",   category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "damage_en", base_power: 80 }],   description: "水属性の高圧噴射。" },
  { id: "tp_thunder_bolt", name: "サンダーボルト・コイル",  element: "thunder", category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "damage_en", base_power: 80 }],   description: "雷属性の放電攻撃。" },
  { id: "tp_smash",        name: "フルスイング・アーム",    element: "none",    category: "attack",  type: "physical", cost_en: 20, effects: [{ type: "damage_en", base_power: 120 }, { type: "delay_gauge", value: 20 }], description: "強力な一撃。次の行動が遅れる。" },
  { id: "tp_pierce",       name: "貫通ニードル・ユニット",  element: "none",    category: "attack",  type: "pierce",   cost_en: 30, effects: [{ type: "damage_hp_direct", base_power: 20 }], description: "ENを無視してHPに直接20ダメージ。" },
  { id: "tp_shield",       name: "シールド・ジェネレータ",  element: "none",    category: "defense", type: "buff",     cost_en: 15, effects: [{ type: "add_status", status: "buff_def_50" }], description: "DEFを高めるバフを付与。" },
  { id: "tp_charge",       name: "エネルギー充填ユニット",  element: "none",    category: "defense", type: "heal",     cost_en: 10, effects: [{ type: "recover_en_direct", value: 40 }], description: "自分のENを40回復。" },
  { id: "tp_power_up",     name: "出力ブースター",          element: "none",    category: "support", type: "buff",     cost_en: 15, effects: [{ type: "buff_stat", stat: "atk", mult: 1.5, target: "self", turns: 2 }], description: "ATKを1.5倍に強化（2ターン）。" },
  { id: "tp_guard_up",     name: "防御強化ユニット",        element: "none",    category: "support", type: "buff",     cost_en: 15, effects: [{ type: "buff_stat", stat: "def", mult: 1.5, target: "self", turns: 2 }], description: "DEFを1.5倍に強化（2ターン）。" },
  { id: "tp_weaken",       name: "弱体化ビーム",            element: "none",    category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "buff_stat", stat: "def", mult: 0.6, target: "enemy", turns: 2 }], description: "敵のDEFを0.6倍に低下（2ターン）。" },
  { id: "tp_slow",         name: "スロウ・パルス",          element: "none",    category: "attack",  type: "magic",    cost_en: 20, effects: [{ type: "delay_gauge", value: 50 }, { type: "buff_stat", stat: "atk", mult: 0.7, target: "enemy", turns: 2 }], description: "敵の行動ゲージを50削り、ATKを低下。" },
  { id: "tp_ice_shot",     name: "アイスショット・ノズル",  element: "ice",     category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "damage_en", base_power: 80 }],   description: "氷属性の冷凍砲。" },
  { id: "tp_wind_blade",   name: "ウィンドブレード・ファン",element: "wind",    category: "attack",  type: "magic",    cost_en: 15, effects: [{ type: "damage_en", base_power: 80 }],   description: "風属性の回転刃。" },
];

// ─── ボディギア（ステータス変動・デメリットあり）───────────────────────
const STAT_PARTS = [
  { id: "sp_heavy_armor",   name: "ヘビーアーマー",    description: "HP+500 DEF+20 SPD-10",  bonus: { hp: 500, def: 20 },      penalty: { spd: -10 } },
  { id: "sp_power_core",    name: "パワーコア",        description: "ATK+20 DEF-10",          bonus: { atk: 20 },               penalty: { def: -10 } },
  { id: "sp_speed_booster", name: "スピードブースター",description: "SPD+15 HP-200",           bonus: { spd: 15 },               penalty: { hp: -200 } },
  { id: "sp_en_tank",       name: "ENタンク",          description: "EN+50 SPD-5",             bonus: { max_en: 50 },            penalty: { spd: -5 } },
  { id: "sp_mag_amp",       name: "魔力増幅器",        description: "MAG+20 HP-150",           bonus: { mag: 20 },               penalty: { hp: -150 } },
  { id: "sp_reactive_shield",name: "リアクティブシールド",description: "DEF+15 ATK-10",        bonus: { def: 15 },               penalty: { atk: -10 } },
  { id: "sp_overclocked",   name: "オーバークロック",  description: "SPD+20 ATK+10 DEF-20",   bonus: { spd: 20, atk: 10 },      penalty: { def: -20 } },
  { id: "sp_bulk_frame",    name: "バルクフレーム",    description: "HP+300 DEF+10 SPD-8",    bonus: { hp: 300, def: 10 },      penalty: { spd: -8 } },
];

// ─── コアギア（特殊パッシブ×1スロット）──────────────────────────
const OPTION_PARTS = [
  { id: "op_auto_repair",  name: "自動修復ユニット",    description: "毎ターンHP+30回復",         effect: { type: "regen_hp", value: 30 } },
  { id: "op_float",        name: "浮遊ブースター",      description: "地属性ダメージを無効",       effect: { type: "immune_element", element: "earth" } },
  { id: "op_en_regen",     name: "EN自動充電",          description: "毎ターンEN+10回復",          effect: { type: "regen_en", value: 10 } },
  { id: "op_purge_guard",  name: "パージガード",        description: "自動パージを1回無効",        effect: { type: "purge_guard" } },
  { id: "op_berserker",    name: "バーサーカーモード",  description: "HP50%以下でATK+50%",         effect: { type: "low_hp_atk_boost", threshold: 0.5, mult: 1.5 } },
  { id: "op_en_absorb",    name: "エネルギー吸収",      description: "攻撃命中時にEN+5回復",       effect: { type: "on_hit_en_recover", value: 5 } },
];

// ─── ビルガマタボディデータ（味方ユニット本体）──────────────────────────────
const KARAKURI_DATA = [
  { id: "k_001", name: "ガタ",   main_element: "fire",    sub_element: "none",    description: "ネジ町の工房で作られた標準型。なぜかいつも不機嫌そうな顔をしている。",         base_stats: { hp: 1800, atk: 40, def: 35, mag: 20, spd: 30, max_en: 150, en_rec: 5 },  default_tech: ["tp_strike", "tp_fireball"] },
  { id: "k_002", name: "ドボン", main_element: "water",   sub_element: "earth",   description: "ずんぐりとした重装型。よく転ぶが気にしていない様子。",                         base_stats: { hp: 2500, atk: 35, def: 100, mag: 15, spd: 20, max_en: 150, en_rec: 5 }, default_tech: ["tp_strike", "tp_water_gun", "tp_shield"] },
  { id: "k_003", name: "ピリカ", main_element: "thunder", sub_element: "wind",    description: "高速型の小型ビルガマタ。頭のアンテナが常にビリビリしている。",                   base_stats: { hp: 1400, atk: 30, def: 30, mag: 45, spd: 45, max_en: 150, en_rec: 15 }, default_tech: ["tp_strike", "tp_thunder_bolt"] },
  { id: "k_004", name: "ゴロタ", main_element: "earth",   sub_element: "none",    description: "岩のように頑丈な重量型。動くたびに床がへこむ。",                               base_stats: { hp: 3000, atk: 50, def: 60, mag: 5,  spd: 20, max_en: 150, en_rec: 0 },  default_tech: ["tp_strike", "tp_smash", "tp_guard_up"] },
  { id: "k_005", name: "クロミ", main_element: "dark",    sub_element: "none",    description: "影のように動く暗殺型。何かをずっとつぶやいている。",                             base_stats: { hp: 1200, atk: 80, def: 50, mag: 10, spd: 50, max_en: 150, en_rec: 10 }, default_tech: ["tp_strike", "tp_pierce"] },
  { id: "k_006", name: "ピカリ", main_element: "light",   sub_element: "fire",    description: "ぴかぴか光るサポート型。眩しすぎて仲間からも嫌がられている。",                   base_stats: { hp: 2200, atk: 40, def: 45, mag: 30, spd: 20, max_en: 150, en_rec: 10 }, default_tech: ["tp_strike", "tp_charge", "tp_shield"] },
  { id: "k_007", name: "コゴリ", main_element: "ice",     sub_element: "water",   description: "触れるとひんやりする耐久型。いつも少し眠そう。",                                 base_stats: { hp: 1800, atk: 35, def: 50, mag: 40, spd: 25, max_en: 150, en_rec: 5 },  default_tech: ["tp_strike", "tp_guard_up", "tp_charge"] },
  { id: "k_008", name: "フワリ", main_element: "wind",    sub_element: "thunder", description: "なぜか常に少し浮いている謎のビルガマタ。重力を舐めている。",                       base_stats: { hp: 1400, atk: 30, def: 25, mag: 50, spd: 55, max_en: 150, en_rec: 10 }, default_tech: ["tp_strike", "tp_slow", "tp_weaken"] },
];

// ─── ジュウマデータ（敵）────────────────────────────────────────────────
const JUMA_DATA = [
  { id: "j_001", name: "ランタン",   main_element: "fire",    sub_element: "none",    base_stats: { hp: 700,  atk: 25, def: 15, mag: 10, spd: 20, max_en: 100, en_rec: 3 }, tech: ["tp_strike", "tp_fireball"],                drop: { material_id: "mat_fire_core",     rate: 0.7 } },
  { id: "j_002", name: "マッド",     main_element: "water",   sub_element: "earth",   base_stats: { hp: 1200, atk: 18, def: 45, mag: 5,  spd: 8,  max_en: 100, en_rec: 5 }, tech: ["tp_strike", "tp_water_gun", "tp_shield"],  drop: { material_id: "mat_water_gel",     rate: 0.7 } },
  { id: "j_003", name: "サニー",     main_element: "thunder", sub_element: "wind",    base_stats: { hp: 480,  atk: 28, def: 8,  mag: 22, spd: 35, max_en: 100, en_rec: 8 }, tech: ["tp_strike", "tp_thunder_bolt"],            drop: { material_id: "mat_thunder_chip",  rate: 0.7 } },
  { id: "j_004", name: "フロスト",   main_element: "ice",     sub_element: "water",   base_stats: { hp: 900,  atk: 20, def: 30, mag: 30, spd: 18, max_en: 110, en_rec: 4 }, tech: ["tp_strike", "tp_charge", "tp_slow"],       drop: { material_id: "mat_ice_crystal",   rate: 0.7 } },
  { id: "j_005", name: "シルフ",     main_element: "wind",    sub_element: "thunder", base_stats: { hp: 600,  atk: 30, def: 10, mag: 35, spd: 45, max_en: 110, en_rec: 6 }, tech: ["tp_strike", "tp_weaken", "tp_thunder_bolt"],drop: { material_id: "mat_wind_feather",  rate: 0.7 } },
  { id: "j_006", name: "あかり",     main_element: "light",   sub_element: "fire",    base_stats: { hp: 1000, atk: 32, def: 28, mag: 28, spd: 22, max_en: 120, en_rec: 5 }, tech: ["tp_strike", "tp_power_up", "tp_fireball"], drop: { material_id: "mat_light_shard",   rate: 0.7 } },
  { id: "j_007", name: "ミスト",     main_element: "dark",    sub_element: "none",    base_stats: { hp: 750,  atk: 40, def: 12, mag: 38, spd: 38, max_en: 120, en_rec: 6 }, tech: ["tp_strike", "tp_weaken", "tp_slow"],       drop: { material_id: "mat_dark_fragment", rate: 0.7 } },
  { id: "j_boss_01", name: "タロ",   main_element: "earth",   sub_element: "none",    base_stats: { hp: 3500, atk: 45, def: 55, mag: 5,  spd: 25, max_en: 120, en_rec: 0 }, tech: ["tp_strike", "tp_smash", "tp_power_up"],    drop: { material_id: "mat_earth_ore",     rate: 1.0 } },
];

// Battle1用: 練習台。超低速・ENが少なくすぐパージが起きる
const TUTORIAL_JUMA_1 = {
  id: "j_tutorial_1", name: "おためしジュウマ",
  main_element: "none", sub_element: "none",
  base_stats: { hp: 120, atk: 8, def: 25, mag: 15, spd: 5, max_en: 30, en_rec: 0 },
  tech: ["tp_strike"], drop: null
};

// Battle2用: 反撃してくる相手。風属性・SPD高めで防御フェーズが確実に発生
const TUTORIAL_JUMA_2 = {
  id: "j_tutorial_2", name: "かぜのジュウマ",
  main_element: "wind", sub_element: "none",
  base_stats: { hp: 200, atk: 22, def: 5, mag: 80, spd: 22, max_en: 80, en_rec: 0 },
  tech: ["tp_strike", "tp_wind_blade"], drop: null
};

// Boss用: EN削り特化。氷属性（ガタ=火で弱点）・プレイヤーのEN切れ→パージを誘発
const TUTORIAL_BOSS_JUMA = {
  id: "j_tutorial_boss", name: "おためしジュウマ・改",
  main_element: "ice", sub_element: "none",
  base_stats: { hp: 1000, atk: 30, def: 8, mag: 35, spd: 20, max_en: 120, en_rec: 5 },
  tech: ["tp_water_gun", "tp_strike", "tp_slow", "tp_weaken"], drop: null
};

// 旧互換エイリアス
const TUTORIAL_JUMA = TUTORIAL_JUMA_1;

// ─── 素材データ ────────────────────────────────────────────────────────
const MATERIAL_DATA = [
  { id: "mat_fire_core",     name: "ランタンの炎コア",    element: "fire",    description: "ランタンの体内にある燃え続ける核。触ると熱い。" },
  { id: "mat_water_gel",     name: "マッドのドロゲル",    element: "water",   description: "マッドの体から採れるぬるぬるしたゲル状物質。" },
  { id: "mat_thunder_chip",  name: "サニーの電気チップ",  element: "thunder", description: "サニーから取り出した小さな電気石。静電気注意。" },
  { id: "mat_ice_crystal",   name: "フロストの氷晶",      element: "ice",     description: "フロストの体の一部。常温でも溶けない不思議な氷。" },
  { id: "mat_wind_feather",  name: "シルフの風羽根",      element: "wind",    description: "シルフが落とした羽根。持つとふわっと浮く感じがする。" },
  { id: "mat_light_shard",   name: "あかりの光かけら",    element: "light",   description: "あかりの体から溢れる光の欠片。暗所でぼんやり光る。" },
  { id: "mat_dark_fragment", name: "ミストの闇片",        element: "dark",    description: "ミストの体から剥がれた闇の断片。見つめると吸い込まれそう。" },
  { id: "mat_earth_ore",     name: "タロの大地鉱石",      element: "earth",   description: "タロが落とした重い鉱石。とても重い。本当に重い。" },
  { id: "mat_scrap",         name: "ガラクタ部品",        element: "none",    description: "どこかで拾ったガラクタ。何かに使えるかも。" },
];

// ─── 合成レシピ ────────────────────────────────────────────────────────
const SYNTHESIS_RECIPES = [
  { result_id: "tp_fireball",      result_type: "tech",   result_name: "ファイアボール・ノズル",   ingredients: [{ material_id: "mat_fire_core",     count: 2 }] },
  { result_id: "tp_water_gun",     result_type: "tech",   result_name: "ウォーターガン・ポンプ",   ingredients: [{ material_id: "mat_water_gel",     count: 2 }] },
  { result_id: "tp_thunder_bolt",  result_type: "tech",   result_name: "サンダーボルト・コイル",   ingredients: [{ material_id: "mat_thunder_chip",  count: 2 }] },
  { result_id: "tp_ice_shot",      result_type: "tech",   result_name: "アイスショット・ノズル",   ingredients: [{ material_id: "mat_ice_crystal",   count: 2 }] },
  { result_id: "tp_wind_blade",    result_type: "tech",   result_name: "ウィンドブレード・ファン", ingredients: [{ material_id: "mat_wind_feather",  count: 2 }] },
  { result_id: "tp_pierce",        result_type: "tech",   result_name: "貫通ニードル・ユニット",   ingredients: [{ material_id: "mat_dark_fragment", count: 2 }] },
  { result_id: "tp_smash",         result_type: "tech",   result_name: "フルスイング・アーム",     ingredients: [{ material_id: "mat_earth_ore",     count: 2 }] },
  { result_id: "tp_charge",        result_type: "tech",   result_name: "エネルギー充填ユニット",   ingredients: [{ material_id: "mat_light_shard",   count: 2 }] },
  { result_id: "sp_heavy_armor",   result_type: "stat",   result_name: "ヘビーアーマー",           ingredients: [{ material_id: "mat_earth_ore",     count: 3 }] },
  { result_id: "sp_power_core",    result_type: "stat",   result_name: "パワーコア",               ingredients: [{ material_id: "mat_fire_core",     count: 3 }] },
  { result_id: "sp_speed_booster", result_type: "stat",   result_name: "スピードブースター",       ingredients: [{ material_id: "mat_wind_feather",  count: 3 }] },
  { result_id: "sp_en_tank",       result_type: "stat",   result_name: "ENタンク",                 ingredients: [{ material_id: "mat_thunder_chip",  count: 3 }] },
  { result_id: "sp_mag_amp",       result_type: "stat",   result_name: "魔力増幅器",               ingredients: [{ material_id: "mat_light_shard",   count: 3 }] },
  { result_id: "op_auto_repair",   result_type: "option", result_name: "自動修復ユニット",         ingredients: [{ material_id: "mat_water_gel",     count: 3 }, { material_id: "mat_light_shard",   count: 1 }] },
  { result_id: "op_float",         result_type: "option", result_name: "浮遊ブースター",           ingredients: [{ material_id: "mat_wind_feather",  count: 3 }, { material_id: "mat_scrap",        count: 2 }] },
  { result_id: "op_en_regen",      result_type: "option", result_name: "EN自動充電",               ingredients: [{ material_id: "mat_thunder_chip",  count: 3 }, { material_id: "mat_scrap",        count: 2 }] },
  { result_id: "op_purge_guard",   result_type: "option", result_name: "パージガード",             ingredients: [{ material_id: "mat_earth_ore",     count: 2 }, { material_id: "mat_dark_fragment", count: 2 }] },
  { result_id: "op_berserker",     result_type: "option", result_name: "バーサーカーモード",       ingredients: [{ material_id: "mat_fire_core",     count: 2 }, { material_id: "mat_dark_fragment", count: 2 }] },
];

// ─── バトルアイテム ────────────────────────────────────────────────────
const BATTLE_ITEMS_DATA = [
  { id: "bitem_hp_potion", name: "修理キット",   type: "item_battle", description: "ビルガマタのHPを500回復",   effect: { type: "recover_hp", value: 500 } },
  { id: "bitem_en_potion", name: "エネルギー缶", type: "item_battle", description: "ビルガマタのENを50回復",    effect: { type: "recover_en_direct", value: 50 } },
  { id: "bitem_bomb",      name: "バクダン",      type: "item_battle", description: "敵に30の防御無視ダメージ",effect: { type: "damage_hp_direct", value: 30 } }
];

// ─── クエストデータ ────────────────────────────────────────────────────
const QUEST_DATA = [
  {
    id: "q_001",
    title: "ネジ町のガラクタ騒動",
    description: "町の倉庫にジュウマが入り込んだらしい。追い払ってほしい。依頼人のおじさんは「なんか大きいのもいる」と言っていた。",
    client: "倉庫のおじさん",
    stage: 1,
    clear_condition: { type: "defeat_boss", juma_id: "j_boss_01" },
    reward: { materials: [{ material_id: "mat_scrap", count: 3 }], karakuri_body_id: null }
  },
  {
    id: "q_002",
    title: "燃えるジュウマを捕まえろ",
    description: "畑に火属性のジュウマが出た。農家が困っている。なぜか踊っているらしい。",
    client: "農家のおばさん",
    stage: 1,
    clear_condition: { type: "defeat_count", count: 3, element: "fire" },
    reward: { materials: [{ material_id: "mat_fire_core", count: 2 }], karakuri_body_id: "k_001" }
  },
];

// 旧互換エイリアス（ui/以下のファイルが参照）
const MONSTERS_DATA  = KARAKURI_DATA;
const ENEMY_DATA     = JUMA_DATA;
const TUTORIAL_ENEMY      = TUTORIAL_JUMA;
const TUTORIAL_BOSS_ENEMY = TUTORIAL_BOSS_JUMA;
const SKILLS         = TECH_PARTS;
const FOOD_DATA      = [];  // えさシステム廃止（ギア合成に移行）

export {
  AFFINITY, TECH_PARTS, STAT_PARTS, OPTION_PARTS,
  KARAKURI_DATA, JUMA_DATA, TUTORIAL_JUMA, TUTORIAL_JUMA_1, TUTORIAL_JUMA_2, TUTORIAL_BOSS_JUMA,
  MATERIAL_DATA, SYNTHESIS_RECIPES, BATTLE_ITEMS_DATA, QUEST_DATA,
  // 旧互換エイリアス
  MONSTERS_DATA, ENEMY_DATA, TUTORIAL_ENEMY, TUTORIAL_BOSS_ENEMY, SKILLS, FOOD_DATA
};
