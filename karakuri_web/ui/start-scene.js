/**
 * start-scene.js
 * スタート画面のモンスターパレードアニメーション
 * - ジュウマ（MONSTERS_DATA）とカラクリ（ENEMY_DATA）が登場
 * - 属性・spd・種別ごとに異なる動き
 * - screen-start が非表示になると自動停止
 */

import { MONSTERS_DATA, ENEMY_DATA } from '../data.js';
import { generateMonsterSprite } from './sprite-generator.js';

const PIXEL_SCALE = 4;          // 32px × 4 = 128px で描画
const SPRITE_PX = 32 * PIXEL_SCALE;

// ---- 動きの定義 ------------------------------------------------

/**
 * 属性・種別ごとの Behavior を返す
 * @param {string} element
 * @param {number} spd  base_stats.spd
 * @param {boolean} isEnemy  カラクリかどうか
 */
function makeBehavior(element, spd, isEnemy) {
  const norm = Math.max(0.3, spd / 35); // spd=35 → 1.0 基準

  // ---- カラクリ：カクカク歩き（歩く→止まる→歩く）----
  if (isEnemy) {
    const mult = norm * 0.55;
    return {
      update(s, t, dt) {
        s.stepT = (s.stepT || 0) + dt;
        const cycle = 0.85, moveFrac = 0.42;
        if ((s.stepT % cycle) / cycle < moveFrac) {
          s.x += s.dir * mult * 60 * dt;
        }
        s.y = s.baseY + Math.sin(t * 5 + s.phase) * 2; // 小さいカクつき
        s.alpha = 1;
      },
    };
  }

  // ---- ジュウマ：属性別 ----------------------------------------
  switch (element) {

    case 'fire':
      // 速い + 地面から跳ねる（炎の活発さ）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 1.35 * 60 * dt;
        s.y = s.baseY - Math.abs(Math.sin(t * 4.5 + s.phase)) * 14;
        s.alpha = 1;
      }};

    case 'water':
      // 中速 + なめらかな波形（流れるように）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 1.0 * 60 * dt;
        s.y = s.baseY + Math.sin(t * 1.4 + s.phase) * 11;
        s.alpha = 1;
      }};

    case 'thunder':
      // 中速 + 2.5秒ごとに瞬間移動（雷のワープ）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 1.2 * 60 * dt;
        s.zapT = (s.zapT || 0) + dt;
        if (s.zapT >= 2.5) { s.x += s.dir * 48; s.zapT = 0; }
        s.y = s.baseY + Math.sin(t * 7 + s.phase) * 4;
        s.alpha = 1;
      }};

    case 'earth':
      // 遅い + 重くドスン着地（pow で急落・緩上がり）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 0.45 * 60 * dt;
        const stomp = Math.pow(Math.abs(Math.sin(t * 1.8 + s.phase)), 0.35);
        s.y = s.baseY + stomp * 9;
        s.alpha = 1;
      }};

    case 'dark':
      // ゆっくり + 透明度が波打つ（幽霊的）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 0.65 * 60 * dt;
        s.y = s.baseY + Math.sin(t * 0.8 + s.phase) * 7;
        s.alpha = 0.3 + Math.abs(Math.sin(t * 0.9 + s.phase)) * 0.6;
      }};

    case 'light':
      // 高い位置を浮遊 + 輝き感（alpha 微振動）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 0.75 * 60 * dt;
        s.y = s.baseY - 24 + Math.sin(t * 1.1 + s.phase) * 10;
        s.alpha = 0.75 + Math.sin(t * 1.6 + s.phase) * 0.25;
      }};

    case 'ice':
      // 中速 + 直線的でなめらか（氷の滑り）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 0.9 * 60 * dt;
        s.y = s.baseY + Math.sin(t * 0.55 + s.phase) * 3;
        s.alpha = 1;
      }};

    case 'wind':
      // 速い + 大きな上下弧（飛翔感）
      return { update(s, t, dt) {
        s.x += s.dir * norm * 1.5 * 60 * dt;
        s.y = s.baseY - 14 + Math.sin(t * 2.5 + s.phase) * 22;
        s.alpha = 1;
      }};

    default:
      return { update(s, t, dt) {
        s.x += s.dir * norm * 1.0 * 60 * dt;
        s.y = s.baseY + Math.sin(t * 2 + s.phase) * 6;
        s.alpha = 1;
      }};
  }
}

// ---- ハッシュ（位置・位相の初期化用）--------------------------
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

// ---- メイン ----------------------------------------------------

