# UI・チュートリアル・HELPシステム バグ調査レポート

調査日: 2026-03-29
対象ファイル: `tutorial.js`, `help.js`, `map-render.js`, `dom.js`, `index.html`, `styles.css`, `app.js`

---

## 発見されたバグ・問題点

### 1. **tutorial.js:88 — hasShownStep() の論理バグ**

**問題**
```javascript
export function hasShownStep(stepId) {
  return appState.tutorialShownSteps?.has(stepId) ?? true;
}
```

**詳細**
- `appState.tutorialShownSteps` が `null` または `undefined` の場合、オプショナルチェーン `?.has()` は `undefined` を返す
- その後 `?? true` により **常に `true` を返す**
- つまり、**初期化されていない状態では全てのステップが「既表示」扱いになる**

**影響**
- tutorial.js:103 の `if (!isTutorialActive() || hasShownStep(stepId))` で、チュートリアルが有効でも、`tutorialShownSteps` が未初期化なら即座に callback が呼ばれて画面が表示されない
- チュートリアル UI が一切表示されない重大なバグ

**修正案**
```javascript
export function hasShownStep(stepId) {
  return appState.tutorialShownSteps?.has(stepId) ?? false;  // true → false
}
```

---

### 2. **tutorial.js:144-156 — getBoundingClientRect が (0,0,0,0) でもスポットライトが処理される**

**問題**
tutorial.js の `_showSpotlight()` 関数は、対象要素が非表示（`display:none`）の場合でも呼ばれている。

```javascript
function _showSpotlight(targetEl, onClickCallback) {
  const pad = 8;
  const r = targetEl.getBoundingClientRect();  // ← (0,0,0,0) になる可能性
  const W = window.innerWidth;
  const H = window.innerHeight;

  const pieces = [
    ['tutorial-spotlight-top',    0,            0,           W,                        r.top - pad],  // r.top = 0 → height = -8 (invalid)
    ...
  ];
  pieces.forEach(([id, top, left, width, height]) => {
    ...
    el.style.height = `${Math.max(0, height)}px`;  // Math.max(0, -8) = 0 でフェーズが機能しない
    el.classList.remove('hide');
  });
```

**詳細**
- チュートリアルステップのハイライト要素（例：`timeline-queue`）が画面外や display:none の場合、`getBoundingClientRect()` は `DOMRect { top: 0, left: 0, width: 0, height: 0 }` を返す
- `r.top - pad = 0 - 8 = -8` となり、スポットライトのピース高さが負になる
- `Math.max(0, -8) = 0` で確実に 0 高さになるので視認性は落ちないが、**機能的にはスポットライトが完全に無視される**
- その後モーダルが表示されるが、スポットライトのクリック待ちが来ない（要素が非表示なため）

**修正案**
`_showFullOverlay()` で事前に要素の可視性をチェック
```javascript
function _showFullOverlay(data, callback) {
  if (appState.loopInterval) {
    clearInterval(appState.loopInterval);
    appState.loopInterval = null;
  }

  const targetEl = data.highlight ? document.getElementById(data.highlight) : null;

  // ← ここで要素の可視性をチェック
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // 非表示要素 → スポットライト表示せず、直接モーダル
      _showModal(data, callback);
      return;
    }
    _showSpotlight(targetEl, () => {
      _removeSpotlight(targetEl);
      _showModal(data, callback);
    });
  } else {
    _showModal(data, callback);
  }
}
```

---

### 3. **tutorial.js:180 — クリックキャッチャーが残存して UI を塞ぐケース**

**問題**
tutorial.js:180 で作成した `tutorial-click-catcher` div が、複数回の呼び出しやコールバック未発火でリークする。

```javascript
function _showSpotlight(targetEl, onClickCallback) {
  // ...
  document.getElementById('tutorial-click-catcher')?.remove();  // 既存を削除
  const catcher = document.createElement('div');
  catcher.id = 'tutorial-click-catcher';
  catcher.style.cssText = `...z-index:10001;...`;
  catcher.addEventListener('click', onClickCallback, { once: true });  // ← once: true だが...
  document.body.appendChild(catcher);
}

function _removeSpotlight(targetEl) {
  // ...
  document.getElementById('tutorial-click-catcher')?.remove();  // ← _showSpotlight 呼出後、必ず呼ばれるか？
  ...
}
```

**詳細**
- `_showSpotlight()` で作成されたクリックキャッチャーが `once: true` 設定でも、以下のケースで UI を塞ぐ可能性:
  1. **コールバック不発火**: 要素の位置取得に失敗した場合、クリックハンドラが登録されていないが div は残る
  2. **スポットライト表示スキップ**: targetEl が null の場合、_showSpotlight が呼ばれず _removeSpotlight も呼ばれない（不具合2参照）

