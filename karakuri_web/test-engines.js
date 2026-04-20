// battle-engines.js（旧: test-engines.js）
// 全バトルエンジン実装の唯一の場所。
// 本番エンジンの切替は game.js の切替ラインを1行変えるだけ。

import { AFFINITY, TECH_PARTS, BATTLE_ITEMS_DATA } from './data.js';

// 旧互換: SKILLSエイリアス（EngineCase1/2/3/4が参照）
const SKILLS = TECH_PARTS;

// ============================================================
// 基底クラス: 全案共通のユーティリティとエフェクト処理
// ============================================================
export class BattleEngineBase {
  getSkill(id) {
    return SKILLS.find(s => s.id === id) ?? BATTLE_ITEMS_DATA.find(i => i.id === id) ?? null;
  }

  getAffinityMultiplier(atk, def) {
    return AFFINITY[atk]?.[def] ?? 1.0;
  }

  /** 属性相性計算: mm * ms, 両方弱点なら 4.0 キャップ */
  calcAffinity(s_elem, defender) {
    const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
    const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
    let aff = mm * ms;
    if (mm > 1 && ms > 1) aff = 4.0;
    return aff;
  }

  /** STAB判定 */
  isStab(s_elem, attacker) {
    return s_elem !== 'none' && (attacker.main_element === s_elem || attacker.sub_element === s_elem);
  }

  /** STAB判定付き実効威力 */
  calcEffPow(base_pow, s_elem, attacker) {
    return this.isStab(s_elem, attacker) ? base_pow * 1.5 : base_pow;
  }

  /** スキルコスト計算 (baseCost + 連続攻撃extraCost) */
  calcSkillCost(skill, attacker) {
    const baseCost = Math.max(10, skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 5) : 0;
    return { baseCost, extraCost, cost: baseCost + extraCost };
  }

  /** 共通エフェクト処理。処理したら true を返す */
  applyCommonEffect(eff, attacker, defender, result) {
    if (eff.type === 'damage_hp_direct') {
      let d = Math.floor((eff.base_power || 0)
        * (defender.is_defending ? 0.5 : 1)
        * (defender.is_break ? 2.0 : 1));
      defender.current_hp -= d;
      result.hp_damage += d;
      return true;
    }
    if (eff.type === 'delay_gauge') {
      defender.gauge = Math.max(0, defender.gauge - (eff.value || 0));
      return true;
    }
    if (eff.type === 'recover_st_direct') {
      attacker.current_st = Math.min(attacker.stats.max_st, attacker.current_st + (eff.value || 0));
      if (attacker.current_st > 0) attacker.is_break = false;
      return true;
    }
    if (eff.type === 'recover_hp') {
      defender.current_hp = Math.min(defender.stats.hp, defender.current_hp + (eff.value || 0));
      return true;
    }
    if (eff.type === 'buff_stat') {
      // target: 'self'=attacker, 'enemy'=defender
      const target = eff.target === 'enemy' ? defender : attacker;
      if (!target.buffs) target.buffs = {};
      target.buffs[eff.stat] = { mult: eff.mult, turns: eff.turns };
      if (!result.buffs_applied) result.buffs_applied = [];
      result.buffs_applied.push({ who: eff.target, stat: eff.stat, mult: eff.mult });
      return true;
    }
    return false;
  }
}

// ============================================================
// 案1: 設計意図通り（STはペナルティのみ最大-30）
//   - 全攻撃に固定ペナルティ（-10〜-30 ST）
//   - damage_st エフェクトはブレイク中のみHPダメージに使用
//   - 自分のSTが0になるとブレイク（技コストがHPから消費）
// ============================================================
export class EngineCase1 extends BattleEngineBase {
  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, armor_crush: false, is_break: false, self_damage: 0
    };

    // 1. 攻撃側 ST コスト（ブレイク中は HP から消費）
    const { extraCost, cost } = this.calcSkillCost(skill, attacker);
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
      const aff = this.calcAffinity(s_elem, defender);

      let penalty = 10;
      let elemBonus = 0;
      let overpowerBonus = 0;
      if (aff > 1.0) { penalty += 10; elemBonus = 10; } // 属性有利

      // 圧倒判定
      const dmgEff = skill.effects?.find(e => e.type === 'damage_st' || e.type === 'damage_hp_direct');
      if (dmgEff) {
        const s_type = skill.type || 'physical';
        const atkStat = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
        const defStat = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
        const effPow = this.calcEffPow(dmgEff.base_power || 0, s_elem, attacker);
        if (effPow * atkStat > defStat * defender.current_st) { penalty += 10; overpowerBonus = 10; }
      }

      result.penalty_detail = { base: 10, elemBonus, overpowerBonus, total: penalty };

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
      } else {
        this.applyCommonEffect(eff, attacker, defender, result);
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
    const aff = this.calcAffinity(s_elem, defender);
    const effPow = this.calcEffPow(eff.base_power || 0, s_elem, attacker);
    const raw = effPow * (atk / Math.max(1, def)) * aff * (defender.is_defending ? 0.5 : 1);
    const mult = aff === 4.0 ? 8.0 : aff > 1.0 ? aff * 2.0 : 2.0;
    return Math.floor(raw * mult);
  }
}

