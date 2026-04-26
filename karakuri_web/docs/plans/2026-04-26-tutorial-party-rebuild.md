# チュートリアル＋パーティ画面 再設計 実装計画

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新規プレイヤーが迷わず完走できるチュートリアルを実現し、パーティ画面をKarakuriシステムに完全対応させる。

**Architecture:**
- パーティ画面（`ui/inventory.js`）をKarakuri専用に書き直す。Monster互換ハック（`_ensureSkills`、`大きさ/賢さ/えさ/育成記録`）を除去し、`tech_parts`/`max_en` ベースのUIにする。
- チュートリアルは「マップ型チュートリアル一本化」を方針とし、`initTutorial()` の呼び出し欠落（バトルステップが出ない致命的バグ）を修正。デッドコードを除去し、体験の流れを整理する。

**Tech Stack:** Vanilla JS ES Modules, HTML/CSS (既存スタック)

---

## 修正前の構造まとめ（把握必須）

| 問題 | 場所 | 重大度 |
|------|------|--------|
| `initTutorial()` 未呼び出し → バトルステップ全滅 | `app.js` btn-tutorial-intro-start | 🔴 致命的 |
| `import { Monster }` (Karakuriは別名) | `ui/inventory.js:3` | 🟡 動作に影響 |
| ST表示（本来はEN） | `ui/inventory.js:311` | 🟡 |
| 大きさ/賢さ/えさ/育成記録（Karakuri非対応） | `ui/inventory.js:317-320, 392-398` | 🟡 |
| `_ensureSkills()` ハック | `ui/inventory.js:112-115` | 🟡 |
| `known_skills`概念なし（Karakuriは`tech_parts`のみ） | 設計上の乖離 | 🟡 |
| デッドコード: `screen-story`, `screen-starter-event`, `screen-tutorial-select`, `startTutorialBattle()`, `grantStarterMonsters()` | `app.js`, `index.html` | 🟢 クリーンアップ |

---

## Part A: パーティ画面 Karakuri対応

### Task A-1: importとAPI整理

**Files:**
- Read: `karakuri_web/game.js` (export確認)
- Modify: `karakuri_web/ui/inventory.js:1-15`

- [ ] **Step 1: game.js の export を確認する**

  game.js が `Monster` をexportしているか確認。していなければ `Karakuri` に差し替え。
  確認ポイント：
  - `export class Karakuri` の有無
  - `export { Karakuri as Monster }` の有無
  - `export class Monster` の有無（別クラス）

- [ ] **Step 2: importを修正する**

  ```js
  // Before
  import { Monster } from '../game.js';
  
  // After
  import { Karakuri } from '../game.js';
  ```
  
  inventory.js 内の `Monster` 参照を `Karakuri` に置換（replace_all）

- [ ] **Step 3: `_ensureSkills()` を削除する**

  inventory.js から `_ensureSkills()` 関数とその呼び出しを全削除。
  代わりに直接 `data.tech_parts || []` を参照する。

- [ ] **Step 4: 動作確認**
  
  ブラウザで `http://localhost:PORT` を開き、パーティ画面が開いてもエラーが出ないことを確認。

---

### Task A-2: ステータス表示をKarakuri専用に修正

**Files:**
- Modify: `karakuri_web/ui/inventory.js` (統計表示部分)

- [ ] **Step 1: stats表示を修正する**

  `_renderPartyDetail` 内のステータスグリッドを以下に変更：

  ```js
  // Before（旧Monster混在）
  statsEl.innerHTML = `
      <div class="party-stat-grid">
          <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${mc.stats.hp}</span></div>
          <div class="stat-row"><span class="stat-label">ST</span><span class="stat-val">${mc.stats.max_st}</span></div>
          ...
      </div>
      <div class="party-stat-grid party-param-grid">
          大きさ/賢さ/えさ  ← 削除
      </div>
  `;
  
  // After（Karakuri専用）
  statsEl.innerHTML = `
      <div class="party-stat-grid">
          <div class="stat-row"><span class="stat-label">HP</span><span class="stat-val">${mc.stats.hp}</span></div>
          <div class="stat-row"><span class="stat-label">EN</span><span class="stat-val">${mc.stats.max_en}</span></div>
          <div class="stat-row"><span class="stat-label">ATK</span><span class="stat-val">${mc.stats.atk}</span></div>
          <div class="stat-row"><span class="stat-label">DEF</span><span class="stat-val">${mc.stats.def}</span></div>
          <div class="stat-row"><span class="stat-label">MAG</span><span class="stat-val">${mc.stats.mag}</span></div>
          <div class="stat-row"><span class="stat-label">SPD</span><span class="stat-val">${mc.stats.spd}</span></div>
      </div>
  `;
  ```

