# karakuri_web — プロジェクト設計書

> 最終更新: 2026-05-06

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [ファイル構成](#2-ファイル構成)
3. [アーキテクチャ](#3-アーキテクチャ)
4. [画面構成と遷移](#4-画面構成と遷移)
5. [バトルシステム](#5-バトルシステム)
6. [データ定義](#6-データ定義)
7. [UIシステム](#7-uiシステム)
8. [開発・テストツール](#8-開発テストツール)
9. [制約・規約](#9-制約規約)

---

## 1. プロジェクト概要

**ビルガ・マタ（Monster Rogue: Web Edition）**

カラクリ（機械生命体）を育てジュウマと戦う、ATBターン制ローグライクRPG。
ビルドフラメーワーク不使用の純粋Web実装（ES Modules + Canvas）。

### コアコンセプト

| 要素 | 内容 |
|------|------|
| **ENシステム** | エネルギーを使い切るとパージ（ギア剥落）→ ステータス低下スパイラル |
| **ATBタイムライン** | SPD依存のゲージ制。行動順を見ながら判断する戦術性 |
| **属性相性** | 9属性 × 相性表。弱点突きで最大4.0倍ダメージ |
| **ギアビルド** | ワザ・ボディ・コアの3種スロットでカスタマイズ |
| **ローグライク** | マップノード探索 → 報酬選択 → 次ステージ |

### 技術スタック

- **言語**: JavaScript（ES Modules）、HTML5、CSS3
- **描画**: Canvas API（スプライト・エフェクト・背景）
- **データ永続化**: localStorage（セーブ/ロード）
- **パッケージ管理**: なし（npm/バンドラー不使用）
- **エントリポイント**: `index.html` → `<script type="module" src="app.js">`

---

## 2. ファイル構成

```
karakuri_web/
├── index.html              # ゲームコンテナ（全画面のHTMLを含む）
├── app.js                  # 画面遷移・ゲームループ統合制御
├── game.js                 # Karakuri / Timeline クラス定義
├── state.js                # グローバル状態（appState）
├── data.js                 # ゲームデータ定義（モンスター・技・ギア）
├── map.js                  # マップジェネレータ
├── persistence.js          # セーブ/ロード（localStorage）
├── test-engines.js         # バトルエンジン実装（4パターン）
├── title-art.js            # タイトルロゴ Canvas 描画
├── styles.css              # 全スタイル定義
├── design_context.md       # UI設計の補足メモ（CSS変数・ID依存）
├── DESIGN.md               # 本設計書
├── title_logo.png          # タイトルロゴ画像
├── ui/
│   ├── dom.js              # DOM要素セレクタ集約
│   ├── battle.js           # バトル画面UIロジック
│   ├── inventory.js        # パーティ・持ち物画面
│   ├── map-render.js       # マップ描画・戦利品UI
│   ├── gear-deck.js        # ギアデッキUI（ワザ/ボディ/コア統合）
│   ├── presentation.js     # スライドプレゼン（5枚）
│   ├── tutorial.js         # チュートリアルシステム
│   ├── help.js             # ヘルプ・属性相性表・用語集
│   ├── encyclopedia.js     # 図鑑（ビルガマタ・ジュウマ・技・アイテム）
│   ├── sprite-generator.js # キャラスプライト生成（procedural）
│   ├── effects.js          # 攻撃エフェクト・ダメージポップアップ
│   ├── start-scene.js      # タイトル画面モンスターパレード
│   ├── bgm.js              # BGM/SE管理
│   ├── dev-overlay.js      # デバッグオーバーレイ（常時表示）
│   └── battle-test/
│       ├── index.js        # テストモード統合
│       ├── setup-ui.js     # テスト設定UI
│       ├── headless.js     # ヘッドレステスト（確率計算）
│       └── live-overlay.js # リアルタイムテストオーバーレイ
└── docs/
    └── plans/
        └── 2026-04-26-tutorial-party-rebuild.md
```

---

## 3. アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────┐
│  app.js（画面遷移・ゲームフロー制御）         │
├─────────────────────────────────────────┤
│  ui/ 層（各画面の描画・インタラクション）       │
│  battle.js / inventory.js / gear-deck.js ...│
├─────────────────────────────────────────┤
│  game.js（Karakuri / Timeline クラス）      │
│  test-engines.js（KarakuriEngine）         │
├─────────────────────────────────────────┤
│  state.js（appState グローバル状態）         │
│  data.js（マスターデータ定数）               │
│  persistence.js（セーブ/ロード）            │
└─────────────────────────────────────────┘
```

### グローバル状態（appState）

`state.js` で定義。ゲーム全体で共有される。

```javascript
appState = {
  // プレイヤー資産
  bilgamata: Karakuri[],         // 所持ビルガマタ全員
  party: Karakuri[3],            // 出撃中パーティ（最大3体）
  inventory: {
    tech_parts: [...],           // 所持ワザギア
    stat_parts: [...],           // 所持ボディギア
    option_parts: [...],         // 所持コアギア
    battle_items: [...],         // 所持バトルアイテム
  },
  materials: { mat_id: count },  // 素材在庫

  // 進行状態
  currentStage: 0,               // 現在のステージ番号
  unlockedStages: 0,             // 解放済みステージ数
  currentMap: MapNode[],         // 現在のマップノード
  clearedNodes: Set<nodeId>,     // クリア済みノード

  // チュートリアル
  tutorialStep: 0,               // 現在のチュートリアルステップ
  tutorialComplete: false,       // チュートリアル完了フラグ

  // バトル中状態
  battle: {
    timeline: Timeline,          // ATBタイムライン
    engine: KarakuriEngine,      // バトルエンジン
    phase: "player" | "enemy",   // 現在のフェーズ
    turn: number,                // ターン数
  }
}
```

---

## 4. 画面構成と遷移

### 主要画面（`.screen`）

| 画面ID | 和名 | 役割 |
|--------|------|------|
| `#screen-start` | タイトル | 開始地点。START GAME・サウンドテスト・戦闘テスト |
| `#screen-presentation` | ストーリー | 世界観スライド5枚 |
| `#screen-hub` | ギルド拠点 | ステージ選択・パーティ確認・セーブ |
| `#screen-map` | 探索マップ | SVGノード選択 |
| `#screen-selection` | 出撃選択 | 3体のビルガマタを選ぶ |
| `#screen-battle` | バトル | 戦闘実行（メイン画面） |
| `#screen-reward` | 戦利品 | クリア後の報酬3択 |
| `#screen-party` | パーティ管理 | キャラ育成・ギア装備 |
| `#screen-inventory` | 持ち物 | インベントリ確認 |

### オーバーレイ（常時呼び出し可能）

| 要素ID | 和名 | 呼び出し元 |
|--------|------|-----------|
| `#screen-help` | ヘルプ | 全画面 |
| `#screen-encyclopedia` | 図鑑 | 全画面 |
| `#tutorial-overlay` | チュートリアル説明 | チュートリアル中 |
| `#tutorial-event-overlay` | チュートリアルイベント | チュートリアルイベントノード |
| `#save-modal` | セーブ確認 | ハブ画面 |
| `#monster-detail-overlay` | モンスター詳細 | バトル画面 |
| `#battle-start-overlay` | BATTLE START演出 | バトル開始時 |
| `#battle-end-overlay` | VICTORY/DEFEAT演出 | バトル終了時 |

### 画面遷移フロー

```
[タイトル]
    ↓ START GAME
[ストーリープレゼン（5枚）]
    ↓ 最終スライド
[ギルド拠点（ハブ）]
    ↓ ステージ選択
[探索マップ]
    ↓ ノードタップ
[出撃選択]
    ↓ 出発する
[バトル画面]
    ├─ 全敵撃破 → [VICTORY演出] → [戦利品3択] → [マップ（次ノード解放）]
    └─ 全味方撃破 → [DEFEAT演出] → [タイトル]
        ↓ ステージクリア
[ギルド拠点]
    ...繰り返し
```

### チュートリアルマップ（固定6ノード）

```
F0: イベント（ストーリー）  → ビルガマタ「ガタ」入手
F1: イベント（アイテム）    → ワザギア「ファイアボール」＋アイテム習得
F2: バトル                 → おためしジュウマ1（無属性、低HP）
F3: イベント（ステータス）  → ボディギア自動装備
F4: バトル                 → おためしジュウマ2（風属性）
F5: ボスバトル             → おためしジュウマ・改（氷属性）
    ↓ クリア
unlockedStages = 1 → Quest1解放
```

---

## 5. バトルシステム

### バトルエンジン（本番採用: KarakuriEngine）

`test-engines.js` に4案を実装。本番はKarakuriEngine。

| エンジン | 方式 | 備考 |
|---------|------|------|
| EngineCase1 | ST制（固定ペナルティ） | 実験版 |
| EngineCase2 | ST制（ブレイク中攻撃禁止） | 実験版 |
| EngineCase3 | ENグラデーション | 実験版 |
| **KarakuriEngine** | **EN管理 + autoPurge** | **本番採用** |

### Karakuri クラス（`game.js`）

```javascript
class Karakuri {
  // 識別
  id, name, main_element, sub_element

  // ギアスロット
  tech_parts: string[]    // ワザギアID × 最大4
  stat_parts: string[]    // ボディギアID × 最大5
  option_part: string     // コアギアID × 最大1

  // 計算済みステータス（calculateFinalStats()で算出）
  stats: { hp, atk, def, mag, spd, max_en, en_rec }

  // 戦闘中可変値
  current_hp, current_en
  gauge          // ATBゲージ（0〜100）

  // パージ管理
  purged_tech: Set<string>    // パージ済みワザID
  purged_stats: Set<string>   // パージ済みボディID
  purged_option: boolean      // コアパージ済みフラグ
  shutdown_turns: number      // 全パージ時のカウンタ
}
```

**主要メソッド:**

| メソッド | 説明 |
|--------|------|
| `calculateFinalStats()` | ボディギアのbonus/penaltyを合算してstatsを確定 |
| `recalculateStats()` | パージ後にstatsを再計算 |
| `getActiveParts()` | パージされていないギア一覧を返す |
| `autoPurge()` | EN≤0時にランダムギアを除去 → EN回復（30%） |
| `manualPurge(partId, type)` | ユーザが手動でパージするギアを指定 |
| `getAvailableTech()` | 使用可能なワザ一覧 |
| `getActiveOption()` | 有効なコアギア取得 |

### Timeline クラス（`game.js`）

ATBゲージを管理し行動順を決定する。

```javascript
class Timeline {
  p1_units: Karakuri[]   // プレイヤーチーム（最大3体）
  p2_units: Karakuri[]   // 敵チーム（最大3体）
  p1_active: Karakuri    // 現在行動可能なプレイヤー側ユニット
  p2_active: Karakuri    // 現在行動可能な敵側ユニット

  tick()                 // SPD量ゲージ増加 → 100到達時に行動権を返す
  onActionCompleted(playerNum)  // ゲージリセット・バフターン数-1・リジェン適用
  swapActive(playerNum, index)  // パーティ内でアクティブユニットを入れ替え
}
```

### バトルフロー

```
1. tick() → ATBゲージ増加
2. ゲージ100到達 → 行動フェーズ開始
   ├─ プレイヤー側: スキル or アイテム or 入れ替えを選択
   └─ 敵側: AIによりスキルを自動選択
3. executeSkill(attacker, defender, skill_id)
   ├─ ENから消費（技ごとに基本コスト + 回数コスト）
   ├─ EN ≤ 0 → autoPurge() 発動
   ├─ ダメージ計算（後述）
   └─ 追加効果処理（バフ・デバフ・ゲージ操作）
4. onActionCompleted() → ゲージリセット・リジェン
5. 勝敗判定 → 全敵or全味方HP=0で終了
```

### ダメージ計算式

**ENダメージ（盾削り）:**
```
en_damage = effPow / 3 + (弱点属性なら +10)
en_damage = clamp(en_damage, 5, 25)
```

**HPダメージ（溢れダメージ）:**
```
overflow = effPow × attacker.atk - (defender.current_en × defender.def)
hp_damage = overflow × (defending ? 0.5 : 1)
```

**属性補正（AFFINITY）:**
```
multiplier = AFFINITY[attacker_element][defender_element]
// 最小0.5倍（耐性）〜最大2.0倍（弱点）
// ブレイク(EN=0)時は × 2.0（最大4.0倍）
```

### パージシステム

| トリガー | 処理 |
|---------|------|
| EN ≤ 0（autoPurge） | ランダムギア1個除去 → EN 30%回復 |
| 手動パージ | ユーザが任意ギアを選んで除去 → EN 大幅回復 |
| 全ギアパージ済み | shutdown_turns増加 → 一定ターン後に消滅 |

パージ後は `recalculateStats()` が呼ばれ、失ったボディギアの補正が消える。

### 状態機械（バトルフェーズ）

```
IDLE
  ↓ バトル開始
PRE_BATTLE（BATTLE START演出）
  ↓
PLAYER_TURN（プレイヤー行動選択）
  ↓ 行動完了
ENEMY_TURN（敵AI行動）
  ↓ 行動完了
PLAYER_TURN ← ループ
  ↓ 勝敗確定
POST_BATTLE（VICTORY/DEFEAT演出）
```

---

## 6. データ定義

すべてのデータは `data.js` にJSオブジェクト定数として定義。

### ビルガマタ（KARAKURI_DATA）

8体のプレイヤー側モンスター。

| ID | 名前 | 主属性 | 副属性 | HP | ATK | DEF | MAG | SPD |
|----|------|--------|--------|-----|-----|-----|-----|-----|
| k_001 | ガタ | 火 | - | 1800 | 40 | 35 | 30 | 30 |
| k_002 | ドボン | 水 | 土 | 2500 | 35 | 100 | 20 | 20 |
| k_003 | ピリカ | 雷 | 風 | 1400 | 30 | 30 | 35 | 45 |
| k_004 | ゴロタ | 土 | - | 3000 | 50 | 60 | 25 | 20 |
| k_005 | クロミ | 暗 | - | 1200 | 80 | 50 | 40 | 50 |
| k_006 | ピカリ | 光 | 火 | 2200 | 40 | 45 | 50 | 20 |
| k_007 | コゴリ | 氷 | 水 | 1800 | 35 | 50 | 40 | 25 |
| k_008 | フワリ | 風 | 雷 | 1400 | 30 | 25 | 45 | 55 |

初期EN: 全体150。`max_en`・`en_rec` はキャラごとに設定。

### ジュウマ（JUMA_DATA）

| ID | 名前 | 属性 | HP | 役割 |
|----|------|------|----|------|
| j_001 | ランタン | 火 | 700 | 火属性弱敵 |
| j_002 | マッド | 水/土 | 1200 | 防御型 |
| j_003 | サニー | 雷/風 | 480 | 高速弱敵 |
| j_004〜j_006 | （中間敵） | 各種 | 〜1800 | 中間難易度 |
| j_boss_01 | タロ | 土 | 3500 | Stage1ボス |
| j_tutorial_1 | おためしジュウマ | 無 | 120 | チュートリアル練習台 |
| j_tutorial_2 | かぜのジュウマ | 風 | 200 | 防御フェーズ誘発用 |
| j_tutorial_boss | おためしジュウマ・改 | 氷 | 1000 | チュートリアル最終戦 |

### ワザギア（TECH_PARTS）

30種以上。カテゴリはattack / defense / support。

```javascript
{
  id: "tp_fireball",
  name: "ファイアボール・ノズル",
  element: "fire",
  category: "attack",
  type: "magic",
  cost_en: 15,
  effects: [{ type: "damage", pow: 80 }],
  description: "..."
}
```

主要技（例）:

| ID | 名前 | 属性 | EN | 威力 | 分類 |
|----|------|------|----|----|------|
| tp_strike | タイアタリ・ユニット | 無 | 10 | 50 | 攻撃 |
| tp_fireball | ファイアボール・ノズル | 火 | 15 | 80 | 攻撃 |
| tp_smash | フルスイング・アーム | 無 | 20 | 120 | 攻撃 |
| tp_pierce | 貫通ニードル | 無 | 30 | 20 | 攻撃（HP直撃） |
| tp_charge | エネルギー充填 | 無 | 10 | - | 防御（EN+40） |
| tp_shield | シールド生成 | 無 | 15 | - | 防御（DEFバフ） |
| tp_slow | スロウ・パルス | 無 | 20 | - | 妨害（ゲージ削り） |

### ボディギア（STAT_PARTS）

8種。最大5スロット。bonus/penaltyでトレードオフ設計。

| ID | 名前 | ボーナス | デメリット |
|----|------|---------|----------|
| sp_heavy_armor | ヘビーアーマー | HP+500, DEF+20 | SPD-10 |
| sp_power_core | パワーコア | ATK+20 | DEF-10 |
| sp_speed_booster | スピードブースター | SPD+15 | HP-200 |
| sp_en_tank | ENタンク | EN+50 | SPD-5 |
| sp_mag_amp | 魔力増幅器 | MAG+20 | HP-150 |
| sp_reactive_shield | リアクティブシールド | DEF+15 | ATK-10 |
| sp_overclocked | オーバークロック | SPD+20, ATK+10 | DEF-20 |
| sp_bulk_frame | バルクフレーム | HP+300, DEF+10 | SPD-8 |

### コアギア（OPTION_PARTS）

6種。1スロットのみ。パッシブ効果。

| ID | 名前 | 効果 |
|----|------|------|
| op_auto_repair | 自動修復ユニット | 毎ターンHP+30 |
| op_float | 浮遊ブースター | 土属性ダメージ無効 |
| op_en_regen | EN自動充電 | 毎ターンEN+10 |
| op_purge_guard | パージガード | オートパージ1回無効 |
| op_berserker | バーサーカー | HP50%以下でATK+50% |
| op_en_absorb | エネルギー吸収 | 命中時EN+5 |

### 属性相性（AFFINITY）

9属性: fire / water / ice / thunder / earth / wind / light / dark / none

相性値: 0.5（耐性）/ 1.0（等倍）/ 2.0（弱点）

主な有利関係:
- 火 → 氷、風 → 氷、水 → 火、雷 → 水、土 → 雷 など

### 素材・合成

**MATERIAL_DATA**: 9種（炎コア・ドロゲル・電気チップ等）

**SYNTHESIS_RECIPES**: 18種のレシピ。素材組み合わせでワザ/ボディ/コアギアを合成。

**BATTLE_ITEMS_DATA**: 4種（修理キット HP+500・エネルギー缶 EN+50・バクダン 30ダメージ・ビルガバッテリー EN全回復）

---

## 7. UIシステム

### レイアウト原則

- **ノースクロール設計**: 全画面 `position: fixed`。スクロールなしで操作完結
- **CSS Grid バトル**: `3fr 4fr 3fr`（左：味方 / 中：タイムライン / 右：敵）
- **Glass Panel**: `backdrop-filter: blur` + 半透明border
- **Canvas スプライト**: キャラ・エフェクト・背景をすべてprocedural生成

### CSSデザイントークン（`styles.css`）

```css
:root {
  --bg-color:    #0f172a;               /* 深紺黒・背景 */
  --panel-bg:    rgba(30, 41, 59, 0.7); /* 半透明パネル */
  --text-main:   #f8fafc;               /* テキスト */
  --text-muted:  #94a3b8;               /* サブテキスト */
  --accent:      #3b82f6;               /* 選択・強調 */
  --hp-color:    #ef4444;               /* HP（赤） */
  --st-color:    #eab308;               /* EN残量（黄） */
  --atb-color:   #10b981;               /* ATBゲージ（緑） */
}
```

### UIモジュール一覧（`ui/`）

| ファイル | 担当画面 | 主な役割 |
|---------|---------|---------|
| `dom.js` | 全体 | `getElementById` 結果を集約export |
| `battle.js` | バトル | トースト・ゲージ更新・スキル実行・アクションメニュー |
| `inventory.js` | パーティ・持ち物 | 2ペインレイアウト・ギア装備切替・ドラッグ&ドロップ |
| `gear-deck.js` | バトル | ギアデッキ表示（TECH/BODY/CORE 10枚統合） |
| `map-render.js` | マップ | SVGノード描画・線描画・戦利品ボックス |
| `tutorial.js` | チュートリアル | ステップ表示・スポットライト・進行管理 |
| `help.js` | ヘルプ | 6タブ（バトル・EN/パージ・属性相性・技・育成・マップ） |
| `encyclopedia.js` | 図鑑 | 4タブ（ビルガマタ・ジュウマ・技・アイテム） |
| `sprite-generator.js` | 全体 | Canvas procedural pixel artスプライト生成 |
| `effects.js` | バトル | 攻撃エフェクト・ダメージポップアップ・パージアニメ |
| `start-scene.js` | タイトル | モンスターパレードCanvas描画 |
| `bgm.js` | 全体 | BGM/SE管理・画面遷移で自動切替 |
| `presentation.js` | プレゼン | スライドショー5枚 |
| `dev-overlay.js` | 全体 | デバッグオーバーレイ（常時表示） |

### ギアデッキUI（`ui/gear-deck.js`）

バトル画面下部に10枚統合表示。TECH・BODY・CORE全スロットを一覧する。

- パージ済みスロットはグレーアウト
- EN残量によってコストが赤く警告表示
- タップで技使用 / 長押しでツールチップ

### BGMトラック定義（`ui/bgm.js`）

| トラック | 対応画面 |
|---------|---------|
| title | タイトル |
| battle | バトル |
| victory | バトル勝利 |
| exploration | マップ・ハブ |
| tutorial | チュートリアル |

---

## 8. 開発・テストツール

### デバッグオーバーレイ（`ui/dev-overlay.js`）

常時表示。以下の情報をリアルタイム表示:
- 現在の画面ID
- appState主要値
- ATBゲージ・EN値

### バトルテストモード（`ui/battle-test/`）

タイトル画面から「戦闘テスト」で起動。

| ファイル | 機能 |
|---------|------|
| `setup-ui.js` | テスト対戦カードの設定UI |
| `headless.js` | 1000回シミュレーション → 勝率・平均ターン数を算出 |
| `live-overlay.js` | リアルタイムで戦闘ログ・ゲージをオーバーレイ表示 |

---

## 9. 制約・規約

### コード規約

- 1コンポーネントファイル **150行以内**（超える場合は分割必須）
- ES Modules（`import/export`）のみ。CommonJS禁止
- グローバル変数は `appState` のみ。他はすべてimportで受け渡し
- コメントは「なぜ」が非自明な場合のみ1行
- `monster_roguelike_web/`・`monster_roguelike/` への書き込み禁止（参照のみ）

### UI制約

- **ノースクロール**: `overflow: hidden` 維持。スクロールが必要な設計は却下
- **モバイル対応**: `max-width: 600px` メディアクエリで `display: block` に変更
- デザイントークン（CSS変数）を直接変更する場合は `design_context.md` も更新

### データ変更時の確認事項

- バランス値（HP・ATK・DEF・SPD・EN）変更 → `DESIGN.md` のデータ表を更新
- 新ギア・新モンスター追加 → `data.js` + 図鑑テキスト（`encyclopedia.js`）+ スプライト定義を同時更新
- 属性追加 → `AFFINITY` マトリクスの全行/全列を更新

### 世界観・表記の固定事項

| 用語 | 正式表記 | 禁止表記 |
|------|---------|---------|
| プレイヤー職業 | **ビルガウィーラー** | ビルガー、トレーナー |
| プレイヤー側モンスター | **カラクリ** / **ビルガマタ** | ロボ、機械、ゴーレム |
| 敵モンスター | **ジュウマ** | モンスター、エネミー |
| EN（エネルギー） | **EN** | スタミナ、SP |
| ゲームタイトル | **ビルガ・マタ** | ビルガマタ（タイトル表記時） |
