import { MONSTERS_DATA, SKILLS } from '../DATA_Game_Master.js';

// ---- HELP System ----

const FLOAT_BTNS = ['btn-help-global', 'btn-affinity-global', 'btn-monsters-global', 'btn-glossary-global'];

export function openHelp() {
  document.getElementById('screen-help').classList.remove('hide');
  FLOAT_BTNS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

export function openHelpTab(tabName) {
  openHelp();
  const tabBtn = document.querySelector(`[data-help-tab="${tabName}"]`);
  if (tabBtn) tabBtn.click();
}

export function closeHelp() {
  document.getElementById('screen-help').classList.add('hide');
  FLOAT_BTNS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
}

export function initHelp() {
  // タブコンテンツを生成
  document.getElementById('help-content-battle').innerHTML   = buildBattleContent();
  document.getElementById('help-content-st').innerHTML       = buildSTContent();
  document.getElementById('help-content-affinity').innerHTML = buildAffinityContent();
  document.getElementById('help-content-skills').innerHTML   = buildSkillsContent();
  document.getElementById('help-content-training').innerHTML = buildTrainingContent();
  document.getElementById('help-content-map').innerHTML      = buildMapContent();

  // 閉じるボタン
  document.getElementById('btn-close-help').onclick = closeHelp;

  // タブ切り替え
  document.querySelectorAll('[data-help-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-help-tab]').forEach(b => {
        b.className = 'btn help-tab-btn inactive-tab';
      });
      btn.className = 'btn help-tab-btn active-tab';
      document.querySelectorAll('.help-tab-content').forEach(c => c.classList.add('hide'));
      document.getElementById(`help-content-${btn.dataset.helpTab}`).classList.remove('hide');
    };
  });
}

