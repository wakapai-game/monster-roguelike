# Monster Rogue: Web Edition — Claude Code ガイド

## セッション開始時にやること
新しいセッションを開始したら、必ず以下のメモリファイルを読んでから作業を始めること：
- `~/.claude/projects/-Users-user-Documents-GitHub-monster-roguelike/memory/MEMORY.md`（インデックス）
- インデックスに記載された各ファイル（project_worldbuilding.md など関連するもの）

## セッション終了時にやること
「今日はここまで」「ここまでにする」など作業終了を示す発言があったら必ず以下を実行すること：
1. gitコミット用サマリー（1行）とディスクリプション（箇条書き）を出力する
2. セッションで決定した設計・世界観・仕様などをメモリファイルに記録・更新する

## 作業対象ディレクトリ
`monster_roguelike_web/` がメインコード。`monster_roguelike/` はPython版（参照のみ）。

## ファイルマップ（変更時に読むファイル）

| 変更内容 | 読むファイル |
|---------|------------|
| UI レイアウト / スタイル | `styles.css` |
| 画面構造 / HTML | `index.html` |
| 画面遷移・ゲームフロー | `app.js` |
| バトルロジック（ダメージ計算・ATB） | `game.js` |
| バトルUI（フェーズ表示・トースト） | `ui/battle.js` |
| インベントリ・パーティ画面 | `ui/inventory.js` |
| マップ描画 | `ui/map-render.js` |
| DOM要素参照・画面切替 | `ui/dom.js` |
| モンスター/スキル/アイテムデータ | `data.js` |
| グローバル状態 | `state.js` |
| セーブ/ロード | `persistence.js` |

## 主要クラス・関数の場所

### game.js
- `Monster` クラス: 全体（ステータス計算・育成）
  - `feed_count`: えさ回数（最大10回）
  - `getSizeLabel()`: params.size → SS/S/M/L/LL ラベル（0=M, 5=L, 10=LL, -5=S, -10=SS）
  - `getIntelligenceLevel()`: params.intelligence → Lv.1〜5（4ポイントごとにランクアップ）
- `Timeline` クラス: ATB制御・交代
- `BattleEngine` クラス: 攻撃実行・属性相性

### ui/battle.js
- `showAttackPhase(monster)`: 攻撃フェーズUI
- `showDefensePhase(target, attacker, skillId)`: 防御フェーズUI
- `setupSwapButton(phaseType, currentMonster, enemyAttacker, enemySkillId)`: 交代ボタン設定（控えモンスター選択UI付き）
- `resumeLoop()`: バトルループ（100msインターバル）
- `updateUI(onlyGauges)`: HP/ST/ATBゲージ更新

### ui/inventory.js
- `_directApplyFood(monster, foodItem)`: えさ適用（最大10回チェック、base_stats直接変更、変動値トースト表示）
- `_directApplySkill(monster, skillId)`: 技習得（known_skillsに追加）
- `renderParty()`: パーティ2ペイン描画（ロースターグリッド + 詳細パネル）
- インベントリ画面は確認専用（使用操作はパーティ画面に一本化）

### app.js
- `confirmBattleSetup()`: バトル開始・敵生成
- `startStage(stageNum, floors)`: ステージ開始
- `generateRosterFromEgg(type)`: 卵からモンスター生成（`new Monster()` インスタンスで返す）

## バトル画面HTML構造
```
#screen-battle
  └── .battle-arena (CSS Grid: 3fr 4fr 3fr, rows: 1fr auto)
        ├── .p1-side (col1/row1): プレイヤーステータス + 控えリスト
        ├── .center-panel (col2/row1-2): アクションキュー + トースト + 結果
        ├── .p2-side (col3/row1-2): 敵ステータス + 控えリスト
        └── #action-menu (col1/row2): スキル/アイテム/防御/交代ボタン
              └── #swap-wrapper: 交代ボタン + #swap-select-panel（控え選択UI）
```

## CSSレイアウト原則（ノースクロール設計）
- `html, body`: `height: 100%; overflow: hidden`
- `#app-container`: `height: 100dvh; overflow: hidden`
- `.screen:not(.hide)`: `flex: 1; min-height: 0`
- スマホ縦向き: 2列グリッド（`#main-header` 非表示）

## メディアクエリの構成
1. `(max-width: 900px)`: タブレット
2. `(max-width: 600px) and (orientation: portrait)`: スマホ縦向き（バトルは2列レイアウト）
3. `(orientation: landscape) and (max-height: 500px)`: スマホ横向き

## 画面ID一覧
メインフロー: `screen-start` → `screen-presentation` → `screen-story` → `screen-starter-event` → `screen-tutorial-select` → `screen-egg` → `screen-hub` → `screen-map` → `screen-selection` → `screen-battle` → `screen-reward`

オーバーレイ系: `screen-encyclopedia`（図鑑）、`screen-help`（ヘルプ）
サブ画面: `screen-party`（2ペイン育成）・`screen-inventory`（持ち物確認のみ）
その他: `screen-sound-test`（BGMサウンドテスト）

## データ構造（data.js）
- `MONSTERS_DATA`: モンスター定義（id, name, base_stats, elements, skills）
- `SKILLS`: スキル定義（id, name, category, power, element, cost_st）
- `BATTLE_ITEMS_DATA`: バトル中使用アイテム
- `FOOD_DATA`: えさ定義（9種）。`effect.base_stats` と `effect.params` で直接加算値を指定
  - `effect.base_stats`: hp/max_st/atk/def/mag/spd の加算値
  - `effect.params`: size/intelligence の加算値
- `AFFINITY`: 8x8 属性相性マトリクス

## えさシステム（FOOD_DATA）
- モンスター1体につき最大10回（`feed_count` で管理）
- えさは `base_stats` を直接変更 + `params`（size/intelligence）を加算
- `Monster.calculateFinalStats()` で params を元に最終ステータスを再計算
- サイズ表示: `getSizeLabel()` で SS/S/M/L/LL に変換（params.size 基準）
- 賢さ表示: `getIntelligenceLevel()` で Lv.1〜5 に変換（4ポイントごと）
