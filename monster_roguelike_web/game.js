// ▼ 本番エンジン切替ライン（EngineCase3 → EngineCase4 等に変更するだけで本番エンジンが切り替わる）
export { EngineCase3 as BattleEngine } from './test-engines.js';

// ▼ チュートリアル切替ライン（エンジンに合わせて変更: 'case3' | 'case4' ...）
export const BATTLE_SYSTEM_VARIANT = 'case3';

const CONSTANTS = {
  GAUGE_MAX: 100.0,
  MIN_STAT_VALUE: 1,
  GROWTH_LOG_MAX_SIZE: 50,
  DEFAULT_SPD: 10,
};

export class Monster {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.main_element = data.main_element || "none";
    this.sub_element = data.sub_element || "none";
    this.base_stats = data.base_stats;

    // Initialize variable stats
    this.params = {
      size: data.params?.size || 0,
      hardness: data.params?.hardness || 0,
      weight: data.params?.weight || 0,  // deprecated
      smartness: data.params?.smartness || 0,
      intelligence: data.params?.intelligence || 0
    };

    // known_skills: 修得技リスト（最大10個）
    // 旧フォーマット（skills + benched_skills）から自動マイグレーション
    if (data.known_skills) {
      this.known_skills = [...data.known_skills].slice(0, 10);
      this.skills = (data.skills || []).filter(id => this.known_skills.includes(id)).slice(0, 4);
    } else {
      const combined = [...new Set([...(data.skills || []), ...(data.benched_skills || [])])];
      this.known_skills = combined.slice(0, 10);
      this.skills = combined.slice(0, 4);
    }
    if (this.skills.length === 0 && this.known_skills.length > 0) {
      this.skills = [this.known_skills[0]];
    }
    this.feed_count = data.feed_count || 0;
    this.growth_log = data.growth_log || [];

    this.stats = this.calculateFinalStats();
    this.current_hp = this.stats.hp;
    this.current_st = this.stats.max_st;
    this.gauge = 0.0;
    this.is_break = false;
    this.buffs = {}; // { atk: { mult: 1.5, turns: 2 }, def: { mult: 0.5, turns: 1 }, ... }
  }

  calculateFinalStats() {
    const base = this.base_stats;
    const p = this.params;
    // TODO: Unity port - standardize to {size, hardness, intelligence}
    // Accept both `smartness` and `intelligence` (prefer `intelligence` if present)
    // `weight` is deprecated — treat as 0 if absent
    const intel = p.intelligence !== undefined ? p.intelligence : (p.smartness || 0);

    return {
      hp: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.hp + (p.size * 5) - (intel * 2))),
      max_st: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.max_st + (p.size * 2) + (p.hardness * 1))),
      atk: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.atk + ((p.weight || 0) * 1))),
      def: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.def + (p.hardness * 1) + ((p.weight || 0) * 0.5))),
      mag: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.mag + (intel * 1))),
      spd: Math.max(CONSTANTS.MIN_STAT_VALUE, Math.floor(base.spd - (p.size * 0.2) - (p.hardness * 0.1) - ((p.weight || 0) * 0.2) + (intel * 0.5)))
    };
  }

  logGrowth(itemId, param, before, after) {
    // timestamp is Unix ms (number), not Date object
    this.growth_log.push({ itemId, param, before, after, timestamp: Date.now() });
    if (this.growth_log.length > CONSTANTS.GROWTH_LOG_MAX_SIZE) {
      this.growth_log = this.growth_log.slice(-CONSTANTS.GROWTH_LOG_MAX_SIZE);
    }
  }

  getSizeLabel() {
    const s = this.params.size || 0;
    if (s >= 10) return 'LL';
    if (s >= 5)  return 'L';
    if (s >= 0)  return 'M';
    if (s >= -5) return 'S';
    return 'SS';
  }

  getIntelligenceLevel() {
    return Math.min(5, Math.floor((this.params.intelligence || 0) / 4) + 1);
  }

  recalculateStats() {
    this.stats = this.calculateFinalStats();
    if (this.current_hp > this.stats.hp) this.current_hp = this.stats.hp;
    if (this.current_st > this.stats.max_st) this.current_st = this.stats.max_st;
  }
}

export class Timeline {
  constructor(p1_monsters, p2_monsters) {
    this.GAUGE_MAX = CONSTANTS.GAUGE_MAX;
    this.p1_monsters = p1_monsters;
    this.p2_monsters = p2_monsters;
    this.p1_active = p1_monsters[0] || null;
    this.p2_active = p2_monsters[0] || null;

    [...this.p1_monsters, ...this.p2_monsters].forEach(m => m.gauge = 0.0);
  }

  tick() {
    while (true) {
      if (this.p1_active && this.p1_active.gauge >= this.GAUGE_MAX) return { player: 1, active: this.p1_active };
      if (this.p2_active && this.p2_active.gauge >= this.GAUGE_MAX) return { player: 2, active: this.p2_active };

      if (this.p1_active) this.p1_active.gauge += this.p1_active.stats.spd || CONSTANTS.DEFAULT_SPD;
      if (this.p2_active) this.p2_active.gauge += this.p2_active.stats.spd || CONSTANTS.DEFAULT_SPD;
    }
  }

  onActionCompleted(player_num) {
    const active = player_num === 1 ? this.p1_active : this.p2_active;
    if (active) active.gauge -= this.GAUGE_MAX;

    const team = player_num === 1 ? this.p1_monsters : this.p2_monsters;
    team.forEach(m => {
      if (m !== active && m.current_hp > 0) {
        const recovery = m.stats.max_st * 0.05;
        m.current_st = Math.min(m.stats.max_st, m.current_st + recovery);
      }
    });

    // バフ/デバフのターン数を全ジュウマ分デクリメント
    [...this.p1_monsters, ...this.p2_monsters].forEach(m => {
      if (!m.buffs) return;
      for (const stat of Object.keys(m.buffs)) {
        m.buffs[stat].turns--;
        if (m.buffs[stat].turns <= 0) delete m.buffs[stat];
      }
    });

    if (active && active.current_hp <= 0 && team.some(m => m.current_hp > 0)) {
        return "need_swap"; // Action completed but active is dead
    }
    return "ok";
  }

  swapActive(player_num, index) {
    const team = player_num === 1 ? this.p1_monsters : this.p2_monsters;
    if (index < 0 || index >= team.length || !team[index]) return false;
    const new_active = team[index];
    if (new_active.current_hp <= 0) return false;

    if (player_num === 1) this.p1_active = new_active;
    else this.p2_active = new_active;

    new_active.gauge = 0.0;
    return true;
  }
}