// ============================
// タブ1: バトルの流れ
// ============================
function buildBattleContent() {
  return `
<div class="help-section">
  <h3 class="help-h3">🖥️ バトル画面の見方</h3>
  <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:10px 12px; font-size:0.82rem; line-height:1.8;">
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; text-align:center; margin-bottom:8px;">
      <div style="background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:4px; padding:6px;">
        <div style="color:#3b82f6; font-weight:bold; margin-bottom:4px;">← 左エリア</div>
        <div style="color:#94a3b8; font-size:0.78rem;">自分のビルガマタ<br><span style="color:#ef4444;">HP</span>・<span style="color:#eab308;">EN</span>・<span style="color:#10b981;">ATB</span>バー<br>控えパーティ</div>
      </div>
      <div style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:4px; padding:6px;">
        <div style="color:#10b981; font-weight:bold; margin-bottom:4px;">中央エリア</div>
        <div style="color:#94a3b8; font-size:0.78rem;">ACTION QUEUE<br>（行動順表示）<br>バトルログ</div>
      </div>
      <div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:4px; padding:6px;">
        <div style="color:#ef4444; font-weight:bold; margin-bottom:4px;">右エリア →</div>
        <div style="color:#94a3b8; font-size:0.78rem;">敵ジュウマ<br><span style="color:#ef4444;">HP</span>・<span style="color:#eab308;">EN</span>・<span style="color:#10b981;">ATB</span>バー<br>控え敵</div>
      </div>
    </div>
    <div style="background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.25); border-radius:4px; padding:6px; text-align:center;">
      <span style="color:#eab308; font-weight:bold;">↓ 下部：ギアデッキ</span>
      <span style="color:#94a3b8; font-size:0.78rem;">　ワザ・ボディ・コアの全ギアが並ぶ（操作方法は攻撃フェーズの項を参照）</span>
    </div>
  </div>
  <ul class="help-list" style="margin-top:6px;">
    <li><b style="color:#ef4444;">HP バー（赤）</b>：本体HP。ENが高いうちはHPへのダメージが抑えられる。ENが0になると全ダメージが直撃する</li>
    <li><b style="color:#eab308;">EN バー（黄）</b>：防御壁の残量。0になるとパージ発生</li>
    <li><b style="color:#10b981;">ATB ゲージ（緑）</b>：SPDで増加し100で行動。高いほど先に動ける</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">⚙️ バトルの基本フロー</h3>
  <p class="help-p">バトルは <b>ATB（Active Time Battle）</b> 方式です。ビルガマタとジュウマの <b>スピード(SPD)</b> に応じてゲージが自動で溜まり、ゲージが 100 に達したときに行動します。</p>
  <p class="help-p">自分のビルガマタがゲージ満タン → <b>攻撃フェーズ</b>（ギアデッキからTECH技を選ぶ）<br>
  敵ジュウマがゲージ満タン → <b>防御フェーズ</b>（敵の攻撃に対応する）</p>
</div>

<div class="help-section">
  <h3 class="help-h3">🔵 攻撃フェーズ — ギアデッキで操作</h3>
  <p class="help-p">画面下部のギアデッキに装備中の <b>ワザギア（青カード）</b> が表示されます。光っているカードをタップ/クリックして技を使います。</p>
  <ul class="help-list">
    <li><b>◎ バツグン</b>：カードの右上に赤バッジ → 特に有効な属性</li>
    <li><b>△ いまいち</b>：カードの右上に灰バッジ → 効果が半減</li>
    <li><b>🔄（交代）</b>：デッキ右のボタンで控えビルガマタに交代できる</li>
    <li><b>💥（パージ）</b>：デッキ右のボタンで手動ギアパージができる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🔴 防御フェーズでできること</h3>
  <p class="help-p">敵の技名と属性相性が表示されます。左のメニューから対応を選んでください。</p>
  <ul class="help-list">
    <li><b>身を守る</b>：HP へのダメージを 50% 軽減する</li>
    <li><b>防御スキル</b>（技タブ）：セットしている防御系技で対応</li>
    <li><b>アイテム</b>（アイテムタブ）：バトルアイテムを使用</li>
    <li><b>交代</b>：控えのビルガマタに交代。交代後のビルガマタが攻撃を受ける</li>
  </ul>
  <div style="margin-top:8px; background:rgba(0,0,0,0.25); border-radius:6px; padding:8px 12px;">
    <div style="color:#94a3b8; font-size:0.78rem; margin-bottom:6px;">▼ アイテムタブで使えるアイテム一覧</div>
    <div style="display:grid; gap:6px;">
      <div style="display:flex; align-items:baseline; gap:8px;">
        <span style="color:#f87171; font-weight:bold; min-width:7em;">🔧 修理キット</span>
        <span style="color:#94a3b8; font-size:0.82rem;">HPを <b style="color:#f87171;">500</b> 回復。HPが削られたときに使う</span>
      </div>
      <div style="display:flex; align-items:baseline; gap:8px;">
        <span style="color:#facc15; font-weight:bold; min-width:7em;">⚡ エネルギー缶</span>
        <span style="color:#94a3b8; font-size:0.82rem;">ENを <b style="color:#facc15;">50</b> 直接回復。パージ直前の緊急手段</span>
      </div>
      <div style="display:flex; align-items:baseline; gap:8px;">
        <span style="color:#fb923c; font-weight:bold; min-width:7em;">💣 バクダン</span>
        <span style="color:#94a3b8; font-size:0.82rem;">敵HPに <b style="color:#fb923c;">30</b> の防御無視ダメージ。ENを無視して直接削る</span>
      </div>
    </div>
  </div>
</div>

<div class="help-section">
  <h3 class="help-h3">📋 行動順パネル</h3>
  <p class="help-p">中央の <b>行動順</b> には次に行動するユニットが最大 6 ターン先まで表示されます。SPD が高いほど頻繁に行動できます。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">⚠️ 勝敗条件</h3>
  <ul class="help-list">
    <li><b>勝利</b>：敵ジュウマをすべて倒す → 報酬獲得</li>
    <li><b>敗北</b>：パーティのビルガマタが全員HP0 → セーブデータから再開可能</li>
  </ul>
</div>
`;
}

