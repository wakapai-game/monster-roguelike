import { appState } from '../state.js';
import { BATTLE_SYSTEM_VARIANT } from '../game.js';

// ============================================================
// バリアント別チュートリアルステップ定義
// バトルシステムを切り替えるときはここに新しいバリアントを追加し、
// game.js の BATTLE_SYSTEM_VARIANT を変更するだけで切り替わる。
// ============================================================

const STEPS_CASE3 = {
  'action-queue': {
    title: 'ACTION QUEUEとは？',
    full: '中央パネルの ACTION QUEUE には、次に行動するモンスターの順番が表示されます。\n\n一番上が「次に行動するモンスター」です。スピード(SPD)が高いほど早く順番が回ってきます。\n\n行動順を読んで戦略を立てましょう！',
    simple: '💡 ACTION QUEUE: 上にいるほど次に行動します。SPDが高いほど早くなります。',
    highlight: 'timeline-queue'
  },
  'attack-phase': {
    title: '攻撃フェーズ',
    full: 'あなたのターンです！スキルを選んで攻撃しましょう。\n\n攻撃すると敵の ST（スタミナ）を削れます。ST はモンスターの防御壁で、ST が残っているとスキルの威力がほとんど ST に吸収されます。\n\nST が低くなるほど HP へのダメージが「溢れ」やすくなります。まずはスキルを選んでみましょう！',
    simple: '💡 スキルで敵STを削ろう！STが低いほどHPへのダメージが溢れやすくなります！',
    highlight: 'skill-buttons'
  },
  'st-chip': {
    title: 'STを削り続けよう',
    full: '攻撃するたびに敵の ST が削れています。\n\nST が低くなるほど、次の攻撃で HP へのダメージが溢れやすくなります。ダメージログの「HP DMG」が増えてきたら ST が低くなっているサインです。\n\n「バツグン」バッジのスキルは ST 削りと HP ダメージ両方が強化されます！',
    simple: '💡 STが削れるほどHPへの溢れダメージが増えます。バツグン属性はさらに強力！',
    highlight: 'p2-active-card'
  },
  'defense-phase': {
    title: '防御フェーズ',
    full: '敵の攻撃が来ます！以下から対応を選んでください：\n\n🛡 身を守る → HP への溢れダメージを半減\n🔮 スキルタブ → 防御スキルで ST 回復など対応\n💊 アイテムタブ → 回復アイテムを使用\n🔄 控えと入れ替える → 控えのモンスターに交代\n\nまずは「アイテム」タブを開いて確認してみましょう！',
    simple: '💡 「身を守る」でHP溢れダメージ半減。スキル・アイテム・交代も選べます！',
    highlight: 'action-menu'
  },
  'item-use': {
    title: 'アイテムを使う',
    full: 'アイテムタブからバトル中にアイテムを使えます。\n\n💊 キズぐすり → HP を 50 回復\n⚡ スタミナドリンク → ST を 50 回復（ST を高く保つことで HP への溢れダメージを防げます！）\n\n今回はアイテムを使うか、「身を守る」を選んでください。',
    simple: '💡 スタミナドリンクでSTを回復すればHPへの溢れダメージを軽減できます！',
    highlight: 'item-buttons'
  },
  'swap': {
    title: '控えと交代する',
    full: '「控えと入れ替える」ボタンで控えのモンスターと交代できます。\n\nST が少なくなったモンスターを下げてフレッシュな状態で戦いましょう。控えに回ったモンスターは 1行動ごとに ST が少し自動回復します。\n\n攻撃フェーズ・防御フェーズどちらでも交代可能です！',
    simple: '💡 「控えと入れ替える」でいつでも交代！控えのモンスターはSTが自動回復します。',
    highlight: 'swap-wrapper'
  },
  'affinity': {
    title: '属性相性を活かせ',
    full: 'スキルボタンの「バツグン」バッジに注目！\n\n「バツグン」属性のスキルは ST へのダメージが増えるだけでなく、HP への溢れダメージも大きくなります。\n\n画面右下の緑の「属性」ボタンでいつでも属性相性早見表を確認できます。敵の属性に合わせてスキルを選びましょう！',
    simple: '💡 バツグン属性のスキルはST削り＆HP溢れダメージ両方アップ！右下「属性」で確認！',
    highlight: 'skill-buttons'
  },
  'reward': {
    title: 'バトル報酬',
    full: 'バトルに勝利すると 3 つの報酬候補が表示されます。その中から 1 つを選んで獲得しましょう！\n\n報酬の種類：\n⚔️ 技 → インベントリに追加。パーティ画面でモンスターの技スロットにセットできます\n💊 バトル用アイテム → 次のバトルのアイテムタブで使用できます\n🍖 えさ → モンスターに与えてステータスを永続強化できます（最大 10 回）\n\n3 つのボックスから 1 つクリックして選び「進む」で受け取りましょう！',
    simple: '💡 3つの報酬から1つ選ぼう！クリックして選択し「進む」で受け取り。',
    highlight: 'reward-boxes'
  }
};

