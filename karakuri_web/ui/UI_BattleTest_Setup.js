import { KARAKURI_DATA, JUMA_DATA, STAT_PARTS, TECH_PARTS } from '../../data.js';

const MIN_STAT_VALUE = 1;

export function renderBattleTestSetup() {
  const container = document.getElementById('battle-test-setup');
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">
      <h2 style="margin-bottom:16px; color:#c4b5fd; letter-spacing:0.08em;">⚔ 戦闘テスト</h2>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div class="glass-panel" style="padding:16px;">
          <h3 style="margin-bottom:12px; color:#93c5fd; font-size:0.9rem;">A. 味方編成（1〜3体）</h3>
          <div id="test-ally-list"></div>
        </div>
        <div class="glass-panel" style="padding:16px;">
          <h3 style="margin-bottom:12px; color:#fca5a5; font-size:0.9rem;">B. 敵設定</h3>
          <div id="test-enemy-config"></div>
        </div>
      </div>
      <div class="glass-panel" style="padding:16px; margin-bottom:16px;">
        <h3 style="margin-bottom:12px; color:#6ee7b7; font-size:0.9rem;">C. オプション / プリセット</h3>
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start;">
          <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" id="test-force-weakness">
            弱点強制モード（aff = 2.0 固定）
          </label>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem;">
            <label>オートバトル</label>
            <input type="number" id="test-auto-n" value="10" min="1" max="500"
              style="width:60px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;">
            <label>回</label>
            <button id="btn-test-auto" class="btn skill-btn" style="font-size:0.78rem; padding:4px 12px;">実行</button>
          </div>
          <div id="test-auto-result" style="font-size:0.82rem; color:#6ee7b7; font-family:monospace; width:100%;"></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <button id="btn-preset-weakness" class="btn skill-btn" style="font-size:0.8rem;">プリセット: 弱点連打</button>
          <button id="btn-preset-en-low"   class="btn skill-btn" style="font-size:0.8rem;">プリセット: EN枯渇ぎわ</button>
        </div>
      </div>
      <div style="display:flex; gap:12px; justify-content:center; padding-bottom:24px;">
        <button id="btn-test-start"    class="btn primary-btn" style="padding:12px 32px;">バトル開始</button>
        <button id="btn-test-to-title" class="btn skill-btn"   style="padding:12px 24px;">← タイトルへ</button>
      </div>
    </div>
  `;

  _renderAllyList();
  _renderEnemyConfig();
  _wirePresetButtons();
}

function _renderAllyList() {
  const el = document.getElementById('test-ally-list');
  if (!el) return;

  const ELEM_LABEL = { fire:'🔥', water:'💧', ice:'❄', thunder:'⚡', earth:'🪨', wind:'🌀', light:'✨', dark:'🌑', none:'' };
  const CAT_COLOR  = { attack:'#fca5a5', defense:'#93c5fd', support:'#86efac' };

  const techOpts = TECH_PARTS.map(t => {
    const el = ELEM_LABEL[t.element] ?? '';
    return `<option value="${t.id}">[${t.id}] ${el} ${t.name}（${t.category}）</option>`;
  }).join('');

  const statOpts = STAT_PARTS.map(p =>
    `<option value="${p.id}">[${p.id}] ${p.name}</option>`
  ).join('');

  el.innerHTML = KARAKURI_DATA.map(k => `
    <div style="margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.3); border-radius:6px;">
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
        <input type="checkbox" class="test-ally-chk" data-id="${k.id}">
        <b style="font-size:0.9rem;">${k.name}</b>
        <span style="font-size:0.7rem; color:#94a3b8;">${k.main_element}</span>
        <span style="font-size:0.68rem; color:#475569; font-family:monospace;">${k.id}</span>
      </label>
      <div class="test-ally-opts" data-id="${k.id}" style="display:none; padding:8px 0 0 16px;">
        <div style="margin-bottom:6px;">
          <label style="font-size:0.75rem; color:#94a3b8;">初期 EN:&nbsp;</label>
          <input type="number" class="test-en-input" data-id="${k.id}"
            value="${k.base_stats.max_en ?? 150}" min="0" max="9999"
            style="width:60px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;">
        </div>
        <div style="font-size:0.75rem; color:#fbbf24; margin-bottom:4px;">ワザギア（最大4スロット）:</div>
        ${[0,1,2,3].map(i => {
          const defaultId = k.default_tech?.[i] ?? '';
          return `
          <select class="test-tech-part" data-id="${k.id}" data-slot="${i}"
            style="font-size:0.75rem; margin-bottom:3px; display:block; width:100%; padding:2px 4px;
                   background:rgba(0,0,0,0.5); border:1px solid #374151; color:#e2e8f0; border-radius:4px;">
            <option value="">— 空 —</option>
            ${TECH_PARTS.map(t => {
              const em = ELEM_LABEL[t.element] ?? '';
              const sel = t.id === defaultId ? ' selected' : '';
              return `<option value="${t.id}"${sel}>[${t.id}] ${em} ${t.name}（${t.category}）</option>`;
            }).join('')}
          </select>`;
        }).join('')}
        <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px; margin-top:6px;">ボディギア（最大5スロット）:</div>
        ${[0,1,2,3,4].map(i => `
          <select class="test-stat-part" data-id="${k.id}" data-slot="${i}"
            style="font-size:0.75rem; margin-bottom:3px; display:block; width:100%; padding:2px 4px;
                   background:rgba(0,0,0,0.5); border:1px solid #374151; color:#e2e8f0; border-radius:4px;">
            <option value="">— 空 —</option>
            ${statOpts}
          </select>
        `).join('')}
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.test-ally-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      const opts = el.querySelector(`.test-ally-opts[data-id="${chk.dataset.id}"]`);
      if (opts) opts.style.display = chk.checked ? 'block' : 'none';
    });
  });
}

