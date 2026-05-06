# プロジェクトコンテキスト — Monster Rogue: Web Edition

**仕様の正**: `karakuri_web/DESIGN.md`（詳細は必ずこちらを参照）
**メインディレクトリ**: `karakuri_web/`
**書き込み禁止**: `monster_roguelike_web/` / `monster_roguelike/`

---

## エージェント別担当ファイル

| エージェント | 担当ファイル |
|------------|------------|
| **ui-engineer** | `karakuri_web/styles.css` / `karakuri_web/index.html` / `karakuri_web/ui/*.js` |
| **logic-engineer** | `karakuri_web/game.js` / `test-engines.js` / `app.js` / `state.js` / `ui/battle.js` / `ui/tutorial.js` / `map.js` |
| **data-engineer** | `karakuri_web/data.js` / `karakuri_web/persistence.js` |

---

## DESIGN.md 参照ガイド

| 知りたい情報 | 参照先 |
|------------|--------|
| ゲームシステム概要・ENパージ・ATB | セクション1・5 |
| 画面構成・遷移フロー・チュートリアル構成 | セクション4 |
| ダメージ計算式・バトル状態機械 | セクション5 |
| キャラ・技・ギアのデータ定義・バランス制約・命名規則 | セクション6 |
| CSSトークン・UIレイアウト原則・ノースクロール制約 | セクション7・9 |
| マップ・ステージ構成 | セクション4 |
| 開発ツール（デバッグ・テストモード） | セクション8 |
