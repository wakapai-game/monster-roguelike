import { MONSTERS_DATA, SKILLS } from '../data.js';

// ---- HELP System ----

const FLOAT_BTNS = ['btn-help-global', 'btn-affinity-global', 'btn-monsters-global'];

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
  <h3 class="help-h3">⚙️ バトルの基本フロー</h3>
  <p class="help-p">バトルは <b>ATB（Active Time Battle）</b> 方式です。カラクリとジュウマの <b>スピード(SPD)</b> に応じてゲージが自動で溜まり、ゲージが 100 に達したときに行動します。</p>
  <p class="help-p">自分のカラクリがゲージ満タン → <b>攻撃フェーズ</b>（パーツデッキからTECH技を選ぶ）<br>
  敵ジュウマがゲージ満タン → <b>防御フェーズ</b>（敵の攻撃に対応する）</p>
</div>

<div class="help-section">
  <h3 class="help-h3">🔵 攻撃フェーズ — パーツデッキで操作</h3>
  <p class="help-p">画面下部のパーツデッキに装備中の <b>TECHパーツ（青カード）</b> が表示されます。光っているカードをタップ/クリックして技を使います。</p>
  <ul class="help-list">
    <li><b>◎ バツグン</b>：カードの右上に赤バッジ → 特に有効な属性</li>
    <li><b>△ いまいち</b>：カードの右上に灰バッジ → 効果が半減</li>
    <li><b>🔄（交代）</b>：デッキ右のボタンで控えカラクリに交代できる</li>
    <li><b>💥（パージ）</b>：デッキ右のボタンで手動パーツパージができる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🔴 防御フェーズでできること</h3>
  <p class="help-p">敵の技名と属性相性が表示されます。左のメニューから対応を選んでください。</p>
  <ul class="help-list">
    <li><b>身を守る</b>：HP へのダメージを 50% 軽減する</li>
    <li><b>防御スキル</b>（技タブ）：セットしている防御系技で対応</li>
    <li><b>アイテム</b>（アイテムタブ）：バトルアイテムを使用</li>
    <li><b>交代</b>：控えのカラクリに交代。交代後のカラクリが攻撃を受ける</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">📋 行動順パネル</h3>
  <p class="help-p">中央の <b>行動順</b> には次に行動するユニットが最大 6 ターン先まで表示されます。SPD が高いほど頻繁に行動できます。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">⚠️ 勝敗条件</h3>
  <ul class="help-list">
    <li><b>勝利</b>：敵ジュウマをすべて倒す → 報酬獲得</li>
    <li><b>敗北</b>：パーティのカラクリが全員HP0 → セーブデータから再開可能</li>
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
  <p class="help-p">EN はカラクリの <b>エネルギー兼防御壁</b> です。EN が高いほど HP へのダメージが届きにくくなります。</p>
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
  <p class="help-p">EN が 0 になると自動で <b>パーツが1つ射出（パージ）</b> されます。射出されるパーツはランダムです。</p>
  <ul class="help-list">
    <li>パージが起きると <b>EN が最大値の40%</b> 回復して戦闘継続できる</li>
    <li>TECHパーツがパージされると、その技が使えなくなる</li>
    <li>STATパーツがパージされると、そのステータス強化が失われる</li>
    <li>全パーツがなくなると <b>シャットダウン状態（3ターン行動不能）</b> になる</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🛡 パージガード</h3>
  <p class="help-p">オプションパーツ「パージガード」を装備していると、最初のパージ発生時に <b>パーツ射出をキャンセル</b> してEN30%を回復します。1回だけ有効。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">♻️ 手動パージ</h3>
  <p class="help-p">デッキ右の 💥 ボタンで任意のタイミングで手動パージができます。弱いパーツを捨ててEN回復するトレードオフ戦略として使えます。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">♻️ 控えのEN自動回復</h3>
  <p class="help-p">バトル中、控えに下がっているカラクリは <b>1行動ごとに最大ENの5%</b> を自動回復します。ENが減ったカラクリを控えに下げて回復させましょう。</p>
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
  const skills = [
    { name:'たいあたり',      elem:'無', type:'物理', cost:10, power:'ST 50',   effect:'STダメージ',                            category:'攻撃' },
    { name:'ファイアボール',  elem:'炎', type:'魔法', cost:15, power:'ST 80',   effect:'STダメージ',                            category:'攻撃' },
    { name:'みずでっぽう',    elem:'水', type:'魔法', cost:15, power:'ST 80',   effect:'STダメージ',                            category:'攻撃' },
    { name:'フルスイング',    elem:'無', type:'物理', cost:20, power:'ST 120',  effect:'STダメージ＋敵のゲージを20遅らせる',      category:'攻撃' },
    { name:'どくばり（貫通）',elem:'無', type:'貫通', cost:30, power:'HP 20',   effect:'STを無視して直接HPダメージ（防御で半減）', category:'攻撃' },
    { name:'じらい（罠）',    elem:'炎', type:'罠',   cost:25, power:'—',       effect:'罠を設置（実装予定）',                    category:'攻撃' },
    { name:'シールド張',      elem:'無', type:'バフ', cost:15, power:'—',       effect:'防御力強化（実装予定）',                  category:'防御' },
    { name:'深呼吸',          elem:'無', type:'回復', cost:10, power:'ST+40',   effect:'自身のSTを40直接回復（ブレイク解除可能）', category:'防御' },
  ];

  const atk = skills.filter(s => s.category === '攻撃');
  const def = skills.filter(s => s.category === '防御');

  const renderSkillCard = s => `
<div class="help-card">
  <div class="help-card-title">${s.name}</div>
  <div class="help-card-meta">${s.category} ／ ${s.elem}属性 ／ ${s.type} ／ STコスト ${s.cost}</div>
  <div>威力: <b>${s.power}</b></div>
  <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">${s.effect}</div>
</div>`;

  const items = [
    { name:'キズぐすり',        cost:'—', effect:'味方のHPを 50 回復。防御フェーズのアイテムタブから使用' },
    { name:'スタミナドリンク',  cost:'—', effect:'味方のSTを 50 直接回復。ブレイク中でも使用でき、STが回復するとブレイク解除される' },
    { name:'バクダン',          cost:'—', effect:'敵のHPに 30 の防御無視ダメージ。STを無視して直接削る' },
  ];

  return `
<div class="help-section">
  <h3 class="help-h3">⚔️ 攻撃系スキル</h3>
  <p class="help-p">攻撃フェーズで使用。主にSTダメージを与えてブレイクを狙う。</p>
  <div class="help-cards">${atk.map(renderSkillCard).join('')}</div>
</div>

<div class="help-section">
  <h3 class="help-h3">🛡️ 防御系スキル</h3>
  <p class="help-p">防御フェーズ（スキルタブ）または交代後に使用。</p>
  <div class="help-cards">${def.map(renderSkillCard).join('')}</div>
</div>

<div class="help-section">
  <h3 class="help-h3">💊 バトルアイテム</h3>
  <p class="help-p">防御フェーズの「アイテム」タブから使用。インベントリで補充できる（報酬やマップで入手）。</p>
  <div class="help-cards">
    ${items.map(it => `
    <div class="help-card">
      <div class="help-card-title">${it.name}</div>
      <div style="font-size:0.82rem; color:#94a3b8; line-height:1.6;">${it.effect}</div>
    </div>`).join('')}
  </div>
</div>

<div class="help-section">
  <h3 class="help-h3">📝 技のセット方法</h3>
  <ul class="help-list">
    <li>バトルで使える技は各ジュウマ最大 <b>4つ</b> まで設定できる</li>
    <li>インベントリ画面 → パーティ → ジュウマカードの「技設定」ボタンから編集</li>
    <li>修得している技（known_skills）からバトル用の技をドラッグ&ドロップでセット・入れ替え可能</li>
    <li>新しい技はバトルの報酬で入手できる</li>
  </ul>
</div>
`;
}