// ============================
// タブ2: EN / パージ
// ============================
function buildSTContent() {
  return `
<div class="help-section">
  <h3 class="help-h3">🔋 EN（エネルギー）とは</h3>
  <p class="help-p">EN はビルガマタの <b>エネルギー兼防御壁</b> です。EN が高いほど HP へのダメージが届きにくくなります。</p>
  <p class="help-p">青いバーが EN です。攻撃を受けるたびに EN が削られ、EN が 0 になると <b>パージ</b> が発生します。</p>
  <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:8px 12px; font-family:monospace; font-size:0.82rem; margin:8px 0;">
    EN ダメージ = 10（弱点属性なら +10）<br>
    HP ダメージ = max(0, 技威力 × ATK × 属性倍率 − 現在EN × DEF) ÷ 100
  </div>
  <ul class="help-list">
    <li>EN が高いうちは HP へのダメージがほとんど入らない</li>
    <li>EN が低くなるほど HP へのダメージが増える</li>
    <li>EN が 0 になると全ダメージが HP に直撃 → <b>パージ発生</b></li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">💥 パージとは</h3>
  <p class="help-p">EN が 0 になると自動で <b>ギアが1つ射出（パージ）</b> されます。射出されるギアはランダムです。</p>
  <ul class="help-list">
    <li>パージが起きると <b>EN が最大値の40%</b> 回復して戦闘継続できる</li>
    <li>ワザギアがパージされると、その技が使えなくなる</li>
    <li>ボディギアがパージされると、そのステータス強化が失われる</li>
    <li>全ギアがなくなると <b>シャットダウン状態（3ターン行動不能）</b> になる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🛡 パージガード</h3>
  <p class="help-p">コアギア「パージガード」を装備していると、最初のパージ発生時に <b>ギア射出をキャンセル</b> してEN30%を回復します。1回だけ有効。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">♻️ 手動パージ</h3>
  <p class="help-p">デッキ右の 💥 ボタンで任意のタイミングで手動パージができます。弱いギアを捨ててEN回復するトレードオフ戦略として使えます。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">♻️ 控えのEN自動回復</h3>
  <p class="help-p">バトル中、控えに下がっているビルガマタは <b>1行動ごとに最大ENの5%</b> を自動回復します。ENが減ったビルガマタを控えに下げて回復させましょう。</p>
</div>
`;
}

