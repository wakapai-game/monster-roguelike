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
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
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

function setPixel(buf, x, y, color, W, H) {
  if (x >= 0 && x < W && y >= 0 && y < H) buf[y][x] = color;
}

function addOutline(buf, outlineColor, W, H) {
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

// 体型タイプ：IDのハッシュで決定
const BODY_TYPES = ['standard', 'stout', 'serpentine', 'avian', 'quadruped'];

function drawOrganic(ctx, element, seed, sizeParam = 0) {
  const W = 32, H = 32;
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;
  const rng = new RNG(seed);
  const buf = makeBuffer(W, H);

  // サイズ補正（SS〜LL: -10〜+10 → scale 0.85〜1.15）
  const sc = 1 + sizeParam * 0.015;

  // 体型を決定
  const bodyType = BODY_TYPES[rng.int(0, BODY_TYPES.length - 1)];

  let headCX, headCY, headRX, headRY;
  let bodyCX, bodyCY, bodyRX, bodyRY;
  let legY, legLX, legRX, legH;

  switch (bodyType) {
    case 'stout': {
      // ずんぐりした体型：大きな胴体、小さな頭
      headCX = 16;
      headCY = Math.round(9 * sc);
      headRX = Math.round((3 + rng.int(0, 1)) * sc);
      headRY = Math.round((3 + rng.int(0, 1)) * sc);
      fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

      bodyCX = 16;
      bodyCY = Math.round((headCY + headRY + 5) * sc);
      bodyRX = Math.round((6 + rng.int(0, 2)) * sc);
      bodyRY = Math.round((5 + rng.int(0, 2)) * sc);
      fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);
      break;
    }
    case 'serpentine': {
      // 蛇のような体型：小さめの頭、縦長の胴体
      headCX = 16;
      headCY = Math.round(8 * sc);
      headRX = Math.round((3 + rng.int(0, 1)) * sc);
      headRY = Math.round((3 + rng.int(0, 1)) * sc);
      fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

      bodyCX = 16;
      bodyCY = Math.round((headCY + headRY + 6) * sc);
      bodyRX = Math.round((3 + rng.int(0, 1)) * sc);
      bodyRY = Math.round((6 + rng.int(0, 2)) * sc);
      fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);
      // うねり：中間楕円
      const midCY = Math.round((headCY + bodyCY) / 2);
      fillEllipse(buf, bodyCX + rng.int(-1, 1), midCY, bodyRX + 1, 2, 'BODY', W, H);
      break;
    }
    case 'avian': {
      // 鳥のような体型：丸い頭、小さな胴体
      headCX = 16;
      headCY = Math.round(10 * sc);
      headRX = Math.round((5 + rng.int(0, 1)) * sc);
      headRY = Math.round((4 + rng.int(0, 1)) * sc);
      fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

      bodyCX = 16;
      bodyCY = Math.round((headCY + headRY + 3) * sc);
      bodyRX = Math.round((3 + rng.int(0, 1)) * sc);
      bodyRY = Math.round((3 + rng.int(0, 1)) * sc);
      fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);
      break;
    }
    case 'quadruped': {
      // 四足歩行型：横長の胴体
      headCX = Math.round(10 * sc);
      headCY = Math.round(10 * sc);
      headRX = Math.round((3 + rng.int(0, 1)) * sc);
      headRY = Math.round((3 + rng.int(0, 1)) * sc);
      fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

      bodyCX = Math.round(18 * sc);
      bodyCY = Math.round((headCY + 2) * sc);
      bodyRX = Math.round((6 + rng.int(0, 2)) * sc);
      bodyRY = Math.round((3 + rng.int(0, 1)) * sc);
      fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);
      // 首をつなぐ
      const neckY = headCY + Math.round(headRY * 0.5);
      fillEllipse(buf, Math.round((headCX + bodyCX) / 2), neckY, 2, 2, 'BODY', W, H);
      break;
    }
    default: {
      // standard：既存の体型
      headCX = 16;
      headCY = Math.round(10 * sc);
      headRX = Math.round((4 + rng.int(0, 2)) * sc);
      headRY = Math.round((4 + rng.int(0, 2)) * sc);
      fillEllipse(buf, headCX, headCY, headRX, headRY, 'HEAD', W, H);

      bodyCX = 16;
      bodyCY = Math.round((headCY + headRY + 4) * sc);
      bodyRX = Math.round((4 + rng.int(0, 3)) * sc);
      bodyRY = Math.round((4 + rng.int(0, 2)) * sc);
      fillEllipse(buf, bodyCX, bodyCY, bodyRX, bodyRY, 'BODY', W, H);
      break;
    }
  }

  // ── パーツ追加（属性とIDに基づくバリエーション） ──

  // 角・耳
  const partSeed = rng.int(0, 99);
  if (partSeed < 20) {
    // 尖った角（2本）
    const hornH = rng.int(2, 5);
    const hornX = headCX - Math.round(headRX * 0.5);
    for (let i = 0; i < hornH; i++) {
      const py = headCY - headRY - i;
      setPixel(buf, hornX, py, 'HEAD', W, H);
      setPixel(buf, W - 1 - hornX, py, 'HEAD', W, H);
    }
  } else if (partSeed < 35) {
    // 一本角（中央）
    const hornH = rng.int(3, 5);
    for (let i = 0; i < hornH; i++) {
      const py = headCY - headRY - i;
      setPixel(buf, headCX, py, 'HEAD', W, H);
    }
  } else if (partSeed < 50) {
    // 丸い耳
    const earCY = headCY - headRY;
    const earX = headCX - headRX + 1;
    fillEllipse(buf, earX, earCY, 2, 2, 'HEAD', W, H);
    fillEllipse(buf, W - earX, earCY, 2, 2, 'HEAD', W, H);
  } else if (partSeed < 65) {
    // 大きい耳（うさぎ風）
    const earCY = headCY - Math.round(headRY * 0.5);
    const earX = headCX - headRX - 1;
    fillEllipse(buf, earX, earCY, 1, 4, 'HEAD', W, H);
    fillEllipse(buf, W - earX, earCY, 1, 4, 'HEAD', W, H);
  } else if (partSeed < 75) {
    // とげとげクレスト（トサカ）
    for (let i = 0; i < 3; i++) {
      const py = headCY - headRY - rng.int(1, 3);
      const px = headCX - 1 + i;
      setPixel(buf, px, py, 'HEAD', W, H);
    }
  }
  // 25%は何もなし（プレーンな頭）

  // 翼（avian は必ず、他は低確率）
  const hasWings = bodyType === 'avian' || rng.bool(0.15);
  if (hasWings) {
    const wingY = bodyCY - Math.round(bodyRY * 0.3);
    const wingSize = rng.int(2, 4);
    // 左翼
    for (let i = 0; i < wingSize; i++) {
      setPixel(buf, bodyCX - bodyRX - 1 - i, wingY - i, 'BODY', W, H);
      setPixel(buf, bodyCX - bodyRX - 1 - i, wingY - i + 1, 'BODY', W, H);
    }
    // 右翼
    for (let i = 0; i < wingSize; i++) {
      setPixel(buf, bodyCX + bodyRX + 1 + i, wingY - i, 'BODY', W, H);
      setPixel(buf, bodyCX + bodyRX + 1 + i, wingY - i + 1, 'BODY', W, H);
    }
  }

  // 尻尾（serpentine は特殊な長い尻尾、quadrupedも必ず尻尾）
  if (bodyType === 'serpentine') {
    const tailBaseY = bodyCY + bodyRY;
    const tailX = bodyCX + rng.int(-1, 1);
    for (let i = 0; i < rng.int(3, 5); i++) {
      setPixel(buf, tailX + (i % 2 === 0 ? 0 : 1), tailBaseY + i, 'BODY', W, H);
    }
  } else if (bodyType === 'quadruped') {
    const tailY = bodyCY - rng.int(0, 1);
    const tailBaseX = bodyCX + bodyRX;
    for (let i = 0; i < rng.int(2, 4); i++) {
      setPixel(buf, tailBaseX + i, tailY - i, 'BODY', W, H);
    }
  } else if (rng.bool(0.5)) {
    const tailY = bodyCY + rng.int(-2, 1);
    const tailX = bodyCX + bodyRX;
    setPixel(buf, Math.min(W-1, tailX), tailY, 'BODY', W, H);
    setPixel(buf, Math.min(W-1, tailX + 1), tailY, 'BODY', W, H);
    if (rng.bool(0.5)) {
      setPixel(buf, Math.min(W-1, tailX + 2), tailY - 1, 'BODY', W, H);
    }
    if (tailY + 1 < H) setPixel(buf, Math.min(W-1, tailX + 1), tailY + 1, 'BODY', W, H);
  }

  // 模様（背中のドット）
  if (rng.bool(0.4)) {
    const spotCount = rng.int(2, 4);
    for (let i = 0; i < spotCount; i++) {
      const sx = bodyCX + rng.int(-bodyRX + 2, bodyRX - 2);
      const sy = bodyCY + rng.int(-bodyRY + 1, bodyRY - 1);
      if (buf[sy] && buf[sy][sx] === 'BODY') {
        buf[sy][sx] = 'SPOT';
      }
    }
  }

  // 足
  if (bodyType === 'quadruped') {
    // 四足：前足2本 + 後足2本
    legH = rng.int(3, 4);
    const frontLegX = headCX;
    const backLegX1 = bodyCX + Math.round(bodyRX * 0.4);
    const backLegX2 = bodyCX - Math.round(bodyRX * 0.4);
    legY = bodyCY + bodyRY;
    for (let i = 0; i < legH; i++) {
      setPixel(buf, frontLegX, legY + i, 'BODY', W, H);
      setPixel(buf, backLegX1, legY + i, 'BODY', W, H);
      setPixel(buf, backLegX2, legY + i, 'BODY', W, H);
      setPixel(buf, headCX - 1, legY + i, 'BODY', W, H);
    }
  } else if (bodyType === 'serpentine') {
    // 蛇型は足なし（尻尾で代替）
    legY = bodyCY + bodyRY;
    legH = 0;
  } else {
    // 二足歩行
    legY = bodyCY + bodyRY;
    legLX = bodyCX - Math.round(bodyRX * 0.6);
    legRX = bodyCX + Math.round(bodyRX * 0.6);
    legH = rng.int(2, 4);
    for (let i = 0; i < legH; i++) {
      if (legY + i < H) {
        setPixel(buf, legLX, legY + i, 'BODY', W, H);
        setPixel(buf, legRX, legY + i, 'BODY', W, H);
      }
    }
    // 足先
    if (legY + legH - 1 < H) {
      setPixel(buf, legLX - 1, legY + legH - 1, 'BODY', W, H);
      setPixel(buf, legRX + 1, legY + legH - 1, 'BODY', W, H);
    }
  }

  // くちばし（avian のみ）
  if (bodyType === 'avian') {
    const beakY = headCY + Math.round(headRY * 0.3);
    const beakX = headCX + headRX;
    setPixel(buf, beakX + 1, beakY, 'BEAK', W, H);
    setPixel(buf, beakX + 2, beakY, 'BEAK', W, H);
  }

  // ── シェーディング ──
  const topY = headCY - headRY;
  const botY = Math.min(H - 1, legY + Math.max(legH, 0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!buf[y][x] || buf[y][x] === 'outline') continue;
      if (buf[y][x] === 'BEAK') {
        buf[y][x] = '#e8a020'; // くちばし色
        continue;
      }
      if (buf[y][x] === 'SPOT') {
        buf[y][x] = pal.glow; // 模様はグロー色
        continue;
      }
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
    // 瞳孔（大きめの目を持つ体型）
    if (bodyType === 'avian' || bodyType === 'stout') {
      const pupilX = eyeX + 1;
      const pupilRX = eyeRX - 1;
      if (buf[eyeY] && buf[eyeY][pupilX] && buf[eyeY][pupilX] !== pal.outline) {
        buf[eyeY][pupilX] = pal.outline;
        buf[eyeY][pupilRX] = pal.outline;
      }
    }
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
  const RIVET   = '#94a3b8';

  // ─ 頭部ボックス
  const headW = rng.int(8, 11);
  const headH = rng.int(5, 7);
  const headX = Math.floor((W - headW) / 2);
  const headY = 4;
  fillRect(buf, headX, headY, headW, headH, METAL_D, W, H);
  // 頭部の明るい上面
  fillRect(buf, headX + 1, headY, headW - 2, 1, METAL_M, W, H);

  // 頭部アンテナ（ランダム）
  if (rng.bool(0.5)) {
    const antennaX = headX + Math.floor(headW / 2);
    setPixel(buf, antennaX, headY - 1, METAL_L, W, H);
    setPixel(buf, antennaX, headY - 2, pal.glow, W, H);
  }

  // ─ 胴体ボックス
  const bodyW = rng.int(10, 13);
  const bodyH = rng.int(9, 13);
  const bodyX = Math.floor((W - bodyW) / 2);
  const bodyY = headY + headH;
  fillRect(buf, bodyX, bodyY, bodyW, bodyH, METAL_M, W, H);
  // 胴体の明るい上面
  fillRect(buf, bodyX + 1, bodyY, bodyW - 2, 1, METAL_L, W, H);

  // ─ 装甲板のリベット（胴体の角に4つ）
  setPixel(buf, bodyX + 1, bodyY + 1, RIVET, W, H);
  setPixel(buf, bodyX + bodyW - 2, bodyY + 1, RIVET, W, H);
  setPixel(buf, bodyX + 1, bodyY + bodyH - 2, RIVET, W, H);
  setPixel(buf, bodyX + bodyW - 2, bodyY + bodyH - 2, RIVET, W, H);

  // 追加リベット（大きい胴体なら中間にも）
  if (bodyW >= 12) {
    setPixel(buf, bodyX + Math.floor(bodyW / 2), bodyY + 1, RIVET, W, H);
    setPixel(buf, bodyX + Math.floor(bodyW / 2), bodyY + bodyH - 2, RIVET, W, H);
  }

  // ─ 装甲ディテールライン（横線）
  const detailY = bodyY + Math.floor(bodyH * 0.35);
  fillRect(buf, bodyX + 1, detailY, bodyW - 2, 1, METAL_D, W, H);
  const detailY2 = bodyY + Math.floor(bodyH * 0.7);
  fillRect(buf, bodyX + 1, detailY2, bodyW - 2, 1, METAL_D, W, H);

  // ─ 装甲ひびわれ（ランダム）
  if (rng.bool(0.4)) {
    const crackStartX = bodyX + rng.int(2, bodyW - 3);
    const crackStartY = bodyY + rng.int(2, bodyH - 3);
    const crackLen = rng.int(2, 4);
    for (let i = 0; i < crackLen; i++) {
      const cx = crackStartX + rng.int(-1, 1);
      const cy = crackStartY + i;
      setPixel(buf, cx, cy, METAL_D, W, H);
    }
  }

  // ─ 発光コア（胴体中央、強化版）
  const coreX = Math.floor(W / 2) - 1;
  const coreY = bodyY + Math.floor(bodyH / 2) - 1;
  // コア外殻
  fillRect(buf, coreX - 2, coreY - 1, 5, 4, pal.dark, W, H);
  // コア内部
  fillRect(buf, coreX - 1, coreY, 4, 2, pal.mid, W, H);
  // コア発光中心
  fillRect(buf, coreX, coreY, 2, 2, pal.glow, W, H);
  // コアの上下に光漏れ
  setPixel(buf, coreX, coreY - 1, pal.mid, W, H);
  setPixel(buf, coreX + 1, coreY - 1, pal.mid, W, H);
  setPixel(buf, coreX, coreY + 2, pal.mid, W, H);
  setPixel(buf, coreX + 1, coreY + 2, pal.mid, W, H);

  // ─ 眼（スリット）
  const eyeY = headY + 2;
  fillRect(buf, headX + 1, eyeY, headW - 2, 1, pal.glow, W, H);
  // 目の上下にダーク枠
  fillRect(buf, headX + 1, eyeY - 1, headW - 2, 1, pal.dark, W, H);
  fillRect(buf, headX + 1, eyeY + 1, headW - 2, 1, pal.dark, W, H);

  // ─ 腕（左右対称）
  const armW = rng.int(2, 3);
  const armH = rng.int(5, 9);
  const armY = bodyY + 1;
  fillRect(buf, bodyX - armW, armY, armW, armH, METAL_D, W, H);
  fillRect(buf, bodyX + bodyW, armY, armW, armH, METAL_D, W, H);
  // 腕の関節（明るいライン）
  const jointY = armY + Math.floor(armH / 2);
  fillRect(buf, bodyX - armW, jointY, armW, 1, METAL_L, W, H);
  fillRect(buf, bodyX + bodyW, jointY, armW, 1, METAL_L, W, H);
  // 腕の先端（属性色）
  fillRect(buf, bodyX - armW, armY + armH - 1, armW, 1, pal.mid, W, H);
  fillRect(buf, bodyX + bodyW, armY + armH - 1, armW, 1, pal.mid, W, H);

  // ─ 肩アーマー（ランダム）
  if (rng.bool(0.5)) {
    setPixel(buf, bodyX - armW, armY - 1, METAL_L, W, H);
    setPixel(buf, bodyX - armW + 1, armY - 1, METAL_L, W, H);
    setPixel(buf, bodyX + bodyW, armY - 1, METAL_L, W, H);
    setPixel(buf, bodyX + bodyW + armW - 2, armY - 1, METAL_L, W, H);
  }

  // ─ 足（左右対称）
  const legW = 2;
  const legH = rng.int(3, 5);
  const legY = bodyY + bodyH;
  const leg1X = bodyX + 2;
  const leg2X = bodyX + bodyW - 2 - legW;
  fillRect(buf, leg1X, legY, legW, legH, METAL_D, W, H);
  fillRect(buf, leg2X, legY, legW, legH, METAL_D, W, H);
  // 足の関節
  const legJointY = legY + Math.floor(legH / 2);
  fillRect(buf, leg1X, legJointY, legW, 1, METAL_L, W, H);
  fillRect(buf, leg2X, legJointY, legW, 1, METAL_L, W, H);
  // 足裏
  fillRect(buf, leg1X - 1, legY + legH - 1, legW + 2, 1, METAL_M, W, H);
  fillRect(buf, leg2X - 1, legY + legH - 1, legW + 2, 1, METAL_M, W, H);

  // ─ アウトライン
  addOutline(buf, pal.outline, W, H);

  // アウトラインで潰れた目・コアを復元
  fillRect(buf, headX + 2, eyeY, headW - 4, 1, pal.glow, W, H);
  setPixel(buf, coreX, coreY, pal.glow, W, H);
  setPixel(buf, coreX + 1, coreY, pal.glow, W, H);

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

  // 属性に応じたidleアニメーションクラスを付与
  canvas.dataset.element = element;
}

