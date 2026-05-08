// ui/gear-deck.js
// GearHandDeck: unified TECH / BODY / CORE card fan animation

const ELEM_COLORS = {
  fire:    { bg: '#c0622a', glow: '#ff9966' },
  water:   { bg: '#2a6ac0', glow: '#66aaff' },
  thunder: { bg: '#c0a02a', glow: '#ffdd44' },
  wind:    { bg: '#2ac07a', glow: '#44ffaa' },
  earth:   { bg: '#7a6230', glow: '#cc9944' },
  light:   { bg: '#a0a02a', glow: '#eeff66' },
  dark:    { bg: '#5a2a9a', glow: '#aa66ff' },
  none:    { bg: '#4a4a5a', glow: '#8888aa' },
};

const STAT_COLORS = {
  hp:     { bg: '#7f1d1d', glow: '#f87171' },
  atk:    { bg: '#7c2d12', glow: '#fb923c' },
  def:    { bg: '#1e3a5f', glow: '#60a5fa' },
  mag:    { bg: '#581c87', glow: '#c084fc' },
  spd:    { bg: '#14532d', glow: '#4ade80' },
  max_en: { bg: '#164e63', glow: '#22d3ee' },
  en_rec: { bg: '#164e63', glow: '#22d3ee' },
};

const CORE_COLOR = { bg: '#713f12', glow: '#fbbf24' };
const STAT_LABEL = { hp: 'HP', atk: 'ATK', def: 'DEF', mag: 'MAG', spd: 'SPD', max_en: 'EN', en_rec: 'EN+' };

function _cardColor(card) {
  if (card.cardType === 'core') return CORE_COLOR;
  if (card.cardType === 'body') return STAT_COLORS[card.primaryStat] || STAT_COLORS.def;
  return ELEM_COLORS[card.elem] || ELEM_COLORS.none;
}

function calcFanParams(count) {
  const c      = Math.max(1, count);
  const cardW  = Math.max(44, Math.round(70 - (c - 4) * 2.4));
  const slotW  = Math.max(32, cardW - 6);
  const slotGap = Math.max(2, Math.round(52 - (c - 4) * 2.5) - slotW + 2);
  const spread = Math.min(42, 16 + c * 2);
  const baseY  = Math.min(20, 10 + c * 1.0);
  const cardH  = Math.round(cardW * 1.38);
  // fanInner幅はスロット総幅＋カード半幅マージンで決まる（slotとcard位置を一致させる）
  const totalSlotsW = c * slotW + (c - 1) * slotGap;
  const contW  = Math.min(totalSlotsW + cardW, 960);
  return { cardW, cardH, slotW, slotGap, spread, baseY, contW, totalSlotsW };
}

/**
 * @param {HTMLElement} container - #parts-deck-tech-row
 * @param {Array} cards  - unified array of tech/body/core card objects
 * @param {'idle'|'attack'} mode
 * @param {(partId: string) => void} onCardClick  - only fires for tech cards
 */
