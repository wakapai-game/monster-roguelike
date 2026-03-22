import json
import os
import hashlib

class SaveManager:
    SECRET_KEY = "ROGUE_MONSTER_SECRET_SALT_2026"

    def __init__(self, save_dir: str):
        self.save_dir = save_dir
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)

    def _generate_hash(self, data_str: str) -> str:
        """データとシークレットキーからSHA-256ハッシュを生成"""
        content = data_str + self.SECRET_KEY
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def save_hall_of_fame(self, monsters: list, filename: str = "hall_of_fame.json"):
        """殿堂入り個体をハッシュ付きで保存"""
        path = os.path.join(self.save_dir, filename)
        
        # モンスターのリストをdict化
        data_list = [m.to_dict() if hasattr(m, 'to_dict') else m for m in monsters]
        
        # ハッシュ計算のために一旦JSON文字列化（ソートして一意性を担保）
        data_str = json.dumps(data_list, sort_keys=True, separators=(',', ':'))
        hash_val = self._generate_hash(data_str)
        
        save_payload = {
            "data": data_list,
            "hash": hash_val
        }
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(save_payload, f, ensure_ascii=False, indent=2)
            
        return path

    def load_hall_of_fame(self, filename: str = "hall_of_fame.json") -> list:
        """保存データの読み込みとハッシュ検証"""
        path = os.path.join(self.save_dir, filename)
        if not os.path.exists(path):
            return []
            
        try:
            with open(path, "r", encoding="utf-8") as f:
                save_payload = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

        data_list = save_payload.get("data", [])
        saved_hash = save_payload.get("hash", "")

        # 検証
        data_str = json.dumps(data_list, sort_keys=True, separators=(',', ':'))
        expected_hash = self._generate_hash(data_str)

        if saved_hash != expected_hash:
            raise ValueError("Save data has been corrupted or tampered with! (Hash mismatch)")

        return data_list

    def save_session(self, session_data: dict, filename: str = "session.json") -> None:
        """Save full game session (roster, inventory, progress)."""
        path = os.path.join(self.save_dir, filename)

        data_str = json.dumps(session_data, sort_keys=True, separators=(',', ':'))
        hash_val = self._generate_hash(data_str)

        save_payload = {
            "data": session_data,
            "hash": hash_val
        }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(save_payload, f, ensure_ascii=False, indent=2)

    def load_session(self, filename: str = "session.json") -> dict | None:
        """Load session. Returns dict or None if no save exists. Raises ValueError on tampering."""
        path = os.path.join(self.save_dir, filename)
        if not os.path.exists(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                save_payload = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

        session_data = save_payload.get("data", {})
        saved_hash = save_payload.get("hash", "")

        data_str = json.dumps(session_data, sort_keys=True, separators=(',', ':'))
        expected_hash = self._generate_hash(data_str)

        if saved_hash != expected_hash:
            raise ValueError("Save data has been corrupted or tampered with! (Hash mismatch)")

        return session_data

    def delete_session(self, filename: str = "session.json") -> None:
        """Delete session save file if it exists."""
        path = os.path.join(self.save_dir, filename)
        if os.path.exists(path):
            os.remove(path)