function _renderEnemyConfig() {
  const el = document.getElementById('test-enemy-config');
  if (!el) return;

  const enemyOpts = JUMA_DATA.map(j =>
    `<option value="${j.id}">[${j.id}] ${j.name}（${j.main_element}）</option>`
  ).join('');

  el.innerHTML = `
    <select id="test-enemy-select"
      style="width:100%; margin-bottom:12px; padding:6px 8px; background:rgba(0,0,0,0.5);
             border:1px solid #374151; color:#e2e8f0; border-radius:6px;">
      ${enemyOpts}
    </select>
    <p style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px;">ステータスを上書き（空欄 = データ値）</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.82rem;">
      <label>HP:&nbsp;<input type="number" id="test-enemy-hp"  placeholder="デフォルト"
        style="width:80px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;"></label>
      <label>EN:&nbsp;<input type="number" id="test-enemy-en"  placeholder="デフォルト"
        style="width:80px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;"></label>
      <label>ATK:<input type="number" id="test-enemy-atk" placeholder="デフォルト"
        style="width:80px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;"></label>
      <label>DEF:<input type="number" id="test-enemy-def" placeholder="デフォルト"
        style="width:80px; padding:2px 6px; background:rgba(0,0,0,0.4); border:1px solid #374151; color:#e2e8f0; border-radius:4px;"></label>
    </div>
  `;
}

function _wirePresetButtons() {
  document.getElementById('btn-preset-weakness')?.addEventListener('click', () => {
    // 全チェック外し
    document.querySelectorAll('.test-ally-chk').forEach(c => {
      if (c.checked) { c.checked = false; c.dispatchEvent(new Event('change')); }
    });
    // ガタ(k_001) を選択
    const gataChk = document.querySelector('.test-ally-chk[data-id="k_001"]');
    if (gataChk) { gataChk.checked = true; gataChk.dispatchEvent(new Event('change')); }
    // 敵: フロスト(j_004, ice弱点)
    const enemySel = document.getElementById('test-enemy-select');
    if (enemySel) enemySel.value = 'j_004';
    // 弱点強制ON
    const fw = document.getElementById('test-force-weakness');
    if (fw) fw.checked = true;
  });

  document.getElementById('btn-preset-en-low')?.addEventListener('click', () => {
    // 先頭1体だけ選択
    document.querySelectorAll('.test-ally-chk').forEach((c, i) => {
      const shouldCheck = i === 0;
      if (c.checked !== shouldCheck) { c.checked = shouldCheck; c.dispatchEvent(new Event('change')); }
    });
    // EN を 5 に設定
    const enInput = document.querySelector('.test-en-input');
    if (enInput) enInput.value = '5';
  });
}

export function buildP1Data() {
  const result = [];
  document.querySelectorAll('.test-ally-chk:checked').forEach(chk => {
    const id = chk.dataset.id;
    const base = KARAKURI_DATA.find(k => k.id === id);
    if (!base) return;
    const data = structuredClone(base);

    data.tech_parts = [];
    document.querySelectorAll(`.test-tech-part[data-id="${id}"]`).forEach(sel => {
      if (sel.value) data.tech_parts.push(sel.value);
    });

    data.stat_parts = [];
    document.querySelectorAll(`.test-stat-part[data-id="${id}"]`).forEach(sel => {
      if (sel.value) data.stat_parts.push(sel.value);
    });

    const enInput = document.querySelector(`.test-en-input[data-id="${id}"]`);
    if (enInput && enInput.value !== '') {
      data._override_en = Math.max(0, parseInt(enInput.value) || 0);
    }
    result.push(data);
    if (result.length >= 3) return false; // max 3
  });
  return result;
}

export function buildP2Data() {
  const sel = document.getElementById('test-enemy-select');
  const id = sel?.value;
  const base = JUMA_DATA.find(j => j.id === id);
  if (!base) return [];

  const data = structuredClone(base);
  data._override = {};

  const rawHP  = document.getElementById('test-enemy-hp')?.value;
  const rawEN  = document.getElementById('test-enemy-en')?.value;
  const rawATK = document.getElementById('test-enemy-atk')?.value;
  const rawDEF = document.getElementById('test-enemy-def')?.value;

  if (rawHP  != null && rawHP  !== '') data._override.hp     = Math.max(MIN_STAT_VALUE, parseInt(rawHP));
  if (rawEN  != null && rawEN  !== '') data._override.max_en = Math.max(MIN_STAT_VALUE, parseInt(rawEN));
  if (rawATK != null && rawATK !== '') data._override.atk    = Math.max(MIN_STAT_VALUE, parseInt(rawATK));
  if (rawDEF != null && rawDEF !== '') data._override.def    = Math.max(MIN_STAT_VALUE, parseInt(rawDEF));

  return [data];
}
