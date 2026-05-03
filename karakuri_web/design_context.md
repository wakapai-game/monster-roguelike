# ビルガ・マタ — Claude Design Context

> このファイルはClaude Designへ渡すためのUIコンテキストです。
> 既存ロジックを壊さずに、競技性の高いソリッドなUIを提案する目的で生成されています。

---

## 1. Component Tree（DOM階層構造）

```
#app-container (main)
├── .bg-gradient + #bg-pixel-canvas  ← 全画面背景（固定）
│
├── [画面グループ: メインフロー]
│   ├── #screen-start (.screen .full-center)       ← タイトル画面
│   │   ├── .start-silhouette (SVG)               ← モンスターシルエット群
│   │   ├── .title-container
│   │   │   ├── h1.mega-title                     ← 「ビルガ・マタ」
│   │   │   ├── p.subtitle                        ← 「KARAKURI QUEST」
│   │   │   └── #title-canvas (Canvas)            ← タイトルロゴアート
│   │   ├── .start-catch                          ← 「育成・構築・戦闘」キャッチコピー
│   │   ├── #btn-begin (.primary-btn .pulse-glow) ← START GAME
│   │   └── #btn-sound-test (.skill-btn)
│   │
│   ├── #screen-presentation (.pres-screen)        ← ストーリースライド
│   │   └── #pres-slide-container
│   │
│   ├── #screen-egg (.glass-panel)                 ← 卵選択
│   │   └── #egg-container
│   │
│   ├── #screen-hub (.glass-panel)                 ← ギルド拠点（ステージ選択）
│   │   ├── .stage-container > .stage-card
│   │   └── #hub-nav-btns [パーティ | 持ち物 | セーブ]
│   │
│   ├── #screen-map (.glass-panel .map-screen)     ← 探索マップ
│   │   ├── #map-container
│   │   │   ├── #map-lines (SVG)                  ← ノード間の線
│   │   │   └── #map-nodes                        ← ノードボタン群
│   │   └── .map-bottom-btns [パーティ | 持ち物]
│   │
│   ├── #screen-selection (.glass-panel)           ← 出撃3体選択
│   │   ├── #roster-grid (.monster-grid)
│   │   └── #btn-start-battle (.primary-btn)
│   │
│   ├── #screen-battle (.screen)                   ← バトル画面 ★メイン
│   │   ├── .battle-arena (CSS Grid: 3fr 4fr 3fr)
│   │   │   ├── .p1-side (.glass-panel) [col1/row1]
│   │   │   │   ├── #p1-active-card (.active-monster-card)
│   │   │   │   │   ├── #p1-sprite (Canvas)
│   │   │   │   │   ├── #p1-name + #p1-elem (.elem-badge)
│   │   │   │   │   └── .bars [HP bar | EN bar]
│   │   │   │   └── #p1-reserves (.reserve-list)
│   │   │   │
│   │   │   ├── .center-panel (.glass-panel) [col2/row1-2]
│   │   │   │   ├── #timeline-queue (.timeline-queue) ← 行動順キュー
│   │   │   │   └── #toast-container (.toast-container)
│   │   │   │
│   │   │   ├── .p2-side (.glass-panel) [col3/row1-2]
│   │   │   │   ├── #p2-active-card (.active-monster-card)
│   │   │   │   └── #p2-reserves
│   │   │   │
│   │   │   └── #action-menu (.action-menu) [col1/row2]
│   │   │       ├── #action-phase-header            ← 「攻撃フェーズ / 防御フェーズ」
│   │   │       ├── #tutorial-hint
│   │   │       ├── .cmd-tabs [技タブ | アイテムタブ]
│   │   │       ├── #skill-buttons (.cmd-grid)      ← ワザギアボタン群
│   │   │       ├── #item-buttons (.cmd-grid)       ← アイテムボタン群
│   │   │       └── #defend-wrapper > #btn-defend-action
│   │   │
│   │   └── #parts-deck                            ← ギアデッキ（バトル下部）
│   │       ├── #parts-deck-tech-row               ← ワザギアスロット×4
│   │       └── #parts-deck-bottom
│   │           ├── #parts-deck-stat-opt           ← ボディ/コアギア表示
│   │           └── #parts-deck-actions
│   │               ├── #swap-wrapper [🔄 交代]
│   │               └── #purge-wrapper [💥 パージ]
│   │
│   └── #screen-reward (.glass-panel)              ← 戦利品3択
│       ├── #reward-boxes (flex)
│       └── #btn-collect-reward (.primary-btn)
│
├── [サブ画面]
│   ├── #screen-party (.glass-panel)               ← 2ペイン育成画面
│   │   ├── #party-roster-list (.party-roster-panel) ← グリッド（左）
│   │   └── #party-details-grid (.party-detail-panel) ← 詳細（右）
│   │
│   └── #screen-inventory (.glass-panel)           ← 持ち物確認（参照のみ）
│
├── [オーバーレイ/モーダル]
│   ├── #screen-help (.help-overlay)               ← ヘルプ（6タブ）
│   ├── #screen-encyclopedia (.enc-overlay)        ← 図鑑（4タブ）
│   ├── #screen-glossary (.help-overlay)           ← 用語集
│   ├── #tutorial-overlay                          ← チュートリアル説明パネル
│   ├── #tutorial-event-overlay                    ← チュートリアルイベント報酬
│   ├── #tutorial-intro-overlay                    ← チュートリアル開始確認
│   ├── #save-modal                                ← セーブ確認
│   ├── #monster-detail-overlay                    ← バトル中モンスター詳細
│   ├── #battle-start-overlay [BATTLE / START]     ← バトル開始演出
│   └── #battle-end-overlay [VICTORY / DEFEAT]    ← バトル終了演出
│
└── [フローティング]
    ├── #float-btns
    │   ├── #float-menu-panel [ヘルプ|図鑑|属性|用語集|感想|タイトルへ]
    │   └── #float-btns-row [🔊 | ☰]
    └── #tutorial-spotlight-* (4枚の暗転ピース)
```