// ============================================================
// 案2: ブレイク中は攻撃技使用禁止
//   - 案1の全ロジックを継承
//   - 違いは executeSkill の先頭でブレイク中攻撃をブロックするだけ
// ============================================================
export class EngineCase2 extends BattleEngineBase {
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
    const { extraCost, cost } = this.calcSkillCost(skill, attacker);
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
      const aff = this.calcAffinity(s_elem, defender);

      let penalty = 10;
      let elemBonus = 0;
      let overpowerBonus = 0;
      if (aff > 1.0) { penalty += 10; elemBonus = 10; }

      const dmgEff = skill.effects?.find(e => e.type === 'damage_st' || e.type === 'damage_hp_direct');
      if (dmgEff) {
        const s_type = skill.type || 'physical';
        const atkStat = attacker.stats[s_type === 'physical' ? 'atk' : 'mag'] || 10;
        const defStat = defender.stats[s_type === 'physical' ? 'def' : 'mag'] || 10;
        const effPow = this.calcEffPow(dmgEff.base_power || 0, s_elem, attacker);
        if (effPow * atkStat > defStat * defender.current_st) { penalty += 10; overpowerBonus = 10; }
      }

      result.penalty_detail = { base: 10, elemBonus, overpowerBonus, total: penalty };

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
      } else {
        this.applyCommonEffect(eff, attacker, defender, result);
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
    const aff = this.calcAffinity(s_elem, defender);
    const effPow = this.calcEffPow(eff.base_power || 0, s_elem, attacker);
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
export class EngineCase3 extends BattleEngineBase {
  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, armor_crush: false, is_break: false, self_damage: 0
    };

    // 1. 攻撃側 ST コスト（ブレイクなし・HP 消費なし）
    const { baseCost, extraCost, cost } = this.calcSkillCost(skill, attacker);
    result.extra_cost = extraCost;
    result.base_cost = baseCost;
    result.cost_total = cost;
    attacker.current_st = Math.max(0, attacker.current_st - cost);

    // 2. スキルエフェクト（damage_st は ST固定 + HP溢れダメージ）
    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_st') {
        const { st_damage, hp_damage, is_weakness, calc } = this._calcDamage(attacker, defender, skill, eff);
        defender.current_st = Math.max(0, defender.current_st - st_damage);
        defender.current_hp = Math.max(0, defender.current_hp - hp_damage);
        result.is_weakness = is_weakness;
        result.calc = calc;
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
      } else {
        this.applyCommonEffect(eff, attacker, defender, result);
      }
    }

    return result;
  }

  // ST固定ダメージ + HP溢れダメージ計算
  // ST_dmg = 10（ヒット固定）+ 10（弱点属性なら追加）
  // HP_dmg = max(0, (effPow*atk*aff - current_st*def) / 100) — STが盾、削れるほど溢れが増える
  _calcDamage(attacker, defender, skill, eff) {
    const s_type = skill.type || 'physical';
    const s_elem = skill.element || 'none';
    const statKey = s_type === 'physical' ? 'atk' : 'mag';
    const defKey  = s_type === 'physical' ? 'def' : 'mag';
    const atk = (attacker.stats[statKey] || 10) * (attacker.buffs?.[statKey]?.mult ?? 1);
    const def = (defender.stats[defKey]   || 10) * (defender.buffs?.[defKey]?.mult ?? 1);
    const aff = this.calcAffinity(s_elem, defender);
    const base_pow = eff.base_power || 0;
    const effPow = this.calcEffPow(base_pow, s_elem, attacker);
    const is_weakness = aff > 1.0;
    const st_damage = Math.min(defender.current_st, 10 + (is_weakness ? 10 : 0));
    const pow_atk = effPow * atk * aff;
    const st_def = defender.current_st * def;
    const hp_damage = Math.max(0, Math.floor((pow_atk - st_def) / 100 * (defender.is_defending ? 0.5 : 1)));
    return {
      st_damage,
      hp_damage,
      is_weakness,
      calc: { base_pow, is_stab: this.isStab(s_elem, attacker), atk, def, aff, effPow, pow_atk, st_def }
    };
  }
}

