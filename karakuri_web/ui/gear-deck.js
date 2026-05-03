// ui/gear-deck.js
// GearHandDeck: slot→fan ejection animation for the attack phase (Industrial Rust aesthetic)

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

function calcFanParams(count) {
  const c = Math.max(1, count);
  const cardW  = Math.max(46, Math.round(72 - (c - 4) * 2.8));
  const xStep  = Math.max(28, Math.round(52 - (c - 4) * 3));
  const spread = Math.min(38, 18 + c * 2);
  const baseY  = Math.min(24, 12 + c * 1.2);
  const cardH  = Math.round(cardW * 1.38);
  const contW  = Math.min(c * xStep + cardW, 800);
  return { cardW, cardH, xStep, spread, baseY, contW };
}

/**
 * Renders an animated gear hand deck into container.
 * @param {HTMLElement} container - #parts-deck-tech-row
 * @param {Array<{id,name,elem,en,desc,isPurged,affinity}>} cards
 * @param {'idle'|'attack'} mode  - attack triggers ejection animation after 300ms
 * @param {(partId: string) => void} onCardClick
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
  const { cardW, cardH, xStep, spread, baseY, contW } = calcFanParams(count);
  const slotW = Math.max(36, cardW - 4);
  const slotGap = Math.max(4, xStep - slotW + 4);

  let ejectedCount = 0;
  let phase = 'idle';
  let ejectionTimer = null;

  // ── Wrapper ──────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.className = 'gd-wrapper';
  container.appendChild(wrapper);

  // ── Slot Row ─────────────────────────────────────────────────────────────
  const slotRow = document.createElement('div');
  slotRow.className = 'gd-slot-row';
  slotRow.style.gap = `${slotGap}px`;
  wrapper.appendChild(slotRow);

  const labelEl = document.createElement('div');
  labelEl.className = 'gd-label';
  labelEl.textContent = `GEAR DECK — ${count}/10`;
  slotRow.appendChild(labelEl);

  const slotEls = validCards.map((card, i) => {
    const e = ELEM_COLORS[card.elem] || ELEM_COLORS.none;

    const slot = document.createElement('div');
    slot.className = 'gd-slot';
    slot.style.width = `${slotW}px`;
    slot.style.borderColor = `${e.bg}55`;

    const railL = document.createElement('div');
    railL.className = 'gd-slot-rail gd-slot-rail-l';
    railL.style.background = `${e.bg}44`;

    const railR = document.createElement('div');
    railR.className = 'gd-slot-rail gd-slot-rail-r';
    railR.style.background = `${e.bg}44`;

    const dot = document.createElement('div');
    dot.className = 'gd-slot-dot';
    dot.style.background = e.glow;
    dot.style.boxShadow = `0 0 6px ${e.glow}`;

    slot.appendChild(railL);
    slot.appendChild(railR);
    slot.appendChild(dot);
    slotRow.appendChild(slot);

    return { slot, dot, railL, railR, e };
  });

  // ── Fan Layer ────────────────────────────────────────────────────────────
  const fanLayer = document.createElement('div');
  fanLayer.className = 'gd-fan-layer';
  wrapper.appendChild(fanLayer);

  const fanInner = document.createElement('div');
  fanInner.className = 'gd-fan-inner';
  fanInner.style.width = `${contW}px`;
  fanInner.style.height = `${cardH + 26}px`;
  fanLayer.appendChild(fanInner);

  const mid = (count - 1) / 2;
  const totalSlotsW = count * slotW + (count - 1) * slotGap;

  // ── Card Elements ─────────────────────────────────────────────────────────
  const cardInfos = validCards.map((card, i) => {
    const offset = i - mid;
    const norm = mid > 0 ? offset / mid : 0;
    const angle = norm * (spread / 2);
    const yDrop = Math.abs(norm) * baseY;
    const xOffset = offset * xStep;
    const slotCenterX = -totalSlotsW / 2 + slotW / 2 + i * (slotW + slotGap);
    const e = ELEM_COLORS[card.elem] || ELEM_COLORS.none;

    const cardEl = document.createElement('div');
    cardEl.className = 'gd-card';
    cardEl.style.cssText = `width:${cardW}px;height:${cardH}px;margin-left:${-cardW/2}px;transform:translateX(${slotCenterX}px) translateY(${cardH+20}px) rotate(0deg) scale(0.7);opacity:0;z-index:${i};cursor:default;transition:none;`;
    const tooltipText = card.desc ? `${card.name}\n${card.desc}\nEN:${card.en}` : `${card.name}\nEN:${card.en}`;
    cardEl.dataset.tooltip = tooltipText;

    const shortName = card.name.length > 5 ? card.name.slice(0, 4) + '…' : card.name;
    const iconSz = Math.round(cardW * 0.36);
    const affBadge = card.affinity === 'strong'
      ? `<span class="gd-aff-badge tech-aff-strong">◎</span>`
      : card.affinity === 'weak'
      ? `<span class="gd-aff-badge tech-aff-weak">△</span>`
      : '';

    cardEl.innerHTML = `
      <div class="gd-card-inner">
        <div class="gd-card-stripe" style="background:linear-gradient(90deg,${e.bg},${e.glow}88);"></div>
        <div class="gd-card-type" style="font-size:${Math.max(6,cardW*0.1)}px;color:${e.glow}99;">TECH</div>
        <div class="gd-card-icon-wrap" style="background:radial-gradient(ellipse at 50% 60%,${e.bg}1a,transparent 70%);">
          <div class="gd-card-icon-star" style="width:${iconSz}px;height:${iconSz}px;background:${e.bg}44;border-color:${e.bg}88;">
            <div class="gd-card-icon-dot" style="width:${Math.round(iconSz*0.36)}px;height:${Math.round(iconSz*0.36)}px;background:${e.glow};box-shadow:0 0 6px ${e.glow};"></div>
          </div>
        </div>
        <div class="gd-card-name" style="font-size:${Math.max(8,cardW*0.13)}px;">${shortName}</div>
        <div class="gd-card-footer">
          <span class="gd-card-en" style="font-size:${Math.max(7,cardW*0.11)}px;">${card.en}<span class="gd-card-en-label" style="font-size:${Math.max(6,cardW*0.09)}px;">EN</span></span>
        </div>
        ${affBadge}
        ${card.isPurged ? '<div class="gd-purged-overlay">PURGED</div>' : ''}
      </div>
    `;

    fanInner.appendChild(cardEl);
    return { cardEl, xOffset, yDrop, angle, slotCenterX, e, card, isHovered: false, isSelected: false };
  });

  // ── Position Updater ──────────────────────────────────────────────────────
  function updateCard(ci) {
    const info = cardInfos[ci];
    const { cardEl, xOffset, yDrop, angle, slotCenterX } = info;
    const isEjected = ci < ejectedCount;
    const isCurrentlyEjecting = phase === 'ejecting' && ci === ejectedCount;
    const isHov = info.isHovered && phase === 'ready';
    const isSel = info.isSelected;

    let tx, ty, rot, opacity, scale, transition;
    if (!isEjected && !isCurrentlyEjecting) {
      tx = slotCenterX; ty = cardH + 20; rot = 0; opacity = 0; scale = 0.7;
      transition = 'none';
    } else if (isCurrentlyEjecting) {
      tx = xOffset; ty = isHov || isSel ? -22 : yDrop;
      rot = isHov || isSel ? 0 : angle; opacity = 1; scale = 1.05;
      transition = 'transform 0.28s cubic-bezier(0.1,1.4,0.3,1), opacity 0.12s ease';
    } else {
      tx = xOffset; ty = isHov || isSel ? -22 : yDrop;
      rot = isHov || isSel ? 0 : angle; opacity = 1; scale = 1;
      transition = 'transform 0.16s cubic-bezier(0.2,0.8,0.3,1)';
    }

    cardEl.style.transition = transition;
    cardEl.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`;
    cardEl.style.opacity = opacity;
    cardEl.style.zIndex = isHov || isSel ? 50 : isCurrentlyEjecting ? 30 : ci;
    cardEl.style.cursor = phase === 'ready' && !info.card.isPurged ? 'pointer' : 'default';

    const inner = cardEl.querySelector('.gd-card-inner');
    if (inner) {
      const e = info.e;
      if (isSel) {
        inner.style.borderColor = e.bg;
        inner.style.boxShadow = `0 0 18px ${e.glow}66, 0 8px 24px rgba(0,0,0,0.7)`;
        inner.style.background = `linear-gradient(160deg,${e.bg}55,#1a0f0a)`;
      } else if (isHov) {
        inner.style.borderColor = `${e.bg}88`;
        inner.style.boxShadow = `0 4px 20px rgba(0,0,0,0.5)`;
        inner.style.background = `linear-gradient(160deg,${e.bg}33,#1a0f0a)`;
      } else {
        inner.style.borderColor = '#4a3728';
        inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        inner.style.background = '#1a0f0a';
      }
    }
  }

  // ── Slot State ────────────────────────────────────────────────────────────
  function ejectSlot(ci) {
    const { slot, dot, railL, railR } = slotEls[ci];
    slot.style.background = 'rgba(0,0,0,0.4)';
    slot.style.borderColor = 'rgba(255,255,255,0.06)';
    dot.style.display = 'none';
    railL.style.background = 'rgba(255,255,255,0.04)';
    railR.style.background = 'rgba(255,255,255,0.04)';
    const empty = document.createElement('div');
    empty.className = 'gd-slot-empty';
    slot.appendChild(empty);
  }

  // ── Ejection Sequence ─────────────────────────────────────────────────────
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

  // ── Hover / Click ─────────────────────────────────────────────────────────
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
      if (phase !== 'ready' || info.card.isPurged) return;
      cardInfos.forEach(c => { c.isSelected = false; });
      info.isSelected = true;
      cardInfos.forEach((_, idx) => updateCard(idx));
      onCardClick?.(info.card.id);
    });
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  let startTimer = null;
  if (mode === 'attack') {
    startTimer = setTimeout(startEjection, 300);
  }

  container._gdCleanup = () => {
    clearTimeout(startTimer);
    clearTimeout(ejectionTimer);
  };
}
