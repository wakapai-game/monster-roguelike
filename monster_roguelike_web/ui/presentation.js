import { generateMonsterSprite, createElementBadge } from './sprite-generator.js';
import { MONSTERS_DATA } from '../data.js';

// ─── スライド定義 ────────────────────────────────────────────────
const SLIDES = [
  {
    tag: 'このゲームとは',
    headline: '地上へ、もう一度。',
    body: '地下に眠るモンスター「ジュウマ」と契約し、荒廃した地上を取り戻す——。プレイヤーはビーステイカーとして、ダンジョンを踏破していく。',
    visual: 'world',
  },
  {
    tag: '育成とは',
    headline: 'えさを与え、\n共に育つ。',
    body: 'ジュウマにえさを与えれば、体が育ち、能力が変わる。大きく育てるか、素早く仕上げるか——あなただけの最強を作れ。',
    visual: 'growth',
    monsterId: 'm_001',
  },
  {
    tag: '構築とは',
    headline: '誰と戦うか、\nそれが戦略だ。',
    body: '最大6体のパーティから3体で出撃。属性の相性と技の組み合わせを考え、最強のチームを組め。',
    visual: 'party',
    monsterIds: ['m_001', 'm_002', 'm_004'],
  },
  {
    tag: '戦闘とは',
    headline: '判断が、\n勝敗を分ける。',
    body: 'ATBゲージが溜まれば行動できる。スタミナを管理しながら攻めるか温存するか——読み合いが勝負を決める。',
    visual: 'battle',
  },
  {
    tag: '旅を始めよう',
    headline: 'ビーステイカーとして、\n地上へ。',
    body: '',
    visual: 'cta',
    monsterIds: ['m_001', 'm_002', 'm_003'],
  },
];

// ─── 状態 ────────────────────────────────────────────────────────
let _currentSlide = 0;
let _onComplete = null;
let _touchStartX = 0;
let _touchStartY = 0;
let _direction = 1; // 1=next, -1=prev
let _animating = false;

// ─── 初期化 ──────────────────────────────────────────────────────
export function initPresentation(onComplete) {
  _onComplete = onComplete;
  _currentSlide = 0;
  _animating = false;

  const screen = document.getElementById('screen-presentation');

  // ドット生成
  const dotsEl = document.getElementById('pres-dots');
  dotsEl.innerHTML = SLIDES.map((_, i) =>
    `<button class="pres-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="スライド${i + 1}"></button>`
  ).join('');

  dotsEl.addEventListener('click', e => {
    const btn = e.target.closest('.pres-dot');
    if (!btn) return;
    const idx = parseInt(btn.dataset.i, 10);
    if (idx !== _currentSlide) {
      _direction = idx > _currentSlide ? 1 : -1;
      _goToSlide(idx);
    }
  });

  // スキップ
  document.getElementById('btn-pres-skip').onclick = _complete;

  // タッチスワイプ
  screen.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  screen.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? _nextSlide() : _prevSlide();
    }
  }, { passive: true });

  // キーボード
  const keyHandler = e => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); _nextSlide(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); _prevSlide(); }
    else if (e.key === 'Escape') _complete();
  };
  document.addEventListener('keydown', keyHandler);
  screen._keyHandler = keyHandler;

  _renderSlide(_currentSlide, 0);
}

// ─── ナビゲーション ──────────────────────────────────────────────
function _nextSlide() {
  if (_animating) return;
  if (_currentSlide < SLIDES.length - 1) {
    _direction = 1;
    _goToSlide(_currentSlide + 1);
  } else {
    _complete();
  }
}

function _prevSlide() {
  if (_animating) return;
  if (_currentSlide > 0) {
    _direction = -1;
    _goToSlide(_currentSlide - 1);
  }
}

function _goToSlide(index) {
  if (_animating) return;
  _animating = true;

  const container = document.getElementById('pres-slide-container');
  const oldSlide = container.querySelector('.pres-slide');

  // 既存スライドをアニメーションアウト
  if (oldSlide) {
    oldSlide.style.transform = `translateX(${_direction < 0 ? '100%' : '-100%'})`;
    oldSlide.style.opacity = '0';
  }

  _currentSlide = index;
  _updateDots();

  // 新スライドをセット
  setTimeout(() => {
    if (oldSlide) oldSlide.remove();
    try {
      _renderSlide(_currentSlide, _direction);
    } finally {
      _animating = false;
    }
  }, 280);
}

