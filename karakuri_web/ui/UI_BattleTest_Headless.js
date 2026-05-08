import { Karakuri, Timeline, BattleEngine } from '../LOGIC_Battle_Core.js';
import { selectEnemySkill } from './UI_Battle_Main.js';
import { buildKarakuri } from './UI_BattleTest_Core.js';

const MAX_TURNS = 1000;

export function runHeadlessBattleN(n, p1Data, p2Data, options = {}) {
  let wins = 0, totalTurns = 0, totalRemainHP = 0, timeouts = 0;
  for (let i = 0; i < n; i++) {
    const r = _runOnce(p1Data, p2Data, options);
    if (r.winner === 'p1') wins++;
    if (r.winner === null) timeouts++;
    totalTurns += r.turns;
    totalRemainHP += r.p1RemainHP;
  }
  return {
    winRate: wins / n,
    avgTurns: totalTurns / n,
    avgP1HP: totalRemainHP / n,
    timeouts,
  };
}

function _runOnce(p1Data, p2Data, options) {
  const engine = new BattleEngine();
  if (options.forceWeakness) {
    const orig = engine.calcAffinity.bind(engine);
    engine.calcAffinity = (elem, defender) => {
      const base = orig(elem, defender);
      return base > 1.0 ? base : 2.0;
    };
  }

  const p1 = p1Data.map(d => buildKarakuri(d));
  const p2 = p2Data.map(d => buildKarakuri(d));
  const timeline = new Timeline(p1, p2);

  let turns = 0;
  while (turns < MAX_TURNS) {
    const tick = timeline.tick();
    if (!tick) continue;
    turns++;

    const { player, active } = tick;
    const defender = player === 1 ? timeline.p2_active : timeline.p1_active;
    if (!defender) break;

    const skillId = selectEnemySkill(active, defender, engine);
    if (skillId) engine.executeSkill(active, defender, skillId);

    if (defender.current_hp <= 0) {
      const team = player === 1 ? p2 : p1;
      const nextIdx = team.findIndex(m => m !== defender && m.current_hp > 0);
      if (nextIdx === -1) {
        return { winner: player === 1 ? 'p1' : 'p2', turns, p1RemainHP: p1[0].current_hp };
      }
      timeline.swapActive(player === 1 ? 2 : 1, nextIdx);
    }
    timeline.onActionCompleted(player);
  }
  return { winner: null, turns: MAX_TURNS, p1RemainHP: p1[0].current_hp };
}