---

## 2. State & Data（状態変数とデータ型）

### appState（グローバル状態 — state.js）

```typescript
appState: {
  playerName: string            // デフォルト "カイト"
  mapGenerator: TutorialMapGenerator | StageMapGenerator | null
  currentStage: number          // 0=チュートリアル, 1,2,3...
  unlockedStages: number
  currentNodeId: string | null
  currentQuestId: string | null
  completedQuests: string[]

  globalRoster: Monster[]       // 手持ちビルガマタ（最大6体）
  garage: Monster[]

  globalInventory: {
    techParts:   Array<{id: string, count: number}>   // ワザギア在庫
    statParts:   Array<{id: string, count: number}>   // ボディギア在庫
    optionParts: Array<{id: string, count: number}>   // コアギア在庫
    battleItems: Array<{id: string, count: number}>   // バトルアイテム
    materials:   Array<{id: string, count: number}>   // 素材
    skills:      string[]   // 旧互換（ワザギアIDの配列）
  }

  selectedIds: string[]         // 出撃選択中のMonster UID
  engine: BattleEngine | null
  timeline: Timeline | null
  loopInterval: number | null   // setInterval ID (100ms ATBループ)
  p1Team: Monster[]
  p2Team: Monster[]
  tutorialMode: 'full' | 'simple' | null
  tutorialShownSteps: Set<string>
}
```

### Monster インスタンス（game.js）

