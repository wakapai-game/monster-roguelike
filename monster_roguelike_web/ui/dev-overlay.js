/**
 * Dev Overlay - デバッグ用オーバーレイ
 * 有効化: URLに ?dev を付ける（例: index.html?dev）
 * 既存UIには一切影響なし（position:fixed / pointer-events:none）
 *
 * 機能:
 * - 右上バッジ: 現在の画面ID をリアルタイム表示
 * - PC: 要素にホバーで ID をツールチップ表示
 * - スマホ: 要素を長押しで ID をポップアップ表示（2秒で消える）
 */

const DEV_MODE = new URLSearchParams(location.search).has('dev');

const SCREEN_LABELS = {
  'screen-start':           'スタート',
  'screen-story':           'ストーリー',
  'screen-name':            '名前入力',
  'screen-starter-event':   'ジュウマ受け取り',
  'screen-tutorial-select': 'チュートリアル選択',
  'screen-egg':             '卵選択',
  'screen-hub':             '拠点',
  'screen-map':             'マップ',
  'screen-selection':       '出撃選択',
  'screen-battle':          'バトル',
  'screen-reward':          '報酬',
  'screen-inventory':       'インベントリ',
  'screen-party':           'パーティ',
  'screen-sound-test':      'サウンドテスト',
};

export function initDevOverlay() {

  // ---- 画面IDバッジ ----
  const badge = document.createElement('div');
  badge.id = 'dev-screen-badge';
  Object.assign(badge.style, {
    position: 'fixed',
    bottom: '8px',
    left: '8px',
    background: 'rgba(0,0,0,0.75)',
    color: '#00ff88',
    fontFamily: 'monospace',
    fontSize: '11px',
    lineHeight: '1.4',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(0,255,136,0.5)',
    zIndex: '99999',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(badge);

  // ---- 要素IDツールチップ ----
  const tooltip = document.createElement('div');
  tooltip.id = 'dev-id-tooltip';
  Object.assign(tooltip.style, {
    position: 'fixed',
    background: 'rgba(0,0,0,0.85)',
    color: '#fbbf24',
    fontFamily: 'monospace',
    fontSize: '10px',
    lineHeight: '1.4',
    padding: '3px 7px',
    borderRadius: '3px',
    border: '1px solid rgba(251,191,36,0.5)',
    zIndex: '99999',
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'none',
    maxWidth: '220px',
    wordBreak: 'break-all',
  });
  document.body.appendChild(tooltip);

  // ---- 画面IDバッジの更新 ----
  function updateBadge() {
    const active = document.querySelector('.screen.active');
    if (!active) { badge.textContent = '?'; return; }
    const label = SCREEN_LABELS[active.id] || '';
    badge.textContent = label ? `${label}  ${active.id}` : active.id;
  }

  // MutationObserver で画面遷移を検知（switchScreen に触れない）
  const observer = new MutationObserver(updateBadge);
  document.querySelectorAll('.screen').forEach(el => {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  updateBadge();

  // ---- ツールチップ表示ヘルパー ----
  function getLabel(el) {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 3).join('.');
    return cls ? `.${cls}` : el.tagName.toLowerCase();
  }

  function positionTooltip(x, y) {
    // 画面端からはみ出ないよう調整
    const margin = 12;
    let left = x + margin;
    let top = y + margin;
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.style.display = 'block';
    const w = tooltip.offsetWidth;
    const h = tooltip.offsetHeight;
    if (left + w > window.innerWidth) left = x - w - margin;
    if (top + h > window.innerHeight) top = y - h - margin;
    tooltip.style.left = `${Math.max(0, left)}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
  }

  // ---- PC: ホバーで要素ID表示 ----
  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (el === badge || el === tooltip) return;
    tooltip.textContent = getLabel(el);
  });

  document.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'none') return;
    positionTooltip(e.clientX, e.clientY);
  });

  // ---- スマホ: 長押しで要素ID表示（2秒で消える）----
  let longPressTimer = null;
  let longPressMoved = false;

  document.addEventListener('touchstart', (e) => {
    longPressMoved = false;
    const el = e.target;
    if (el === badge || el === tooltip) return;
    longPressTimer = setTimeout(() => {
      if (longPressMoved) return;
      const touch = e.touches[0];
      tooltip.textContent = getLabel(el);
      positionTooltip(touch.clientX, touch.clientY);
      setTimeout(() => { tooltip.style.display = 'none'; }, 2000);
    }, 600);
  }, { passive: true });

  document.addEventListener('touchmove', () => {
    longPressMoved = true;
    clearTimeout(longPressTimer);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
  }, { passive: true });
}