function _complete() {
  const screen = document.getElementById('screen-presentation');
  if (screen._keyHandler) {
    document.removeEventListener('keydown', screen._keyHandler);
    screen._keyHandler = null;
  }
  if (_onComplete) _onComplete();
}

// ─── スライド描画 ────────────────────────────────────────────────
function _renderSlide(index, direction) {
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const container = document.getElementById('pres-slide-container');

  const el = document.createElement('div');
  el.className = 'pres-slide';
  el.style.transform = direction === 0 ? 'translateX(0)' : `translateX(${direction > 0 ? '60%' : '-60%'})`;
  el.style.opacity = '0';

  el.innerHTML = `
    <div class="pres-slide-inner">
      <div class="pres-tag-label">${slide.tag}</div>
      <div class="pres-visual-area" id="pres-va-${index}"></div>
      <div class="pres-text-block">
        <h2 class="pres-headline">${slide.headline.replace(/\n/g, '<br>')}</h2>
        ${slide.body ? `<p class="pres-body-text">${slide.body}</p>` : ''}
        ${isLast ? `<button id="btn-pres-start" class="btn btn-primary pres-cta-btn">旅を始める　→</button>` : ''}
      </div>
    </div>
    ${!isLast ? `<div class="pres-tap-hint">タップして次へ</div>` : ''}
  `;

  container.appendChild(el);

  // CTA ボタン
  const ctaBtn = el.querySelector('#btn-pres-start');
  if (ctaBtn) ctaBtn.onclick = _complete;

  // クリックで次へ（ボタン以外）
  el.addEventListener('click', e => {
    if (e.target.closest('#btn-pres-start, .pres-dot, #btn-pres-skip')) return;
    _nextSlide();
  });

  // インエントランスアニメーション
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.28s ease';
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  });

  // ビジュアル描画
  _buildVisual(slide, index);
}

// ─── ビジュアルビルダー ──────────────────────────────────────────
function _buildVisual(slide, index) {
  const va = document.getElementById(`pres-va-${index}`);
  if (!va) return;

  switch (slide.visual) {
    case 'world':   _buildWorldVisual(va); break;
    case 'growth':  _buildGrowthVisual(va, slide.monsterId); break;
    case 'party':   _buildPartyVisual(va, slide.monsterIds); break;
    case 'battle':  _buildBattleVisual(va); break;
    case 'cta':     _buildCtaVisual(va, slide.monsterIds); break;
  }
}

// Slide 1: 世界観
function _buildWorldVisual(va) {
  va.innerHTML = `
    <div class="pres-world">
      <div class="pres-world-sky">
        <div class="pres-star"></div><div class="pres-star"></div><div class="pres-star"></div>
        <div class="pres-star"></div><div class="pres-star"></div>
        <span class="pres-world-sky-label">地上</span>
      </div>
      <div class="pres-world-crack">⬆</div>
      <div class="pres-world-underground">
        <span class="pres-world-ug-label">地下ダンジョン</span>
        <div class="pres-world-ug-icons">⚔️&nbsp;&nbsp;🥚&nbsp;&nbsp;💀</div>
      </div>
    </div>
  `;
}

// Slide 2: 育成
function _buildGrowthVisual(va, monsterId) {
  const mData = MONSTERS_DATA.find(m => m.id === monsterId);
  va.innerHTML = `
    <div class="pres-growth">
      <div class="pres-growth-monster" id="pgm-canvas"></div>
      <div class="pres-growth-stats">
        <div class="pres-growth-stat">
          <span class="pgs-label">ATK</span>
          <div class="pgs-track"><div class="pgs-bar" style="--w:72%;background:#f87171;animation-delay:0.1s"></div></div>
        </div>
        <div class="pres-growth-stat">
          <span class="pgs-label">DEF</span>
          <div class="pgs-track"><div class="pgs-bar" style="--w:55%;background:#60a5fa;animation-delay:0.2s"></div></div>
        </div>
        <div class="pres-growth-stat">
          <span class="pgs-label">SPD</span>
          <div class="pgs-track"><div class="pgs-bar" style="--w:85%;background:#34d399;animation-delay:0.3s"></div></div>
        </div>
        <div class="pres-growth-stat">
          <span class="pgs-label">MAG</span>
          <div class="pgs-track"><div class="pgs-bar" style="--w:40%;background:#a78bfa;animation-delay:0.4s"></div></div>
        </div>
        <div class="pgs-hint">🍖 えさで強化</div>
      </div>
    </div>
  `;

  if (mData) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:80px;height:80px;image-rendering:pixelated;filter:drop-shadow(0 0 10px rgba(251,191,36,0.4))';
    generateMonsterSprite(canvas, mData);
    va.querySelector('#pgm-canvas').appendChild(canvas);
  }
}

