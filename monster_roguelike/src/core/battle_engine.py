from src.models.monster import Monster
from src.systems.loader import DataLoader
import math

BREAK_DAMAGE_MULTIPLIER = 2.0
DOUBLE_WEAKNESS_MULTIPLIER = 8.0
MIN_ST_COST = 10
BASELINE_ATTACK_PENALTY = 10

class BattleEngine:
    def __init__(self, data_loader: DataLoader):
        self.loader = data_loader

    def execute_skill(self, attacker: Monster, defender: Monster, skill_id: str) -> dict:
        skill = self.loader.get_skill(skill_id)
        if not skill:
            return {"error": "Skill not found"}

        result_log = {
            "attacker": attacker.name,
            "defender": defender.name,
            "skill": skill.get("name"),
            "st_damage": 0,
            "hp_damage": 0,
            "armor_crush": False,
            "is_break": False,
            "self_damage": 0
        }

        # STコストの支払い（ブレイク状態ならHP自傷ダメージ）
        cost = max(MIN_ST_COST, skill.get("cost_st", MIN_ST_COST))
        if attacker.is_break:
            attacker.current_hp -= cost
            result_log["self_damage"] = cost
        else:
            attacker.current_st = max(0, attacker.current_st - cost)
            if attacker.current_st == 0:
                self._check_break(attacker)

        # 技の効果を処理
        effects = skill.get("effects", [])
        for effect in effects:
            e_type = effect.get("type")
            
            if e_type == "damage_st":
                dmg = self._calc_st_damage(attacker, defender, skill, effect)
                defender.current_st -= dmg["st_damage"]
                result_log["st_damage"] += dmg["st_damage"]
                result_log["armor_crush"] = result_log["armor_crush"] or dmg["armor_crush"]
                
                # ブレイクチェックと、もし0未満になれば超過分をHPへ？（要件的にはSTが防ぐ限りHPは減らない、ST0ならHPダメージなので、超過分はHPには流さない前提で計算）
                if defender.current_st <= 0:
                    defender.current_st = 0
                    self._check_break(defender)
                    result_log["is_break"] = defender.is_break
                    
            elif e_type == "damage_hp_direct":
                # 貫通スキル等、STを無視してHPを削る
                dmg_hp = effect.get("base_power", 0)
                if defender.is_break:
                    dmg_hp *= BREAK_DAMAGE_MULTIPLIER  # ブレイク時はダメージ2倍
                
                dmg_hp = math.floor(dmg_hp)
                defender.current_hp -= dmg_hp
                result_log["hp_damage"] += dmg_hp
                
            elif e_type == "delay_gauge":
                delay_val = effect.get("value", 0)
                defender.gauge = max(0, defender.gauge - delay_val)
                
            elif e_type == "recover_hp":
                amount = int(effect.get("base_val", effect.get("value", 0)) * defender.stats.get("hp", 1))
                defender.current_hp = min(defender.stats["hp"], defender.current_hp + amount)

            elif e_type == "recover_st":
                pct = effect.get("percent", 0) / 100.0
                recover_val = attacker.stats.get("max_st", 100) * pct + attacker.stats.get("st_rec", 0)
                attacker.current_st = min(attacker.stats.get("max_st", 100), attacker.current_st + recover_val)
                # 回復したのでブレイク解除か判定
                if attacker.current_st > 0 and attacker.is_break:
                    attacker.is_break = False

        if defender.current_hp < 0:
            defender.current_hp = 0
        if attacker.current_hp < 0:
            attacker.current_hp = 0

        return result_log

    def _calc_st_damage(self, attacker: Monster, defender: Monster, skill: dict, effect: dict) -> dict:
        base_power = effect.get("base_power", 0)
        s_type = skill.get("type", "physical")
        s_elem = skill.get("element", "none")
        
        # 攻撃と防御ステータスの決定
        atk_stat = attacker.stats.get("atk" if s_type == "physical" else "mag", 10)
        def_stat = defender.stats.get("def" if s_type == "physical" else "mag", 10)
        
        # 属性相性の計算
        multi_main = self.loader.get_affinity_multiplier(s_elem, defender.main_element)
        multi_sub = self.loader.get_affinity_multiplier(s_elem, defender.sub_element)
        
        # メイン・サブ両方に有利なら4.0倍
        affinity_mult = multi_main * multi_sub
        if multi_main > 1.0 and multi_sub > 1.0:
            affinity_mult = 4.0
            
        # ダメージベース計算
        raw_damage = base_power * (atk_stat / max(1, def_stat)) * affinity_mult
        
        # --- ブレイク時のHPダメージ処理 ---
        if defender.is_break:
            hp_mult = BREAK_DAMAGE_MULTIPLIER
            # ブレイク状態＆4倍弱点直撃なら合計8.0倍 (4.0 * 2.0)
            if affinity_mult == 4.0:
                hp_mult = DOUBLE_WEAKNESS_MULTIPLIER
            elif affinity_mult > 1.0:
                hp_mult = affinity_mult * BREAK_DAMAGE_MULTIPLIER
                
            hp_damage = raw_damage * hp_mult
            # 直節HPを削る（STダメージは0）
            defender.current_hp -= math.floor(hp_damage)
            return {"st_damage": 0, "armor_crush": False}
        
        # --- STダメージ（通常時）と装甲粉砕処理 ---
        armor_crush = False
        crush_threshold = def_stat * defender.current_st
        crush_power = base_power * atk_stat
        
        if crush_power > crush_threshold:
            armor_crush = True
            raw_damage *= BREAK_DAMAGE_MULTIPLIER  # STダメージ2倍
            
        return {"st_damage": math.floor(raw_damage), "armor_crush": armor_crush}

    def _check_break(self, monster: Monster):
        if monster.current_st <= 0:
            monster.is_break = True