// 案4以降を実装したらここに追加
// const STEPS_CASE4 = { ...STEPS_CASE3, 'attack-phase': { ... } };

const STEPS_BY_VARIANT = {
  'case3': STEPS_CASE3,
  // 'case4': STEPS_CASE4,
};

// アクティブバリアントのステップを取得（未定義なら case3 にフォールバック）
const STEPS = STEPS_BY_VARIANT[BATTLE_SYSTEM_VARIANT] ?? STEPS_CASE3;

// ---- 公開API ----

export function initTutorial(mode) {
  appState.tutorialMode = mode;
  appState.tutorialShownSteps = new Set();
}

export function isTutorialActive() {
  return appState.tutorialMode === 'full' || appState.tutorialMode === 'simple';
}

export function isTutorialFullMode() {
  return appState.tutorialMode === 'full';
}

export function hasShownStep(stepId) {
  return appState.tutorialShownSteps?.has(stepId) ?? false;
}

export function markStepShown(stepId) {
  if (!appState.tutorialShownSteps) appState.tutorialShownSteps = new Set();
  appState.tutorialShownSteps.add(stepId);
}

/**
 * チュートリアルステップを表示する。
 * フル版: オーバーレイ表示、OKを押したら callback 呼び出し
 * シンプル版: ヒントバー表示、callback をすぐ呼び出し
 * 既表示ステップは callback をすぐ呼ぶだけ。
 */
export function showTutorialStep(stepId, callback) {
  if (!isTutorialActive() || hasShownStep(stepId)) {
    if (callback) callback();
    return;
  }
  markStepShown(stepId);

  const data = STEPS[stepId];
  if (!data) {
    if (callback) callback();
    return;
  }

  // reward ステップはモード問わず常にオーバーレイ表示（報酬画面ではヒントバーが見えないため）
  if (appState.tutorialMode === 'full' || stepId === 'reward') {
    _showFullOverlay(data, callback);
  } else {
    _showSimpleHint(data);
    if (callback) callback();
  }
}

function _showFullOverlay(data, callback) {
  if (appState.loopInterval) {
    clearInterval(appState.loopInterval);
    appState.loopInterval = null;
  }

  const targetEl = data.highlight ? document.getElementById(data.highlight) : null;

  // 二重呼び出し防止ラッパー
  let safeCalled = false;
  const safeCallback = () => {
    if (safeCalled) return;
    safeCalled = true;
    if (callback) callback();
  };

  // 30秒タイムアウト: OKボタンが押されなくてもゲームが凍らないようにする
  const timeoutId = setTimeout(() => {
    _removeSpotlight(targetEl);
    document.getElementById('tutorial-overlay')?.classList.add('hide');
    safeCallback();
  }, 30000);

  const wrappedCallback = () => {
    clearTimeout(timeoutId);
    safeCallback();
  };

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // 要素が非表示 → スポットライトをスキップして直接モーダル表示
      _showModal(data, wrappedCallback);
      return;
    }
    // フェーズ1: スポットライト — 暗転＋強調表示、クリック待ち
    _showSpotlight(targetEl, () => {
      _removeSpotlight(targetEl);
      _showModal(data, wrappedCallback);
    });
  } else {
    // ハイライト要素なし → 直接モーダル表示
    _showModal(data, wrappedCallback);
  }
}