**影響**
- チュートリアル UI が transparent div で覆われたままゲームが進行
- 以降のタッチ/クリックが無視される

**修正案**
`_removeSpotlight()` を確実に呼ぶか、timeout で自動削除
```javascript
function _showSpotlight(targetEl, onClickCallback) {
  ...
  const catcher = document.createElement('div');
  catcher.id = 'tutorial-click-catcher';
  ...
  const wrappedCallback = () => {
    onClickCallback();
    // コールバック後、明示的にクリックキャッチャーを削除
    document.getElementById('tutorial-click-catcher')?.remove();
  };
  catcher.addEventListener('click', wrappedCallback, { once: true });
  document.body.appendChild(catcher);

  // 念のため 10秒後に自動削除（timeout safety）
  setTimeout(() => {
    document.getElementById('tutorial-click-catcher')?.remove();
  }, 10000);
}
```

---

### 4. **tutorial.js:124-141 — バトルループ clearInterval 後、コールバック呼び忘れで無限停止**

**問題**
tutorial.js の `_showFullOverlay()` で `loopInterval` をクリアしているが、**`_showModal()` コールバック後に resumeLoop() が必ず呼ばれるか保証されていない**

```javascript
function _showFullOverlay(data, callback) {
  if (appState.loopInterval) {
    clearInterval(appState.loopInterval);
    appState.loopInterval = null;  // ← ここでバトルループ停止
  }
  // ...
  if (targetEl) {
    _showSpotlight(targetEl, () => {
      _removeSpotlight(targetEl);
      _showModal(data, callback);  // ← callback がここで呼ばれるはずだが...
    });
  } else {
    _showModal(data, callback);
  }
}

function _showModal(data, callback) {
  const overlay = document.getElementById('tutorial-overlay');
  // ...
  document.getElementById('btn-tutorial-ok').onclick = () => {
    overlay.classList.add('hide');
    if (callback) callback();  // ← OK ボタンを押さないと callback が呼ばれない
  };
}
```

**詳細**
- `_showFullOverlay()` でループをクリアしているため、**ユーザーが OK ボタンを押すまでバトルは完全に停止**
- もし OK ボタンの DOM 要素が見つからない場合（例：tutorial-overlay が innerHTML で上書きされた）、**callback が永遠に呼ばれず、ゲームが frozen**

**影響**（バトルシステムに直結）
- チュートリアルバトルがハング
- プレイ継続不可

**修正案**
timeout safety を追加
```javascript
function _showFullOverlay(data, callback) {
  if (appState.loopInterval) {
    clearInterval(appState.loopInterval);
    appState.loopInterval = null;
  }

  const targetEl = data.highlight ? document.getElementById(data.highlight) : null;

  // ← コールバック安全ラッパー + timeout
  const safeCallback = (() => {
    let called = false;
    return () => {
      if (called) return;
      called = true;
      if (callback) callback();
    };
  })();

  // timeout safety: 30秒後は強制的にループ再開
  const timeoutId = setTimeout(() => {
    console.warn('Tutorial overlay timeout - force resuming battle loop');
    safeCallback();
  }, 30000);

  const wrappedCallback = () => {
    clearTimeout(timeoutId);
    safeCallback();
  };

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      _showModal(data, wrappedCallback);
      return;
    }
    _showSpotlight(targetEl, () => {
      _removeSpotlight(targetEl);
      _showModal(data, wrappedCallback);
    });
  } else {
    _showModal(data, wrappedCallback);
  }
}
```

---

### 5. **help.js:444-480 — buildMonstersContent() が MONSTERS_DATA 空や SKILLS 未定義でクラッシュ**

**問題**
help.js の `buildMonstersContent()` が data の整合性チェックなしで SKILLS.find() を呼び出している

```javascript
function buildMonstersContent() {
  const cards = MONSTERS_DATA.map(m => {
    // ...
    const skillNames = (m.skills || []).map(id => {
      const s = SKILLS.find(sk => sk.id === id);  // ← SKILLS が undefined や空配列の場合、find() は undefined を返す
      return s ? s.name : id;
    }).join('、') || '—';
    // ...
  }).join('');
  return `...${cards}...`;
}
```

**詳細**
- `SKILLS` が未定義または空配列の場合、`.find()` が `undefined` を返す
- `s ? s.name : id` で `id` が代わりに使われるが、UI 表示として不正確
- `MONSTERS_DATA` が空の場合、そのまま「モンスター一覧が空」として表示される（バグではないが、エラーハンドリングが甘い）

**修正案**
防御的プログラミング
```javascript
function buildMonstersContent() {
  if (!MONSTERS_DATA || MONSTERS_DATA.length === 0) {
    return `<div class="help-section"><p>モンスターデータが利用できません。</p></div>`;
  }

  const cards = MONSTERS_DATA.map(m => {
    // ...
    const skillNames = (m.skills || []).map(id => {
      const s = SKILLS?.find?.(sk => sk.id === id);  // ← SKILLS が undefined の場合も安全
      return (s && s.name) ? s.name : id;
    }).join('、') || '—';
    // ...
  }).join('');
  return `...`;
}
```

