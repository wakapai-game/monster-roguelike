// ▼ 本番エンジン切替ライン
export { KarakuriEngine as BattleEngine } from './LOGIC_Battle_Engines.js';
export const BATTLE_SYSTEM_VARIANT = 'karakuri';

import { TECH_PARTS, STAT_PARTS, OPTION_PARTS } from './DATA_Game_Master.js';

const CONSTANTS = {
  GAUGE_MAX: 100.0,
  MIN_STAT_VALUE: 1,
  DEFAULT_SPD: 10,
  SHUTDOWN_TURNS: 3,
};

export function findTechPart(id)   { return TECH_PARTS.find(p => p.id === id) || null; }
export function findStatPart(id)   { return STAT_PARTS.find(p => p.id === id) || null; }
export function findOptionPart(id) { return OPTION_PARTS.find(p => p.id === id) || null; }

export class Karakuri {
  constructor(data) {
    this.id           = data.id;
    this.name         = data.name;
    this.main_element = data.main_element || "none";
    this.sub_element  = data.sub_element  || "none";
    this.base_stats   = { ...data.base_stats };
    this.description  = data.description || "";

    this.tech_parts  = (data.tech_parts || data.tech || data.default_tech || []).slice(0, 4);
    this.stat_parts  = (data.stat_parts  || []).slice(0, 5);
    this.option_part = data.option_part  || null;

    this.purged_tech       = new Set(Array.isArray(data.purged_tech)  ? data.purged_tech  : []);
    this.purged_stats      = new Set(Array.isArray(data.purged_stats) ? data.purged_stats : []);
    this.purged_option     = data.purged_option ?? false;
    this.purge_guard_count = 0;

    this.stats          = this.calculateFinalStats();
    this.current_hp     = this.stats.hp;
    this.current_en     = this.stats.max_en;
    this.current_st     = this.stats.max_en; // 旧互換
    this.gauge          = 0.0;
    this.is_break       = false;
    this.shutdown_turns = 0;
    this.buffs          = {};
    this.consecutive_count = 0;

    this._initPurgeGuard();
  }

  calculateFinalStats() {
    const b = this.base_stats;
    let s = {
      hp:     Math.max(CONSTANTS.MIN_STAT_VALUE, b.hp     || 100),
      atk:    Math.max(CONSTANTS.MIN_STAT_VALUE, b.atk    || 10),
      def:    Math.max(CONSTANTS.MIN_STAT_VALUE, b.def    || 10),
      mag:    Math.max(CONSTANTS.MIN_STAT_VALUE, b.mag    || 10),
      spd:    Math.max(CONSTANTS.MIN_STAT_VALUE, b.spd    || 10),
      max_en: Math.max(CONSTANTS.MIN_STAT_VALUE, b.max_en || 100),
      max_st: Math.max(CONSTANTS.MIN_STAT_VALUE, b.max_en || 100), // 旧互換
      en_rec: b.en_rec || b.st_rec || 0,
      st_rec: b.en_rec || b.st_rec || 0,
    };
    for (const partId of (this.stat_parts || [])) {
      if (this.purged_stats?.has(partId)) continue;
      const part = findStatPart(partId);
      if (!part) continue;
      for (const [k, v] of Object.entries(part.bonus   || {})) s[k] = Math.max(CONSTANTS.MIN_STAT_VALUE, (s[k] || 0) + v);
      for (const [k, v] of Object.entries(part.penalty || {})) s[k] = Math.max(CONSTANTS.MIN_STAT_VALUE, (s[k] || 0) + v);
    }
    s.max_st = s.max_en;
    return s;
  }

  recalculateStats() {
    this.stats = this.calculateFinalStats();
    if (this.current_hp > this.stats.hp)     this.current_hp = this.stats.hp;
    if (this.current_en > this.stats.max_en) this.current_en = this.stats.max_en;
    this.current_st = this.current_en;
  }

  _initPurgeGuard() {
    this.purge_guard_count = (this.option_part === 'op_purge_guard' && !this.purged_option) ? 1 : 0;
  }

  getActiveParts() {
    return {
      tech:   this.tech_parts.filter(id => !this.purged_tech.has(id)),
      stats:  this.stat_parts.filter(id => !this.purged_stats.has(id)),
      option: (!this.purged_option && this.option_part) ? this.option_part : null,
    };
  }

  hasPurgeable() {
    const a = this.getActiveParts();
    return a.tech.length > 0 || a.stats.length > 0 || a.option !== null;
  }

  manualPurge(partId, partType) {
    // パーツデータから en_purge_recovery を取得してENを回復
    const partData = findTechPart(partId) || findStatPart(partId) || findOptionPart(partId);
    const recovery = partData?.en_purge_recovery ?? 0;
    if (partType === 'tech') {
      this.purged_tech.add(partId);
      this.recalculateStats();
    } else if (partType === 'stat') {
      this.purged_stats.add(partId);
      this.recalculateStats();
    } else if (partType === 'option') {
      this.purged_option = true;
      this.purge_guard_count = 0;
    } else {
      return false;
    }
    if (recovery > 0) {
      this.current_en = Math.min(this.stats.max_en, this.current_en + recovery);
    }
    return recovery;
  }

