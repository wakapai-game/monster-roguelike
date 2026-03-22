#!/bin/bash
# 実行しているスクリプトのディレクトリに移動
cd "$(dirname "$0")/monster_roguelike_web"

# ブラウザを開く
open http://localhost:8000

# サーバーを起動
python3 -m http.server 8000
