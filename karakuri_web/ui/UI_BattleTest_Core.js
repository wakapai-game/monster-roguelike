import { Karakuri, Timeline, BattleEngine } from '../LOGIC_Battle_Core.js';
import { appState } from '../DATA_App_State.js';

const MIN_STAT_VALUE = 1;
let _snapshot = null;

const SNAPSHOT_KEYS = [
  'p1Team', 'p2Team', 'engine', 'timeline', 'loopInterval',
  'mapGenerator', 'currentNodeId', 'selectedIds',
  'isTutorialMap', 'tutorialBattleIndex',
];

export function saveSnapshot() {
  _snapshot = Object.fromEntries(SNAPSHOT_KEYS.map(k => [k, appState[k]]));
}

export function restoreSnapshot() {
  if (!_snapshot) return;
  clearInterval(appState.loopInterval);
  for (const k of SNAPSHOT_KEYS) appState[k] = _snapshot[k];
  appState.loopInterval = null;
  _snapshot = null;
}

export function buildKarakuri(data) {
  const k = new Karakuri(structuredClone(data));
  if (data._override) {
    const ov = data._override;
    if (ov.hp  != null) { k.stats.hp = Math.max(MIN_STAT_VALUE, ov.hp); k.current_hp = k.stats.hp; }
    if (ov.atk != null)   k.stats.atk = Math.max(MIN_STAT_VALUE, ov.atk);
    if (ov.def != null)   k.stats.def = Math.max(MIN_STAT_VALUE, ov.def);
    if (ov.max_en != null) {
      k.stats.max_en = k.stats.max_st = Math.max(MIN_STAT_VALUE, ov.max_en);
      k.current_en = k.current_st = k.stats.max_en;
    }
  }
  if (data._override_en != null) {
    k.current_en = k.current_st = Math.max(0, data._override_en);
  }
  return k;
}

export function startLiveTest(p1Data, p2Data, options = {}) {
  if (!p1Data.length) {
    alert('味方を1体以上選択してください。');
    return false;
  }
  saveSnapshot();
  appState.isTestMode = true;
  appState.engine = new BattleEngine();
  if (options.forceWeakness) {
    const origCalc = appState.engine.calcAffinity.bind(appState.engine);
    appState.engine.calcAffinity = (elem, defender) => {
      const base = origCalc(elem, defender);
      return base > 1.0 ? base : 2.0;
    };
  }
  appState.p1Team = p1Data.map(d => buildKarakuri(d));
  appState.p2Team = p2Data.map(d => buildKarakuri(d));
  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
  appState.isTutorialMap = false;
  appState.tutorialBattleIndex = 0;
  return true;
}

export function abortLiveTest() {
  clearInterval(appState.loopInterval);
  appState.loopInterval = null;
  restoreSnapshot();
  appState.isTestMode = false;
}

export function resetTestHP() {
  if (!appState.isTestMode) return;
  clearInterval(appState.loopInterval);
  appState.loopInterval = null;
  for (const m of [...(appState.p1Team || []), ...(appState.p2Team || [])]) {
    m.current_hp = m.stats.hp;
    m.current_en = m.current_st = m.stats.max_en ?? m.stats.max_st ?? 150;
    m.gauge = 0;
    m.buffs = {};
    m.is_break = false;
    m.shutdown_turns = 0;
    m.consecutive_count = 0;
    if (m.purged_tech?.clear)  m.purged_tech.clear();
    if (m.purged_stats?.clear) m.purged_stats.clear();
    m.purged_option = false;
  }
  appState.timeline = new Timeline(appState.p1Team, appState.p2Team);
}

export function stepEnemyOnly() {
  if (!appState.isTestMode || !appState.timeline) return null;
  clearInterval(appState.loopInterval);
  appState.loopInterval = null;

  const p1 = appState.timeline.p1_active;
  if (!p1) return null;
  const savedGauge = p1.gauge;

  let safeguard = 0;
  while (safeguard++ < 2000) {
    p1.gauge = 0;
    const r = appState.timeline.tick();
    if (r && r.player === 2) {
      p1.gauge = savedGauge;
      return r;
    }
  }
  p1.gauge = savedGauge;
  return null;
}
