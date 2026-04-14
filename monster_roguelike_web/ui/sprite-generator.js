// sprite-generator.js
// プロシージャル ピクセルアート生成（ジュウマ：有機的 / カラクリ：機械的）

export const ELEMENT_PALETTES = {
  fire:    { outline:'#450a0a', dark:'#991b1b', mid:'#ef4444', light:'#fca5a5', glow:'#fbbf24' },
  water:   { outline:'#082f49', dark:'#1e40af', mid:'#3b82f6', light:'#93c5fd', glow:'#67e8f9' },
  thunder: { outline:'#422006', dark:'#b45309', mid:'#f59e0b', light:'#fcd34d', glow:'#fef08a' },
  earth:   { outline:'#1c1003', dark:'#78350f', mid:'#d97706', light:'#fde047', glow:'#86efac' },
  ice:     { outline:'#083344', dark:'#0e7490', mid:'#0ea5e9', light:'#7dd3fc', glow:'#e0f2fe' },
  wind:    { outline:'#052e16', dark:'#166534', mid:'#16a34a', light:'#86efac', glow:'#d1fae5' },
  light:   { outline:'#1c1003', dark:'#92400e', mid:'#fbbf24', light:'#fef9c3', glow:'#ffffff' },
  dark:    { outline:'#1a0533', dark:'#4c1d95', mid:'#7c3aed', light:'#c4b5fd', glow:'#ede9fe' },
  none:    { outline:'#0f172a', dark:'#334155', mid:'#64748b', light:'#94a3b8', glow:'#e2e8f0' },
};

// ─── ユーティリティ ───────────────────────────────────────────

class RNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    this.s = Math.imul(1664525, this.s) + 1013904223 >>> 0;
    return this.s / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  bool(p = 0.5) { return this.next() < p; }
}

function strHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

function hexToRGB(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// 2D バッファ管理
function makeBuffer(W, H) {
  return Array.from({length: H}, () => new Array(W).fill(null));
}

function fillEllipse(buf, cx, cy, rx, ry, color, W, H) {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) buf[y][x] = color;
    }
  }
}

function fillRect(buf, x, y, w, h, color, W, H) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy;
      if (px >= 0 && px < W && py >= 0 && py < H) buf[py][px] = color;
    }
}

function addOutline(buf, outlineColor, W, H) {
  // 外周ピクセルを outline に変更
  const copy = buf.map(r => [...r]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!copy[y][x]) continue;
      if (y === 0 || !copy[y-1][x] || y === H-1 || !copy[y+1][x] ||
          x === 0 || !copy[y][x-1] || x === W-1 || !copy[y][x+1]) {
        buf[y][x] = outlineColor;
      }
    }
  }
}

function bufToCanvas(buf, ctx, W, H) {
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!buf[y][x]) continue;
      const [r, g, b] = hexToRGB(buf[y][x]);
      const i = (y * W + x) * 4;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ─── ジュウマ（有機的・生物的） ──────────────────────────────

