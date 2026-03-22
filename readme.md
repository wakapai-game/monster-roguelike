# Monster Rogue (モンスターローグ)

Monster Rogue は、Webブラウザ上で動作するタクティカル・ローグライクRPGです。
※ゲームのルールや戦闘システム、設計思想については、[`DESIGN.md`](./DESIGN.md) を参照してください。

---

## 🔹 ファイル構成 (File Structure)

本プロジェクトは完全にフロントエンドの技術（HTML / CSS / Vanilla JS）のみで構成されています。

```text
monster-roguelike/
├── DESIGN.md                      # ゲームの設計、バトルシステム、属性等のデザインドキュメント
├── readme.md                      # 本ファイル（起動方法、ファイル構成）
└── monster_roguelike_web/         # Webアプリケーションのルートフォルダ
    ├── index.html                 # メインのHTMLファイル。すべてのUI画面が定義されています。
    ├── styles.css                 # UIのデザイン、アニメーション、エフェクトを管理するCSSファイル。
    ├── app.js                     # エントリポイント。イベント配線・ゲームフロー管理のみ。
    ├── state.js                   # appState（ゲーム全体の状態）の定義と export。
    ├── game.js                    # 戦闘ロジック、モンスタークラス、タイムライン制御を司るコアモジュール。
    ├── map.js                     # ローグライクのノードマップ（Slay the Spire風）をランダム生成するロジック。
    ├── data.js                    # モンスターのマスターデータ、敵データ、スキル構成、アイテム一覧。
    └── ui/                        # UI描画モジュール群
        ├── dom.js                 # 全DOM要素の参照と switchScreen 関数。
        ├── battle.js              # バトルUI全体（フェーズ処理、updateUI、toast等）。
        ├── inventory.js           # インベントリ・パーティ画面のUI。
        └── map-render.js          # マップ描画と報酬生成。
```

### 各モジュールの役割

- **`index.html`**:
  SPA (Single Page Application) のように、`hide` クラスを付け外しすることで画面（ストーリー、拠点、マップ、戦闘、報酬、インベントリ等）を切り替えます。
- **`app.js`**:
  薄いオーケストレーター層。各UIモジュールを import し、ボタンの `onclick` 等のイベントを配線します。ゲームセッションの初期化（`initGameSession`）やバトルセットアップ（`confirmBattleSetup`）もここで行います。
- **`state.js`**:
  `appState` オブジェクトを定義・export します。解放されたステージ、現在いるノード、所持している全モンスターやアイテムなど、ゲーム全体の進行度を管理します。
- **`game.js`**:
  `Monster` クラスによるダメージ計算やブレイク判定、`Timeline` クラスによる行動順（ATB）の並び替え、`BattleEngine` によるターン制御（味方のアクション、敵のAIアクション）を内包しています。
- **`map.js`**:
  `MapGenerator` クラスが指定された階層（Floors）に応じたノードツリーを生成します。開始点からボスまで、パスが繋がっているノードのみを選択して進める仕組みを提供します。
- **`data.js`**:
  各種パラメータはここに集約されています。バランス調整を行う場合は、このファイルの `MONSTERS_DATA` や `SKILLS` を編集します。
- **`ui/dom.js`**:
  全 DOM 要素の参照（`const screenStart = ...` 等）と、画面切替関数 `switchScreen` を提供します。
- **`ui/battle.js`**:
  バトル画面のUI全体を担当。攻撃・防御フェーズの表示、`updateUI`、`toast`、`resumeLoop` などを提供します。
- **`ui/inventory.js`**:
  インベントリ画面とパーティ画面のUIを担当。アイテム・スキルの使用処理も含みます。
- **`ui/map-render.js`**:
  ノードマップの描画と、戦闘勝利後の報酬生成を担当します。

---

## 🔹 ゲームの起動方法

本ゲームは JavaScript の ESモジュール（`type="module"`）を使用しているため、HTMLファイルを直接ダブルクリックしてブラウザで開いても遊ぶことができません（CORSエラーが発生します）。
必ず**ローカルサーバー**を立ち上げて起動してください。

### 【方法】Mac標準のPythonを使う（推奨）

1. ターミナルを開き、ゲームのWeb版フォルダ（`monster_roguelike_web`）に移動します。
   ```bash
   cd /Users/user/Documents/GitHub/monster-roguelike/monster_roguelike_web
   ```

2. 以下のコマンドを実行して簡易サーバーを立ち上げます。
   ```bash
   python3 -m http.server 8000
   ```
   *(Windowsの場合は同梱の `run_game_win.bat` をダブルクリックするだけでも起動します)*

3. Webブラウザ（ChromeやSafariなど）を開き、以下のURLにアクセスします。
   `http://localhost:8000`

> 💡 **補足**: Visual Studio Code をお使いの場合は、拡張機能の「Live Server」を使うことでも手軽に起動可能です。
