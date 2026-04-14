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
