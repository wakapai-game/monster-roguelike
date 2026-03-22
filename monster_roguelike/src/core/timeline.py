from typing import List, Tuple
from src.models.monster import Monster

class Timeline:
    GAUGE_MAX = 100.0

    def __init__(self, p1_monsters: List[Monster], p2_monsters: List[Monster]):
        self.p1_monsters = p1_monsters # 全6体（または選出3体）のリスト
        self.p2_monsters = p2_monsters
        
        self.p1_active: Monster = p1_monsters[0] if p1_monsters else None
        self.p2_active: Monster = p2_monsters[0] if p2_monsters else None

        # 初期ゲージ
        for m in self.p1_monsters + self.p2_monsters:
            m.gauge = 0.0

    def tick(self) -> Tuple[int, Monster]:
        """タイムラインを進め、次に行動可能なモンスターとプレイヤー(1 or 2)を返す"""
        while True:
            # 現在のゲージが行き着いているか確認
            if self.p1_active and self.p1_active.gauge >= self.GAUGE_MAX:
                return (1, self.p1_active)
            if self.p2_active and self.p2_active.gauge >= self.GAUGE_MAX:
                return (2, self.p2_active)

            # ゲージ進行 (SPDを加算)
            if self.p1_active:
                self.p1_active.gauge += self.p1_active.stats.get("spd", 10)
            if self.p2_active:
                self.p2_active.gauge += self.p2_active.stats.get("spd", 10)

    def on_action_completed(self, player_num: int):
        """行動完了時の処理・控えのST回復"""
        active = self.p1_active if player_num == 1 else self.p2_active
        if active:
            active.gauge -= self.GAUGE_MAX
            
        # 控えのST回復 (最大値の5%)
        team = self.p1_monsters if player_num == 1 else self.p2_monsters
        for m in team:
            if m != active and m.current_hp > 0:
                recovery = m.stats.get("max_st", 100) * 0.05
                m.current_st = min(m.stats.get("max_st", 100), m.current_st + recovery)

    def swap_active(self, player_num: int, new_active_index: int):
        """モンスターの交代とペナルティ(ゲージ0)処理"""
        team = self.p1_monsters if player_num == 1 else self.p2_monsters
        new_active = team[new_active_index]
        if new_active.current_hp <= 0:
            return False # 倒れているモンスターには交代不可
            
        if player_num == 1:
            self.p1_active = new_active
        else:
            self.p2_active = new_active
            
        # 交代ペナルティ：ゲージ0から
        new_active.gauge = 0.0
        return True