function drawOrganic(ctx, element, seed, sizeParam = 0) {
  const W = 32, H = 32;
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;
  const rng = new RNG(seed);
  const buf = makeBuffer(W, H);

  // サイズ補正（SS〜LL: -10〜+10 → scale 0.85〜1.15）
  const sc = 1 + sizeParam * 0.015;

  // 頭
  const headCX = 16;
  const headCY = Math.round(10 * sc);
  const headRX = Math.round((4 + rng.int(0, 2)) * sc);
  const headRY = Math.round((4 + rng.int(0, 2)) * sc);
  fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

  // 胴体
  const bodyCX = 16;
  const bodyCY = Math.round((headCY + headRY + 4) * sc);
  const bodyRX = Math.round((4 + rng.int(0, 3)) * sc);
  const bodyRY = Math.round((4 + rng.int(0, 2)) * sc);
  fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);

  // 耳・角（ランダム）
  if (rng.bool(0.7)) {
    const earStyle = rng.int(0, 2);
    if (earStyle === 0) {
      // 尖った角
      const hornH = rng.int(2, 4);
      const hornX = headCX - Math.round(headRX * 0.5);
      for (let i = 0; i < hornH; i++) {
        const py = headCY - headRY - i;
        if (py >= 0) { buf[py][hornX] = 'HEAD'; buf[py][W - 1 - hornX] = 'HEAD'; }
      }
    } else if (earStyle === 1) {
      // 丸い耳
      const earCY = headCY - headRY;
      const earX = headCX - headRX + 1;
      fillEllipse(buf, earX, earCY, 2, 2, 'HEAD', W, H);
      fillEllipse(buf, W - earX, earCY, 2, 2, 'HEAD', W, H);
    } else {
      // 大きい耳
      const earCY = headCY - Math.round(headRY * 0.5);
      const earX = headCX - headRX - 1;
      fillEllipse(buf, earX, earCY, 1, 3, 'HEAD', W, H);
      fillEllipse(buf, W - earX, earCY, 1, 3, 'HEAD', W, H);
    }
  }

  // 尻尾（ランダム）
  if (rng.bool(0.5)) {
    const tailY = bodyCY + rng.int(-2, 1);
    const tailX = bodyCX + bodyRX;
    buf[tailY][Math.min(W-1, tailX)] = 'BODY';
    buf[tailY][Math.min(W-1, tailX + 1)] = 'BODY';
    if (tailY + 1 < H) buf[tailY + 1][Math.min(W-1, tailX + 1)] = 'BODY';
  }

  // 足
  const legY = bodyCY + bodyRY;
  const legLX = bodyCX - Math.round(bodyRX * 0.6);
  const legRX = bodyCX + Math.round(bodyRX * 0.6);
  const legH = rng.int(2, 4);
  for (let i = 0; i < legH; i++) {
    if (legY + i < H) {
      buf[legY + i][legLX] = 'BODY';
      buf[legY + i][legRX] = 'BODY';
    }
  }
  // 足先
  if (legY + legH < H) {
    buf[legY + legH - 1][legLX - 1] = 'BODY';
    buf[legY + legH - 1][legRX + 1] = 'BODY';
  }

  // シェーディング（y位置で明暗）
  const topY = headCY - headRY;
  const botY = Math.min(H - 1, legY + legH);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!buf[y][x] || buf[y][x] === 'outline') continue;
      const t = (y - topY) / Math.max(1, botY - topY);
      buf[y][x] = t < 0.25 ? pal.light : t < 0.65 ? pal.mid : pal.dark;
    }
  }

  // アウトライン
  addOutline(buf, pal.outline, W, H);

  // 目（頭の中央付近、左右対称）
  const eyeY = headCY - Math.round(headRY * 0.15);
  const eyeX = headCX - Math.round(headRX * 0.35);
  const eyeRX = W - 1 - eyeX;
  if (eyeX >= 0 && eyeRX < W && buf[eyeY] && buf[eyeY][eyeX] && buf[eyeY][eyeX] !== pal.outline) {
    buf[eyeY][eyeX] = pal.glow;
    buf[eyeY][eyeRX] = pal.glow;
  }

  // 光源ハイライト（頭の左上に1〜2ピクセル）
  const hlY = headCY - Math.round(headRY * 0.4);
  const hlX = headCX - Math.round(headRX * 0.2);
  if (hlX >= 0 && hlY >= 0 && buf[hlY] && buf[hlY][hlX] && buf[hlY][hlX] !== pal.outline && buf[hlY][hlX] !== pal.glow) {
    buf[hlY][hlX] = pal.glow;
  }

  bufToCanvas(buf, ctx, W, H);
}

// ─── カラクリ（機械的・幾何学的） ────────────────────────────