export function initStartScene() {
  const section = document.getElementById('screen-start');
  if (!section) return;

  // キャンバスを section の最背面に追加
  const canvas = document.createElement('canvas');
  canvas.id = 'start-monsters-canvas';
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  section.style.position = 'relative';
  section.insertBefore(canvas, section.firstChild);

  // 既存コンテンツを前面に（シルエットSVGはabsolute配置を維持するためスキップ）
  [...section.children].forEach(el => {
    if (el !== canvas && !el.classList.contains('start-silhouette')) {
      el.style.position = 'relative';
      el.style.zIndex = '1';
    }
  });

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ---- 全モンスターのスプライトをプールとして生成 --------------
  const allData = [...MONSTERS_DATA, ...ENEMY_DATA];
  const pool = allData.map((m) => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 32;
    offscreen.height = 32;
    generateMonsterSprite(offscreen, m);
    const isEnemy = m.id.startsWith('e_');
    return {
      sprite: offscreen,
      isEnemy,
      behavior: makeBehavior(m.main_element, m.base_stats.spd, isEnemy),
      hashBase: simpleHash(m.id),
    };
  });

  let poolIndex = 0; // 次に登場させるモンスターのインデックス

  // ---- スロット（同時表示2体）----------------------------------
  // slot: { poolEntry, state }
  const MAX_ACTIVE = 2;
  const slots = [];

  function getGroundY(H) {
    return H * 0.72;
  }

  // スロットに新しいモンスターをセット（画面端から入場）
  function spawnIntoSlot(slot, W, H, slotIndex) {
    const entry = pool[poolIndex % pool.length];
    poolIndex++;

    // 2スロットを交互に左→右、右→左で入場させる
    const dir = (slotIndex % 2 === 0) ? 1 : -1;
    const margin = SPRITE_PX * 0.6;
    const startX = dir > 0 ? -margin : W + margin;
    const baseY = getGroundY(H) + ((entry.hashBase % 50) - 25);

    slot.entry = entry;
    slot.state = {
      x: startX,
      y: baseY,
      baseY,
      dir,
      phase: (entry.hashBase % 1000) / 1000 * Math.PI * 2,
      alpha: 1,
      stepT: 0,
      zapT: 0,
    };
  }

  // ---- キャンバスサイズ設定 ------------------------------------
  function resize() {
    canvas.width = section.clientWidth || window.innerWidth;
    canvas.height = section.clientHeight || window.innerHeight;
    ctx.imageSmoothingEnabled = false;
  }

  resize();
  window.addEventListener('resize', resize);

  // ---- アニメーションループ ------------------------------------
  let raf = null;
  let lastTime = null;
  let initialized = false;

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    const t = ts / 1000;

    const W = canvas.width;
    const H = canvas.height;

    // 初回：2体を画面端から入場
    if (!initialized) {
      for (let i = 0; i < MAX_ACTIVE; i++) {
        slots.push({ entry: null, state: null });
        spawnIntoSlot(slots[i], W, H, i);
      }
      initialized = true;
    }

    ctx.clearRect(0, 0, W, H);
    const margin = SPRITE_PX * 0.6;

    slots.forEach((slot, slotIndex) => {
      const { entry, state: s } = slot;
      if (!entry) return;

      entry.behavior.update(s, t, dt);

      // 画面外に出たら次のモンスターに交代
      if ((s.dir > 0 && s.x > W + margin) || (s.dir < 0 && s.x < -margin)) {
        spawnIntoSlot(slot, W, H, slotIndex);
        return;
      }

      const drawX = s.x - SPRITE_PX / 2;
      const drawY = s.y - SPRITE_PX / 2;

      // 影
      ctx.globalAlpha = 0.22 * s.alpha;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(s.x, s.baseY + SPRITE_PX * 0.44, SPRITE_PX * 0.32, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // スプライト（進行方向に向く）
      ctx.globalAlpha = s.alpha;
      ctx.save();
      if (s.dir < 0) {
        ctx.translate(s.x, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(entry.sprite, -SPRITE_PX / 2, 0, SPRITE_PX, SPRITE_PX);
      } else {
        ctx.drawImage(entry.sprite, drawX, drawY, SPRITE_PX, SPRITE_PX);
      }
      ctx.restore();

      ctx.globalAlpha = 1;
    });

    raf = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (raf) return;
    lastTime = null;
    raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  // screen-start の表示/非表示に連動
  new MutationObserver(() => {
    if (section.classList.contains('active')) startLoop();
    else stopLoop();
  }).observe(section, { attributes: true, attributeFilter: ['class'] });

  // 初期状態
  if (section.classList.contains('active')) {
    // レンダリング後にサイズを再取得してから開始
    requestAnimationFrame(() => { resize(); startLoop(); });
  }
}