```typescript
Monster: {
  // 識別
  id: string              // 例: "k_001"
  uid: string             // 例: "k_001_1"（インスタンス固有）
  name: string
  main_element: ElementType   // fire/water/thunder/ice/earth/wind/light/dark/none
  sub_element: ElementType

  // ギア（スロット上限あり）
  tech_parts: string[]    // ワザギアID × 最大4スロット
  stat_parts: string[]    // ボディギアID × 最大5スロット
  option_parts: string[]  // コアギアID × 最大1スロット

  // 計算済みステータス
  stats: {
    hp: number
    atk: number
    def: number
    mag: number
    spd: number         // ATBゲージの増加速度
    max_en: number      // ENの最大値
    en_rec: number      // 毎ターンEN自然回復量
  }

  // 戦闘中の可変値
  current_hp: number
  current_en: number    // 0になるとオートパージが発動
  gauge: number         // ATBゲージ（0〜GAUGE_MAX=100）

  // パージ管理
  purged_tech: Set<string>    // パージ済みワザギアID
  purged_stats: Set<string>
  purged_option: boolean
  consecutive_count: number   // 連続攻撃カウンタ（ST消費増加に影響）
  is_defending: boolean
}
```

### ゲームシステム定数

```typescript
GAUGE_MAX = 100.0          // ATBゲージ満タン値
ATBループ間隔 = 100ms      // setInterval周期
EN枯渇時: オートパージ発動 → 指定ギアを除去してEN+30%回復
手動パージ: EN+40%回復
```

---

## 3. Current Styling（CSSクラスとカラースキーム）

### デザイントークン（CSS Variables）

```css
/* ベースカラー */
--bg-color:     #0f172a   /* 深い紺黒（メイン背景） */
--panel-bg:     rgba(30, 41, 59, 0.7)  /* 半透明パネル */
--panel-border: rgba(255, 255, 255, 0.1)

/* テキスト */
--text-main:    #f8fafc   /* ほぼ白 */
--text-muted:   #94a3b8   /* グレーブルー */

/* アクセント */
--accent:       #3b82f6   /* ブルー（選択・強調） */
--btn-hover:    #60a5fa

/* ゲームシステム色 */
--hp-color:     #ef4444   /* 赤（HP、敵側） */
--st-color:     #eab308   /* 黄（EN残量警告） */
--atb-color:    #10b981   /* 緑（ATBゲージ） */

/* インダストリアル/ポストアポカリプスパレット（未活用気味） */
--rust:         #8b4513
--steel:        #4a5568
--neon-red:     #ff3b3b
--organic-green:#2d6a4f
--mech-gray:    #2d3748
```

### 主要コンポーネントクラス

| クラス | 用途 |
|--------|------|
| `.glass-panel` | 半透明パネル（border-radius: 12px, backdrop-filter: blur）|
| `.screen` | 各画面（active時にscreen-enterアニメ 0.25s）|
| `.full-center` | flexbox中央配置（タイトル・卵・ハブなど）|
| `.primary-btn` | 主要アクションボタン（accent色、pulse-glowアニメ対応）|
| `.skill-btn` | 汎用ボタン（半透明bg、hover時accent border）|
| `.active-tab` / `.inactive-tab` | タブ切替スタイル |
| `.elem-badge` | 属性バッジ（Canvas描画で属性アイコン表示）|
| `.battle-arena` | バトル画面グリッド（3fr 4fr 3fr / 2rows）|
| `.active-monster-card` | モンスターカード（HP/ENバー付き）|
| `.timeline-queue` | 行動順アイコン列 |
| `.toast` | トースト通知（fadeOut 3s）|
| `.dmg-popup` | ダメージポップアップ（0.9s後auto remove）|
| `.hub-nav-btn` | ハブナビゲーションボタン（アイコン+テキスト）|
| `.is-broken` | EN切れ時の赤点滅アニメ |
| `.tutorial-guide-pulse` | チュートリアル誘導パルス |

### フォント

```
font-family: 'Inter', sans-serif  （Google Fonts: weight 400/600/800）
```

### バトル画面レイアウト（CSS Grid詳細）

```css
.battle-arena {
  display: grid;
  grid-template-columns: 3fr 4fr 3fr;  /* 左:中央:右 */
  grid-template-rows: 1fr auto;
  /* col1/row1 → .p1-side */
  /* col2/row1-2 → .center-panel */
  /* col3/row1-2 → .p2-side */
  /* col1/row2 → #action-menu */
}
```