---

### 6. **app.js:24-26 — グローバルボタンハンドラが登録されたか不確実**

**問題**
app.js でグローバル HELP ボタンのイベントハンドラを登録しているが、**要素が存在しない場合のエラーハンドリングがない**

```javascript
// app.js:24-26
document.getElementById('btn-help-global').onclick = openHelp;
document.getElementById('btn-affinity-global').onclick = () => openHelpTab('affinity');
document.getElementById('btn-monsters-global').onclick = () => openHelpTab('monsters');
```

**詳細**
- `index.html` に `id="btn-help-global"` 等が定義されているが、もし欠落した場合、`.onclick = ...` は `null.onclick` となってエラーが発生
- モジュール読み込み時にエラーが起きると、後続の初期化が全て中断される可能性

**影響**
- 起動時にアプリがクラッシュ
- ユーザーが何も操作できない状態

**修正案**
null チェック
```javascript
document.getElementById('btn-help-global')?.addEventListener('click', openHelp);
document.getElementById('btn-affinity-global')?.addEventListener('click', () => openHelpTab('affinity'));
document.getElementById('btn-monsters-global')?.addEventListener('click', () => openHelpTab('monsters'));
```

---

### 7. **map-render.js:32-43 — _pendingReward が複数回上書きされても collectPendingReward() は1回のみ追加**

**問題**
reward を複数回選択し直しても、`_pendingReward` は上書きされるが、`collectPendingReward()` は1回だけ呼ばれる

```javascript
// map-render.js:25-33
box.onclick = () => {
  rBoxes.querySelectorAll('.reward-box-selectable').forEach(b => b.classList.remove('selected'));
  box.classList.add('selected');
  btnCollect.disabled = false;
  appState.globalInventory._pendingReward = { type: pool.type, id: item.id };  // ← 上書き
};

// map-render.js:38-44
export function collectPendingReward() {
  const pending = appState.globalInventory._pendingReward;
  if (!pending) return;
  if (pending.type === 'skill')      appState.globalInventory.skills.push(pending.id);
  if (pending.type === 'battleItem') appState.globalInventory.battleItems.push(pending.id);
  if (pending.type === 'food')       appState.globalInventory.mapItems.push(pending.id);
  delete appState.globalInventory._pendingReward;  // ← ここで削除
}
```

**詳細**
- UI 上で複数回 reward を選択し直すことは可能（`_pendingReward` は上書き）
- しかし `collectPendingReward()` は button click イベント後に1回だけ呼ばれる
- つまり、**最後に選択した reward だけがインベントリに追加される** — これは仕様通り
- **バグではない**が、UI 期待値として「前の選択がリセットされる」という挙動が曖昧

**修正案**
実際には修正不要だが、UI フィードバックを明確化するなら
```javascript
box.onclick = () => {
  rBoxes.querySelectorAll('.reward-box-selectable').forEach(b => {
    b.classList.remove('selected');
    b.style.opacity = '0.6';  // ← 非選択状態を視認化
  });
  box.classList.add('selected');
  box.style.opacity = '1';
  btnCollect.disabled = false;
  appState.globalInventory._pendingReward = { type: pool.type, id: item.id };
};
```

---

### 8. **styles.css:87-88 — .hide と .screen.hide の !important 競合**

**問題**
スタイルシート内で `.hide` と `.screen.hide` が異なる specificity で定義されている

```css
/* styles.css:87-88 */
.hide { display: none; }
.screen.hide { display: none !important; }
```

**詳細**
- `.hide` は単純に `display: none`
- `.screen.hide` は `!important` 付き
- `.screen` クラスに対してのみ `!important` が付く
- 意図的な設計のようだが、**他の要素（div, button）に対しては .hide の特異性が低く、インラインスタイルで上書きされる可能性**

```javascript
// もし誰かが以下を書いた場合:
const el = document.querySelector('.some-overlay');
el.style.display = 'block';  // インラインスタイル
el.classList.add('hide');    // .hide は display: none (特異性が負け)
// → el は見えたままになる
```

**修正案**
一貫性のために全てに `!important` を付けるか、インラインスタイル操作を避ける
```css
.hide { display: none !important; }
.screen.hide { display: none !important; }
```

---

### 9. **tutorial.js & styles.css — .tutorial-spotlight-piece.hide が二重定義**

**問題**
```css
/* styles.css:1285-1289 */
.tutorial-spotlight-piece {
  position: fixed;
  background: rgba(0, 0, 0, 0.75);
  z-index: 5000;
  pointer-events: none;  // ← pointer-events: none なのに...
}

.tutorial-highlight {
  position: relative;
  z-index: 10000;
  ...
}
```

