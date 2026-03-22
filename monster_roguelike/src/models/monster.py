import math

class Monster:
    # 係数の定義 (HP, ATK, DEF, MAG, SPD, MaxST, ST_REC)
    COEFF_SIZE = {"hp": 1.0, "atk": 0.8, "spd": -0.5}
    COEFF_HARD = {"def": 1.0, "max_st": 0.5, "mag": -0.5}
    COEFF_INT = {"mag": 1.0, "st_rec": 1.0, "atk": -0.5}

    def __init__(self, data: dict):
        self.id = data.get("id", "temp_id")
        self.name = data.get("name", "Unknown")
        self.main_element = data.get("main_element", "none")
        self.sub_element = data.get("sub_element", "none")
        self.base_stats = data.get("base_stats", {})
        self.params = data.get("params", {"size": 50, "hardness": 50, "intelligence": 50})
        self.skills = data.get("skills", [])
        
        # 実行時管理用
        self.stats = self._calculate_final_stats()
        self.current_hp = self.stats["hp"]
        self.current_st = self.stats["max_st"]
        self.gauge = 0.0
        self.is_break = False  # ST 0の状態

    def _calculate_final_stats(self):
        # 合計が150であることを前提とする
        size = self.params.get("size", 50)
        hard = self.params.get("hardness", 50)
        intel = self.params.get("intelligence", 50)

        final_stats = {}
        for stat, base_val in self.base_stats.items():
            # 該当ステータスに対する係数和を計算
            coeff_sum = 0.0
            
            # Sizeによる影響
            if stat in self.COEFF_SIZE:
                coeff_sum += ((size - 50) / 100.0) * self.COEFF_SIZE[stat]
            # Hardnessによる影響
            if stat in self.COEFF_HARD:
                coeff_sum += ((hard - 50) / 100.0) * self.COEFF_HARD[stat]
            # Intelligenceによる影響
            if stat in self.COEFF_INT:
                coeff_sum += ((intel - 50) / 100.0) * self.COEFF_INT[stat]

            # 計算式: FinalStat = BaseStat * (1 + 係数和)
            calculated = base_val * (1.0 + coeff_sum)
            final_stats[stat] = max(1, math.floor(calculated)) # 最小値1、切り捨て

        return final_stats
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "main_element": self.main_element,
            "sub_element": self.sub_element,
            "base_stats": self.base_stats,
            "params": self.params,
            "skills": self.skills
        }