スマホ縦向き（max-width:600px + portrait）では `.battle-arena { display: block }` にフォールバック。

---

## 4. Technical Constraints（設計上の制約）

### 絶対に変えてはいけないもの

1. **IDセレクタ依存のJS処理**  
   `getElementById('p1-hp-fill')` など、IDで直接DOMを参照する箇所が多数ある。  
   `#p1-hp-fill`, `#p2-hp-fill`, `#p1-st-fill`, `#p2-st-fill`, `#p1-sprite`, `#p2-sprite`,  
   `#timeline-queue`, `#toast-container`, `#action-menu`, `#skill-buttons`, `#item-buttons`,  
   `#parts-deck-tech-row`, `#parts-deck-stat-opt`, `#swap-wrapper`, `#purge-wrapper` など  
   → これらのIDを削除・改名すると即座に動作不能になる

2. **ノースクロール設計**  
   `html, body: height: 100%; overflow: hidden`  
   `#app-container: height: 100dvh; overflow: hidden`  
   → スクロールを発生させるレイアウト変更は禁止

3. **Canvas要素**  
   - `#title-canvas` — タイトルロゴ（title-art.jsで生成）
   - `#bg-pixel-canvas` — 背景パーティクル
   - `#p1-sprite`, `#p2-sprite` — モンスタースプライト（sprite-generator.jsで生成）
   - 各モンスターカードのスプライト Canvas は width/height が JS で設定される  
   → Canvas 要素の position/size を CSS で強制変更しないこと

4. **`.hide` クラス**  
   `display: none !important` が付与されており、表示切替の核心  
   → `.hide` の `display` 値を変更しないこと

5. **バトルループ（100ms setInterval）**  
   ATBゲージ更新は 100ms 間隔の setInterval で動作中  
   → CSS animation でゲージを動かそうとすると二重制御になる  
   → HP/ENバーは `style.width = X%` で直接書き換えている（transition:width 0.3s のみ）

6. **エフェクトCanvas（effects.js）**  
   攻撃エフェクトは `.active-monster-card` に Canvas を appendChild して描画後 remove する  
   → `.active-monster-card` の `position: relative` は必須

7. **z-index 構造**  
   - バトル開始/終了オーバーレイ: z-index 9000/8000
   - チュートリアルスポットライト: z-index 高
   - フローティングボタン: 画面最前面  
   → 新しいレイヤーを追加する場合は既存 z-index との衝突に注意

### 変更可能だが注意が必要なもの

- **`.glass-panel`** — backdrop-filter はモバイルで重い場合がある。変更する場合は mobile fallback を検討
- **バーの色（`--hp-color`, `--st-color`, `--atb-color`）** — 変更は全バトル画面に影響
- **スマホメディアクエリ** — `(max-width:600px) and (orientation:portrait)` でバトルが2列→1列に変わる。このブレークポイントを変えると両対応が崩れる
- **`.screen.active` アニメーション** — 現在 0.25s。これより短くすると画面切替が知覚できなくなる

### 属性カラー（elem-badge）

属性バッジはCanvasで描画されており、CSS直接制御ではない。  
属性ごとのカラーコードは `ui/sprite-generator.js` 内で定義されている。

---

## 5. デザイン目標（Claude Designへの指示）

- **トーン**: 競技性・緊張感のあるソリッドなUI。ポップ・かわいい方向には行かない
- **世界観**: 機械仕掛け（カラクリ）＋ポストアポカリプス風。インダストリアル・サイバーパンク寄り
- **優先改善画面**: バトル画面（`.battle-arena`）が最も使用頻度が高い
- **フォント**: Inter を使用中。等幅フォントの部分的活用は検討可
- **現在の課題**: インダストリアルパレット（`--rust`, `--steel`, `--mech-gray`）が定義されているが活用されていない。ブルー系アクセント一辺倒になっている
