# Monster Rogue (モンスターローグ)

Monster Rogue は、Webブラウザ上で動作するタクティカル・ローグライクRPGです。
※ゲームのルール・戦闘システム・設計思想については、[`DESIGN.md`](./DESIGN.md) を参照してください。

---

## 🔹 ファイル構成 (File Structure)

本プロジェクトは完全にフロントエンド技術（HTML / CSS / Vanilla JS）のみで構成されています。

```text
monster-roguelike/
├── DESIGN.md                      # ゲーム設計・バトルシステム・仕様のデザインドキュメント
├── readme.md                      # 本ファイル（起動方法・ファイル構成）
├── CLAUDE.md                      # Claude Code 向け開発ガイド
└── monster_roguelike_web/         # Web アプリケーションのルートフォルダ
    ├── index.html                 # メインHTML。全UI画面・オーバーレイが定義されている
    ├── styles.css                 # UIデザイン・アニメーション・エフェクトを管理するCSS
    ├── app.js                     # エントリポイント。イベント配線・ゲームフロー管理
    ├── state.js                   # appState（ゲーム全体の状態）の定義と export
    ├── game.js                    # 戦闘ロジック・Monster/Timeline/BattleEngine クラス
    ├── map.js                     # ローグライクノードマップのランダム生成ロジック
    ├── data.js                    # モンスター・敵・スキル・アイテム・えさのマスターデータ
    ├── persistence.js             # セーブ・ロード（LocalStorage）
    └── ui/                        # UI 描画モジュール群
        ├── dom.js                 # 全 DOM 要素の参照と switchScreen 関数
        ├── battle.js              # バトルUI全体（フェーズ処理・updateUI・toast・resumeLoop 等）
        ├── inventory.js           # インベントリ・パーティ・技設定画面の UI と処理
        ├── map-render.js          # マップ描画と報酬生成
        ├── encyclopedia.js        # 図鑑オーバーレイ（モンスター・技・アイテム・えさ一覧）
        ├── tutorial.js            # チュートリアル制御（ステップ管理・オーバーレイ・ヒント表示）
        └── help.js                # HELP オーバーレイ（全ゲームシステムの説明、6タブ構成）
```

### 各モジュールの役割

- **`index.html`**:
  SPA 的に `hide` クラスの付け外しで画面を切り替えます。ストーリー・拠点・マップ・バトル・報酬・インベントリ・チュートリアル選択・図鑑・HELP 等、全 UI 画面とオーバーレイを定義します。

- **`app.js`**:
  薄いオーケストレーター層。各モジュールを import し、ボタンの `onclick` 等のイベントを配線します。ゲームセッション初期化（`initGameSession`）・通常バトルセットアップ（`confirmBattleSetup`）・チュートリアルバトル開始（`startTutorialBattle`）もここで担当します。

- **`state.js`**:
  `appState` オブジェクトを定義・export します。解放済みステージ・現在ノード・所持モンスター・インベントリ・チュートリアル進行状態など、ゲーム全体の状態を管理します。

- **`game.js`**:
  `Monster` クラス（ステータス計算・えさ育成）・`Timeline` クラス（ATB 行動順制御）・`BattleEngine` クラス（スキル実行・属性相性・ブレイク判定）を内包するコアモジュールです。

- **`map.js`**:
  `MapGenerator` クラスが指定フロア数のノードツリーをランダム生成します。ノードタイプ（通常・エリート・ボス・休憩）の配置とパス接続を管理します。

- **`data.js`**:
  全パラメータを集約。バランス調整は `MONSTERS_DATA`・`SKILLS`・`FOOD_DATA` 等を編集します。チュートリアル専用の `TUTORIAL_ENEMY` もここで定義されています。

- **`persistence.js`**:
  `saveGame` / `loadGame` / `deleteSave` を提供します。ブラウザの `localStorage` を使用してセーブデータを管理します。

- **`ui/dom.js`**:
  全 DOM 要素の参照と、`hide`/`active` クラスを操作する `switchScreen` 関数を提供します。

- **`ui/battle.js`**:
  バトル画面の UI 全体を担当。`showAttackPhase` / `showDefensePhase` / `executeAction` / `resumeLoop` / `updateUI` / `toast` を提供します。チュートリアルフック（各フェーズでのステップ表示）も内包しています。

- **`ui/inventory.js`**:
  インベントリ画面・パーティ画面・技設定モーダルの UI と処理を担当します。えさ適用（`applyItemToMonster`）・技のドラッグ&ドロップ設定もここで行います。

- **`ui/map-render.js`**:
  ノードマップの SVG 描画と、バトル勝利後の報酬生成（`generateRewards`）を担当します。

- **`ui/encyclopedia.js`**:
  図鑑オーバーレイ。モンスター・技・バトルアイテム・えさの一覧をタブ切り替えで表示します。

- **`ui/tutorial.js`**:
  チュートリアル制御モジュール。`initTutorial` / `showTutorialStep` / `hasShownStep` 等を提供します。フル版（ゲーム一時停止＋オーバーレイ）とシンプル版（ヒントバー表示）の 2 モードに対応します。

- **`ui/help.js`**:
  HELP オーバーレイの生成・開閉を担当します。`initHelp` で 6 タブ分のコンテンツを DOM に書き込みます。どの画面からでもフローティングボタン（`?`）で呼び出せます。

---

## 🔹 画面構成（画面遷移フロー）

```
スタート → ストーリー → 名前入力 → モンスター受け取り
    → チュートリアル選択（フル版 / シンプル版 / スキップ）
    → [チュートリアルバトル → 報酬]
    → 拠点（ステージ選択）
    → マップ → バトル → 報酬 → [ステージクリア → 卵選択 → 拠点]

オーバーレイ（常時アクセス可）:
  - HELP（? ボタン、全画面から呼び出し可能）
  - 図鑑（スタート画面から呼び出し可能）
  - チュートリアルオーバーレイ（バトル中フル版チュートリアル時）
```

---

## 🔹 ゲームの起動方法

### 【方法1】GitHub Pages で遊ぶ（Web ですぐプレイ）
以下のリンクから、ブラウザ上ですぐにゲームを遊ぶことができます。
👉 **[Monster Rogue をプレイする](https://wakapai-game.github.io/monster-roguelike/monster_roguelike_web/)**

---

### 【方法2】ローカル環境で起動する（開発用）
本ゲームは JavaScript の ES モジュール（`type="module"`）を使用しているため、HTML ファイルを直接ダブルクリックしても動作しません（CORS エラー）。必ず**ローカルサーバー**を立ち上げて起動してください。

#### Mac 標準の Python を使う（推奨）

1. ターミナルを開き、`monster_roguelike_web` フォルダに移動します。
   ```bash
   cd /path/to/monster-roguelike/monster_roguelike_web
   ```

2. 以下のコマンドでサーバーを起動します。
   ```bash
   python3 -m http.server 8000
   ```

3. ブラウザで `http://localhost:8000` にアクセスします。

> 💡 Visual Studio Code をお使いの場合は「Live Server」拡張機能でも起動できます。
