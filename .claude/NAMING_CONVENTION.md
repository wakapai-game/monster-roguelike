# Rational Naming Protocol — karakuri_web

## 目的
ファイル名とリストの並び順を見るだけで、ファイルを開かずに依存関係と役割を100%推測できる状態を維持する。
エージェントと人間の両方がファイルツリーを見るだけでコンテキストを把握できるようにする。

---

## フォーマット
```
[CATEGORY]_[Module]_[Action].js
```

- **CATEGORY**: 大文字の分類プレフィックス（下表参照）
- **Module**: モジュール名（PascalCase）
- **Action**: 機能・状態の名称（PascalCase）

---

## カテゴリ定義（このプロジェクトで使用するもの）

| プレフィックス | 対象 | 例 |
|---|---|---|
| `UI_` | 画面描画・インタラクション（DOM操作含む） | `UI_Battle_Main.js`, `UI_Inventory_Screen.js` |
| `LOGIC_` | 純粋なJSロジック（Reactに依存しない関数・クラス） | `LOGIC_Battle_Core.js`, `LOGIC_Audio_BGM.js` |
| `DATA_` | 定数・マスターデータ・グローバル状態 | `DATA_Game_Master.js`, `DATA_App_State.js` |

**このプロジェクトでは `HOOK_`・`API_`・`COMPONENT_` は使用しない**（バニラJS ES Modules のため）。

---

## 例外規定（Framework Entrypoints）

フレームワークや `index.html` から直接参照される以下のファイルはプレフィックスを省略可：
- `app.js` — `index.html` の `<script type="module" src="app.js">` で固定参照

---

## 適用対象

**対象**: `karakuri_web/` 配下の `.js` ファイル（ES Modules）  
**対象外**: `.html` / `.css` / `.md` / `.json` / `.png` / 設定ファイル

---

## フォルダ階層（Max Depth: 2）

- `karakuri_web/` — ルートレベル（DATA_・LOGIC_・UI_Title_・app.js）
- `karakuri_web/ui/` — UI画面モジュール（UI_*.js）
- それ以上の深さは禁止。サブフォルダが必要な場合はファイル名のプレフィックスで名前空間を表現する（例: `UI_BattleTest_Core.js`）

---

## 自己監査プロトコル（ファイル作成・リネーム後に実施）

1. **Regex Check**: ファイル名が `^(UI|LOGIC|DATA)_[A-Z][a-zA-Z]+_[A-Z][a-zA-Z]+\.js$` に合致するか
2. **Language Check**: ローマ字表記（Tatakau, Kogeki 等）が混入していないか
3. **Category Check**: `ui/` フォルダ内に `DATA_` や `LOGIC_` ファイルを置いていないか（ルートへ移動すること）
4. **Index Update**: `karakuri_web/.claudecode_index.md` を更新したか

---

## 命名例

```
✅ LOGIC_Battle_Core.js        ← クラス定義・ロジック
✅ DATA_Game_Master.js         ← マスターデータ定数
✅ UI_Inventory_Screen.js      ← 画面UI
✅ UI_BattleTest_Headless.js   ← BattleTestというモジュールのHeadlessアクション

❌ game.js                     ← プレフィックスなし
❌ battleUI.js                 ← 小文字始まり・プレフィックスなし
❌ LOGIC_Tatakau_Core.js       ← ローマ字使用
❌ ui/LOGIC_Audio_BGM.js       ← ui/ 内に LOGIC_ ファイルを置いている
```