- [ ] **Step 2: 育成記録セクションを削除する**

  `_renderPartyDetail` から `renderGrowthLog(data)` の呼び出しと `renderGrowthLog` 関数を削除。
  Karakuriは成長ログを持たない。

- [ ] **Step 3: えさセクションの扱いを決定する**

  **判断が必要**: Karakuriに「えさ」相当の強化システムがあるか？
  - ある（別名で）→ そのUIに置換
  - ない → `_renderFoodSection()` を削除
  現時点では `_renderFoodSection()` ごと削除してシンプルにする。

- [ ] **Step 4: Commit**

  ```bash
  git add karakuri_web/ui/inventory.js
  git commit -m "refactor(party): Karakuri専用UIに書き直し（ST→EN、えさ/育成ログ削除）"
  ```

---

### Task A-3: 技パーツ（tech_parts）操作の整理

**Files:**
- Modify: `karakuri_web/ui/inventory.js` (技セクション)

Karakuriの技システム：
- `tech_parts`: 装備中のパーツID配列（最大4）
- インベントリ `globalInventory.skills`: 未装備のパーツID配列
- `known_skills` は存在しない → 「覚えた技から選ぶ」ではなく「インベントリから装備する」だけ

- [ ] **Step 1: `_renderLearnSection` を tech_parts ベースに書き直す**

  ```js
  function _renderLearnSection(data) {
      const section = document.createElement('div');
      section.className = 'party-action-section';
      section.id = 'party-learn-section';
  
      const equipped = data.tech_parts || [];
      const label = document.createElement('div');
      label.className = 'party-action-label';
      label.textContent = `技パーツ装備（${equipped.length}/4）`;
      section.appendChild(label);
  
      const skillItems = appState.globalInventory.skills;
      if (skillItems.length === 0) {
          section.innerHTML += '<div style="font-size:0.78rem; color:#64748b;">装備できるパーツがない</div>';
          return section;
      }
  
      // ... インベントリの技パーツをボタン表示 → クリックで装備
  ```

- [ ] **Step 2: `_directApplySkill` を `_equipTechPart` にリネーム＆修正**

  ```js
  function _equipTechPart(data, skillIndex, info) {
      if (!data.tech_parts) data.tech_parts = [];
      if (data.tech_parts.includes(info.id)) { _showPartyToast('すでに装備している！'); return; }
      if (data.tech_parts.length >= 4) { _showPartyToast('装備スロットが満杯（最大4）'); return; }
  
      data.tech_parts.push(info.id);
      appState.globalInventory.skills.splice(skillIndex, 1);
  
      _showPartyToast(`${data.name} に ${info.name} を装備！`);
  
      // チュートリアルフック
      const targetSkill = appState.tutorialAwaitEquipSkillId;
      if (appState.tutorialAwaitEquip && (!targetSkill || targetSkill === info.id)) {
          document.dispatchEvent(new CustomEvent('tutorial-skill-equipped', {
              detail: { skillId: info.id, monster: data }
          }));
          appState.tutorialAwaitEquip = null;
          appState.tutorialAwaitEquipSkillId = null;
      }
  
      renderParty();
  }
  ```

- [ ] **Step 3: スキル表示部分も tech_parts から読み込むよう修正**

  `_renderPartyDetail` 内のバトル技バッジ表示:
  ```js
  const equipped = data.tech_parts || [];
  ```