// Slide 3: 構築
function _buildPartyVisual(va, monsterIds) {
  const monsters = monsterIds.map(id => MONSTERS_DATA.find(m => m.id === id)).filter(Boolean);

  va.innerHTML = `<div class="pres-party-row"></div>`;
  const row = va.querySelector('.pres-party-row');

  monsters.forEach((mData, i) => {
    const card = document.createElement('div');
    card.className = 'pres-party-card';
    card.style.animationDelay = `${i * 0.12}s`;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:64px;height:64px;image-rendering:pixelated';
    generateMonsterSprite(canvas, mData);

    const badge = createElementBadge(mData.main_element);

    const name = document.createElement('div');
    name.className = 'pres-pcard-name';
    name.textContent = mData.name;

    card.append(canvas, badge, name);
    row.appendChild(card);
  });

  // 属性相性ヒント
  const hint = document.createElement('div');
  hint.className = 'pres-party-hint';
  hint.textContent = '⚡ 属性の相性が勝負を左右する';
  va.appendChild(hint);
}

// Slide 4: 戦闘
function _buildBattleVisual(va) {
  va.innerHTML = `
    <div class="pres-battle-ui">
      <div class="pres-battle-col pres-battle-you">
        <div class="pbu-label">あなた</div>
        <div class="pbu-gauge-row">
          <span class="pbu-g-name">ATB</span>
          <div class="pbu-track"><div class="pbu-fill pbu-atb" style="background:#fbbf24"></div></div>
          <span class="pbu-ready">READY!</span>
        </div>
        <div class="pbu-gauge-row">
          <span class="pbu-g-name">ST</span>
          <div class="pbu-track"><div class="pbu-fill" style="width:78%;background:#a78bfa"></div></div>
          <span class="pbu-val">78</span>
        </div>
        <div class="pbu-actions">
          <div class="pbu-action pbu-action-hl">⚡ フルスイング</div>
          <div class="pbu-action">🛡 防御</div>
        </div>
      </div>
      <div class="pres-battle-vs">VS</div>
      <div class="pres-battle-col pres-battle-enemy">
        <div class="pbu-label">敵</div>
        <div class="pbu-gauge-row">
          <span class="pbu-g-name">ATB</span>
          <div class="pbu-track"><div class="pbu-fill" style="width:55%;background:#f87171"></div></div>
        </div>
        <div class="pbu-gauge-row">
          <span class="pbu-g-name">ST</span>
          <div class="pbu-track"><div class="pbu-fill" style="width:40%;background:#f87171;opacity:0.6"></div></div>
          <span class="pbu-val">40</span>
        </div>
        <div class="pbu-actions">
          <div class="pbu-action pbu-action-dim">行動中...</div>
        </div>
      </div>
    </div>
  `;
}

// Slide 5: CTA
function _buildCtaVisual(va, monsterIds) {
  const monsters = (monsterIds || []).map(id => MONSTERS_DATA.find(m => m.id === id)).filter(Boolean);

  va.innerHTML = `<div class="pres-cta-monsters"></div>`;
  const row = va.querySelector('.pres-cta-monsters');

  monsters.forEach((mData, i) => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `width:72px;height:72px;image-rendering:pixelated;filter:drop-shadow(0 0 14px rgba(251,191,36,0.6));animation:presMonFloat 2s ease-in-out infinite alternate;animation-delay:${i * 0.3}s`;
    generateMonsterSprite(canvas, mData);
    row.appendChild(canvas);
  });
}

// ─── ドット更新 ──────────────────────────────────────────────────
function _updateDots() {
  document.querySelectorAll('.pres-dot').forEach((d, i) => {
    d.classList.toggle('active', i === _currentSlide);
  });
}