export function renderGearDeck(container, cards, mode, onCardClick) {
  if (container._gdCleanup) {
    container._gdCleanup();
    container._gdCleanup = null;
  }
  container.innerHTML = '';

  if (!cards || cards.length === 0) return;

  const count = Math.min(cards.length, 10);
  const validCards = cards.slice(0, count);
  const { cardW, cardH, slotW, slotGap, spread, baseY, contW, totalSlotsW } = calcFanParams(count);

  let ejectedCount = 0;
  let phase = 'idle';
  let ejectionTimer = null;

  // ── Wrapper ───────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.className = 'gd-wrapper';
  container.appendChild(wrapper);

  // ── Fan Layer (absolute, bottom-anchored, overflows above wrapper) ───
  const fanLayer = document.createElement('div');
  fanLayer.className = 'gd-fan-layer';
  fanLayer.style.height = `${cardH + 26}px`;
  wrapper.appendChild(fanLayer);

  const fanInner = document.createElement('div');
  fanInner.className = 'gd-fan-inner';
  fanInner.style.width  = `${contW}px`;
  fanInner.style.height = `${cardH + 26}px`;
  fanLayer.appendChild(fanInner);

  // ── Slot Row (in-flow, 52px height) ──────────────────────────────────
  const slotRow = document.createElement('div');
  slotRow.className = 'gd-slot-row';
  slotRow.style.gap = `${slotGap}px`;
  wrapper.appendChild(slotRow);

  const labelEl = document.createElement('div');
  labelEl.className = 'gd-label';
  labelEl.textContent = `GEAR DECK — ${count}/10`;
  slotRow.appendChild(labelEl);

  const slotEls = validCards.map((card) => {
    const e = _cardColor(card);

    const slot = document.createElement('div');
    slot.className = 'gd-slot';
    slot.style.width       = `${slotW}px`;
    slot.style.borderColor = `${e.bg}55`;

    const railL = document.createElement('div');
    railL.className  = 'gd-slot-rail gd-slot-rail-l';
    railL.style.background = `${e.bg}44`;

    const railR = document.createElement('div');
    railR.className  = 'gd-slot-rail gd-slot-rail-r';
    railR.style.background = `${e.bg}44`;

    const dot = document.createElement('div');
    dot.className = 'gd-slot-dot';
    dot.style.background = e.glow;
    dot.style.boxShadow  = `0 0 6px ${e.glow}`;

    slot.appendChild(railL);
    slot.appendChild(railR);
    slot.appendChild(dot);
    slotRow.appendChild(slot);

    return { slot, dot, railL, railR, e };
  });

  // ── Card Elements ─────────────────────────────────────────────────────
  const mid = (count - 1) / 2;

  const cardInfos = validCards.map((card, i) => {
    const offset = i - mid;
    const norm   = mid > 0 ? offset / mid : 0;
    const angle  = norm * (spread / 2);
    const yDrop  = Math.abs(norm) * baseY;
    // カードX位置はスロット中心と完全一致させる（xOffsetをslotCenterXに統一）
    const slotCenterX = -totalSlotsW / 2 + slotW / 2 + i * (slotW + slotGap);
    const e = _cardColor(card);

    const cardEl = document.createElement('div');
    cardEl.className = 'gd-card';
    cardEl.style.cssText = `width:${cardW}px;height:${cardH}px;margin-left:${-cardW / 2}px;` +
      `transform:translateX(${slotCenterX}px) translateY(${cardH + 20}px) rotate(0deg) scale(0.7);` +
      `opacity:0;z-index:${i};cursor:default;transition:none;`;

    // ── Tooltip ──
    let tooltipText = card.name || card.id;
    if (card.cardType === 'tech') {
      tooltipText = card.desc ? `${card.name}\n${card.desc}\nEN:${card.en}` : `${card.name}\nEN:${card.en}`;
    } else if (card.cardType === 'body') {
      const bLines = Object.entries(card.bonus   || {}).map(([k, v]) => `${STAT_LABEL[k] || k}+${v}`);
      const pLines = Object.entries(card.penalty || {}).map(([k, v]) => `${STAT_LABEL[k] || k}${v}`);
      tooltipText = card.name
        + (bLines.length ? '\n▲ ' + bLines.join(' ') : '')
        + (pLines.length ? '\n▼ ' + pLines.join(' ') : '');
    } else if (card.cardType === 'core') {
      tooltipText = card.name + (card.desc ? '\n' + card.desc : '');
    }
    cardEl.dataset.tooltip = tooltipText;

    const shortName = card.name.length > 5 ? card.name.slice(0, 4) + '…' : card.name;
    const iconSz    = Math.round(cardW * 0.36);
    const typeLabel = card.cardType === 'body' ? 'BODY' : card.cardType === 'core' ? 'CORE' : 'TECH';
    const idFs      = Math.max(5, Math.round(cardW * 0.085));
    const nameFs    = Math.max(8, cardW * 0.13);
    const footerFs  = Math.max(7, cardW * 0.11);
    const enLabelFs = Math.max(6, cardW * 0.09);

    const affBadge = card.affinity === 'strong'
      ? `<span class="gd-aff-badge tech-aff-strong">◎</span>`
      : card.affinity === 'weak'
      ? `<span class="gd-aff-badge tech-aff-weak">△</span>`
      : '';

    // ── Card body per type ──
    let cardBody;
    if (card.cardType === 'tech') {
      cardBody = `
        <div class="gd-card-icon-wrap" style="background:radial-gradient(ellipse at 50% 60%,${e.bg}1a,transparent 70%);">
          <div class="gd-card-icon-star" style="width:${iconSz}px;height:${iconSz}px;background:${e.bg}44;border-color:${e.bg}88;">
            <div class="gd-card-icon-dot" style="width:${Math.round(iconSz*0.36)}px;height:${Math.round(iconSz*0.36)}px;background:${e.glow};box-shadow:0 0 6px ${e.glow};"></div>
          </div>
        </div>
        <div class="gd-card-name" style="font-size:${nameFs}px;">${shortName}</div>
        <div style="font-size:${idFs}px;color:#6b7280;font-family:monospace;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px;text-align:center;">${card.id}</div>
        <div class="gd-card-footer">
          <span class="gd-card-en" style="font-size:${footerFs}px;">${card.en}<span class="gd-card-en-label" style="font-size:${enLabelFs}px;">EN</span></span>
        </div>`;
    } else if (card.cardType === 'body') {
      const mainKey = Object.keys(card.bonus || {})[0];
      const mainVal = mainKey ? `+${card.bonus[mainKey]}` : '';
      const statLbl = STAT_LABEL[card.primaryStat] || card.primaryStat || '?';
      cardBody = `
        <div class="gd-card-icon-wrap" style="background:radial-gradient(ellipse at 50% 60%,${e.bg}1a,transparent 70%);">
          <div style="font-size:${Math.max(10,Math.round(cardW*0.22))}px;font-weight:bold;color:${e.glow};font-family:'JetBrains Mono',monospace;text-align:center;line-height:1;">${statLbl}</div>
        </div>
        <div class="gd-card-name" style="font-size:${nameFs}px;">${shortName}</div>
        <div style="font-size:${idFs}px;color:#6b7280;font-family:monospace;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px;text-align:center;">${card.id}</div>
        <div class="gd-card-footer">
          <span class="gd-card-en" style="font-size:${footerFs}px;color:${e.glow};">${mainVal}</span>
        </div>`;
    } else {
      // CORE
      cardBody = `
        <div class="gd-card-icon-wrap" style="background:radial-gradient(ellipse at 50% 60%,${e.bg}1a,transparent 70%);">
          <div style="font-size:${Math.max(14,Math.round(cardW*0.28))}px;color:${e.glow};text-align:center;line-height:1;">✦</div>
        </div>
        <div class="gd-card-name" style="font-size:${nameFs}px;">${shortName}</div>
        <div style="font-size:${idFs}px;color:#6b7280;font-family:monospace;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px;text-align:center;">${card.id}</div>
        <div class="gd-card-footer"></div>`;
    }

    cardEl.innerHTML = `
      <div class="gd-card-inner">
        <div class="gd-card-stripe" style="background:linear-gradient(90deg,${e.bg},${e.glow}88);"></div>
        <div class="gd-card-type" style="font-size:${Math.max(6,cardW*0.1)}px;color:${e.glow}99;">${typeLabel}</div>
        ${cardBody}
        ${affBadge}
        ${card.isPurged ? '<div class="gd-purged-overlay">PURGED</div>' : ''}
      </div>`;

    fanInner.appendChild(cardEl);
    return { cardEl, slotCenterX, yDrop, angle, e, card, isHovered: false, isSelected: false };
  });

  // ── Position Updater ──────────────────────────────────────────────────
  function updateCard(ci) {
    const info = cardInfos[ci];
    const { cardEl, slotCenterX, yDrop, angle } = info;
    const isEjected           = ci < ejectedCount;
    const isCurrentlyEjecting = phase === 'ejecting' && ci === ejectedCount;
    const isHov = info.isHovered && phase === 'ready';
    const isSel = info.isSelected;
    const isTech = info.card.cardType === 'tech';

    let tx, ty, rot, opacity, scale, transition;
    if (!isEjected && !isCurrentlyEjecting) {
      // 隠れている状態: スロット真上に整列（slotCenterXで位置合わせ）
      tx = slotCenterX; ty = cardH + 20; rot = 0; opacity = 0; scale = 0.7;
      transition = 'none';
    } else if (isCurrentlyEjecting) {
      // エジェクション中: スロット中心から飛び出す（中央カードも必ず10px上げる）
      tx = slotCenterX; ty = isHov || isSel ? -(yDrop + 22) : -(yDrop + 10);
      rot = isHov || isSel ? 0 : angle; opacity = 1; scale = 1.05;
      transition = 'transform 0.28s cubic-bezier(0.1,1.4,0.3,1), opacity 0.12s ease';
    } else {
      // ready状態: スロット中心から扇形に展開（中央カードも必ず10px上げる）
      tx = slotCenterX; ty = isHov || isSel ? -(yDrop + 22) : -(yDrop + 10);
      rot = isHov || isSel ? 0 : angle; opacity = 1; scale = 1;
      transition = 'transform 0.16s cubic-bezier(0.2,0.8,0.3,1)';
    }

    cardEl.style.transition = transition;
    cardEl.style.transform  = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`;
    cardEl.style.opacity    = opacity;
    cardEl.style.zIndex     = isHov || isSel ? 50 : isCurrentlyEjecting ? 30 : ci;
    cardEl.style.cursor     = isTech && phase === 'ready' && !info.card.isPurged ? 'pointer' : 'default';

    const inner = cardEl.querySelector('.gd-card-inner');
    if (inner) {
      const e = info.e;
      if (isSel && isTech) {
        inner.style.borderColor = e.bg;
        inner.style.boxShadow   = `0 0 18px ${e.glow}66, 0 8px 24px rgba(0,0,0,0.7)`;
        inner.style.background  = `linear-gradient(160deg,${e.bg}55,#1a0f0a)`;
      } else if (isHov && isTech) {
        inner.style.borderColor = `${e.bg}88`;
        inner.style.boxShadow   = `0 4px 20px rgba(0,0,0,0.5)`;
        inner.style.background  = `linear-gradient(160deg,${e.bg}33,#1a0f0a)`;
      } else {
        inner.style.borderColor = '#4a3728';
        inner.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.4)';
        inner.style.background  = '#1a0f0a';
      }
    }
  }

  // ── Slot State ────────────────────────────────────────────────────────
  function ejectSlot(ci) {
    const { slot, dot, railL, railR } = slotEls[ci];
    slot.style.background  = 'rgba(0,0,0,0.4)';
    slot.style.borderColor = 'rgba(255,255,255,0.06)';
    dot.style.display      = 'none';
    railL.style.background = 'rgba(255,255,255,0.04)';
    railR.style.background = 'rgba(255,255,255,0.04)';
    const empty = document.createElement('div');
    empty.className = 'gd-slot-empty';
    slot.appendChild(empty);
  }

  // ── Ejection Sequence ─────────────────────────────────────────────────
  function ejectStep() {
    if (ejectedCount >= count) {
      ejectionTimer = setTimeout(() => {
        phase = 'ready';
        fanLayer.style.pointerEvents = 'auto';
        cardInfos.forEach((_, ci) => updateCard(ci));
      }, 200);
      return;
    }
    const ci = ejectedCount;
    ejectSlot(ci);
    updateCard(ci);
    ejectedCount++;
    ejectionTimer = setTimeout(ejectStep, 70);
  }

  function startEjection() {
    phase = 'ejecting';
    ejectedCount = 0;
    fanLayer.style.pointerEvents = 'none';
    ejectStep();
  }

  // ── Hover / Click ─────────────────────────────────────────────────────
  cardInfos.forEach((info, ci) => {
    info.cardEl.addEventListener('mouseenter', () => {
      if (phase !== 'ready') return;
      info.isHovered = true;
      updateCard(ci);
    });
    info.cardEl.addEventListener('mouseleave', () => {
      if (phase !== 'ready') return;
      info.isHovered = false;
      updateCard(ci);
    });
    info.cardEl.addEventListener('click', () => {
      if (phase !== 'ready' || info.card.isPurged || info.card.cardType !== 'tech') return;
      cardInfos.forEach(c => { c.isSelected = false; });
      info.isSelected = true;
      cardInfos.forEach((_, idx) => updateCard(idx));
      onCardClick?.(info.card.id);
    });
  });

  // ── Start ─────────────────────────────────────────────────────────────
  let startTimer = null;
  if (mode === 'attack') {
    startTimer = setTimeout(startEjection, 300);
  }

  container._gdCleanup = () => {
    clearTimeout(startTimer);
    clearTimeout(ejectionTimer);
  };
}