function drawMechanical(ctx, element, seed) {
  const W = 32, H = 32;
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;
  const rng = new RNG(seed);
  const buf = makeBuffer(W, H);

  const METAL_D = '#334155';
  const METAL_M = '#475569';
  const METAL_L = '#64748b';

  // ─ 頭部ボックス
  const headW = rng.int(8, 11);
  const headH = rng.int(5, 7);
  const headX = Math.floor((W - headW) / 2);
  const headY = 4;
  fillRect(buf, headX, headY, headW, headH, METAL_D, W, H);
  // 頭部の明るい上面
  fillRect(buf, headX + 1, headY, headW - 2, 1, METAL_M, W, H);

  // ─ 胴体ボックス
  const bodyW = rng.int(10, 13);
  const bodyH = rng.int(9, 13);
  const bodyX = Math.floor((W - bodyW) / 2);
  const bodyY = headY + headH;
  fillRect(buf, bodyX, bodyY, bodyW, bodyH, METAL_M, W, H);
  // 胴体の明るい上面
  fillRect(buf, bodyX + 1, bodyY, bodyW - 2, 1, METAL_L, W, H);

  // ─ 発光コア（胴体中央）
  const coreX = Math.floor(W / 2) - 1;
  const coreY = bodyY + Math.floor(bodyH / 2) - 1;
  fillRect(buf, coreX - 1, coreY - 1, 4, 4, pal.dark, W, H);
  fillRect(buf, coreX, coreY, 2, 2, pal.mid, W, H);
  buf[coreY][coreX] = pal.glow;

  // ─ 眼（スリット）
  const eyeY = headY + 2;
  fillRect(buf, headX + 1, eyeY, headW - 2, 1, pal.glow, W, H);

  // ─ 腕（左右対称）
  const armW = rng.int(2, 3);
  const armH = rng.int(5, 9);
  const armY = bodyY + 1;
  fillRect(buf, bodyX - armW, armY, armW, armH, METAL_D, W, H);
  fillRect(buf, bodyX + bodyW, armY, armW, armH, METAL_D, W, H);
  // 腕の先端（属性色）
  buf[armY + armH - 1][bodyX - armW] = pal.mid;
  buf[armY + armH - 1][bodyX + bodyW + armW - 1] = pal.mid;

  // ─ 足（左右対称）
  const legW = 2;
  const legH = rng.int(3, 5);
  const legY = bodyY + bodyH;
  const leg1X = bodyX + 2;
  const leg2X = bodyX + bodyW - 2 - legW;
  fillRect(buf, leg1X, legY, legW, legH, METAL_D, W, H);
  fillRect(buf, leg2X, legY, legW, legH, METAL_D, W, H);
  // 足裏
  fillRect(buf, leg1X - 1, legY + legH - 1, legW + 2, 1, METAL_M, W, H);
  fillRect(buf, leg2X - 1, legY + legH - 1, legW + 2, 1, METAL_M, W, H);

  // ─ アウトライン
  addOutline(buf, pal.outline, W, H);

  // アウトラインで潰れた目・コアを復元
  fillRect(buf, headX + 1, eyeY, headW - 2, 1, pal.glow, W, H);
  buf[coreY][coreX] = pal.glow;

  bufToCanvas(buf, ctx, W, H);
}

// ─── 公開 API ────────────────────────────────────────────────

/**
 * モンスター/カラクリのスプライトを canvas に描画する
 * @param {HTMLCanvasElement} canvas
 * @param {{ id: string, main_element: string, params?: { size?: number } }} monsterData
 */
export function generateMonsterSprite(canvas, monsterData) {
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const isEnemy = monsterData.id.startsWith('e_');
  const element = monsterData.main_element || 'none';
  const seed = strHash(monsterData.id);
  const sizeParam = monsterData.params?.size ?? 0;

  if (isEnemy) {
    drawMechanical(ctx, element, seed);
  } else {
    drawOrganic(ctx, element, seed, sizeParam);
  }
}
