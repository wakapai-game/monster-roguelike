from typing import List
from src.models.monster import Monster

class DashboardUI:
    @staticmethod
    def show_selection_board(p1_roster: List[Monster], p2_roster: List[Monster], is_p1_view: bool = True):
        """6体の選出画面（相手の選抜は非公開）"""
        print("+" + "-"*40 + "+")
        print("|          MONSTER SELECTION             |")
        print("+" + "-"*40 + "+")
        
        print("[Your Roster (P1)]" if is_p1_view else "[Opponent Roster (P1)]")
        for i, m in enumerate(p1_roster):
            # 選出フラグ等は仮に全表示（実際は選んだ3体のみフラグ立て）
            print(f" {i+1}. {m.name} [HP: {m.stats['hp']} / ST: {m.stats['max_st']}]")
            
        print("\n[Opponent Roster (P2)]" if is_p1_view else "[Your Roster (P2)]")
        for i, m in enumerate(p2_roster):
            # 相手のステータスは見えても、どれが選出されたかは「???」で隠す想定
            print(f" {i+1}. {m.name} [HP: {m.stats['hp']} / ST: {m.stats['max_st']}]")
            
        print("+" + "-"*40 + "+\n")

    @staticmethod
    def print_status(monster: Monster):
        """戦闘中のステータス表示（残STは見せず、0の演出のみ）"""
        hp_display = f"HP: {monster.current_hp}/{monster.stats['hp']}"
        gauge_display = f"Gauge: {int(monster.gauge)}/100"
        
        if monster.is_break:
            # ST 0時の演出（相手からST残量が見えない仕様）
            st_display = "ST: [！！疲労状態（ゼーゼー）！！]"
        else:
            # 残っていることはわかるが具体的な数字は（相手からは）見えない
            st_display = "ST: [ACTIVE]"
            
        print(f"[{monster.name}] {hp_display} | {st_display} | {gauge_display}")
