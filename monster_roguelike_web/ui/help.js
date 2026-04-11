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
  <h3 class="help-h3">⚔️ バトルの基本フロー</h3>
  <p class="help-p">バトルは <b>ATB（Active Time Battle）</b> 方式です。各モンスターの <b>スピード(SPD)</b> に応じてゲージが自動で溜まり、ゲージが 100 に達したときにそのモンスターが行動します。</p>
  <p class="help-p">自分のモンスターがゲージ満タン → <b>攻撃フェーズ</b>（スキルを選んで攻撃）<br>
  敵のモンスターがゲージ満タン → <b>防御フェーズ</b>（敵の攻撃に対応）</p>
</div>

<div class="help-section">
  <h3 class="help-h3">📋 ACTION QUEUE（行動キュー）</h3>
  <p class="help-p">中央パネルの <b>ACTION QUEUE</b> には、次に行動するモンスターの順番が最大 6 ターン先まで表示されます。一番上が「次に行動するモンスター」です。</p>
  <p class="help-p">行動順は現在の SPD とゲージ残量から計算されます。交代や一部スキルの効果でゲージが変化すると行動順も変わります。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">🔵 攻撃フェーズでできること</h3>
  <ul class="help-list">
    <li><b>スキル</b>：技を選んで攻撃。主に敵の ST を削り、ブレイクを狙う</li>
    <li><b>控えと交代</b>：任意のタイミングで控えのモンスターに交代できる（交代後は ATB ループが再スタート）</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🔴 防御フェーズでできること</h3>
  <p class="help-p">敵の技名と属性相性（バツグン / いまいち）が表示されます。</p>
  <ul class="help-list">
    <li><b>身を守る</b>：受けるダメージを 50%軽減。ST コストも半減して受ける</li>
    <li><b>防御スキル</b>（スキルタブ）：セットしている防御系スキルで対応</li>
    <li><b>アイテム</b>（アイテムタブ）：バトルアイテムを使用してから敵の攻撃を受ける</li>
    <li><b>控えと交代</b>：控えのモンスターに交代。交代したモンスターが敵の攻撃を受ける</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">⚠️ 勝敗条件</h3>
  <ul class="help-list">
    <li><b>勝利</b>：敵チームのモンスターを全員倒す → リワード（報酬）獲得</li>
    <li><b>敗北</b>：自パーティのモンスターが全員HP0 → <span style="color:#ef4444;">ゲームリセット（リロード）</span>。セーブデータがあれば再開可能</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🏆 ステージクリアと卵</h3>
  <p class="help-p">ステージ最終フロアのボスを倒すとステージクリア。報酬画面の後に <b>卵選択画面</b> に移り、新しいモンスターを1体仲間にできます。ステージクリアで次のステージが解放されます。</p>
</div>
`;
}

// ============================
// タブ2: ST / ダメージ
// ============================
function buildSTContent() {
  return `
<div class="help-section">
  <h3 class="help-h3">💛 ST（スタミナ）とは</h3>
  <p class="help-p">ST はモンスターの <b>スタミナ兼防御壁</b> です。ST が高いほどスキルの威力が HP に届きにくくなります。</p>
  <p class="help-p">自分のモンスターの ST は画面左の黄色バーで確認できます。<b>敵の ST は表示されません</b>。攻撃を続けて ST を削り、HP へのダメージを通しましょう。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">💥 HP溢れダメージの仕組み</h3>
  <p class="help-p">毎回の攻撃で必ず <b>ST 固定ダメージ（10〜20）</b> を与えつつ、スキル威力が ST 防御を超えた分だけ HP にダメージが「溢れ」ます。</p>
  <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:8px 12px; font-family:monospace; font-size:0.82rem; margin:8px 0;">
    ST ダメージ = 10（苦手属性なら +10）<br>
    HP ダメージ = max(0, スキル威力 × ATK − 現在ST × DEF)
  </div>
  <ul class="help-list">
    <li>敵の <b>ST が高い</b> うちは HP へのダメージがほとんど入らない</li>
    <li>敵の <b>ST が低くなる</b> ほど HP へのダメージが増えていく</li>
    <li>敵の <b>ST が 0</b> になると防御力がなくなり全ダメージが HP に入る</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🛡 身を守る（Defend）の効果</h3>
  <p class="help-p">防御フェーズで「身を守る」を選ぶと、その攻撃の HP への溢れダメージを <b>半減</b> できます。</p>
  <ul class="help-list">
    <li>敵がバツグン属性で攻撃してくるときに特に有効</li>
    <li>防御スキル「深呼吸」で ST を 40 直接回復 → 次のターンの防御力を回復</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">♻️ 控えのST自動回復</h3>
  <p class="help-p">バトル中、控えに下がっているモンスターは <b>1行動ごとに最大STの5%</b> を自動回復します。ST が減ったモンスターを控えに下げてSTを回復させましょう。</p>
