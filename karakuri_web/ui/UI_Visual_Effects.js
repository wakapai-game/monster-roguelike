// ---- Attack Effect System (Canvas Particle) ----

/**
 * Play an elemental attack effect on top of a target's monster card.
 * @param {string} elementType - fire/water/thunder/ice/earth/wind/dark/light/none
 * @param {string} targetSide - 'p1' or 'p2'
 * @param {Function} [callback] - called when the effect finishes
 */
export function playEffect(elementType, targetSide, callback) {
  const card = document.getElementById(`${targetSide}-active-card`);
  if (!card) { callback?.(); return; }

  // Create overlay canvas
  const canvas = document.createElement('canvas');
  const rect = card.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  canvas.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10; border-radius:12px;`;
  card.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const w = rect.width;
  const h = rect.height;

  const effectFn = EFFECT_MAP[elementType] || EFFECT_MAP['none'];
  const particles = effectFn.init(w, h);
  const duration = effectFn.duration || 700;
  const startTime = performance.now();

  // rAFが止まった場合（スマホ画面OFF・タブ切替など）のフォールバック
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    canvas.remove();
    callback?.();
  };
  const safetyTimer = setTimeout(finish, duration + 400);

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    ctx.clearRect(0, 0, w, h);
    effectFn.draw(ctx, particles, t, w, h);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      clearTimeout(safetyTimer);
      finish();
    }
  }

  requestAnimationFrame(animate);
}

// ---- Utility ----
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---- Effect Definitions ----

const EFFECT_MAP = {
  // ---- Fire: rising flame particles ----
  fire: {
    duration: 450,
    init(w, h) {
      return Array.from({ length: 30 }, () => ({
        x: rand(w * 0.2, w * 0.8),
        y: rand(h * 0.4, h * 0.9),
        r: rand(3, 8),
        speed: rand(40, 100),
        drift: rand(-20, 20),
        color: Math.random() > 0.4 ? '#ff6b35' : '#fbbf24',
      }));
    },
    draw(ctx, particles, t, w, h) {
      const alpha = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
      particles.forEach(p => {
        const y = p.y - p.speed * t;
        const x = p.x + p.drift * t;
        const r = p.r * (1 - t * 0.5);
        ctx.globalAlpha = alpha * (1 - t * 0.6);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  },

  // ---- Water: splashing droplets ----
  water: {
    duration: 450,
    init(w, h) {
      return Array.from({ length: 25 }, () => ({
        x: rand(w * 0.3, w * 0.7),
        y: h * 0.5,
        vx: rand(-60, 60),
        vy: rand(-80, -20),
        r: rand(2, 6),
        color: Math.random() > 0.5 ? '#60a5fa' : '#22d3ee',
      }));
    },
    draw(ctx, particles, t, w, h) {
      const alpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      particles.forEach(p => {
        const x = p.x + p.vx * t;
        const y = p.y + p.vy * t + 120 * t * t; // gravity
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  },

  // ---- Thunder: zigzag lightning bolts ----
  thunder: {
    duration: 350,
    init(w, h) {
      // Generate 3 lightning bolts
      return Array.from({ length: 3 }, () => {
        const startX = rand(w * 0.3, w * 0.7);
        const segments = [];
        let x = startX, y = 0;
        const steps = randInt(5, 8);
        for (let i = 0; i < steps; i++) {
          const nx = x + rand(-20, 20);
          const ny = y + h / steps;
          segments.push({ x1: x, y1: y, x2: nx, y2: ny });
          x = nx; y = ny;
        }
        return { segments, color: Math.random() > 0.5 ? '#fbbf24' : '#ffffff' };
      });
    },
    draw(ctx, bolts, t, w, h) {
      // Flash effect
      if (t < 0.15) {
        ctx.globalAlpha = 0.3 * (1 - t / 0.15);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, w, h);
      }
      const alpha = t < 0.1 ? t / 0.1 : t > 0.6 ? (1 - t) / 0.4 : 1;
      bolts.forEach(bolt => {
        ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.4); // flicker
        ctx.strokeStyle = bolt.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        bolt.segments.forEach((seg, i) => {
          if (i === 0) ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    }
  },

  // ---- Ice: crystalline shards ----
  ice: {
    duration: 350,
    init(w, h) {
      return Array.from({ length: 20 }, () => ({
        x: rand(w * 0.2, w * 0.8),
        y: rand(h * 0.2, h * 0.8),
        size: rand(4, 10),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-3, 3),
        color: Math.random() > 0.5 ? '#e0f2fe' : '#67e8f9',
        delay: rand(0, 0.3),
      }));
    },
    draw(ctx, particles, t, w, h) {
      particles.forEach(p => {
        const localT = Math.max(0, Math.min(1, (t - p.delay) / (1 - p.delay)));
        if (localT <= 0) return;
        const scale = localT < 0.3 ? localT / 0.3 : localT > 0.7 ? (1 - localT) / 0.3 : 1;
        const angle = p.rotation + p.rotSpeed * t;

        ctx.save();
        ctx.globalAlpha = scale * 0.9;
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.fillStyle = p.color;
        // Diamond shape
        ctx.beginPath();
        const s = p.size * scale;
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.5, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }
  },

  // ---- Earth: rock fragments ----
  earth: {
    duration: 450,
    init(w, h) {
      return Array.from({ length: 15 }, () => ({
        x: rand(w * 0.2, w * 0.8),
        y: h * 0.8,
        vx: rand(-30, 30),
        vy: rand(-90, -40),
        size: rand(4, 10),
        rotation: rand(0, Math.PI * 2),
        color: Math.random() > 0.5 ? '#92400e' : '#78716c',
      }));
    },
    draw(ctx, particles, t, w, h) {
      const alpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      particles.forEach(p => {
        const x = p.x + p.vx * t;
        const y = p.y + p.vy * t + 150 * t * t;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.translate(x, y);
        ctx.rotate(p.rotation + t * 4);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
    }
  },

  // ---- Wind: swirling arcs ----
  wind: {
    duration: 450,
    init(w, h) {
      return Array.from({ length: 12 }, () => ({
        cx: w * 0.5 + rand(-20, 20),
        cy: h * 0.5 + rand(-20, 20),
        radius: rand(15, 45),
        startAngle: rand(0, Math.PI * 2),
        speed: rand(4, 8),
        color: Math.random() > 0.5 ? '#4ade80' : '#a3e635',
      }));
    },
    draw(ctx, particles, t, w, h) {
      const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
      particles.forEach(p => {
        const angle = p.startAngle + p.speed * t;
        const arcLen = Math.PI * 0.6;
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.radius, angle, angle + arcLen);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  },

  // ---- Dark: spreading shadow waves ----
  dark: {
    duration: 350,
    init(w, h) {
      return Array.from({ length: 3 }, (_, i) => ({
        cx: w * 0.5,
        cy: h * 0.5,
        maxRadius: rand(30, 60),
        delay: i * 0.15,
        color: Math.random() > 0.5 ? '#7c3aed' : '#1e1b4b',
      }));
    },
    draw(ctx, rings, t, w, h) {
      rings.forEach(ring => {
        const localT = Math.max(0, (t - ring.delay) / (1 - ring.delay));
        if (localT <= 0) return;
        const r = ring.maxRadius * localT;
        const alpha = (1 - localT) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ring.cx, ring.cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Scattered dark particles
      if (t < 0.8) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + t * 3;
          const dist = 20 + t * 40;
          const x = w * 0.5 + Math.cos(angle) * dist;
          const y = h * 0.5 + Math.sin(angle) * dist;
          ctx.globalAlpha = (1 - t) * 0.5;
          ctx.fillStyle = '#a78bfa';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  },

  // ---- Light: radiant golden particles ----
  light: {
    duration: 450,
    init(w, h) {
      return Array.from({ length: 20 }, () => ({
        x: w * 0.5 + rand(-30, 30),
        y: h * 0.5 + rand(-30, 30),
        angle: rand(0, Math.PI * 2),
        speed: rand(30, 70),
        r: rand(2, 5),
        color: Math.random() > 0.5 ? '#fef9c3' : '#fbbf24',
      }));
    },
    draw(ctx, particles, t, w, h) {
      // Central flash
      if (t < 0.3) {
        const flashAlpha = (1 - t / 0.3) * 0.25;
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, 30 + t * 40, 0, Math.PI * 2);
        ctx.fill();
      }
      // Expanding particles
      const alpha = t > 0.6 ? (1 - t) / 0.4 : 1;
      particles.forEach(p => {
        const x = p.x + Math.cos(p.angle) * p.speed * t;
        const y = p.y + Math.sin(p.angle) * p.speed * t;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 - t * 0.3), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  },

  // ---- None (physical): impact shockwave ----
  none: {
    duration: 350,
    init(w, h) {
      return [{ cx: w * 0.5, cy: h * 0.5, maxRadius: 50 }];
    },
    draw(ctx, particles, t, w, h) {
      const p = particles[0];
      const r = p.maxRadius * t;
      const alpha = (1 - t) * 0.6;

      // Shockwave ring
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3 * (1 - t);
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Impact lines
      if (t < 0.4) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const innerR = r * 0.3;
          const outerR = r;
          ctx.globalAlpha = (1 - t / 0.4) * 0.5;
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.cx + Math.cos(angle) * innerR, p.cy + Math.sin(angle) * innerR);
          ctx.lineTo(p.cx + Math.cos(angle) * outerR, p.cy + Math.sin(angle) * outerR);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  },
};
