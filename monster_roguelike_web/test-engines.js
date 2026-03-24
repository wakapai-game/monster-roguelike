// test-engines.js
// 各案のバトルエンジン（完全独立実装）
// game.js の BattleEngine を継承しない。案ごとに変更が閉じている。

import { AFFINITY, SKILLS, BATTLE_ITEMS_DATA } from './data.js';

// ============================================================
// 案1: 設計意図通り（STはペナルティのみ最大-30）
//   - 全攻撃に固定ペナルティ（-10〜-30 ST）
//   - damage_st エフェクトはブレイク中のみHPダメージに使用
//   - 自分のSTが0になるとブレイク（技コストがHPから消費）
// ============================================================
export class EngineCase1 {
  getSkill(id) {
    return SKILLS.find(s => s.id === id) ?? BATTLE_ITEMS_DATA.find(i => i.id === id) ?? null;
  }

  getAffinityMultiplier(atk, def) {
    return AFFINITY[atk]?.[def] ?? 1.0;
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, armor_crush: false, is_break: false, self_damage: 0
    };

    // 1. 攻撃側 ST コスト（ブレイク中は HP から消費）
    const baseCost = Math.max(10, skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 5) : 0;
    const cost = baseCost + extraCost;
    result.extra_cost = extraCost;
    if (attacker.is_break) {
      attacker.current_hp -= cost;
      result.self_damage = cost;
    } else {
      attacker.current_st = Math.max(0, attacker.current_st - cost);
      if (attacker.current_st === 0) attacker.is_break = true;
    }

    // 2. ペナルティ（STダメージの唯一の発生源、最大 -30）
    if (attacker.id !== defender.id && (skill.category === 'attack' || skill.category === 'trap')) {
      const s_elem = skill.element || 'none';
      const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
      const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
      let aff = mm * ms;
      if (mm > 1 && ms > 1) aff = 4.0;

      let penalty = 10;
      if (aff > 1.0) penalty += 10; // 属性有利

      // 圧倒判定
      const dmgEff = skill.effects?.find(e => e.type === 'damage_st' || e.type === 'damage_hp_direct');
      if (dmgEff) {
        const s_type = skill.type || 'physical';
        const atkStat = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
        const defStat = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
        const is_stab = attacker.main_element === s_elem || attacker.sub_element === s_elem;
        const effPow = (is_stab ? (dmgEff.base_power || 0) * 1.5 : (dmgEff.base_power || 0));
        if (effPow * atkStat > defStat * defender.current_st) penalty += 10;
      }

      if (defender.is_break) {
        defender.current_hp -= penalty;
        result.hp_damage += penalty;
      } else {
        const actual = Math.min(defender.current_st, penalty);
        defender.current_st -= actual;
        result.st_damage += actual;
        if (defender.current_st === 0) {
          defender.is_break = true;
          result.is_break = true;
        }
      }
    }

    // 3. スキルエフェクト
    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_st') {
        // ブレイク中のみ威力計算でHPダメージ。通常時はペナルティで処理済みなので無視
        if (defender.is_break) {
          const hp_dmg = this._calcBreakDamage(attacker, defender, skill, eff);
          defender.current_hp -= hp_dmg;
          result.hp_damage += hp_dmg;
        }
      } else if (eff.type === 'damage_hp_direct') {
        let d = Math.floor((eff.base_power || 0)
          * (defender.is_defending ? 0.5 : 1)
          * (defender.is_break ? 2.0 : 1));
        defender.current_hp -= d;
        result.hp_damage += d;
      } else if (eff.type === 'delay_gauge') {
        defender.gauge = Math.max(0, defender.gauge - (eff.value || 0));
      } else if (eff.type === 'recover_st_direct') {
        attacker.current_st = Math.min(attacker.stats.max_st, attacker.current_st + (eff.value || 0));
        if (attacker.current_st > 0) attacker.is_break = false;
      } else if (eff.type === 'recover_hp') {
        defender.current_hp = Math.min(defender.stats.hp, defender.current_hp + (eff.value || 0));
      }
    }

    defender.current_hp = Math.max(0, defender.current_hp);
    attacker.current_hp = Math.max(0, attacker.current_hp);
    return result;
  }

  // ブレイク中の HP ダメージ計算（威力 × ブレイク倍率）
  _calcBreakDamage(attacker, defender, skill, eff) {
    const s_type = skill.type || 'physical';
    const s_elem = skill.element || 'none';
    const atk = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
    const def = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
    const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
    const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
    let aff = mm * ms;
    if (mm > 1 && ms > 1) aff = 4.0;
    const is_stab = attacker.main_element === s_elem || attacker.sub_element === s_elem;
    const effPow = is_stab ? (eff.base_power || 0) * 1.5 : (eff.base_power || 0);
    const raw = effPow * (atk / Math.max(1, def)) * aff * (defender.is_defending ? 0.5 : 1);
    const mult = aff === 4.0 ? 8.0 : aff > 1.0 ? aff * 2.0 : 2.0;
    return Math.floor(raw * mult);
  }
}