</div>

<div class="help-section">
  <h3 class="help-h3">📊 ダメージ計算の概要</h3>
  <ul class="help-list">
    <li>物理スキル → 攻撃側 <b>ATK</b> × スキル威力 vs 防御側 <b>DEF</b> × 現在ST で計算</li>
    <li>魔法スキル → 攻撃側 <b>MAG</b> × スキル威力 vs 防御側 <b>MAG</b> × 現在ST で計算</li>
    <li>同属性スキル使用（一致ボーナス）→ スキル威力 <b>×1.5</b></li>
    <li>バツグン属性 → ST ダメージ +10 かつ HP 溢れダメージ増加</li>
    <li>身を守る → HP 溢れダメージ <b>×0.5</b></li>
  </ul>
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
    <li><b style="color:#6ee7b7;">◎ バツグン（×2.0）</b>：攻撃の ST ダメージが2倍。攻撃フェーズのスキルボタンに「バツグン」バッジが表示される</li>
    <li><b style="color:#fca5a5;">✕ いまいち（×0.5）</b>：STダメージが半減。スキルボタンに「いまいち」バッジが表示される</li>
    <li><b>－ ふつう（×1.0）</b>：通常通りのダメージ</li>
    <li><b style="color:#fbbf24;">ダブルバツグン（×4.0）</b>：スキル属性が敵のメイン・サブ両方に有利な場合。ブレイク中は <b>×8.0</b> になる</li>
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
    <li>モンスターはメイン属性とサブ属性を持つ。スキル属性が両方に有利なら×4（ブレイク時×8）</li>
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
    <li>バトルで使える技は各モンスター最大 <b>4つ</b> まで設定できる</li>
    <li>インベントリ画面 → パーティ → モンスターカードの「技設定」ボタンから編集</li>
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
  <p class="help-p">えさをモンスターに与えるとベースステータスが直接変化します。1体のモンスターに与えられるえさの回数は <b>最大10回</b> まで（feed_count で管理）。</p>
  <p class="help-p">えさはインベントリ画面 → パーティ → モンスターカードから与えられます。バトルの報酬でも入手可能。</p>
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
    <li>バトルに出撃できるモンスターは <b>3体</b>（ハブ画面で選択）</li>
    <li>所持しているモンスターは何体でも倉庫に保管できる</li>
    <li>ステージクリア後の卵で仲間が増える</li>
  </ul>
