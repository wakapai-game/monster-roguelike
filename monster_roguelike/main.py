import os
from src.systems.loader import DataLoader
from src.systems.save_manager import SaveManager
from src.core.timeline import Timeline
from src.core.battle_engine import BattleEngine
from src.ui.dashboard import DashboardUI

def main():
    print("=== Monster Breeding Tactical Roguelike - Demo ===")
    
    # 1. データのロード
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    save_dir = os.path.join(base_dir, "saves")
    
    loader = DataLoader(data_dir)
    save_mgr = SaveManager(save_dir)
    engine = BattleEngine(loader)
    
    # 2. ロースターの準備 (6体選出のモックとしてデータからそのまま引く)
    m_ids = ["m_001", "m_002", "m_003", "m_004", "m_005", "m_006"]
    p1_team = [loader.get_monster(mid) for mid in m_ids[:3]] # 3体に絞る
    p2_team = [loader.get_monster(mid) for mid in m_ids[3:6]]
    
    # UIの表示
    DashboardUI.show_selection_board(p1_team, p2_team, is_p1_view=True)
    
    # 3. バトルのセットアップ
    timeline = Timeline(p1_team, p2_team)
    print("\n--- BATTLE START ---")
    
    # モック・デモループ（数ターンだけ回す）
    for turn in range(5):
        print(f"\n[Turn {turn+1}] Ticking Timeline...")
        player_turn, active_monster = timeline.tick()
        
        DashboardUI.print_status(p1_team[0])
        DashboardUI.print_status(p2_team[0])
        
        print(f"\n>> Player {player_turn}'s Turn! Active: {active_monster.name}")
        
        # モックのアクション選択（P1ならP2の先頭を攻撃、スキルは先頭のもの）
        if player_turn == 1:
            target = timeline.p2_active
            skill_id = active_monster.skills[0] if active_monster.skills else "strike"
        else:
            target = timeline.p1_active
            skill_id = active_monster.skills[0] if active_monster.skills else "strike"
            
        print(f"{active_monster.name} used {skill_id} on {target.name}!")
        result = engine.execute_skill(active_monster, target, skill_id)
        
        # ログの出力
        print(f"  -> ST Damage: {result.get('st_damage')}")
        print(f"  -> HP Damage: {result.get('hp_damage')}")
        if result.get("armor_crush"):
            print("  -> !! ARMOR CRUSH !! (ST Damage x2)")
        if result.get("self_damage") > 0:
            print(f"  -> !! OVERHEAT !! ({active_monster.name} took {result['self_damage']} HP self-damage from exhaustion)")
        if target.is_break:
            print(f"  -> {target.name} is BROKEN! (ST = 0)")
            
        # タイムラインのゲージリセットや控え回復
        timeline.on_action_completed(player_turn)
        
    print("\n--- BATTLE END (Demo Limit) ---")
    
    # 4. 殿堂入りセーブのテスト
    print("\nSaving P1 Team to Hall of Fame...")
    saved_path = save_mgr.save_hall_of_fame(p1_team)
    print(f"Saved successfully: {saved_path}")
    
    # セーブデータの読み込みテスト
    print("Loading Hall of Fame & Verifying Hash...")
    loaded_data = save_mgr.load_hall_of_fame()
    print(f"Loaded {len(loaded_data)} monsters perfectly with valid hash.")

if __name__ == "__main__":
    main()
