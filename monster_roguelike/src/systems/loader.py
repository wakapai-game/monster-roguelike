import json
import os
from src.models.monster import Monster

class DataLoader:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.affinity = self._load_json("affinity.json")
        self.skills = {s["id"]: s for s in self._load_json("skills.json")}
        self.monsters_data = self._load_json("monsters.json")

    def _load_json(self, filename: str):
        path = os.path.join(self.data_dir, filename)
        if not os.path.exists(path):
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_monster(self, monster_id: str) -> Monster:
        for m_data in self.monsters_data:
            if m_data.get("id") == monster_id:
                return Monster(m_data)
        return None

    def get_skill(self, skill_id: str) -> dict:
        return self.skills.get(skill_id, {})
    
    def get_affinity_multiplier(self, atk_elem: str, def_elem: str) -> float:
        if atk_elem in self.affinity and def_elem in self.affinity[atk_elem]:
            return self.affinity[atk_elem][def_elem]
        return 1.0