- [ ] **Step 4: スキル設定モーダルの tech_parts 対応**

  `openSkillEdit` / `renderSkillEditBody` も `tech_parts` を使用するよう修正。
  `known_skills` → `tech_parts`（装備中）。
  「修得技リスト」の概念はなくなるので、そのセクションを削除またはインベントリ未装備パーツ一覧に変更。

- [ ] **Step 5: 動作確認**

  パーティ画面でインベントリの技パーツをカラクリに装備できることを確認。

- [ ] **Step 6: Commit**

  ```bash
  git add karakuri_web/ui/inventory.js
  git commit -m "refactor(party): tech_parts装備操作をKarakuri設計に統一"
  ```

---

## Part B: チュートリアル修正・デッドコード除去

### Task B-1: 致命的バグ修正 — initTutorial 未呼び出し

**Files:**
- Modify: `karakuri_web/app.js`

- [ ] **Step 1: btn-tutorial-intro-start の onClick に initTutorial を追加**

  ```js
  // Before (app.js の btn-tutorial-intro-start 周辺)
  document.getElementById('btn-tutorial-intro-start').onclick = () => {
    document.getElementById('tutorial-intro-overlay').classList.add('hide');
    // チュートリアルアイテムを1回だけ付与
    if (!appState.tutorialItemsGiven) {
      appState.globalInventory.battleItems.push('bitem_hp_potion', 'bitem_hp_potion', 'bitem_st_potion');
      appState.tutorialItemsGiven = true;
    }
    appState.isTutorialMap = true;
    ...
  
  // After: initTutorial を追加
  document.getElementById('btn-tutorial-intro-start').onclick = () => {
    document.getElementById('tutorial-intro-overlay').classList.add('hide');
    initTutorial('full');  // ← この1行を追加
    if (!appState.tutorialItemsGiven) {
      ...
  ```

- [ ] **Step 2: 動作確認**

  チュートリアルマップでバトルを開始し、「ACTION QUEUEとは？」のオーバーレイが表示されることを確認。

- [ ] **Step 3: Commit**

  ```bash
  git add karakuri_web/app.js
  git commit -m "fix(tutorial): initTutorial未呼び出しバグ修正 - マップ型チュートリアルでバトルステップが出るように"
  ```

---

### Task B-2: デッドコード除去

**Files:**
- Modify: `karakuri_web/app.js`
- Modify: `karakuri_web/index.html`

以下はすべて `btn-begin → initPresentation → hub` フローで到達不能なデッドコード：
- `grantStarterMonsters()`（btn-skip-story / btn-skip-all-story から呼ばれていたが、それらのボタンへのルートがない）
- `startTutorialBattle()`（screen-tutorial-selectから呼ばれていたが、そこへのルートがない）
- `screen-story`, `screen-starter-event`, `screen-tutorial-select` の処理

- [ ] **Step 1: app.js からデッドコードを削除する**

  削除対象：
  - `let storyPage = 1;`
  - `function showStoryPage(pageNum)` 関数全体
  - `document.getElementById('btn-skip-all-story').onclick`
  - `document.getElementById('btn-skip-story').onclick`
  - `btnStarterEventProceed.onclick`
  - `document.getElementById('btn-tutorial-full').onclick`
  - `document.getElementById('btn-tutorial-simple').onclick`
  - `document.getElementById('btn-tutorial-skip').onclick`
  - `function grantStarterMonsters()` 関数全体
  - `function startTutorialBattle()` 関数全体

- [ ] **Step 2: index.html からデッドスクリーンを削除する**

  削除対象：
  - `<section id="screen-story" ...>` ブロック全体
  - `<section id="screen-starter-event" ...>` ブロック全体
  - `<section id="screen-tutorial-select" ...>` ブロック全体

- [ ] **Step 3: ui/dom.js の参照クリーンアップ**

  `screenStory`, `screenStarterEvent`, `screenTutorialSelect`, `starterEventGrid`, `btnStarterEventProceed` 等の参照を dom.js から削除。

