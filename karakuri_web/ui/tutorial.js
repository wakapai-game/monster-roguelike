import { appState } from '../state.js';
import { BATTLE_SYSTEM_VARIANT } from '../game.js';

// ============================================================
// バリアント別チュートリアルステップ定義
// バトルシステムを切り替えるときはここに新しいバリアントを追加し、
// game.js の BATTLE_SYSTEM_VARIANT を変更するだけで切り替わる。
// ============================================================

const STEPS_CASE3 = {
  'pre-battle-1': {
    title: 'ATBゲージで戦え',
    full: 'コルク：「中央のゲージが100になったら行動できる。それがATBだ。\n\nスキルを選んで攻撃しろ。敵のENを削れ。ENが低くなるほどHPへのダメージが溢れやすくなる。\n\nまず1回殴れ。それだけでいい。」',
    simple: '💡 ATBゲージが100になったら行動！スキルで敵ENを削ろう。',
    highlight: null
  },
  'pre-battle-2': {
    title: '今度は反撃してくる',
    full: 'コルク：「今回の相手は速い。こちらより先に動いてくる。\n\n敵が来たら「防御フェーズ」になる。「身を守る」で受けるか、スキルで対応するか、アイテムを使え。\n\n貰ったアイテムも活用しろ。ここで使わなくていつ使う。」',
    simple: '💡 敵が来たら防御フェーズ！Defendかアイテムで対応しよう。',
    highlight: null
  },
  'pre-battle-boss': {
    title: 'ENを管理しろ',
    full: 'コルク：「ボス戦だ。相手はENを大きく削ってくる。\n\nお前のENが尽きるとパーツが強制的に吹き飛ぶ（オートパージ）。\n\n攻撃フェーズの「パージ」ボタンから自分でパーツを外して、先にENを回復する手もある。全部使え。」',
    simple: '💡 ENが切れると強制パージ！攻撃フェーズで任意パージもできる。',
    highlight: null
  },
  'stat-parts-intro': {
    title: 'ステータス強化パーツ',
    full: 'コルク：「強化パーツをガタに組み込んだ。ボーナスがある代わりにデメリットもある。\n\nHPが増えてもSPDが落ちる、ATKが上がるがDEFが下がる。そういうもんだ。\n\n取捨選択が腕の見せ所だ。」',
    simple: '💡 ステータスパーツはボーナスとデメリットがセット。戦略に合わせて選ぼう。',
    highlight: null
  },
  'purge-intro': {
    title: 'パージとは',
    full: 'コルク：「「パージ」ボタンが出てる。攻撃フェーズ中に任意のパーツを外せる。\n\nパーツを捨てると引き換えにENが回復する。ENが尽きそうなときの保険だ。\n\n一度外したパーツは戻らない。考えて使え。」',
    simple: '💡 パージでパーツを外してEN回復。ENが切れる前に使おう。',
    highlight: null
  },
  'pre-battle': {
    title: 'チュートリアル戦闘',
    full: 'コルク：「チュートリアル戦闘だ。相手はダミーのジュウマだ。死んでもリトライできる。安心しろ。\n\n手は抜くな。」',
    simple: '💡 チュートリアル戦闘開始！負けてもリトライできます。',
    highlight: null
  },
  'action-queue': {
    title: 'ACTION QUEUEとは？',
    full: 'コルク：「中央の ACTION QUEUE が行動順だ。上にいるやつが次に動く。SPDが高いほど早く回ってくる。読め。それだけだ。」',
    simple: '💡 ACTION QUEUE: 上にいるほど次に行動します。SPDが高いほど早くなります。',
    highlight: 'timeline-queue'
  },
  'attack-phase': {
    title: '攻撃フェーズ',
    full: 'コルク：「スキルを選んで攻撃しろ。敵の EN（エナジー）を削るんだ。\n\nENが残ってると、ダメージのほとんどがENに吸われる。ENが低くなるほどHPへのダメージが「溢れ」やすくなる。\n\nとにかくスキルを1つ選んでみろ。」',
    simple: '💡 スキルで敵ENを削ろう！ENが低いほどHPへの溢れダメージが増えます！',
    highlight: 'skill-buttons'
  },
  'affinity': {
    title: '属性相性',
    full: 'コルク：「スキルボタンのバッジを見ろ。「バツグン」と出ているやつがある。\n\n属性が有利なスキルはENダメージも、HPへの溢れも両方増える。まず「バツグン」から選べ。それだけで全然違う。\n\n右下の「属性」ボタンで相性表をいつでも確認できる。」',
    simple: '💡 「バツグン」スキルはEN削り＆HP溢れ両方アップ！右下「属性」で相性確認！',
    highlight: 'skill-buttons'
  },
  'st-chip': {
    title: 'ENを削り続けよう',
    full: 'コルク：「いい感じだ。ENが削れてる。\n\nENが低くなるほどHPへのダメージが溢れやすくなる。ログの「HP DMG」が増えてきたらENが落ちてるサインだ。\n\n「バツグン」のスキルはEN削りとHP溢れダメージ、両方が強くなる。属性は覚えとけ。」',
    simple: '💡 ENが削れるほどHPへの溢れダメージが増えます。バツグン属性はさらに強力！',
    highlight: 'p2-active-card'
  },
  'defense-phase': {
    title: '防御フェーズ',
    full: 'コルク：「敵が来るぞ。選択肢がある。\n\n🛡 身を守る → HPへの溢れダメージを半減\n🔮 スキルタブ → EN回復スキルで立て直す\n💊 アイテムタブ → 回復アイテムを使う\n\nどれを選んでもいい。間違えても問題ない。死んだら問題あるが。」',
    simple: '💡 「身を守る」でHP溢れダメージ半減。スキルでEN回復もできます！',
    highlight: 'action-menu'
  },
  'item-use': {
    title: 'アイテムを使う',
    full: 'コルク：「アイテムタブからバトル中にアイテムが使える。\n\n💊 キズぐすり → HPを50回復\n⚡ スタミナドリンク → ENを50回復。ENを高く保つとHPへの溢れダメージを防げる。\n\nまあ、練習だ。使ってみろ。」',
    simple: '💡 スタミナドリンクでENを回復すればHPへの溢れダメージを軽減できます！',
    highlight: 'item-buttons'
  },
  'reward': {
    title: '戦利品',
    full: 'コルク：「勝ったな。3つ報酬が出る。1つもらえ。\n\n⚙️ 技パーツ → インベントリに追加。パーティ画面でカラクリに装備できる\n💊 バトル用アイテム → 次のバトルで使える\n🔩 強化パーツ → カラクリのステータスをアップ\n\nカラクリが増えたら、控えとの交代も使えるようになる。問題ない。」',
    simple: '💡 3つの報酬から1つ選ぼう！クリックして選択し「進む」で受け取り。',
    highlight: 'reward-boxes'
  }
};

const STEPS = STEPS_CASE3;

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
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay?._enableTimer) clearTimeout(overlay._enableTimer);
    _removeSpotlight(targetEl);
    overlay?.classList.add('hide');
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
  document.body.appendChild(catcher);
  // 直前のタップ/クリックが引き継がれないよう1フレーム遅延してリスナーを登録
  requestAnimationFrame(() => {
    catcher.addEventListener('click', onClickCallback, { once: true });
  });
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

  const okBtn = document.getElementById('btn-tutorial-ok');
  // ghost click 防止: スポットライトのタップ直後に合成クリックがOKボタンに当たらないよう
  // 350ms間はクリックを無視する
  okBtn.disabled = true;
  okBtn.onclick = null;
  const enableTimer = setTimeout(() => {
    okBtn.disabled = false;
    okBtn.onclick = () => {
      clearTimeout(overlay._enableTimer);
      overlay.classList.add('hide');
      if (callback) callback();
    };
  }, 350);
  overlay._enableTimer = enableTimer;
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

