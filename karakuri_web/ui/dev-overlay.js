/**
 * Dev Overlay - デバッグ用オーバーレイ
 * 有効化: URLに ?dev を付ける（例: index.html?dev）
 * 既存UIには一切影響なし（position:fixed / pointer-events:none）
 *
 * 機能:
 * - 左下バッジ: 現在の画面ID をリアルタイム表示（クリックで全ラベルモード切替）
 * - 全ラベルモード: アクティブ画面内の全ID要素にラベルを貼り付け（Shift+D でも切替）
 * - PC: 要素にホバーで ID をツールチップ表示
 * - スマホ: 要素を長押しで ID をポップアップ表示（2秒で消える）
 */

// screen-xxx の "screen-" を除いた短縮名で表示
function screenCode(id) {
  return id.startsWith('screen-') ? id.slice(7) : id;
}

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
    zIndex: '100000',
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'none',
    maxWidth: '220px',
    wordBreak: 'break-all',
  });
  document.body.appendChild(tooltip);

  // ---- 画面IDバッジの更新 ----
  let _presSlideIndex = 0;

  function updateBadge() {
    const active = document.querySelector('.screen.active');
    if (!active) { badge.textContent = '?'; return; }
    const suffix = active.id === 'screen-presentation' ? `-${_presSlideIndex + 1}` : '';
    badge.textContent = `ID:${screenCode(active.id)}${suffix}`;
  }

  // MutationObserver で画面遷移を検知
  const observer = new MutationObserver(() => {
    updateBadge();
    if (_allLabelsActive) _showAllLabels();
  });
  document.querySelectorAll('.screen').forEach(el => {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  updateBadge();

  // presentation.js のスライド変更イベントを受け取る
  document.addEventListener('pres-slide-change', (e) => {
    _presSlideIndex = e.detail.index;
    updateBadge();
  });

  // ---- 全ラベルモード切替ボタン（float-btns-row に挿入） ----
  let _allLabelsActive = false;
  const _labelOverlays = [];

  const labelToggleBtn = document.createElement('button');
  labelToggleBtn.id = 'btn-dev-label-toggle';
  labelToggleBtn.className = 'float-circle-btn';
  labelToggleBtn.title = 'IDラベル表示 ON/OFF';
  labelToggleBtn.textContent = '🏷';
  labelToggleBtn.style.opacity = '0.5';

  // float-btns-row が存在すれば先頭に挿入
  const floatRow = document.getElementById('float-btns-row');
  if (floatRow) floatRow.prepend(labelToggleBtn);

  labelToggleBtn.addEventListener('click', _toggleAllLabels);

  // Shift+D でも切替
  document.addEventListener('keydown', (e) => {
    if (e.key === 'D' && e.shiftKey) _toggleAllLabels();
  });

  function _showAllLabels() {
    _clearAllLabels();
    const active = document.querySelector('.screen.active');
    if (!active) return;

    active.querySelectorAll('[id]').forEach(el => {
      const rect = el.getBoundingClientRect();
      // 非表示・ゼロサイズ要素はスキップ
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (rect.right < 0 || rect.left > window.innerWidth) return;

      const lbl = document.createElement('div');
      Object.assign(lbl.style, {
        position: 'fixed',
        left: `${rect.left + 2}px`,
        top: `${rect.top + 2}px`,
        background: 'rgba(0,0,0,0.82)',
        color: '#fbbf24',
        fontFamily: 'monospace',
        fontSize: '9px',
        lineHeight: '1',
        padding: '1px 3px',
        borderRadius: '2px',
        border: '1px solid rgba(251,191,36,0.6)',
        zIndex: '99998',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        maxWidth: '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      });
      lbl.textContent = `#${el.id}`;
      document.body.appendChild(lbl);
      _labelOverlays.push(lbl);
    });
  }

  function _clearAllLabels() {
    _labelOverlays.forEach(l => l.remove());
    _labelOverlays.length = 0;
  }

  function _toggleAllLabels() {
    _allLabelsActive = !_allLabelsActive;
    if (_allLabelsActive) {
      labelToggleBtn.style.opacity = '1';
      labelToggleBtn.style.background = 'rgba(251,191,36,0.85)';
      labelToggleBtn.style.borderColor = 'rgba(251,191,36,0.9)';
      _showAllLabels();
    } else {
      labelToggleBtn.style.opacity = '0.5';
      labelToggleBtn.style.background = '';
      labelToggleBtn.style.borderColor = '';
      _clearAllLabels();
    }
    updateBadge();
  }

  // ---- ツールチップ表示ヘルパー ----
  function getLabel(el) {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 3).join('.');
    return cls ? `.${cls}` : el.tagName.toLowerCase();
  }

  function positionTooltip(x, y) {
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