function _showSpotlight(targetEl, onClickCallback) {
  const pad = 8;
  const r = targetEl.getBoundingClientRect();
  const W = window.innerWidth;
  const H = window.innerHeight;

  // 4枚の暗転ピースを対象要素の周囲に配置
  const pieces = [
    ['tutorial-spotlight-top',    0,            0,           W,                        r.top - pad],
    ['tutorial-spotlight-bottom', r.bottom+pad, 0,           W,                        H - (r.bottom + pad)],
    ['tutorial-spotlight-left',   r.top - pad,  0,           r.left - pad,             r.height + 2 * pad],
    ['tutorial-spotlight-right',  r.top - pad,  r.right+pad, W - (r.right + pad),      r.height + 2 * pad],
  ];
  pieces.forEach(([id, top, left, width, height]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.top    = `${top}px`;
    el.style.left   = `${left}px`;
    el.style.width  = `${Math.max(0, width)}px`;
    el.style.height = `${Math.max(0, height)}px`;
    el.classList.remove('hide');
  });

  // ラベルを要素の下に表示
  const label = document.getElementById('tutorial-spotlight-label');
  if (label) {
    const labelTop = Math.min(r.bottom + 14, H - 50);
    label.style.top  = `${labelTop}px`;
    label.style.left = `${r.left + r.width / 2}px`;
    label.classList.remove('hide');
  }

  // 対象要素をパルス強調
  targetEl.classList.add('tutorial-highlight');

  // クリックキャッチャー: 対象要素の上に透明div → 子要素の誤クリックを防ぎつつクリックを捕捉
  document.getElementById('tutorial-click-catcher')?.remove();
  const catcher = document.createElement('div');
  catcher.id = 'tutorial-click-catcher';
  catcher.style.cssText = `position:fixed;top:${r.top-pad}px;left:${r.left-pad}px;` +
    `width:${r.width+2*pad}px;height:${r.height+2*pad}px;` +
    `z-index:10001;cursor:pointer;border-radius:8px;`;
  catcher.addEventListener('click', onClickCallback, { once: true });
  document.body.appendChild(catcher);
}

function _removeSpotlight(targetEl) {
  ['tutorial-spotlight-top', 'tutorial-spotlight-bottom',
   'tutorial-spotlight-left', 'tutorial-spotlight-right',
   'tutorial-spotlight-label'].forEach(id => {
    document.getElementById(id)?.classList.add('hide');
  });
  document.getElementById('tutorial-click-catcher')?.remove();
  if (targetEl) targetEl.classList.remove('tutorial-highlight');
}

function _showModal(data, callback) {
  const overlay = document.getElementById('tutorial-overlay');
  document.getElementById('tutorial-overlay-title').textContent = data.title;
  document.getElementById('tutorial-overlay-body').textContent = data.full;
  overlay.classList.remove('hide');

  document.getElementById('btn-tutorial-ok').onclick = () => {
    overlay.classList.add('hide');
    if (callback) callback();
  };
}

function _showSimpleHint(data) {
  const hintEl = document.getElementById('tutorial-hint');
  const textEl = document.getElementById('tutorial-hint-text');
  if (!hintEl || !textEl) return;

  textEl.textContent = data.simple;
  hintEl.classList.remove('hide');

  clearTimeout(hintEl._timer);
  hintEl._timer = setTimeout(() => hintEl.classList.add('hide'), 6000);
}

export function hideTutorialHint() {
  document.getElementById('tutorial-hint')?.classList.add('hide');
}