// ============================================================
// 案2: ブレイク中は攻撃技使用禁止
//   - 案1の全ロジックを独自に持つ（案1から継承しない）
//   - 違いは executeSkill の先頭でブレイク中攻撃をブロックするだけ
// ============================================================
export class EngineCase2 {
  getSkill(id) {
    return SKILLS.find(s => s.id === id) ?? BATTLE_ITEMS_DATA.find(i => i.id === id) ?? null;
  }

  getAffinityMultiplier(atk, def) {
    return AFFINITY[atk]?.[def] ?? 1.0;
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    // ブレイク中は攻撃技使用禁止
    if (attacker.is_break && skill.category === 'attack') {
      return { error: 'BREAK_NO_ATTACK', message: 'ブレイク中は攻撃不可！' };
    }

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, armor_crush: false, is_break: false, self_damage: 0
    };

    // 1. 攻撃側 ST コスト
    const baseCost = Math.max(10, skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 5) : 0;
    const cost = baseCost + extraCost;
    result.extra_cost = extraCost;
    if (attacker.is_break) {
      attacker.current_hp -= cost;
      result.self_damage = cost;
    } else {
      attacker.current_st = Math.max(0, attacker.current_st - cost);
      if (attacker.current_st === 0) attacker.is_break = true;
    }

    // 2. ペナルティ（最大 -30 ST）
    if (attacker.id !== defender.id && (skill.category === 'attack' || skill.category === 'trap')) {
      const s_elem = skill.element || 'none';
      const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
      const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
      let aff = mm * ms;
      if (mm > 1 && ms > 1) aff = 4.0;

      let penalty = 10;
      if (aff > 1.0) penalty += 10;

      const dmgEff = skill.effects?.find(e => e.type === 'damage_st' || e.type === 'damage_hp_direct');
      if (dmgEff) {
        const s_type = skill.type || 'physical';
        const atkStat = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
        const defStat = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
        const is_stab = attacker.main_element === s_elem || attacker.sub_element === s_elem;
        const effPow = is_stab ? (dmgEff.base_power || 0) * 1.5 : (dmgEff.base_power || 0);
        if (effPow * atkStat > defStat * defender.current_st) penalty += 10;
      }

      if (defender.is_break) {
        defender.current_hp -= penalty;
        result.hp_damage += penalty;
      } else {
        const actual = Math.min(defender.current_st, penalty);
        defender.current_st -= actual;
        result.st_damage += actual;
        if (defender.current_st === 0) {
          defender.is_break = true;
          result.is_break = true;
        }
      }
    }

