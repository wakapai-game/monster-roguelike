import { appState } from '../state.js';

// ---- チュートリアルステップ定義 ----
const STEPS = {
  'action-queue': {
    title: 'ACTION QUEUEとは？',
    full: '中央パネルの ACTION QUEUE には、次に行動するモンスターの順番が表示されます。\n\n一番上が「次に行動するモンスター」です。スピード(SPD)が高いほど早く順番が回ってきます。\n\n行動順を読んで戦略を立てましょう！',
    simple: '💡 ACTION QUEUE: 上にいるほど次に行動します。SPDが高いほど早くなります。',
    highlight: 'timeline-queue'
  },
  'attack-phase': {
    title: '攻撃フェーズ',
    full: 'あなたのターンです！スキルを選んで攻撃しましょう。\n\n攻撃すると敵の ST（スタミナ）を削れます。敵の ST は見えませんが、ST が 0 になると敵のカードが赤く点滅してブレイク状態を知らせます。\n\nブレイク中の敵は HP に直接大ダメージを受けます。まずはスキルを選んでみましょう！',
    simple: '💡 スキルで敵STを削ろう！STが0になると敵カードが赤く点滅してブレイク発動！',
    highlight: 'skill-buttons'
  },
  'st-chip': {
    title: 'STを削り続けよう',
    full: '敵はまだブレイクしていません。\n\n敵の ST は画面上に表示されませんが、攻撃するたびに削れています。ST が 0 になると敵のカードが赤く点滅し、ブレイクを知らせます。\n\n引き続き攻撃を続けてブレイクを狙いましょう！「バツグン」バッジのスキルは効果が倍増します。',
    simple: '💡 まだブレイクしていません。攻撃を続けよう！ブレイクすると敵カードが赤く点滅します。',
    highlight: 'p2-active-card'
  },
  'defense-phase': {
    title: '防御フェーズ',
    full: '敵の攻撃が来ます！以下から対応を選んでください：\n\n🛡 身を守る → 受けるダメージを半減\n🔮 スキルタブ → 防御スキルで対応\n💊 アイテムタブ → 回復アイテムを使用\n🔄 控えと入れ替える → 控えのモンスターに交代\n\nまずは「アイテム」タブを開いて確認してみましょう！',
    simple: '💡 「身を守る」でダメージ半減。アイテムタブから回復アイテムも使えます！',
    highlight: 'action-menu'
  },
  'item-use': {
    title: 'アイテムを使う',
    full: 'アイテムタブからバトル中にアイテムを使えます。\n\n💊 キズぐすり → HP を 50 回復\n⚡ スタミナドリンク → ST を 50 回復（ブレイク解除にも！）\n\nアイテムはインベントリ画面で補充できます。今回はアイテムを使うか、「身を守る」を選んでください。',
    simple: '💡 アイテムタブ: キズぐすり(HP回復)やスタミナドリンク(ST回復)が使えます！',
    highlight: 'item-buttons'
  },
  'player-break': {
    title: 'スタミナ切れ！',
    full: '自分のモンスターのSTが0になりブレイク状態です！カードが赤く点滅しています。\n\nブレイク中にSTコストのある技を使うと、STではなく HP を消費します（ボタンに「★HP自傷」と表示）。\n\n対処法：\n🔄 控えのモンスターと交代する\n⚡ スタミナドリンクでSTを回復してブレイク解除\n\n無理に戦い続けるとHPを消耗するので注意しましょう。',
    simple: '💡 自分がブレイク中！技を使うとHPを消費します。交代かスタミナドリンクで立て直そう。',
    highlight: 'skill-buttons'
  },
  'swap': {
    title: '控えと交代する',
    full: '「控えと入れ替える」ボタンで控えのモンスターと交代できます。\n\nブレイク中や ST が少ないときに交代してフレッシュな状態で戦いましょう。攻撃フェーズ・防御フェーズ、どちらでも交代可能です。\n\nスワップボタンを押して試してみましょう！（スキップしても OK）',
    simple: '💡 「控えと入れ替える」でいつでも交代できます！状況に応じて使いましょう。',
    highlight: 'swap-wrapper'
  },
  'break': {
    title: 'ブレイク発動！',
    full: '敵のカードが赤く点滅しています。これがブレイク状態です！\n\nブレイク中の敵は HP へ直接大ダメージが入ります。属性有利（バツグン）なスキルで攻めれば更に大ダメージ！\n\nST が回復するまでブレイクは続きます。今がチャンス、畳み掛けましょう！',
    simple: '💡 赤く点滅 = ブレイク中！HPへ直接大ダメージが入ります。強いスキルで追撃しよう！',
    highlight: 'p2-active-card'
  },
  'reward': {
    title: 'バトル報酬',
    full: 'バトルに勝利すると報酬を 2 つ獲得できます！\n\n報酬の種類はランダムで、以下から選ばれます：\n\n⚔️ 技 (Skill) → インベントリに追加。パーティ画面でモンスターの技スロットにセットできます\n💊 バトル用アイテム → 次のバトルからアイテムタブで使用できます\n🍖 えさ (Food) → モンスターにえさを与えてステータスを永続強化できます（最大 10 回）\n\n「回収して進む」ボタンで報酬を受け取って拠点へ進みましょう！',
    simple: '💡 勝利報酬：技・アイテム・えさがランダムで2つもらえます。「回収して進む」で受け取ろう！',
    highlight: 'reward-boxes'
  },
  'affinity': {
    title: '属性相性を活かせ',
    full: 'スキルボタンの「バツグン」バッジに注目！\n\n「バツグン」属性のスキルはSTダメージ（またはHPダメージ）が倍増します。ブレイク中に「バツグン」スキルを使えばさらに大ダメージ！\n\n「いまいち」は効果が半減するため、相性に注意して攻めましょう。',
    simple: '💡 「バツグン」バッジのスキルは効果倍増！ブレイク中に使えばさらに強力！',
    highlight: 'skill-buttons'
  }
};

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
  return appState.tutorialShownSteps?.has(stepId) ?? true;
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

  const overlay = document.getElementById('tutorial-overlay');
  document.getElementById('tutorial-overlay-title').textContent = data.title;
  document.getElementById('tutorial-overlay-body').textContent = data.full;
  overlay.classList.remove('hide');

  const targetEl = data.highlight ? document.getElementById(data.highlight) : null;
  if (targetEl) targetEl.classList.add('tutorial-highlight');

  document.getElementById('btn-tutorial-ok').onclick = () => {
    if (targetEl) targetEl.classList.remove('tutorial-highlight');
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