// ─── 属性アイコン（16×16） ─────────────────────────────────────

export function generateElementIcon(canvas, element) {
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;

  const W = 16, H = 16;
  const buf = makeBuffer(W, H);

  switch (element) {
    case 'fire': {
      // 炎：底が広く上が細い
      setPixel(buf, 7, 2, pal.glow, W, H);
      setPixel(buf, 8, 2, pal.glow, W, H);
      setPixel(buf, 7, 3, pal.light, W, H);
      setPixel(buf, 8, 3, pal.light, W, H);
      setPixel(buf, 6, 4, pal.light, W, H);
      setPixel(buf, 7, 4, pal.mid, W, H);
      setPixel(buf, 8, 4, pal.mid, W, H);
      setPixel(buf, 9, 4, pal.light, W, H);
      setPixel(buf, 6, 5, pal.mid, W, H);
      setPixel(buf, 7, 5, pal.glow, W, H);
      setPixel(buf, 8, 5, pal.glow, W, H);
      setPixel(buf, 9, 5, pal.mid, W, H);
      for (let y = 6; y <= 9; y++) {
        for (let x = 5; x <= 10; x++) {
          const c = (x >= 7 && x <= 8) ? pal.glow : pal.mid;
          setPixel(buf, x, y, c, W, H);
        }
      }
      for (let x = 5; x <= 10; x++) setPixel(buf, x, 10, pal.mid, W, H);
      for (let x = 4; x <= 11; x++) setPixel(buf, x, 11, pal.dark, W, H);
      for (let x = 5; x <= 10; x++) setPixel(buf, x, 12, pal.dark, W, H);
      for (let x = 6; x <= 9; x++) setPixel(buf, x, 13, pal.dark, W, H);
      break;
    }
    case 'water': {
      // 水滴：上半分が丸、下が尖る
      fillEllipse(buf, 8, 7, 4, 4, pal.mid, W, H);
      fillEllipse(buf, 8, 6, 3, 3, pal.light, W, H);
      setPixel(buf, 8, 3, pal.light, W, H);
      setPixel(buf, 7, 4, pal.mid, W, H);
      setPixel(buf, 9, 4, pal.mid, W, H);
      setPixel(buf, 8, 12, pal.dark, W, H);
      setPixel(buf, 7, 11, pal.dark, W, H);
      setPixel(buf, 9, 11, pal.dark, W, H);
      // ハイライト
      setPixel(buf, 6, 6, pal.glow, W, H);
      break;
    }
    case 'thunder': {
      // 稲妻：Z字ジグザグ
      const pts = [
        [6,2],[7,2],[8,2],[9,2],
        [8,3],[9,3],
        [7,4],[8,4],
        [6,5],[7,5],[8,5],[9,5],
        [6,6],[7,6],
        [7,7],[8,7],
        [6,8],[7,8],[8,8],[9,8],
        [8,9],[9,9],
        [7,10],[8,10],
        [6,11],[7,11],
        [7,12],[8,12],
      ];
      for (const [x, y] of pts) setPixel(buf, x, y, pal.mid, W, H);
      // 中心を明るく
      setPixel(buf, 7, 5, pal.glow, W, H);
      setPixel(buf, 8, 5, pal.glow, W, H);
      setPixel(buf, 7, 8, pal.glow, W, H);
      setPixel(buf, 8, 8, pal.glow, W, H);
      break;
    }
    case 'ice': {
      // 六角形の雪結晶：中心から6方向
      const cx = 8, cy = 8;
      setPixel(buf, cx, cy, pal.glow, W, H);
      // 上下
      for (let i = 1; i <= 3; i++) {
        setPixel(buf, cx, cy - i, pal.light, W, H);
        setPixel(buf, cx, cy + i, pal.light, W, H);
      }
      // 右上・左下
      for (let i = 1; i <= 2; i++) {
        setPixel(buf, cx + i, cy - i, pal.mid, W, H);
        setPixel(buf, cx - i, cy + i, pal.mid, W, H);
      }
      // 左上・右下
      for (let i = 1; i <= 2; i++) {
        setPixel(buf, cx - i, cy - i, pal.mid, W, H);
        setPixel(buf, cx + i, cy + i, pal.mid, W, H);
      }
      // 腕の先端に小枝
      setPixel(buf, cx - 1, cy - 3, pal.mid, W, H);
      setPixel(buf, cx + 1, cy - 3, pal.mid, W, H);
      setPixel(buf, cx - 1, cy + 3, pal.mid, W, H);
      setPixel(buf, cx + 1, cy + 3, pal.mid, W, H);
      break;
    }
    case 'earth': {
      // 山形3つ（横並び三角シルエット）
      // 左の山
      for (let i = 0; i <= 3; i++) {
        for (let x = 4 - i; x <= 4 + i; x++) setPixel(buf, x, 10 - i, pal.dark, W, H);
      }
      // 中央の山（高い）
      for (let i = 0; i <= 5; i++) {
        for (let x = 8 - i; x <= 8 + i; x++) setPixel(buf, x, 11 - i, pal.mid, W, H);
      }
      // 右の山
      for (let i = 0; i <= 3; i++) {
        for (let x = 12 - i; x <= 12 + i; x++) setPixel(buf, x, 10 - i, pal.dark, W, H);
      }
      // 地面
      for (let x = 1; x <= 14; x++) setPixel(buf, x, 12, pal.dark, W, H);
      // 山頂ハイライト
      setPixel(buf, 8, 6, pal.glow, W, H);
      break;
    }
    case 'wind': {
      // Cカーブ状の渦巻き弧
      const arcs = [
        [5,4],[6,3],[7,3],[8,3],[9,3],[10,4],
        [10,5],[10,6],[9,7],[8,7],
        [6,7],[7,7],[8,8],[9,9],[10,9],[11,9],
        [11,10],[10,11],[9,11],[8,11],[7,10],
        [5,5],[4,6],[4,7],[5,8],
      ];
      for (const [x, y] of arcs) setPixel(buf, x, y, pal.mid, W, H);
      // 中心付近を明るく
      setPixel(buf, 8, 7, pal.glow, W, H);
      setPixel(buf, 7, 7, pal.light, W, H);
      break;
    }
    case 'light': {
      // 星型：中心＋8方向に放射線
      const cx = 8, cy = 8;
      setPixel(buf, cx, cy, pal.glow, W, H);
      // 4方向
      for (let i = 1; i <= 3; i++) {
        setPixel(buf, cx, cy - i, pal.light, W, H);
        setPixel(buf, cx, cy + i, pal.light, W, H);
        setPixel(buf, cx - i, cy, pal.light, W, H);
        setPixel(buf, cx + i, cy, pal.light, W, H);
      }
      // 斜め4方向
      for (let i = 1; i <= 2; i++) {
        setPixel(buf, cx - i, cy - i, pal.mid, W, H);
        setPixel(buf, cx + i, cy - i, pal.mid, W, H);
        setPixel(buf, cx - i, cy + i, pal.mid, W, H);
        setPixel(buf, cx + i, cy + i, pal.mid, W, H);
      }
      // 先端を明るく
      setPixel(buf, cx, cy - 3, pal.glow, W, H);
      setPixel(buf, cx, cy + 3, pal.glow, W, H);
      setPixel(buf, cx - 3, cy, pal.glow, W, H);
      setPixel(buf, cx + 3, cy, pal.glow, W, H);
      break;
    }
    case 'dark': {
      // 三日月：大円から右側の小円を背景色で消す
      fillEllipse(buf, 8, 8, 5, 5, pal.mid, W, H);
      fillEllipse(buf, 7, 7, 4, 4, pal.light, W, H);
      // 右側を消して三日月に
      fillEllipse(buf, 10, 7, 4, 4, null, W, H);
      // アクセント
      setPixel(buf, 5, 5, pal.glow, W, H);
      break;
    }
    default: {
      // none：縦向きの剣
      // 刃（菱形）
      setPixel(buf, 8, 2, pal.light, W, H);
      setPixel(buf, 7, 3, pal.mid, W, H);
      setPixel(buf, 8, 3, pal.light, W, H);
      setPixel(buf, 9, 3, pal.mid, W, H);
      for (let y = 4; y <= 8; y++) {
        setPixel(buf, 7, y, pal.mid, W, H);
        setPixel(buf, 8, y, pal.light, W, H);
        setPixel(buf, 9, y, pal.mid, W, H);
      }
      setPixel(buf, 7, 9, pal.dark, W, H);
      setPixel(buf, 8, 9, pal.mid, W, H);
      setPixel(buf, 9, 9, pal.dark, W, H);
      // 鍔
      for (let x = 5; x <= 11; x++) setPixel(buf, x, 10, pal.dark, W, H);
      // 柄
      setPixel(buf, 8, 11, pal.dark, W, H);
      setPixel(buf, 8, 12, pal.dark, W, H);
      setPixel(buf, 8, 13, pal.dark, W, H);
      // 柄頭
      setPixel(buf, 7, 13, pal.dark, W, H);
      setPixel(buf, 9, 13, pal.dark, W, H);
      break;
    }
  }

  bufToCanvas(buf, ctx, W, H);
}