// ============================
// タブ3: 属性相性
// ============================
function buildAffinityContent() {
  const elems = ['fire','water','ice','thunder','earth','wind','light','dark'];
  const labels = { fire:'炎🔥', water:'水💧', ice:'氷❄️', thunder:'雷⚡', earth:'地🪨', wind:'風🌀', light:'光✨', dark:'闇🌑' };
  const shortLabels = { fire:'炎', water:'水', ice:'氷', thunder:'雷', earth:'地', wind:'風', light:'光', dark:'闇' };
  const AFFINITY = {
    fire:    [1.0, 0.5, 2.0, 1.0, 1.0, 2.0, 1.0, 1.0],
    water:   [2.0, 1.0, 1.0, 0.5, 2.0, 1.0, 1.0, 1.0],
    ice:     [0.5, 1.0, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0],
    thunder: [1.0, 2.0, 2.0, 1.0, 0.5, 1.0, 1.0, 1.0],
    earth:   [2.0, 0.5, 0.5, 2.0, 1.0, 1.0, 1.0, 1.0],
    wind:    [0.5, 2.0, 0.5, 2.0, 1.0, 1.0, 1.0, 1.0],
    light:   [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0],
    dark:    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0],
  };

  let tableHtml = `<table class="affinity-table"><thead><tr><th>攻↓ 防→</th>`;
  elems.forEach(e => { tableHtml += `<th class="elem-badge elem-${e}" style="font-size:0.7rem;">${shortLabels[e]}</th>`; });
  tableHtml += `</tr></thead><tbody>`;
  elems.forEach(atk => {
    tableHtml += `<tr><th class="elem-badge elem-${atk}" style="font-size:0.7rem;">${shortLabels[atk]}</th>`;
    AFFINITY[atk].forEach(val => {
      const cls = val > 1.0 ? 'aff-good' : val < 1.0 ? 'aff-bad' : 'aff-normal';
      const txt = val > 1.0 ? '◎' : val < 1.0 ? '✕' : '－';
      tableHtml += `<td class="${cls}" title="${val}x">${txt}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</tbody></table>`;

  return `
<div class="help-section">
  <h3 class="help-h3">🌈 8つの属性</h3>
  <div class="help-cards">
    ${elems.map(e => `<div class="help-card"><span class="elem-badge elem-${e}">${shortLabels[e]}</span> ${labels[e]}</div>`).join('')}
  </div>
</div>

<div class="help-section">
  <h3 class="help-h3">⚡ 相性の効果</h3>
  <ul class="help-list">
    <li><b style="color:#6ee7b7;">◎ バツグン（×2.0）</b>：攻撃の EN ダメージが2倍。TECHカードに◎バッジが表示される</li>
    <li><b style="color:#fca5a5;">△ いまいち（×0.5）</b>：ENダメージが半減。TECHカードに△バッジが表示される</li>
    <li><b>－ ふつう（×1.0）</b>：通常通りのダメージ</li>
    <li><b style="color:#fbbf24;">ダブルバツグン（×4.0）</b>：技の属性が敵のメイン・サブ両方に有利な場合</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">📊 属性相性早見表</h3>
  <p class="help-p" style="font-size:0.75rem; color:#64748b;">◎ バツグン(×2) 　✕ いまいち(×0.5)　－ ふつう(×1)</p>
  ${tableHtml}
</div>

<div class="help-section">
  <h3 class="help-h3">💡 相性の活かし方</h3>
  <ul class="help-list">
    <li>敵の属性はバトル画面右側のカードの「属性バッジ」で確認できる</li>
    <li>防御フェーズでは、敵スキルの属性相性が表示される。バツグンなら「身を守る」や交代で対処しよう</li>
    <li>ジュウマはメイン属性とサブ属性を持つ。技の属性が両方に有利なら×4のダメージになる</li>
  </ul>
</div>
`;
}

// ============================
// タブ4: 技・アイテム
// ============================
function buildSkillsContent() {
  const items = [
    { name:'修理キット',   effect:'味方のHPを 500 回復。防御フェーズのアイテムタブから使用' },
    { name:'エネルギー缶', effect:'味方のENを 50 直接回復。パージ直前の緊急手段として有効' },
    { name:'バクダン',          effect:'敵のHPに 30 の防御無視ダメージ。ENを無視して直接削る' },
  ];

  return `
<div class="help-section">
  <h3 class="help-h3">🔧 ワザギア</h3>
  <p class="help-p">ビルガマタが使う技は <b>ワザギア</b> として管理されています。バトルで使える技は各ビルガマタ最大 <b>4つ</b>（装備しているワザギアの数に依存）。</p>
  <p class="help-p">ワザギアの詳細はパーティ画面で確認できます。</p>
  <ul class="help-list">
    <li>ギアには攻撃系・防御系・サポート系がある</li>
    <li>各ギアには <b>ENコスト</b> があり、ENを消費して使用する</li>
    <li>ギアがパージされると、その技が使えなくなる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">💊 バトルアイテム</h3>
  <p class="help-p">防御フェーズの「アイテム」タブから使用。報酬やマップで入手できる。</p>
  <div class="help-cards">
    ${items.map(it => `
    <div class="help-card">
      <div class="help-card-title">${it.name}</div>
      <div style="font-size:0.82rem; color:#94a3b8; line-height:1.6;">${it.effect}</div>
    </div>`).join('')}
  </div>
</div>
`;
}

// ============================
// タブ5: 育成・強化
// ============================
function buildTrainingContent() {
  return `
<div class="help-section">
  <h3 class="help-h3">🔩 ギアによる強化</h3>
  <p class="help-p">ビルガマタはギアを装備することでステータスが強化されます。ギアにはTECH（技）・STAT（ステータス）・OPTION（特殊効果）の3種類があります。</p>
  <ul class="help-list">
    <li><b>ワザギア</b>：バトルで使用する技。装備すると攻撃・防御・サポート技が使えるようになる</li>
    <li><b>ボディギア</b>：HP・EN・ATK・DEF・MAG・SPDなどを直接強化する</li>
    <li><b>コアギア</b>：パージガードなど特殊効果を付与する</li>
  </ul>
  <p class="help-p">ギアの装備・確認はパーティ画面から行えます。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">💥 パージとギア管理</h3>
  <p class="help-p">バトル中にENが0になるとパージが発生し、装備ギアが1つランダムに射出されます。失ったギアはバトル後には戻りますが、そのバトル中は使えなくなります。</p>
  <ul class="help-list">
    <li>重要なギアを守りたいときは「パージガード」オプションが有効</li>
    <li>手動パージで弱いギアを意図的に捨て、ENを回復する戦略もある</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">📦 パーティ管理</h3>
  <ul class="help-list">
    <li>バトルに出撃できるビルガマタは <b>3体</b>（ハブ画面で選択）</li>
    <li>所持しているビルガマタは何体でも倉庫に保管できる</li>
    <li>クエストクリア後の卵で仲間が増える</li>
  </ul>
</div>
`;
}

// ============================
// タブ6: マップ・用語集
// ============================
function buildMapContent() {
  const glossary = [
    { term:'HP',           def:'ヒットポイント。0になるとそのジュウマは戦闘不能になる。' },
    { term:'EN（エネルギー）', def:'ビルガマタのエネルギー兼防御壁。ENが高いほどHPへのダメージが届きにくくなる。0でパージ発生。' },
    { term:'ATK（攻撃力）', def:'物理スキルのENダメージ計算に使用。ATK÷相手DEFで倍率が決まる。' },
    { term:'DEF（防御力）', def:'相手の物理スキルによるENダメージを軽減する。' },
    { term:'MAG（魔力）',   def:'魔法スキルの攻撃・防御に使用。攻撃側MAG÷防御側MAGで倍率が決まる。' },
    { term:'SPD（スピード）',def:'ATBゲージの溜まる速さ。SPDが高いほど先に行動できる。' },
    { term:'EN回復（en_rec）',def:'控えに入っているビルガマタの自動EN回復量（1行動ごと）。基本は最大ENの5%。' },
    { term:'パージ',        def:'ENが0になった状態。ギアが1つランダムに射出され、ENが40%回復して戦闘継続。' },
    { term:'ACTION QUEUE', def:'次に行動するジュウマの予測順番リスト。最大6ターン先まで表示。' },
    { term:'バツグン',      def:'属性相性が有利な場合のENダメージ倍率（×2）。' },
    { term:'いまいち',      def:'属性相性が不利な場合のENダメージ倍率（×0.5）。' },
    { term:'ゲージ',        def:'ATBゲージ。SPDで増加し100になると行動。行動後100減算される。' },

    { term:'一致ボーナス',  def:'ジュウマのメイン/サブ属性とスキル属性が同じとき、スキル威力が×1.5になる。' },

    { term:'ギアハンドデッキ', def:'バトル攻撃フェーズに画面下部へ展開されるワザギアのカードデッキ。スロットからカードがファン状に射出される演出（ファンエジェクション）が起き、カードを選ぶと技を発動する。カード左下のIDがギアの識別子。' },
  ];

  return `
<div class="help-section">
  <h3 class="help-h3">🗺️ クエスト一覧</h3>
  <div class="help-cards">
    <div class="help-card"><div class="help-card-title">Quest 1：始まりの草原</div><div>フロア数：3F　難易度：初級<br>敵数：1〜2体（ボス4体）</div></div>
    <div class="help-card"><div class="help-card-title">Quest 2：迷いの森</div><div>フロア数：5F　難易度：中級<br>Quest 1クリアで解放</div></div>
    <div class="help-card"><div class="help-card-title">Quest 3：果ての荒野</div><div>フロア数：7F　難易度：上級<br>Quest 2クリアで解放</div></div>
  </div>
</div>

<div class="help-section">
  <h3 class="help-h3">📍 ノードタイプ</h3>
  <ul class="help-list">
    <li><b style="color:#3b82f6;">🔵 通常バトル</b>：最も多い。1F=1体、2〜3F=2体、4F以上=3体の敵が出現。フロアが上がるほど敵ステータスが強化される</li>
    <li><b style="color:#f59e0b;">🟡 エリートバトル</b>：通常より敵が1体多い（中盤以降に出現）</li>
    <li><b style="color:#ef4444;">🔴 ボス</b>：各クエストの最終フロアに必ず出現。敵4体、HP×2。倒すとクエストクリア</li>
    <li><b style="color:#10b981;">🟢 休憩ノード</b>：バトルなし（内容は今後実装予定）</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🥚 卵システム</h3>
  <ul class="help-list">
    <li>クエストクリア後に卵選択画面が表示される</li>
    <li>3種類の卵（赤・青・緑）から1つを選ぶ。それぞれ出やすい属性が異なる</li>
    <li>選んだ卵から1体のジュウマが生まれてパーティに加わる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">💾 セーブ / ロード</h3>
  <ul class="help-list">
    <li>ハブ画面の「SAVE」ボタンでセーブ（ブラウザのLocalStorageに保存）</li>
    <li>ページをリロードすると自動的にセーブデータが読み込まれてハブ画面から再開</li>
    <li>「DELETE SAVE」でセーブデータを削除してゲームをリセットできる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">📚 用語集</h3>
  <div class="help-glossary">
    ${glossary.map(g => `
    <div class="help-glossary-item">
      <div class="help-glossary-term">${g.term}</div>
      <div class="help-glossary-def">${g.def}</div>
    </div>`).join('')}
  </div>
</div>
`;
}

// ============================
// 用語集オーバーレイ（独立）
// ============================
export function openGlossary() {
  document.getElementById('screen-glossary').classList.remove('hide');
  FLOAT_BTNS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

export function closeGlossary() {
  document.getElementById('screen-glossary').classList.add('hide');
  FLOAT_BTNS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
}

export function initGlossary() {
  document.getElementById('glossary-content').innerHTML = buildGlossaryContent();
  document.getElementById('btn-close-glossary').onclick = closeGlossary;
}

function buildGlossaryContent() {
  const sections = [
    {
      title: '⚙️ ステータス',
      terms: [
        { term: 'HP',              def: 'ヒットポイント。0になるとそのビルガマタは戦闘不能になる。' },
        { term: 'EN（エネルギー）', def: 'ビルガマタのエネルギー兼防御壁。ENが高いほどHPへのダメージが届きにくい。0でパージ発生。' },
        { term: 'ATK（攻撃力）',   def: '物理技のENダメージ計算に使用。高いほど相手のENを削りやすい。' },
        { term: 'DEF（防御力）',   def: '相手の物理技によるENダメージを軽減する。' },
        { term: 'MAG（魔力）',     def: '魔法技の攻撃・防御に使用。攻撃側MAG÷防御側MAGで倍率が決まる。' },
        { term: 'SPD（スピード）', def: 'ATBゲージの溜まる速さ。高いほど先に行動できる。' },
      ]
    },
    {
      title: '⚡ バトルシステム',
      terms: [
        { term: 'ATBゲージ',       def: 'SPDで増加し100になると行動できる。行動後100減算される。' },
        { term: 'パージ',          def: 'ENが0になった状態。ギアが1つランダム射出され、ENが約40%回復して戦闘継続。' },
        { term: 'ACTION QUEUE',    def: '次に行動するビルガマタ/ジュウマの予測順リスト。最大6ターン先まで表示。' },
        { term: 'バツグン',        def: '属性相性が有利な場合のENダメージ倍率（×2.0）。' },
        { term: 'いまいち',        def: '属性相性が不利な場合のENダメージ倍率（×0.5）。' },
        { term: '一致ボーナス',    def: 'ビルガマタのメイン/サブ属性とスキル属性が同じとき、スキル威力が×1.5になる。' },
        { term: 'EN回復',          def: '控えにいるビルガマタの自動EN回復。毎行動ごとに最大ENの5%回復する。' },
      ]
    },
    {
      title: '🔧 ギア・スロット',
      terms: [
        { term: 'ギア',       def: 'ビルガマタに装備する部品の総称。スロットにセットして能力を付与する。' },
        { term: 'スロット',   def: 'ビルガマタが持つギアの装備枠。全部で10スロット。ワザ×4・ボディ×4・コア×1・（未解放×1）。' },
        { term: 'ワザギア',   def: 'バトルで使う技。スロットにセットするとギアデッキに表示される。最大4スロット。' },
        { term: 'ボディギア', def: 'ステータスを変化させるギア。ボーナスとペナルティがセットになっている。最大4スロット。' },
        { term: 'コアギア',   def: '特殊パッシブ効果を持つギア。1スロットのみ装備可能。' },
        { term: 'ギアデッキ', def: 'バトル画面下部に表示されるワザギアの一覧。光っているカードを選んで技を使う。' },
        { term: 'ギアパージ', def: '手動でギアを1つ取り外してENを回復する行動。攻撃フェーズ中に実行できる。' },
      ]
    },
    {
      title: '🌍 世界観',
      terms: [
        { term: 'ビルガマタ',    def: 'プレイヤーが操る機械生命体。ギアをスロットにセットして戦う。' },
        { term: 'ジュウマ',      def: '地上に生息する野生の機械生物。戦闘の相手となる。' },
        { term: 'ビルガウィーラー',def: 'ビルガマタを使いこなせる者の総称。レンジャー・ハンターなど役割ごとに呼称が分かれる。' },
      ]
    },
  ];

  return sections.map(s => `
<div class="help-section">
  <h3 class="help-h3">${s.title}</h3>
  <div class="help-glossary">
    ${s.terms.map(g => `
    <div class="help-glossary-item">
      <div class="help-glossary-term">${g.term}</div>
      <div class="help-glossary-def">${g.def}</div>
    </div>`).join('')}
  </div>
</div>`).join('');
}

// ============================
// タブ7: ジュウマ図鑑
// ============================
function buildMonstersContent() {
  const ELEM_SHORT = { fire:'炎', water:'水', ice:'氷', thunder:'雷', earth:'地', wind:'風', light:'光', dark:'闇', none:'無' };
  const STAT_LABELS = [['hp','HP'],['max_st','ST'],['atk','ATK'],['def','DEF'],['mag','MAG'],['spd','SPD']];

  const cards = MONSTERS_DATA.map(m => {
    const elemBadges = [
      `<span class="elem-badge elem-${m.main_element}">${ELEM_SHORT[m.main_element] ?? m.main_element}</span>`,
      m.sub_element && m.sub_element !== 'none'
        ? `<span class="elem-badge elem-${m.sub_element}" style="opacity:0.7;">${ELEM_SHORT[m.sub_element] ?? m.sub_element}</span>`
        : ''
    ].join('');

    const statsHtml = STAT_LABELS.map(([key, label]) =>
      `<div>${label} <span>${m.base_stats[key] ?? '—'}</span></div>`
    ).join('');

    const skillNames = (m.skills || []).map(id => {
      const s = SKILLS.find(sk => sk.id === id);
      return s ? s.name : id;
    }).join('、') || '—';

    return `
<div class="monster-dex-card">
  <div class="monster-dex-name">${m.name}${elemBadges}</div>
  <div class="monster-dex-stats">${statsHtml}</div>
  <div class="monster-dex-skills">技: ${skillNames}</div>
</div>`;
  }).join('');

  return `
<div class="help-section">
  <h3 class="help-h3">📖 ジュウマ一覧（ベースステータス）</h3>
  <p class="help-p" style="font-size:0.78rem; color:#64748b;">※ えさや大きさ・賢さパラメータによって最終ステータスは変動します。</p>
  <div class="monster-dex-grid">${cards}</div>
</div>
`;
}
