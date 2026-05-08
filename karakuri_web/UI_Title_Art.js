// title-art.js — Pixel art title screen for Monster Rogue
// Draws a ruined cityscape night sky (bgCanvas) and bitmap-font title (titleCanvas)

// 5x7 bitmap font definitions (each char is an array of 7 rows, each row is 5 bits)
const FONT = {
  // 7x9 bold glyphs for BILGAMATA (bit6=col0 … bit0=col6)
  A: [0b0001000,0b0011100,0b0110110,0b1100011,0b1111111,0b1100011,0b1100011,0b1100011,0b1100011],
  B: [0b0111110,0b1100011,0b1100011,0b1111110,0b1100011,0b1100011,0b1100011,0b1100011,0b0111110],
  G: [0b0111110,0b1100011,0b1100000,0b1100000,0b1100111,0b1100011,0b1100011,0b1100011,0b0111110],
  I: [0b1111111,0b1111111,0b0011100,0b0011100,0b0011100,0b0011100,0b0011100,0b1111111,0b1111111],
  L: [0b1100000,0b1100000,0b1100000,0b1100000,0b1100000,0b1100000,0b1100000,0b1111111,0b1111111],
  M: [0b1100011,0b1110111,0b1111111,0b1101011,0b1100011,0b1100011,0b1100011,0b1100011,0b1100011],
  T: [0b1111111,0b1111111,0b0011100,0b0011100,0b0011100,0b0011100,0b0011100,0b0011100,0b0011100],
  // 5x7 fallback glyphs for other characters
  C: [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  D: [0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
  E: [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  F: [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  H: [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  J: [0b00111,0b00010,0b00010,0b00010,0b00010,0b10010,0b01100],
  K: [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  N: [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  O: [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  P: [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  Q: [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
  R: [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  S: [0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110],
  U: [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  V: [0b10001,0b10001,0b10001,0b10001,0b01010,0b01010,0b00100],
  W: [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  X: [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  Y: [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  Z: [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  ' ': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b00000],
};

// Bold glyphs are 7x9; others are 5x7
const BOLD_CHARS = new Set(['A','B','G','I','L','M','T']);
const BOLD_W = 7, BOLD_H = 9;
const STD_W = 5, STD_H = 7;

function drawBitmapText(ctx, text, x, y, pixelSize, color) {
  ctx.fillStyle = color;
  const spacing = 1;
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] || FONT[' '];
    const cw = BOLD_CHARS.has(ch) ? BOLD_W : STD_W;
    const ch_h = BOLD_CHARS.has(ch) ? BOLD_H : STD_H;
    for (let row = 0; row < ch_h; row++) {
      for (let col = 0; col < cw; col++) {
        if (glyph[row] & (1 << (cw - 1 - col))) {
          ctx.fillRect(cx + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    cx += (cw + spacing) * pixelSize;
  }
}

function measureBitmapText(text, pixelSize) {
  const spacing = 1;
  let width = 0;
  for (const ch of text) {
    const cw = BOLD_CHARS.has(ch) ? BOLD_W : STD_W;
    width += (cw + spacing) * pixelSize;
  }
  width -= spacing * pixelSize;
  return { width, height: BOLD_H * pixelSize };
}

// --- Background scene generation ---

function generateStars(w, h, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.floor(Math.random() * w),
      y: Math.floor(Math.random() * (h * 0.55)),
      size: Math.random() < 0.3 ? 2 : 1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      color: Math.random() < 0.6 ? '#ffffff' : '#aaccff',
    });
  }
  return stars;
}

function generateBuildings(w, h) {
  const buildings = [];
  const groundY = Math.floor(h * 0.82);
  let bx = 0;
  while (bx < w) {
    const bw = 30 + Math.floor(Math.random() * 60);
    const bh = 60 + Math.floor(Math.random() * 160);
    const by = groundY - bh;
    // Jagged top edge for ruined look
    const jaggedTop = [];
    const numJags = Math.floor(bw / 6);
    for (let j = 0; j <= numJags; j++) {
      const jx = Math.floor((j / numJags) * bw);
      const jy = by + Math.floor(Math.random() * 20) - 5;
      jaggedTop.push({ x: bx + jx, y: jy });
    }
    const shade = Math.random() < 0.5 ? '#1a1a2e' : '#0d0d1a';
    buildings.push({ x: bx, y: by, w: bw, h: bh, groundY, jaggedTop, shade });
    bx += bw + Math.floor(Math.random() * 20);
  }
  return buildings;
}

function generateKarakuri(w, h) {
  const groundY = Math.floor(h * 0.82);
  const silhouettes = [];
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    silhouettes.push({
      x: Math.floor(w * 0.15 + Math.random() * w * 0.7),
      baseY: groundY,
      scale: 0.6 + Math.random() * 0.5,
    });
  }
  return silhouettes;
}

function drawSky(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(0.5, '#111428');
  grad.addColorStop(1, '#1a1030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx, stars, time) {
  for (const s of stars) {
    const alpha = 0.4 + 0.6 * ((Math.sin(time * s.speed + s.phase) + 1) / 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawBuildings(ctx, buildings) {
  for (const b of buildings) {
    ctx.fillStyle = b.shade;
    // Draw building body
    ctx.fillRect(b.x, b.y, b.w, b.groundY - b.y);
    // Draw jagged top
    ctx.fillStyle = '#0a0e1a'; // sky color to cut out jagged silhouette
    if (b.jaggedTop.length > 1) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 6);
      for (const j of b.jaggedTop) {
        ctx.lineTo(j.x, j.y);
      }
      ctx.lineTo(b.x + b.w, b.y - 6);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawKarakuri(ctx, silhouettes) {
  for (const k of silhouettes) {
    const s = k.scale;
    const x = k.x;
    const by = k.baseY;
    ctx.fillStyle = '#2a1228';
    // Head (circle approximation with rect)
    const headSize = Math.floor(12 * s);
    const headY = by - Math.floor(60 * s);
    ctx.fillRect(x - Math.floor(headSize / 2), headY, headSize, headSize);
    // Eye slit
    ctx.fillStyle = '#44102a';
    ctx.fillRect(x - Math.floor(4 * s), headY + Math.floor(4 * s), Math.floor(8 * s), Math.floor(2 * s));
    // Body
    ctx.fillStyle = '#2a1228';
    const bodyW = Math.floor(18 * s);
    const bodyH = Math.floor(28 * s);
    const bodyY = headY + headSize + Math.floor(2 * s);
    ctx.fillRect(x - Math.floor(bodyW / 2), bodyY, bodyW, bodyH);
    // Arms
    const armW = Math.floor(4 * s);
    const armH = Math.floor(22 * s);
    ctx.fillRect(x - Math.floor(bodyW / 2) - armW - Math.floor(2 * s), bodyY + Math.floor(4 * s), armW, armH);
    ctx.fillRect(x + Math.floor(bodyW / 2) + Math.floor(2 * s), bodyY + Math.floor(4 * s), armW, armH);
    // Legs
    const legW = Math.floor(5 * s);
    const legH = Math.floor(18 * s);
    const legY = bodyY + bodyH;
    ctx.fillRect(x - Math.floor(bodyW / 4) - Math.floor(legW / 2), legY, legW, legH);
    ctx.fillRect(x + Math.floor(bodyW / 4) - Math.floor(legW / 2), legY, legW, legH);
  }
}

function drawGround(ctx, w, h) {
  const groundY = Math.floor(h * 0.82);
  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, groundY, w, h - groundY);
  // Rubble on top
  ctx.fillStyle = '#1a1a2e';
  for (let rx = 0; rx < w; rx += 3 + Math.floor(Math.random() * 6)) {
    const rh = 2 + Math.floor(Math.random() * 6);
    ctx.fillRect(rx, groundY - rh, 2 + Math.floor(Math.random() * 4), rh);
  }
}

// --- Main export ---

export function initTitleArt(titleCanvas, bgCanvas) {
  // Cancel any previous animation loops
  if (initTitleArt._bgRaf) cancelAnimationFrame(initTitleArt._bgRaf);
  if (initTitleArt._titleRaf) cancelAnimationFrame(initTitleArt._titleRaf);
  if (initTitleArt._resizeHandler) {
    window.removeEventListener('resize', initTitleArt._resizeHandler);
  }

  const bgCtx = bgCanvas.getContext('2d');
  const titleCtx = titleCanvas.getContext('2d');
  bgCtx.imageSmoothingEnabled = false;
  titleCtx.imageSmoothingEnabled = false;

  // --- Title canvas setup ---
  const titleText = 'BILGAMATA';
  const titlePixel = 7;

  const titleMeasure = measureBitmapText(titleText, titlePixel);
  const padding = 20;
  const cw = titleMeasure.width + padding * 2;
  const ch = titleMeasure.height + padding * 2;
  titleCanvas.width = cw;
  titleCanvas.height = ch;
  titleCtx.imageSmoothingEnabled = false;

  const titleX = Math.floor((cw - titleMeasure.width) / 2);
  const titleY = padding;

  // Title glow animation
  let titleRaf;
  function animateTitle(time) {
    const t = time / 1000;
    titleCtx.clearRect(0, 0, cw, ch);

    // Blue outline: draw in 8 directions offset by 2px
    titleCtx.shadowBlur = 0;
    const offsets = [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]];
    for (const [ox, oy] of offsets) {
      drawBitmapText(titleCtx, titleText, titleX + ox, titleY + oy, titlePixel, '#1a6fd4');
    }

    // Orange fill with pulsing glow
    const glowSize = 6 + 12 * ((Math.sin(t * 1.2) + 1) / 2);
    titleCtx.shadowBlur = glowSize;
    titleCtx.shadowColor = '#ff6b35';
    drawBitmapText(titleCtx, titleText, titleX, titleY, titlePixel, '#ff8c00');

    // Gold shimmer pass
    const goldAlpha = 0.35 + 0.3 * ((Math.sin(t * 1.8 + 1) + 1) / 2);
    titleCtx.globalAlpha = goldAlpha;
    titleCtx.shadowBlur = glowSize * 0.5;
    titleCtx.shadowColor = '#f7c948';
    drawBitmapText(titleCtx, titleText, titleX, titleY, titlePixel, '#f7c948');
    titleCtx.globalAlpha = 1;
    titleCtx.shadowBlur = 0;

    titleRaf = requestAnimationFrame(animateTitle);
  }
  titleRaf = requestAnimationFrame(animateTitle);
  initTitleArt._titleRaf = titleRaf;

  // --- Background canvas setup ---
  let stars, buildings, karakuri;

  function setupBg() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    bgCanvas.width = w;
    bgCanvas.height = h;
    bgCtx.imageSmoothingEnabled = false;

    stars = generateStars(w, h, Math.floor((w * h) / 3000));
    buildings = generateBuildings(w, h);
    karakuri = generateKarakuri(w, h);
  }

  setupBg();

  // Draw static parts to an offscreen canvas for performance
  let staticCanvas = document.createElement('canvas');
  let staticCtx = staticCanvas.getContext('2d');

  function renderStatic() {
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    staticCanvas.width = w;
    staticCanvas.height = h;
    staticCtx.imageSmoothingEnabled = false;

    drawSky(staticCtx, w, h);
    drawBuildings(staticCtx, buildings);
    drawKarakuri(staticCtx, karakuri);
    drawGround(staticCtx, w, h);
  }

  renderStatic();

  let bgRaf;
  function animateBg(time) {
    const t = time / 1000;
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    // Draw cached static scene
    bgCtx.drawImage(staticCanvas, 0, 0);

    // Draw animated stars on top
    drawStars(bgCtx, stars, t);

    bgRaf = requestAnimationFrame(animateBg);
  }
  bgRaf = requestAnimationFrame(animateBg);
  initTitleArt._bgRaf = bgRaf;

  function onResize() {
    setupBg();
    renderStatic();
  }
  window.addEventListener('resize', onResize);
  initTitleArt._resizeHandler = onResize;
}