// ─── 属性バッジDOM要素 ──────────────────────────────────────────

export function createElementBadge(element) {
  const span = document.createElement('span');
  span.className = `elem-badge elem-${element}`;
  span.title = element;
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  c.style.cssText = 'display:block;image-rendering:pixelated;width:16px;height:16px;';
  generateElementIcon(c, element);
  span.appendChild(c);
  return span;
}

// ─── アイテムアイコン（24×24） ──────────────────────────────────

export function generateItemIcon(canvas, itemId, itemType, element) {
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = 24, H = 24;
  const buf = makeBuffer(W, H);
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;

  if (itemType === 'skill') {
    // 外枠：属性色の円
    fillEllipse(buf, 12, 12, 10, 10, pal.dark, W, H);
    fillEllipse(buf, 12, 12, 8, 8, pal.mid, W, H);
    // 中心に属性シンボル（簡略版）
    switch (element) {
      case 'fire':
        setPixel(buf, 12, 8, pal.glow, W, H);
        setPixel(buf, 11, 9, pal.light, W, H); setPixel(buf, 12, 9, pal.glow, W, H); setPixel(buf, 13, 9, pal.light, W, H);
        for (let y = 10; y <= 14; y++) { setPixel(buf, 11, y, pal.light, W, H); setPixel(buf, 12, y, pal.glow, W, H); setPixel(buf, 13, y, pal.light, W, H); }
        for (let x = 10; x <= 14; x++) setPixel(buf, x, 15, pal.dark, W, H);
        break;
      case 'water':
        setPixel(buf, 12, 7, pal.light, W, H);
        setPixel(buf, 11, 8, pal.light, W, H); setPixel(buf, 13, 8, pal.light, W, H);
        fillEllipse(buf, 12, 11, 3, 3, pal.light, W, H);
        setPixel(buf, 12, 15, pal.dark, W, H);
        break;
      case 'thunder':
        for (const [x, y] of [[11,7],[12,7],[12,8],[11,9],[12,9],[13,9],[12,10],[13,10],[12,11],[13,11],[12,12],[11,13],[12,14]])
          setPixel(buf, x, y, pal.glow, W, H);
        break;
      case 'ice':
        setPixel(buf, 12, 12, pal.glow, W, H);
        for (let i = 1; i <= 2; i++) {
          setPixel(buf, 12, 12 - i, pal.light, W, H); setPixel(buf, 12, 12 + i, pal.light, W, H);
          setPixel(buf, 12 - i, 12, pal.light, W, H); setPixel(buf, 12 + i, 12, pal.light, W, H);
        }
        setPixel(buf, 11, 11, pal.light, W, H); setPixel(buf, 13, 11, pal.light, W, H);
        setPixel(buf, 11, 13, pal.light, W, H); setPixel(buf, 13, 13, pal.light, W, H);
        break;
      default:
        fillEllipse(buf, 12, 12, 3, 3, pal.glow, W, H);
        break;
    }
    addOutline(buf, pal.outline, W, H);
  } else if (itemType === 'battleItem') {
    switch (itemId) {
      case 'bitem_hp_potion': {
        // 赤い瓶
        fillRect(buf, 10, 4, 4, 2, '#d97706', W, H); // 蓋
        fillRect(buf, 9, 6, 6, 3, '#fca5a5', W, H);  // 首
        fillRect(buf, 7, 9, 10, 10, '#ef4444', W, H); // 胴
        fillRect(buf, 8, 10, 8, 8, '#dc2626', W, H);  // 胴内
        // ハイライト
        fillRect(buf, 8, 10, 2, 6, '#fca5a5', W, H);
        // ラベル
        fillRect(buf, 9, 14, 6, 2, '#ffffff', W, H);
        addOutline(buf, '#450a0a', W, H);
        break;
      }
      case 'bitem_st_potion': {
        // 青い缶（円柱）
        fillEllipse(buf, 12, 6, 5, 2, '#93c5fd', W, H); // 上蓋
        fillRect(buf, 7, 6, 10, 12, '#3b82f6', W, H);   // 胴
        fillEllipse(buf, 12, 18, 5, 2, '#1e40af', W, H); // 底
        fillRect(buf, 8, 8, 8, 8, '#2563eb', W, H);      // 胴内
        // ハイライト
        fillRect(buf, 8, 8, 2, 8, '#93c5fd', W, H);
        addOutline(buf, '#082f49', W, H);
        break;
      }
      case 'bitem_bomb': {
        // 黒い球＋導火線
        fillEllipse(buf, 12, 13, 6, 6, '#334155', W, H);
        fillEllipse(buf, 12, 13, 4, 4, '#475569', W, H);
        // ハイライト
        setPixel(buf, 10, 10, '#94a3b8', W, H);
        // 導火線
        setPixel(buf, 14, 7, '#78350f', W, H);
        setPixel(buf, 15, 6, '#78350f', W, H);
        setPixel(buf, 16, 5, '#78350f', W, H);
        // 火花
        setPixel(buf, 17, 4, '#fbbf24', W, H);
        setPixel(buf, 16, 4, '#ef4444', W, H);
        addOutline(buf, '#0f172a', W, H);
        break;
      }
      default: {
        // 汎用の箱
        fillRect(buf, 6, 7, 12, 12, '#92400e', W, H);
        fillRect(buf, 7, 8, 10, 10, '#b45309', W, H);
        fillRect(buf, 6, 7, 12, 2, '#d97706', W, H); // 蓋
        addOutline(buf, '#422006', W, H);
        break;
      }
    }
  } else if (itemType === 'food') {
    switch (itemId) {
      case 'food_01':
      case 'food_02': {
        // 骨付き肉（T字）
        // 骨
        fillRect(buf, 11, 3, 2, 4, '#e2e8f0', W, H);
        setPixel(buf, 10, 3, '#e2e8f0', W, H);
        setPixel(buf, 13, 3, '#e2e8f0', W, H);
        // 肉
        fillEllipse(buf, 12, 12, 6, 5, '#991b1b', W, H);
        fillEllipse(buf, 12, 11, 5, 4, '#dc2626', W, H);
        // ハイライト
        setPixel(buf, 9, 10, '#fca5a5', W, H);
        setPixel(buf, 10, 9, '#fca5a5', W, H);
        addOutline(buf, '#450a0a', W, H);
        break;
      }
      case 'food_03':
      case 'food_04': {
        // 魚：楕円ボディ＋三角尾
        fillEllipse(buf, 11, 12, 7, 3, '#64748b', W, H);
        fillEllipse(buf, 10, 12, 6, 2, '#94a3b8', W, H);
        // 尾
        setPixel(buf, 19, 10, '#64748b', W, H);
        setPixel(buf, 20, 10, '#64748b', W, H);
        setPixel(buf, 19, 11, '#64748b', W, H);
        setPixel(buf, 20, 12, '#64748b', W, H);
        setPixel(buf, 19, 13, '#64748b', W, H);
        setPixel(buf, 20, 14, '#64748b', W, H);
        setPixel(buf, 19, 14, '#64748b', W, H);
        // 目
        setPixel(buf, 6, 11, '#0f172a', W, H);
        // ハイライト
        setPixel(buf, 8, 10, '#e2e8f0', W, H);
        addOutline(buf, '#0f172a', W, H);
        break;
      }
      case 'food_05':
      case 'food_06': {
        // 葉っぱ：水滴型＋葉脈
        setPixel(buf, 12, 4, '#16a34a', W, H);
        setPixel(buf, 11, 5, '#16a34a', W, H); setPixel(buf, 12, 5, '#22c55e', W, H); setPixel(buf, 13, 5, '#16a34a', W, H);
        for (let y = 6; y <= 11; y++) {
          const w = Math.min(y - 3, 5);
          for (let x = 12 - w; x <= 12 + w; x++) {
            setPixel(buf, x, y, '#16a34a', W, H);
          }
          setPixel(buf, 12, y, '#22c55e', W, H); // 葉脈
        }
        for (let y = 12; y <= 15; y++) {
          const w = 15 - y;
          for (let x = 12 - w; x <= 12 + w; x++) {
            setPixel(buf, x, y, '#16a34a', W, H);
          }
          setPixel(buf, 12, y, '#22c55e', W, H);
        }
        // 茎
        setPixel(buf, 12, 16, '#166534', W, H);
        setPixel(buf, 12, 17, '#166534', W, H);
        addOutline(buf, '#052e16', W, H);
        break;
      }
      case 'food_07':
      case 'food_08': {
        // 丸い実（紫系）
        fillEllipse(buf, 12, 12, 5, 5, '#7c3aed', W, H);
        fillEllipse(buf, 12, 11, 4, 4, '#8b5cf6', W, H);
        // ハイライト
        setPixel(buf, 10, 9, '#c4b5fd', W, H);
        setPixel(buf, 10, 10, '#c4b5fd', W, H);
        // ヘタ
        setPixel(buf, 12, 6, '#166534', W, H);
        setPixel(buf, 13, 5, '#166534', W, H);
        addOutline(buf, '#1a0533', W, H);
        break;
      }
      case 'food_09': {
        // 星形の実（黄系5角星）
        const star = [
          [12,4],
          [11,7],[12,7],[13,7],
          [10,8],[11,8],[12,8],[13,8],[14,8],
          [8,9],[9,9],[10,9],[14,9],[15,9],[16,9],
          [9,10],[10,10],[14,10],[15,10],
          [10,11],[11,11],[12,11],[13,11],[14,11],
          [10,12],[11,12],[13,12],[14,12],
          [9,13],[10,13],[14,13],[15,13],
          [9,14],[14,14],
        ];
        for (const [x, y] of star) setPixel(buf, x, y, '#f59e0b', W, H);
        // 中心を明るく
        setPixel(buf, 12, 8, '#fcd34d', W, H);
        setPixel(buf, 11, 9, '#fcd34d', W, H);
        setPixel(buf, 12, 9, '#fcd34d', W, H);
        setPixel(buf, 13, 9, '#fcd34d', W, H);
        setPixel(buf, 12, 10, '#fcd34d', W, H);
        addOutline(buf, '#422006', W, H);
        break;
      }
      default: {
        // 汎用の丸い球（緑）
        fillEllipse(buf, 12, 12, 5, 5, '#16a34a', W, H);
        fillEllipse(buf, 12, 11, 4, 4, '#22c55e', W, H);
        setPixel(buf, 10, 9, '#86efac', W, H);
        addOutline(buf, '#052e16', W, H);
        break;
      }
    }
  }

  bufToCanvas(buf, ctx, W, H);
}

