import { AFFINITY, SKILLS, BATTLE_ITEMS_DATA } from './data.js';

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
      weight: data.params?.weight || 0,
      smartness: data.params?.smartness || 0
    };
    
    this.skills = data.skills;

    this.stats = this.calculateFinalStats();
    this.current_hp = this.stats.hp;
    this.current_st = this.stats.max_st;
    this.gauge = 0.0;
    this.is_break = false;
  }

  calculateFinalStats() {
    const base = this.base_stats;
    const p = this.params;
    
    return {
      hp: Math.max(1, Math.floor(base.hp + (p.size * 5) - (p.smartness * 2))),
      max_st: Math.max(1, Math.floor(base.max_st + (p.size * 2) + (p.hardness * 1))),
      atk: Math.max(1, Math.floor(base.atk + (p.weight * 1))),
      def: Math.max(1, Math.floor(base.def + (p.hardness * 1) + (p.weight * 0.5))),
      mag: Math.max(1, Math.floor(base.mag + (p.smartness * 1))),
      spd: Math.max(1, Math.floor(base.spd - (p.size * 0.2) - (p.hardness * 0.1) - (p.weight * 0.2) + (p.smartness * 0.5)))
    };
  }
  
  recalculateStats() {
    this.stats = this.calculateFinalStats();
    if (this.current_hp > this.stats.hp) this.current_hp = this.stats.hp;
    if (this.current_st > this.stats.max_st) this.current_st = this.stats.max_st;
  }
}

export class Timeline {
  constructor(p1_monsters, p2_monsters) {
    this.GAUGE_MAX = 100.0;
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

      if (this.p1_active) this.p1_active.gauge += this.p1_active.stats.spd || 10;
      if (this.p2_active) this.p2_active.gauge += this.p2_active.stats.spd || 10;
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

    const cost = skill.cost_st || 0;
    if (attacker.is_break) {
      attacker.current_hp -= cost;
      result.self_damage = cost;
    } else {
      attacker.current_st = Math.max(0, attacker.current_st - cost);
      if (attacker.current_st === 0 && !attacker.is_break) this._triggerBreak(attacker);
    }

    // Baseline Incoming Attack Penalty
    if (attacker.id !== defender.id && (skill.category === "attack" || skill.category === "trap")) {
        const penalty = 10;
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
        const dmg = this._calcStDamage(attacker, defender, skill, effect);
        defender.current_st -= dmg.st_damage;
        result.st_damage += dmg.st_damage;
        result.armor_crush = result.armor_crush || dmg.armor_crush;

        if (defender.current_st <= 0) {
          defender.current_st = 0;
          this._triggerBreak(defender);
          result.is_break = defender.is_break;
        }
      } else if (effect.type === "damage_hp_direct") {
        let dmg_hp = effect.base_power || 0;
        if (defender.is_defending) dmg_hp *= 0.5;
        if (defender.is_break) dmg_hp *= 2.0;
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

    const atk_stat = attacker.stats[s_type === "physical" ? "atk" : "mag"] || 10;
    const def_stat = defender.stats[s_type === "physical" ? "def" : "mag"] || 10;

    const multi_main = this.getAffinityMultiplier(s_elem, defender.main_element);
    const multi_sub = this.getAffinityMultiplier(s_elem, defender.sub_element);

    let affinity_mult = multi_main * multi_sub;
    if (multi_main > 1.0 && multi_sub > 1.0) affinity_mult = 4.0;

    let raw_damage = base_power * (atk_stat / Math.max(1, def_stat)) * affinity_mult;

    if (defender.is_defending) {
      raw_damage *= 0.5;
    }

    if (defender.is_break) {
      let hp_mult = 2.0;
      if (affinity_mult === 4.0) hp_mult = 8.0;
      else if (affinity_mult > 1.0) hp_mult = affinity_mult * 2.0;

      const hp_damage = Math.floor(raw_damage * hp_mult);
      defender.current_hp -= hp_damage;
      return { st_damage: 0, armor_crush: false };
    }

    let armor_crush = false;
    const crush_threshold = def_stat * defender.current_st;
    const crush_power = base_power * atk_stat;

    if (crush_power > crush_threshold) {
      armor_crush = true;
      raw_damage *= 2.0;
    }

    return { st_damage: Math.floor(raw_damage), armor_crush };
  }

  _triggerBreak(monster) {
    monster.is_break = true;
  }
}
