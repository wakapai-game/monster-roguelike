import { AFFINITY, SKILLS, BATTLE_ITEMS_DATA } from './data.js';

const CONSTANTS = {
  GAUGE_MAX: 100.0,
  BREAK_DAMAGE_MULTIPLIER: 2.0,
  DOUBLE_WEAKNESS_MULTIPLIER: 8.0,
  MIN_ST_COST: 10,
  BASELINE_ATTACK_PENALTY: 10,
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

export class BattleEngine {
  getSkill(skill_id) {
    let skill = SKILLS.find(s => s.id === skill_id);
    if (!skill) skill = BATTLE_ITEMS_DATA.find(i => i.id === skill_id);
    return skill;
  }

  getAffinityMultiplier(atk_elem, def_elem) {
    if (AFFINITY[atk_elem] && AFFINITY[atk_elem][def_elem] !== undefined) {
      return AFFINITY[atk_elem][def_elem];
    }
    return 1.0;
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: "Skill not found" };

    const result = {
      attacker: attacker.name,
      defender: defender.name,
      skill: skill.name,
      st_damage: 0,
      hp_damage: 0,
      armor_crush: false,
      is_break: false,
      self_damage: 0
    };

    const cost = Math.max(CONSTANTS.MIN_ST_COST, skill.cost_st || 0);
    if (attacker.is_break) {
      attacker.current_hp -= cost;
      result.self_damage = cost;
    } else {
      attacker.current_st = Math.max(0, attacker.current_st - cost);
      if (attacker.current_st === 0 && !attacker.is_break) this._triggerBreak(attacker);
    }

    // Baseline Incoming Attack Penalty
    if (attacker.id !== defender.id && (skill.category === "attack" || skill.category === "trap")) {
        let penalty = CONSTANTS.BASELINE_ATTACK_PENALTY;

        // Advantageous Element Penalty (-10)
        const s_elem = skill.element || "none";
        const multi_main = this.getAffinityMultiplier(s_elem, defender.main_element);
        const multi_sub = this.getAffinityMultiplier(s_elem, defender.sub_element);
        let affinity_mult = multi_main * multi_sub;
        if (multi_main > 1.0 && multi_sub > 1.0) affinity_mult = 4.0;

        if (affinity_mult > 1.0) {
            penalty += 10;
        }

        // Overpower Penalty (-10)
        let base_power = 0;
        if (skill.effects) {
            const attack_effect = skill.effects.find(e => e.type === "damage_st" || e.type === "damage_hp_direct");
            if (attack_effect) base_power = attack_effect.base_power || 0;
        }

        const is_stab = s_elem !== 'none' && (attacker.main_element === s_elem || attacker.sub_element === s_elem);
        const effective_skill_power = is_stab ? base_power * 1.5 : base_power;
        
        const s_type = skill.type || "physical";
        const atk_stat = attacker.stats[s_type === "physical" ? "atk" : "mag"] || CONSTANTS.DEFAULT_SPD;
        const def_stat = defender.stats[s_type === "physical" ? "def" : "mag"] || CONSTANTS.DEFAULT_SPD;

        const total_attack_power = effective_skill_power * atk_stat;
        const total_defense_power = defender.current_st * def_stat;

        if (total_attack_power > total_defense_power) {
            penalty += 10;
        }

        if (defender.is_break) {
            defender.current_hp -= penalty;
            result.hp_damage += penalty;
        } else {
            const actualStDmg = Math.min(defender.current_st, penalty);
            defender.current_st -= actualStDmg;
            result.st_damage += actualStDmg;
            
            if (defender.current_st === 0 && !defender.is_break) {
                this._triggerBreak(defender);
                result.is_break = true;
            }
        }
    }

    const effects = skill.effects || [];
    for (const effect of effects) {
      if (effect.type === "damage_st") {
        if (defender.is_break) {
          // ブレイク中のみ: スキル威力でHPダメージを計算
          const hpBefore = defender.current_hp;
          const dmg = this._calcStDamage(attacker, defender, skill, effect);
          result.hp_damage += hpBefore - defender.current_hp;
          result.armor_crush = result.armor_crush || dmg.armor_crush;
        }
        // 通常時: STダメージはペナルティのみ（最大-30）なのでここでは処理しない
      } else if (effect.type === "damage_hp_direct") {
        let dmg_hp = effect.base_power || 0;
        if (defender.is_defending) dmg_hp *= 0.5;
        if (defender.is_break) dmg_hp *= CONSTANTS.BREAK_DAMAGE_MULTIPLIER;
        dmg_hp = Math.floor(dmg_hp);
        defender.current_hp -= dmg_hp;
        result.hp_damage += dmg_hp;
      } else if (effect.type === "delay_gauge") {
        defender.gauge = Math.max(0, defender.gauge - (effect.value || 0));
      } else if (effect.type === "recover_st") {
        const pct = (effect.percent || 0) / 100.0;
        const recover_val = attacker.stats.max_st * pct + (attacker.stats.st_rec || 0);
        attacker.current_st = Math.min(attacker.stats.max_st, attacker.current_st + recover_val);
        if (attacker.current_st > 0 && attacker.is_break) attacker.is_break = false;
      } else if (effect.type === "recover_hp") {
        const recover_val = effect.value || 0;
        defender.current_hp = Math.min(defender.stats.hp, defender.current_hp + recover_val);
        // Note: For items targeted at allies, we pass the ally as both attacker and defender, or set up explicit targeting.
        // Let's assume if it's an item, the action is executed where defender = target (which could be self/ally).
        // Since "attacker" is the one using the item, "defender" is the target receiving the heal.
      } else if (effect.type === "recover_st_direct") {
        const recover_val = effect.value || 0;
        defender.current_st = Math.min(defender.stats.max_st, defender.current_st + recover_val);
        if (defender.current_st > 0 && defender.is_break) defender.is_break = false;
      }
    }

    if (defender.current_hp < 0) defender.current_hp = 0;
    if (attacker.current_hp < 0) attacker.current_hp = 0;

    return result;
  }

  _calcStDamage(attacker, defender, skill, effect) {
    const base_power = effect.base_power || 0;
    const s_type = skill.type || "physical";
    const s_elem = skill.element || "none";

    const atk_stat = attacker.stats[s_type === "physical" ? "atk" : "mag"] || CONSTANTS.DEFAULT_SPD;
    const def_stat = defender.stats[s_type === "physical" ? "def" : "mag"] || CONSTANTS.DEFAULT_SPD;

    const multi_main = this.getAffinityMultiplier(s_elem, defender.main_element);
    const multi_sub = this.getAffinityMultiplier(s_elem, defender.sub_element);

    let affinity_mult = multi_main * multi_sub;
    if (multi_main > 1.0 && multi_sub > 1.0) affinity_mult = 4.0;

    let raw_damage = base_power * (atk_stat / Math.max(1, def_stat)) * affinity_mult;

    if (defender.is_defending) {
      raw_damage *= 0.5;
    }

    if (defender.is_break) {
      let hp_mult = CONSTANTS.BREAK_DAMAGE_MULTIPLIER;
      if (affinity_mult === 4.0) hp_mult = CONSTANTS.DOUBLE_WEAKNESS_MULTIPLIER;
      else if (affinity_mult > 1.0) hp_mult = affinity_mult * CONSTANTS.BREAK_DAMAGE_MULTIPLIER;

      const hp_damage = Math.floor(raw_damage * hp_mult);
      defender.current_hp -= hp_damage;
      return { st_damage: 0, armor_crush: false };
    }

    let armor_crush = false;
    const crush_threshold = def_stat * defender.current_st;
    const crush_power = base_power * atk_stat;

    if (crush_power > crush_threshold) {
      armor_crush = true;
      raw_damage *= CONSTANTS.BREAK_DAMAGE_MULTIPLIER;
    }

    return { st_damage: Math.floor(raw_damage), armor_crush };
  }

  _triggerBreak(monster) {
    monster.is_break = true;
  }
}