</div>
`;
}

// ============================
// タブ6: マップ・用語集
// ============================
function buildMapContent() {
  const glossary = [
    { term:'HP',           def:'ヒットポイント。0になるとそのモンスターは戦闘不能になる。' },
    { term:'ST（スタミナ）', def:'モンスターの装甲。ST が残っている間は攻撃の多くを吸収する。0でブレイク。' },
    { term:'ATK（攻撃力）', def:'物理スキルのSTダメージ計算に使用。ATK÷相手DEFで倍率が決まる。' },
    { term:'DEF（防御力）', def:'相手の物理スキルによるSTダメージを軽減する。' },
    { term:'MAG（魔力）',   def:'魔法スキルの攻撃・防御に使用。攻撃側MAG÷防御側MAGで倍率が決まる。' },
    { term:'SPD（スピード）',def:'ATBゲージの溜まる速さ。SPDが高いほど先に行動できる。' },
    { term:'ST回復（st_rec）',def:'控えに入っているモンスターの自動ST回復量（1行動ごと）。基本は最大STの5%。' },
    { term:'ブレイク',      def:'STが0になった状態。カードが赤く点滅。この間HPに直接大ダメージが入る。' },
    { term:'ACTION QUEUE', def:'次に行動するモンスターの予測順番リスト。最大6ターン先まで表示。' },
    { term:'バツグン',      def:'属性相性が有利な場合のSTダメージ倍率（×2）。' },
    { term:'いまいち',      def:'属性相性が不利な場合のSTダメージ倍率（×0.5）。' },
    { term:'ゲージ',        def:'ATBゲージ。SPDで増加し100になると行動。行動後100減算される。' },
    { term:'えさ',          def:'インベントリ内のアイテム。モンスターに与えてステータスを強化する（最大10回）。' },
    { term:'大きさ',        def:'えさで変化するパラメータ。大きくなるとHP・STが上がりSPDが下がる。' },
    { term:'賢さ',          def:'賢者のキノコで上がるパラメータ。MAGが上がりHPが下がる。' },
    { term:'一致ボーナス',  def:'モンスターのメイン/サブ属性とスキル属性が同じとき、スキル威力が×1.5になる。' },
  ];

  return `
<div class="help-section">
  <h3 class="help-h3">🗺️ ステージ一覧</h3>
  <div class="help-cards">
    <div class="help-card"><div class="help-card-title">Stage 1：始まりの草原</div><div>フロア数：3F　難易度：初級<br>敵数：1〜2体（ボス4体）</div></div>
    <div class="help-card"><div class="help-card-title">Stage 2：迷いの森</div><div>フロア数：5F　難易度：中級<br>Stage 1クリアで解放</div></div>
    <div class="help-card"><div class="help-card-title">Stage 3：果ての荒野</div><div>フロア数：7F　難易度：上級<br>Stage 2クリアで解放</div></div>
  </div>
</div>

<div class="help-section">
  <h3 class="help-h3">📍 ノードタイプ</h3>
  <ul class="help-list">
    <li><b style="color:#3b82f6;">🔵 通常バトル</b>：最も多い。1F=1体、2〜3F=2体、4F以上=3体の敵が出現。フロアが上がるほど敵ステータスが強化される</li>
    <li><b style="color:#f59e0b;">🟡 エリートバトル</b>：通常より敵が1体多い（中盤以降に出現）</li>
    <li><b style="color:#ef4444;">🔴 ボス</b>：各ステージの最終フロアに必ず出現。敵4体、HP×2。倒すとステージクリア</li>
    <li><b style="color:#10b981;">🟢 休憩ノード</b>：バトルなし（内容は今後実装予定）</li>
  </ul>
</div>

<div class="help-section">
  <h3 class="help-h3">🥚 卵システム</h3>
  <ul class="help-list">
    <li>ステージクリア後に卵選択画面が表示される</li>
    <li>3種類の卵（赤・青・緑）から1つを選ぶ。それぞれ出やすい属性が異なる</li>
    <li>選んだ卵から1体のモンスターが生まれてパーティに加わる</li>
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
// タブ7: モンスター図鑑
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
  <h3 class="help-h3">📖 モンスター一覧（ベースステータス）</h3>
  <p class="help-p" style="font-size:0.78rem; color:#64748b;">※ えさや大きさ・賢さパラメータによって最終ステータスは変動します。</p>
  <div class="monster-dex-grid">${cards}</div>
</div>
`;
}