// ============================================================
// 案4: 案3改良版
//   - ST削りを威力連動に（固定10 → effPow/3、範囲5〜25）
//   - ST=0時もHPコスト消費で攻撃継続可能（逆転の芽）
//   - 連続行動ペナルティ倍増（+5/回 → +10/回）
//   - STAB: 1.5 → 1.3、ダブル弱点上限: 4.0 → 3.0
//   - Defend時のHP溢れダメージも半減
// ============================================================
export class EngineCase4 extends EngineCase3 {
  // STAB倍率を抑制
  calcEffPow(base_pow, s_elem, attacker) {
    return this.isStab(s_elem, attacker) ? base_pow * 1.3 : base_pow;
  }

  // ダブル弱点上限を緩和
  calcAffinity(s_elem, defender) {
    const mm = this.getAffinityMultiplier(s_elem, defender.main_element);
    const ms = this.getAffinityMultiplier(s_elem, defender.sub_element);
    let aff = mm * ms;
    if (mm > 1 && ms > 1) aff = 3.0;
    return aff;
  }

  // 連続行動ペナルティ倍増
  calcSkillCost(skill, attacker) {
    const baseCost = Math.max(10, skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 10) : 0;
    return { baseCost, extraCost, cost: baseCost + extraCost };
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      st_damage: 0, hp_damage: 0, is_break: false, self_damage: 0
    };

    const { baseCost, extraCost, cost } = this.calcSkillCost(skill, attacker);
    result.extra_cost = extraCost;
    result.base_cost = baseCost;
    result.cost_total = cost;

    // ST=0時はHPからコスト消費（逆転可能）
    if (attacker.current_st === 0 && skill.category === 'attack') {
      attacker.current_hp = Math.max(0, attacker.current_hp - cost);
      result.self_damage = cost;
    } else {
      attacker.current_st = Math.max(0, attacker.current_st - cost);
    }

    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_st') {
        const { st_damage, hp_damage, is_weakness, calc } = this._calcDamage(attacker, defender, skill, eff);
        defender.current_st = Math.max(0, defender.current_st - st_damage);
        defender.current_hp = Math.max(0, defender.current_hp - hp_damage);
        result.is_weakness = is_weakness;
        result.calc = calc;
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
      } else {
        this.applyCommonEffect(eff, attacker, defender, result);
      }
    }

    return result;
  }

  // ST削りを威力連動に + Defend時HP溢れダメ半減
  _calcDamage(attacker, defender, skill, eff) {
    const s_type = skill.type || 'physical';
    const s_elem = skill.element || 'none';
    const statKey = s_type === 'physical' ? 'atk' : 'mag';
    const defKey  = s_type === 'physical' ? 'def' : 'mag';
    const atk = (attacker.stats[statKey] || 10) * (attacker.buffs?.[statKey]?.mult ?? 1);
    const def = (defender.stats[defKey]   || 10) * (defender.buffs?.[defKey]?.mult ?? 1);
    const aff = this.calcAffinity(s_elem, defender);
    const base_pow = eff.base_power || 0;
    const effPow = this.calcEffPow(base_pow, s_elem, attacker);
    const is_weakness = aff > 1.0;

    // ST削り: effPow/3 + 弱点ボーナス10、範囲5〜25
    const st_raw = Math.floor(effPow / 3) + (is_weakness ? 10 : 0);
    const st_damage = Math.min(defender.current_st, Math.max(5, Math.min(25, st_raw)));

    const pow_atk = effPow * atk;
    const st_def = defender.current_st * def;
    const overflow = Math.max(0, pow_atk - st_def);
    const hp_damage = Math.floor(overflow * (defender.is_defending ? 0.5 : 1));

    return {
      st_damage,
      hp_damage,
      is_weakness,
      calc: { base_pow, is_stab: this.isStab(s_elem, attacker), atk, def, aff, effPow, pow_atk, st_def }
    };
  }
}

// ============================================================
// KarakuriEngine: カラクリ新ゲーム用エンジン
//   - STをENに置き換え（旧互換のためcurrent_stもcurrent_enに同期）
//   - EN=0で autoPurge() を呼び出す
//   - damage_en エフェクトタイプを処理
// ============================================================
export class KarakuriEngine extends BattleEngineBase {
  getSkill(id) {
    return TECH_PARTS.find(s => s.id === id) ?? BATTLE_ITEMS_DATA.find(i => i.id === id) ?? null;
  }