// ─── NPCスプライト（32×32） ────────────────────────────────────

export function generateNPCSprite(canvas, npcId) {
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = 32, H = 32;
  const buf = makeBuffer(W, H);

  if (npcId === 'cork') {
    const skin = '#c8956c';
    const hair = '#3d2b1f';
    const suit = '#2d3748';
    const badge = '#fbbf24';
    const outline = '#1a1a2a';
    const eye = '#1a1a2a';

    // 頭（楕円）
    fillEllipse(buf, 16, 9, 6, 7, skin, W, H);

    // 髪（頭の上半分を覆う）
    fillEllipse(buf, 16, 6, 6, 4, hair, W, H);
    // 横髪
    setPixel(buf, 10, 8, hair, W, H);
    setPixel(buf, 10, 9, hair, W, H);
    setPixel(buf, 22, 8, hair, W, H);
    setPixel(buf, 22, 9, hair, W, H);

    // 眉（への字：内側が少し下がった）
    setPixel(buf, 13, 8, eye, W, H);
    setPixel(buf, 14, 9, eye, W, H);
    setPixel(buf, 18, 9, eye, W, H);
    setPixel(buf, 19, 8, eye, W, H);

    // 目（ふさぎかけた小さい目）
    setPixel(buf, 13, 10, eye, W, H);
    setPixel(buf, 19, 10, eye, W, H);

    // 口（一文字口）
    setPixel(buf, 15, 13, eye, W, H);
    setPixel(buf, 16, 13, eye, W, H);

    // 胴体（制服）
    fillRect(buf, 10, 18, 12, 10, suit, W, H);

    // 腕左
    fillRect(buf, 7, 19, 3, 7, suit, W, H);
    // 腕右
    fillRect(buf, 22, 19, 3, 7, suit, W, H);

    // 首
    fillRect(buf, 14, 16, 4, 3, skin, W, H);

    // 手
    fillRect(buf, 7, 26, 3, 2, skin, W, H);
    fillRect(buf, 22, 26, 3, 2, skin, W, H);

    // ギルドバッジ（胸中央に星：中心＋4方向）
    setPixel(buf, 15, 22, badge, W, H);
    setPixel(buf, 15, 21, badge, W, H);
    setPixel(buf, 15, 23, badge, W, H);
    setPixel(buf, 14, 22, badge, W, H);
    setPixel(buf, 16, 22, badge, W, H);

    // 足
    fillRect(buf, 11, 28, 4, 3, '#1a1a2a', W, H);
    fillRect(buf, 17, 28, 4, 3, '#1a1a2a', W, H);

    // アウトライン
    addOutline(buf, outline, W, H);

    // アウトラインで潰れた目を復元
    setPixel(buf, 13, 10, eye, W, H);
    setPixel(buf, 19, 10, eye, W, H);
  }

  bufToCanvas(buf, ctx, W, H);
}