- [ ] **Step 4: 動作確認**

  削除後、`btn-begin` → Presentation → Hub が正常に遷移することを確認。

- [ ] **Step 5: Commit**

  ```bash
  git add karakuri_web/app.js karakuri_web/index.html karakuri_web/ui/dom.js
  git commit -m "chore: 旧チュートリアルフローのデッドコード除去（story/starter-event/tutorial-select）"
  ```

---

### Task B-3: チュートリアルイベントオーバーレイのUI改善

**Files:**
- Modify: `karakuri_web/app.js` (event_story / event_item ハンドラ)

- [ ] **Step 1: event_story のUI改善**

  カラクリ入手イベントをより印象的に：
  - コルクのNPCポートレートcanvasを追加（すでに `generateNPCSprite(c, 'cork')` の仕組みがある）
  - 技パーツの説明文をよりわかりやすく（「これで戦える」まで伝える）

- [ ] **Step 2: event_item のUI改善**

  技パーツ入手後の誘導を改善：
  - 現在: パーティボタンのパルス + フローティングバナー
  - 改善: バナーのテキストをより明確に「⬆ パーティを開いて、カラクリに技パーツを装備させよう」
  - バナーの位置計算を `openParty` 呼び出し後に再計算するよう修正（スクリーン遷移後も追従）

- [ ] **Step 3: event_equip の廃止または改善**

  現在は「サイレント通過（自動補完）」。これでは学習機会を逃している。
  
  **方針 A（推奨）**: node ごと削除。代わりに event_item → battle へ直接つなぐ。
  （技装備が完了したら自動的にマップが進む現在の設計は変えない）
  
  **方針 B**: event_equip をインタラクティブな「装備確認」画面に変える。
  
  *どちらが望ましいかはプロジェクトオーナーに確認すること。*

- [ ] **Step 4: Commit**

  ```bash
  git add karakuri_web/app.js
  git commit -m "improve(tutorial): チュートリアルイベントUI改善 - カラクリ入手/技装備誘導の強化"
  ```

---

### Task B-4: チュートリアル完走テスト

- [ ] ブラウザでゲームを開き、以下の完走チェックを実施：

  **フロー確認:**
  1. START GAME → Presentation（5スライド） → Hub
  2. 「訓練場」ボタン → tutorial-intro-overlay → 「出発する」
  3. マップ: `event_story` ノードをクリック → カラクリ入手ダイアログ → 「受け取る」
  4. マップ: `event_item` ノードをクリック → 技パーツ入手ダイアログ → 「受け取る」
  5. パーティボタンが光ること → パーティ画面を開く → 技パーツを装備
  6. マップが自動アンロックされること
  7. バトルノードをクリック → バトル開始
  8. **「ACTION QUEUEとは？」オーバーレイが表示されること** ← Task B-1 の確認
  9. バトル中: 攻撃/防御/アイテム等のチュートリアルステップが順次表示されること
  10. Boss バトル → 勝利 → 報酬画面 → Hub
  11. STAGE 1 が解放されていること

  **パーティ画面確認:**
  - HP/EN/ATK/DEF/MAG/SPD が正しく表示される（STと表示されていない）
  - tech_parts が正しく表示される
  - 大きさ/賢さ/えさ が表示されていない
  - インベントリの技パーツを装備できる

---

## 実装順序の推奨

```
A-1 → A-2 → A-3  (パーティ画面、独立して実施可)
    ↕ 並行可
B-1 (致命的バグ修正、最優先)
B-2 (デッドコード、B-1完了後)
B-3 (UI改善、余力があれば)
    ↓
B-4 (全部終わったら完走テスト)
```

---

## 設計上の未決事項（実装前に確認）

1. **Karakuriに「えさ」相当の強化システムはあるか？** なければえさセクションは完全削除。
2. **event_equip ノードを残すか削除するか？** （Task B-3 Step 3）
3. **チュートリアルモード選択（フル/シンプル）は必要か？** 現在の map-based tutorial は `initTutorial('full')` 固定にする予定。