    // 3. スキルエフェクト
    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_st') {
        if (defender.is_break) {
          const hp_dmg = this._calcBreakDamage(attacker, defender, skill, eff);
          defender.current_hp -= hp_dmg;
          result.hp_damage += hp_dmg;
        }
      } else if (eff.type === 'damage_hp_direct') {
        let d = Math.floor((eff.base_power || 0)
          * (defender.is_defending ? 0.5 : 1)
          * (defender.is_break ? 2.0 : 1));
        defender.current_hp -= d;
        result.hp_damage += d;
      } else if (eff.type === 'delay_gauge') {
        defender.gauge = Math.max(0, defender.gauge - (eff.value || 0));
      } else if (eff.type === 'recover_st_direct') {
        attacker.current_st = Math.min(attacker.stats.max_st, attacker.current_st + (eff.value || 0));
        if (attacker.current_st > 0) attacker.is_break = false;
      } else if (eff.type === 'recover_hp') {
        defender.current_hp = Math.min(defender.stats.hp, defender.current_hp + (eff.value || 0));
      }
    }

    defender.current_hp = Math.max(0, defender.current_hp);
    attacker.current_hp = Math.max(0, attacker.current_hp);
    return result;
  }

  _calcBreakDamage(attacker, defender, skill, eff) {
    const s_type = skill.type || 'physical';
    const s_elem = skill.element || 'none';
    const atk = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
    const def = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
    const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
    const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
    let aff = mm * ms;
    if (mm > 1 && ms > 1) aff = 4.0;
    const is_stab = attacker.main_element === s_elem || attacker.sub_element === s_elem;
    const effPow = is_stab ? (eff.base_power || 0) * 1.5 : (eff.base_power || 0);
    const raw = effPow * (atk / Math.max(1, def)) * aff * (defender.is_defending ? 0.5 : 1);
    const mult = aff === 4.0 ? 8.0 : aff > 1.0 ? aff * 2.0 : 2.0;
    return Math.floor(raw * mult);
  }
}

// ============================================================
// 案3: STグラデーション（ブレイクなし）
//   - is_break は使用しない
//   - STが減るほど HP へのダメージが増える
//   - 攻撃するほど自分の ST も消耗し防御力が下がる
//   - HP_dmg = raw × (1 - ST_ratio)
//   - ST_dmg = raw × ST_ratio
// ============================================================
export class EngineCase3 {
  getSkill(id) {
    return SKILLS.find(s => s.id === id) ?? BATTLE_ITEMS_DATA.find(i => i.id === id) ?? null;
  }

  getAffinityMultiplier(atk, def) {
    return AFFINITY[atk]?.[def] ?? 1.0;
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, armor_crush: false, is_break: false, self_damage: 0
    };

    // 1. 攻撃側 ST コスト（ブレイクなし・HP 消費なし）
    const baseCost = Math.max(10, skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 5) : 0;
    const cost = baseCost + extraCost;
    result.extra_cost = extraCost;
    attacker.current_st = Math.max(0, attacker.current_st - cost);

    // 2. スキルエフェクト（damage_st は ST と HP に分配）
    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_st') {
        const { st_damage, hp_damage } = this._calcGradientDamage(attacker, defender, skill, eff);
        defender.current_st = Math.max(0, defender.current_st - st_damage);
        defender.current_hp = Math.max(0, defender.current_hp - hp_damage);
        result.st_damage += st_damage;
        result.hp_damage += hp_damage;
      } else if (eff.type === 'damage_hp_direct') {
        let d = Math.floor((eff.base_power || 0) * (defender.is_defending ? 0.5 : 1));
        defender.current_hp = Math.max(0, defender.current_hp - d);
        result.hp_damage += d;
      } else if (eff.type === 'delay_gauge') {
        defender.gauge = Math.max(0, defender.gauge - (eff.value || 0));
      } else if (eff.type === 'recover_st_direct') {
        attacker.current_st = Math.min(attacker.stats.max_st, attacker.current_st + (eff.value || 0));
      } else if (eff.type === 'recover_hp') {
        defender.current_hp = Math.min(defender.stats.hp, defender.current_hp + (eff.value || 0));
      }
    }

    return result;
  }

  // raw ダメージを ST 残量比で ST と HP に分配する
  _calcGradientDamage(attacker, defender, skill, eff) {
    const s_type = skill.type || 'physical';
    const s_elem = skill.element || 'none';
    const atk = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
    const def = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
    const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
    const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
    let aff = mm * ms;
    if (mm > 1 && ms > 1) aff = 4.0;
    const is_stab = attacker.main_element === s_elem || attacker.sub_element === s_elem;
    const effPow = is_stab ? (eff.base_power || 0) * 1.5 : (eff.base_power || 0);
    const raw = effPow * (atk / Math.max(1, def)) * aff * (defender.is_defending ? 0.5 : 1);
    const stRatio = defender.current_st / Math.max(1, defender.stats.max_st);
    return {
      st_damage: Math.floor(Math.min(defender.current_st, raw * stRatio)),
      hp_damage: Math.floor(raw * (1 - stRatio))
    };
  }
}