// ─── 卵スプライト（32×32） ────────────────────────────────────────
// 属性ごとに色・模様が異なるピクセルアートの卵

export function generateEggSprite(canvas, element) {
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = 32, H = 32;
  const buf = makeBuffer(W, H);
  const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.none;

  // 卵の基本形（縦長オーバル、中心をやや下に）
  const cx = 16, cy = 18, rx = 9, ry = 11;
  fillEllipse(buf, cx, cy, rx, ry, pal.light, W, H);
  // 下半分をやや暗く（立体感）
  fillEllipse(buf, cx, cy + 4, rx - 2, ry - 5, pal.mid, W, H);

  // 属性別の模様
  switch (element) {
    case 'fire':
      // 炎のしずく斑点
      for (const [px, py] of [[13,14],[17,16],[12,19],[18,19],[15,22]])
        if (buf[py]?.[px]) { setPixel(buf, px, py, pal.glow, W, H); setPixel(buf, px, py + 1, pal.glow, W, H); }
      break;
    case 'water':
      // 水玉
      for (const [px, py] of [[13,15],[19,17],[14,21],[20,20]])
        fillEllipse(buf, px, py, 1, 1, pal.dark, W, H);
      break;
    case 'thunder':
      // 稲妻ジグザグ
      for (const [px, py] of [[16,13],[15,15],[17,15],[16,17],[15,19],[17,21]])
        if (buf[py]?.[px]) setPixel(buf, px, py, pal.glow, W, H);
      break;
    case 'earth':
      // 格子（菱形模様）
      for (let y = 14; y <= 24; y += 4)
        for (let x = 9; x <= 23; x += 4)
          if (buf[y]?.[x]) setPixel(buf, x, y, pal.dark, W, H);
      for (let y = 16; y <= 24; y += 4)
        for (let x = 11; x <= 23; x += 4)
          if (buf[y]?.[x]) setPixel(buf, x, y, pal.dark, W, H);
      break;
    case 'ice':
      // 雪の結晶（十字＋斜め）
      for (let i = -3; i <= 3; i++) {
        if (buf[18]?.[16 + i]) setPixel(buf, 16 + i, 18, pal.glow, W, H);
        if (buf[18 + i]?.[16]) setPixel(buf, 16, 18 + i, pal.glow, W, H);
      }
      for (const [px, py] of [[14,16],[18,16],[14,20],[18,20]])
        if (buf[py]?.[px]) setPixel(buf, px, py, pal.glow, W, H);
      break;
    case 'wind':
      // 流れる曲線2本
      for (const [px, py] of [[11,15],[12,14],[14,14],[16,15],[18,14],[20,14]])
        if (buf[py]?.[px]) setPixel(buf, px, py, pal.glow, W, H);
      for (const [px, py] of [[11,19],[12,20],[14,20],[16,19],[18,20],[20,20]])
        if (buf[py]?.[px]) setPixel(buf, px, py, pal.glow, W, H);
      break;
    case 'light':
      // 放射の光条
      for (let i = 0; i < 4; i++) {
        if (buf[16]?.[13 + i]) setPixel(buf, 13 + i, 16, pal.glow, W, H);
        if (buf[16]?.[17 + i]) setPixel(buf, 17 + i, 16, pal.glow, W, H);
        if (buf[13 + i]?.[16]) setPixel(buf, 16, 13 + i, pal.glow, W, H);
        if (buf[17 + i]?.[16]) setPixel(buf, 16, 17 + i, pal.glow, W, H);
      }
      break;
    case 'dark':
      // 星型の点
      for (const [px, py] of [[13,14],[19,14],[11,18],[21,18],[13,22],[19,22]])
        if (buf[py]?.[px]) setPixel(buf, px, py, pal.glow, W, H);
      break;
    default:
      // 横ストライプ2本
      for (let x = 8; x <= 23; x++) {
        if (buf[17]?.[x]) setPixel(buf, x, 17, pal.dark, W, H);
        if (buf[21]?.[x]) setPixel(buf, x, 21, pal.dark, W, H);
      }
  }

  addOutline(buf, pal.outline, W, H);

  // ハイライト（左上）―アウトラインの上から重ねる
  setPixel(buf, 12, 11, '#ffffff', W, H);
  setPixel(buf, 13, 11, '#ffffff', W, H);
  setPixel(buf, 12, 12, '#ffffff', W, H);

  bufToCanvas(buf, ctx, W, H);
}