**詳細**
- `.tutorial-spotlight-piece` には `pointer-events: none` が設定されている
- つまり、暗転ピースはクリック不可
- **代わりに tutorial-click-catcher (z-index: 10001) が対象要素の上に配置されて、そこでクリック待ち**
- これは設計として正しい

**バグではないが、誤解の元**
- `styles.css` に `.tutorial-spotlight-piece.hide` の明示的な定義がない（`.hide { display: none }` に依存）
- テスト性を上げるなら明示的に定義すべき

**修正案**（オプション）
```css
.tutorial-spotlight-piece.hide { display: none; }
```

---

### 10. **dom.js:53 — btnCollectReward が null の場合のハンドリング**

**問題**
dom.js で `btnCollectReward` を export しているが、null チェックがない

```javascript
// dom.js:53
export const btnCollectReward = document.getElementById('btn-collect-reward');
```

**詳細**
- `index.html` に `id="btn-collect-reward"` が定義されているので、現在は null ではない
- しかし、HTML 変更時に欠落すると、`app.js:279` の以下が失敗
```javascript
btnCollectReward.onclick = () => { ... };  // ← TypeError: Cannot set property onclick of null
```

**修正案**
app.js でのハンドラ登録時にチェック
```javascript
btnCollectReward?.addEventListener?.('click', () => {
  collectPendingReward();
  // ...
});
```

---

### 11. **index.html:53 — DOM 構造とチュートリアルの要素マッピング**

**問題**
tutorial.js で指定されるハイライト要素が全て index.html に存在するか確認が必要

**調査結果**
```javascript
// tutorial.js の STEPS_CASE3 で使用されるハイライト ID:
'timeline-queue'      // ✓ index.html:282 に存在
'skill-buttons'       // ✓ battle.js で動的生成（存在）
'p2-active-card'      // ✓ index.html:294 に存在
'action-menu'         // ✓ index.html:308 に存在
'item-buttons'        // ✓ battle.js で動的生成（存在）
'swap-wrapper'        // ✓ index.html:? で確認が必要
'reward-boxes'        // ✓ index.html:234 に存在
```

**`swap-wrapper` の確認**
```bash
grep "swap-wrapper" index.html
→ <div id="swap-wrapper"> が存在（確認済み）
```

**問題なし** - 全ての要素が index.html に存在

---

## サマリー：重大度別バグリスト

| ID | ファイル | 行番号 | 重大度 | 内容 |
|----|---------|--------|--------|------|
| 1  | tutorial.js | 88 | 🔴 Critical | hasShownStep() の ?? true が全ステップを未表示にする |
| 2  | tutorial.js | 144-156 | 🔴 Critical | getBoundingClientRect(0,0,0,0) でスポットライト無視 |
| 3  | tutorial.js | 180 | 🟠 High | クリックキャッチャーが残存して UI 塞ぎ |
| 4  | tutorial.js | 124-141 | 🔴 Critical | バトルループ clearInterval 後、コールバック未発火で無限停止 |
| 5  | help.js | 444-480 | 🟠 High | SKILLS 未定義や MONSTERS_DATA 空でクラッシュ |
| 6  | app.js | 24-26 | 🟠 High | グローバルボタン登録時の null チェック欠落 |
| 7  | map-render.js | 32-43 | 🟢 Low | _pendingReward 上書き時の UI フィードバック不足（仕様通り） |
| 8  | styles.css | 87-88 | 🟡 Medium | .hide と .screen.hide の !important 競合 |
| 9  | tutorial.js/styles.css | - | 🟢 Low | .tutorial-spotlight-piece.hide が明示的に定義されていない |
| 10 | dom.js/app.js | 53/279 | 🟡 Medium | btnCollectReward null チェック欠落 |
| 11 | index.html | - | 🟢 Low | ハイライト要素マッピング — 問題なし |

---

## 推奨修正優先度

1. **バグ #1** — hasShownStep() 修正（1行） — **最優先**
2. **バグ #4** — loopInterval timeout safety 追加 — **次優先**
3. **バグ #2** — getBoundingClientRect チェック → _showFullOverlay 改修 — **次優先**
4. **バグ #6** — グローバルボタン null チェック
5. **バグ #3** — クリックキャッチャー timeout safety
6. **バグ #5** — help.js 防御的プログラミング
7. **バグ #8** — CSS !important 一貫性
8. **バグ #10** — btnCollectReward null チェック

---

## 補足

- **バグ #9** は仕様通り（.hide に依存しても機能）
- **バグ #7** は実装仕様上正常（UI 改善は optional）
- **バグ #11** はクリアしている

すべての Critical/High バグの修正で、チュートリアル・バトルループ・Help システムの安定性が大幅に向上します。