  executeSkill(attacker, defender, skill_id) {
    const skill = this.getSkill(skill_id);
    if (!skill) return { error: 'Skill not found' };

    const result = {
      attacker: attacker.name, defender: defender.name, skill: skill.name,
      en_damage: 0, st_damage: 0, hp_damage: 0, is_weakness: false,
      purge_event: null, defender_purge_event: null
    };

    const baseCost = Math.max(10, skill.cost_en || skill.cost_st || 0);
    const extraCost = skill.category === 'attack'
      ? Math.max(0, ((attacker.consecutive_count || 1) - 1) * 5) : 0;
    const cost = baseCost + extraCost;
    result.base_cost = baseCost;
    result.extra_cost = extraCost;
    result.cost_total = cost;

    attacker.current_en = Math.max(0, attacker.current_en - cost);
    attacker.current_st = attacker.current_en;

    if (attacker.current_en <= 0 && attacker.autoPurge) {
      result.purge_event = attacker.autoPurge();
      attacker.current_st = attacker.current_en;
    }

    for (const eff of (skill.effects || [])) {
      if (eff.type === 'damage_en' || eff.type === 'damage_st') {
        const { en_damage, hp_damage, is_weakness, calc } = this._calcDamage(attacker, defender, skill, eff);
        defender.current_en = Math.max(0, defender.current_en - en_damage);
        defender.current_st = defender.current_en;
        defender.current_hp = Math.max(0, defender.current_hp - hp_damage);
        if (defender.current_en <= 0 && defender.autoPurge) {
          result.defender_purge_event = defender.autoPurge();
          defender.current_st = defender.current_en;
        }
        result.is_weakness = is_weakness;
        result.calc = calc;
        result.en_damage += en_damage;
        result.st_damage  = result.en_damage;
        result.hp_damage += hp_damage;
      } else if (eff.type === 'recover_en_direct' || eff.type === 'recover_st_direct') {
        attacker.current_en = Math.min(attacker.stats.max_en, attacker.current_en + (eff.value || 0));
        attacker.current_st = attacker.current_en;
      } else {
        this.applyCommonEffect(eff, attacker, defender, result);
      }
    }

    const opt = attacker.getActiveOption?.();
    if (opt?.effect?.type === 'on_hit_en_recover' && result.hp_damage > 0) {
      attacker.current_en = Math.min(attacker.stats.max_en, attacker.current_en + opt.effect.value);
      attacker.current_st = attacker.current_en;
    }

    return result;
  }

  _calcDamage(attacker, defender, skill, eff) {
    const s_type  = skill.type || 'physical';
    const s_elem  = skill.element || 'none';
    const statKey = s_type === 'physical' ? 'atk' : 'mag';
    const defKey  = s_type === 'physical' ? 'def' : 'mag';
    const atk = (attacker.stats[statKey] || 10) * (attacker.buffs?.[statKey]?.mult ?? 1);
    const def = (defender.stats[defKey]   || 10) * (defender.buffs?.[defKey]?.mult ?? 1);
    const aff = this.calcAffinity(s_elem, defender);

    let atkMult = 1;
    const opt = attacker.getActiveOption?.();
    if (opt?.effect?.type === 'low_hp_atk_boost') {
      if ((attacker.current_hp / attacker.stats.hp) <= opt.effect.threshold) atkMult = opt.effect.mult;
    }
    if (opt?.effect?.type === 'immune_element' && s_elem === opt.effect.element) {
      return { en_damage: 0, hp_damage: 0, is_weakness: false, calc: {} };
    }

    const base_pow    = eff.base_power || 0;
    const effPow      = this.calcEffPow(base_pow, s_elem, attacker);
    const is_weakness = aff > 1.0;
    const en_damage   = Math.min(defender.current_en, 10 + (is_weakness ? 10 : 0));
    const pow_atk     = effPow * atk * aff * atkMult;
    const en_def      = defender.current_en * def;
    const hp_damage   = Math.max(0, Math.floor((pow_atk - en_def) / 100 * (defender.is_defending ? 0.5 : 1)));

    return {
      en_damage, hp_damage, is_weakness,
      calc: { base_pow, is_stab: this.isStab(s_elem, attacker), atk, def, aff, effPow, pow_atk, en_def }
    };
  }
}