// ─── UI ボタン用アイコン（24×24） ────────────────────────────────

export function generateUIIcon(canvas, iconType) {
  const W = 24, H = 24;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const buf = makeBuffer(W, H);

  if (iconType === 'party') {
    // 3体のジュウマシルエット（奥左・中央大・奥右）

    // 奥左（小さめ・暗め）
    fillEllipse(buf, 5, 10, 3, 3, '#334155', W, H);
    fillEllipse(buf, 5, 15, 3, 3, '#334155', W, H);
    setPixel(buf, 3, 18, '#334155', W, H);
    setPixel(buf, 7, 18, '#334155', W, H);

    // 奥右（小さめ・暗め）
    fillEllipse(buf, 19, 10, 3, 3, '#334155', W, H);
    fillEllipse(buf, 19, 15, 3, 3, '#334155', W, H);
    setPixel(buf, 17, 18, '#334155', W, H);
    setPixel(buf, 21, 18, '#334155', W, H);

    // 中央（大きめ・明るめ）
    fillEllipse(buf, 12, 8, 4, 4, '#94a3b8', W, H);
    fillEllipse(buf, 12, 15, 4, 4, '#64748b', W, H);
    setPixel(buf, 9, 19, '#64748b', W, H);
    setPixel(buf, 10, 19, '#64748b', W, H);
    setPixel(buf, 14, 19, '#64748b', W, H);
    setPixel(buf, 15, 19, '#64748b', W, H);
    // 目（中央キャラ）
    setPixel(buf, 10, 7, '#e2e8f0', W, H);
    setPixel(buf, 14, 7, '#e2e8f0', W, H);

    addOutline(buf, '#0f172a', W, H);
    // アウトラインで潰れた目を復元
    setPixel(buf, 10, 7, '#e2e8f0', W, H);
    setPixel(buf, 14, 7, '#e2e8f0', W, H);

  } else if (iconType === 'inventory') {
    // バックパック

    // ハンドル
    fillRect(buf, 9, 3, 6, 3, '#92400e', W, H);
    fillRect(buf, 10, 4, 4, 3, '#b45309', W, H);

    // 本体
    fillRect(buf, 4, 8, 16, 13, '#92400e', W, H);
    fillRect(buf, 5, 9, 14, 11, '#b45309', W, H);

    // フラップ（蓋）
    fillRect(buf, 4, 6, 16, 4, '#78350f', W, H);
    fillEllipse(buf, 12, 6, 8, 2, '#78350f', W, H);

    // ポケット（前面）
    fillRect(buf, 8, 13, 8, 5, '#78350f', W, H);
    fillRect(buf, 9, 14, 6, 3, '#92400e', W, H);

    // バックル
    setPixel(buf, 11, 11, '#d97706', W, H);
    setPixel(buf, 12, 11, '#fbbf24', W, H);
    setPixel(buf, 13, 11, '#d97706', W, H);
    fillRect(buf, 11, 12, 3, 1, '#d97706', W, H);

    // ハイライト
    fillRect(buf, 5, 9, 2, 5, '#d97706', W, H);

    addOutline(buf, '#422006', W, H);

  } else if (iconType === 'save') {
    // フロッピーディスク

    // 本体
    fillRect(buf, 3, 2, 18, 20, '#334155', W, H);
    fillRect(buf, 4, 3, 16, 18, '#475569', W, H);

    // 右上カット（フロッピー特徴）
    fillRect(buf, 15, 2, 6, 6, null, W, H);
    fillRect(buf, 15, 2, 5, 5, '#334155', W, H);
    setPixel(buf, 19, 3, '#334155', W, H);
    setPixel(buf, 19, 4, '#334155', W, H);
    setPixel(buf, 20, 4, '#334155', W, H);

    // ラベル部分（中央の明るい面）
    fillRect(buf, 5, 11, 14, 8, '#94a3b8', W, H);
    fillRect(buf, 6, 12, 12, 6, '#cbd5e1', W, H);
    // ラベルの線
    fillRect(buf, 6, 14, 12, 1, '#94a3b8', W, H);
    fillRect(buf, 6, 16, 12, 1, '#94a3b8', W, H);

    // ラベル上部の書き込み口（スロット）
    fillRect(buf, 8, 3, 8, 6, '#1e293b', W, H);
    fillRect(buf, 10, 4, 4, 4, '#0f172a', W, H);
    // スロット内のシャッター
    fillRect(buf, 9, 4, 1, 4, '#334155', W, H);

    // ハイライト
    setPixel(buf, 4, 3, '#64748b', W, H);
    setPixel(buf, 4, 4, '#64748b', W, H);

    addOutline(buf, '#0f172a', W, H);
  }

  bufToCanvas(buf, ctx, W, H);
}