  autoPurge() {
    if (this.purge_guard_count > 0) {
      this.purge_guard_count--;
      const recovered = Math.floor(this.stats.max_en * 0.3);
      this.current_en = Math.min(this.stats.max_en, this.current_en + recovered);
      this.current_st = this.current_en;
      return { purged: false, guarded: true, recovered_en: recovered };
    }
    const active = this.getActiveParts();
    const candidates = [
      ...active.tech.map(id  => ({ id, type: 'tech' })),
      ...active.stats.map(id => ({ id, type: 'stat' })),
      ...(active.option ? [{ id: active.option, type: 'option' }] : []),
    ];
    if (candidates.length === 0) {
      this.shutdown_turns = CONSTANTS.SHUTDOWN_TURNS;
      return { purged: false, shutdown: true };
    }
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    // autoPurge は独自EN回復（max_en × 40%）を使うため、直接パージ処理を実行
    if (target.type === 'tech')   { this.purged_tech.add(target.id);  this.recalculateStats(); }
    if (target.type === 'stat')   { this.purged_stats.add(target.id); this.recalculateStats(); }
    if (target.type === 'option') { this.purged_option = true; this.purge_guard_count = 0; }
    const recovered = Math.floor(this.stats.max_en * 0.4);
    this.current_en = Math.min(this.stats.max_en, this.current_en + recovered);
    this.current_st = this.current_en;
    return { purged: true, partId: target.id, partType: target.type, recovered_en: recovered };
  }

  resetPurge() {
    this.purged_tech.clear();
    this.purged_stats.clear();
    this.purged_option = false;
    this.shutdown_turns = 0;
    this.recalculateStats();
    this._initPurgeGuard();
  }

  getAvailableTech() { return this.tech_parts.filter(id => !this.purged_tech.has(id)); }
  get skills()       { return this.getAvailableTech(); } // 旧互換

  getActiveOption() {
    if (this.purged_option || !this.option_part) return null;
    return findOptionPart(this.option_part);
  }
}

export class Timeline {
  constructor(p1_units, p2_units) {
    this.GAUGE_MAX = CONSTANTS.GAUGE_MAX;
    this.p1_units  = p1_units;
    this.p2_units  = p2_units;
    this.p1_active = p1_units[0] || null;
    this.p2_active = p2_units[0] || null;
    [...this.p1_units, ...this.p2_units].forEach(u => u.gauge = 0.0);
  }

  tick() {
    while (true) {
      const p1ok = this.p1_active && this.p1_active.shutdown_turns <= 0;
      const p2ok = this.p2_active && this.p2_active.shutdown_turns <= 0;
      if (p1ok && this.p1_active.gauge >= this.GAUGE_MAX) return { player: 1, active: this.p1_active };
      if (p2ok && this.p2_active.gauge >= this.GAUGE_MAX) return { player: 2, active: this.p2_active };
      if (p1ok) this.p1_active.gauge += this.p1_active.stats.spd || CONSTANTS.DEFAULT_SPD;
      if (p2ok) this.p2_active.gauge += this.p2_active.stats.spd || CONSTANTS.DEFAULT_SPD;
      if (!p1ok && !p2ok) {
        if (this.p1_active) this.p1_active.shutdown_turns = Math.max(0, this.p1_active.shutdown_turns - 1);
        if (this.p2_active) this.p2_active.shutdown_turns = Math.max(0, this.p2_active.shutdown_turns - 1);
      }
    }
  }

  onActionCompleted(player_num) {
    const active = player_num === 1 ? this.p1_active : this.p2_active;
    if (active) active.gauge -= this.GAUGE_MAX;

    const team = player_num === 1 ? this.p1_units : this.p2_units;
    team.forEach(u => {
      if (u !== active && u.current_hp > 0) {
        const rec = u.stats.max_en * 0.05;
        u.current_en = Math.min(u.stats.max_en, u.current_en + rec);
        u.current_st = u.current_en;
      }
    });

    [...this.p1_units, ...this.p2_units].forEach(u => {
      if (!u.buffs) return;
      for (const stat of Object.keys(u.buffs)) {
        u.buffs[stat].turns--;
        if (u.buffs[stat].turns <= 0) delete u.buffs[stat];
      }
    });

    [...this.p1_units, ...this.p2_units].forEach(u => {
      const opt = u.getActiveOption?.();
      if (!opt) return;
      if (opt.effect.type === 'regen_hp') u.current_hp = Math.min(u.stats.hp, u.current_hp + opt.effect.value);
      if (opt.effect.type === 'regen_en') { u.current_en = Math.min(u.stats.max_en, u.current_en + opt.effect.value); u.current_st = u.current_en; }
    });

    if (active && active.current_hp <= 0 && team.some(u => u.current_hp > 0)) return "need_swap";
    return "ok";
  }

  swapActive(player_num, index) {
    const team = player_num === 1 ? this.p1_units : this.p2_units;
    if (index < 0 || index >= team.length || !team[index]) return false;
    const next = team[index];
    if (next.current_hp <= 0) return false;
    if (player_num === 1) this.p1_active = next;
    else                  this.p2_active = next;
    next.gauge = 0.0;
    return true;
  }
}

// 旧互換エイリアス
export { Karakuri as Monster };