// ============================
// タブ5: 育成・強化
// ============================
function buildTrainingContent() {
  const foodBulk = [
    { name:'たっぷりの肉', effects:'HP+2 ST+10 ATK+1 DEF+1 SPD-1 大きさ+1' },
    { name:'巨大な肉',     effects:'HP+1 ST+20 ATK+1 DEF+1 SPD-1 大きさ+1' },
    { name:'戦士の肉',     effects:'HP+1 ST+10 ATK+2 DEF+1 SPD-1 大きさ+1' },
    { name:'鎧の肉',       effects:'HP+1 ST+10 ATK+1 DEF+2 SPD-1 大きさ+1' },
  ];
  const foodLight = [
    { name:'軽量フルーツ',   effects:'HP-2 ST-5 ATK-1 DEF-1 SPD+1 大きさ-1' },
    { name:'絞りジュース',   effects:'HP-1 ST-10 ATK-1 DEF-1 SPD+1 大きさ-1' },
    { name:'研ぎすまし果実', effects:'HP-1 ST-5 ATK-2 DEF-1 SPD+1 大きさ-1' },
    { name:'機動の実',       effects:'HP-1 ST-5 ATK-1 DEF-2 SPD+1 大きさ-1' },
  ];
  const foodSpecial = [
    { name:'賢者のキノコ', effects:'MAG+2 SPD-1 賢さ+1' },
  ];

  const renderFood = f => `
<div class="help-card">
  <div class="help-card-title">${f.name}</div>
  <div style="font-size:0.8rem; color:#94a3b8;">${f.effects}</div>
</div>`;

  return `
<div class="help-section">
  <h3 class="help-h3">🍖 えさ（ステータス強化）</h3>
  <p class="help-p">えさをジュウマに与えるとベースステータスが直接変化します。1体のジュウマに与えられるえさの回数は <b>最大10回</b> まで（feed_count で管理）。</p>
  <p class="help-p">えさはインベントリ画面 → パーティ → ジュウマカードから与えられます。バトルの報酬でも入手可能。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">🥩 大型化えさ（HPとST重視・SPD低下）</h3>
  <div class="help-cards">${foodBulk.map(renderFood).join('')}</div>
</div>

<div class="help-section">
  <h3 class="help-h3">🍎 軽量化えさ（SPD重視・HP/ST低下）</h3>
  <div class="help-cards">${foodLight.map(renderFood).join('')}</div>
</div>

<div class="help-section">
  <h3 class="help-h3">🍄 特殊えさ</h3>
  <div class="help-cards">${foodSpecial.map(renderFood).join('')}</div>
</div>

<div class="help-section">
  <h3 class="help-h3">📏 大きさ（size）パラメータ</h3>
  <p class="help-p">えさの種類によって「大きさ」パラメータが変化します。大きさはステータスにも影響します。</p>
  <ul class="help-list">
    <li>size +1 ごと → <b>HP+5 / ST+2 / SPD-0.2</b></li>
    <li>size -1 ごと → <b>HP-5 / ST-2 / SPD+0.2</b></li>
    <li>大きさラベル：SS（-10以下）→ S（-5以下）→ <b>M（0以上）</b> → L（+5以上）→ LL（+10以上）</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🧠 賢さ（intelligence）パラメータ</h3>
  <p class="help-p">賢者のキノコで増加します。賢さが上がると MAG が上がり SPD も少し上がりますが、HP が下がります。</p>
  <ul class="help-list">
    <li>intelligence +1 ごと → <b>HP-2 / MAG+1 / SPD+0.5</b></li>
    <li>賢さレベル：Lv.1（0〜3）/ Lv.2（4〜7）/ Lv.3（8〜11）/ Lv.4（12〜15）/ Lv.5（16以上）</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">📦 パーティ管理</h3>
  <ul class="help-list">
    <li>バトルに出撃できるジュウマは <b>3体</b>（ハブ画面で選択）</li>
    <li>所持しているジュウマは何体でも倉庫に保管できる</li>
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
    { term:'ST（スタミナ）', def:'ジュウマの装甲。ST が残っている間は攻撃の多くを吸収する。0でブレイク。' },
    { term:'ATK（攻撃力）', def:'物理スキルのSTダメージ計算に使用。ATK÷相手DEFで倍率が決まる。' },
    { term:'DEF（防御力）', def:'相手の物理スキルによるSTダメージを軽減する。' },
    { term:'MAG（魔力）',   def:'魔法スキルの攻撃・防御に使用。攻撃側MAG÷防御側MAGで倍率が決まる。' },
    { term:'SPD（スピード）',def:'ATBゲージの溜まる速さ。SPDが高いほど先に行動できる。' },
    { term:'ST回復（st_rec）',def:'控えに入っているジュウマの自動ST回復量（1行動ごと）。基本は最大STの5%。' },
    { term:'ブレイク',      def:'STが0になった状態。カードが赤く点滅。この間HPに直接大ダメージが入る。' },
    { term:'ACTION QUEUE', def:'次に行動するジュウマの予測順番リスト。最大6ターン先まで表示。' },
    { term:'バツグン',      def:'属性相性が有利な場合のSTダメージ倍率（×2）。' },
    { term:'いまいち',      def:'属性相性が不利な場合のSTダメージ倍率（×0.5）。' },
    { term:'ゲージ',        def:'ATBゲージ。SPDで増加し100になると行動。行動後100減算される。' },
    { term:'えさ',          def:'インベントリ内のアイテム。ジュウマに与えてステータスを強化する（最大10回）。' },
    { term:'大きさ',        def:'えさで変化するパラメータ。大きくなるとHP・STが上がりSPDが下がる。' },
    { term:'賢さ',          def:'賢者のキノコで上がるパラメータ。MAGが上がりHPが下がる。' },
    { term:'一致ボーナス',  def:'ジュウマのメイン/サブ属性とスキル属性が同じとき、スキル威力が×1.5になる。' },
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
