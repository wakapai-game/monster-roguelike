# Monster Rogue: Web Edition — Claude Code ガイド

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
- `Timeline` クラス: ATB制御・交代
- `BattleEngine` クラス: 攻撃実行・属性相性

### ui/battle.js
- `showAttackPhase(monster)`: 攻撃フェーズUI
- `showDefensePhase(target, attacker, skillId)`: 防御フェーズUI
- `resumeLoop()`: バトルループ（100msインターバル）
- `updateUI(onlyGauges)`: HP/ST/ATBゲージ更新

### app.js
- `confirmBattleSetup()`: バトル開始・敵生成
- `startStage(stageNum, floors)`: ステージ開始
- `generateRosterFromEgg(type)`: 卵からモンスター生成

## バトル画面HTML構造
```
#screen-battle
  └── .battle-arena (CSS Grid: 3fr 4fr 3fr, rows: 1fr auto)
        ├── .p1-side (col1/row1): プレイヤーステータス + 控えリスト
        ├── .center-panel (col2/row1-2): アクションキュー + トースト + 結果
        ├── .p2-side (col3/row1-2): 敵ステータス + 控えリスト
        └── #action-menu (col1/row2): スキル/アイテム/防御/交代ボタン
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
`screen-start` → `screen-story` → `screen-name` → `screen-starter-event` → `screen-egg` → `screen-hub` → `screen-map` → `screen-selection` → `screen-battle` → `screen-reward`

モーダル系: `screen-encyclopedia`（オーバーレイ）、`screen-party`・`screen-inventory`（サブ画面として切替）

## データ構造（data.js）
- `MONSTERS_DATA`: モンスター定義（id, name, base_stats, elements, skills）
- `SKILLS_DATA`: スキル定義（id, name, category, power, element, cost_st）
- `ITEMS_DATA` / `BATTLE_ITEMS_DATA` / `FOOD_DATA`: アイテム・えさ
- `AFFINITY_TABLE`: 8x8 属性相性マトリクス
