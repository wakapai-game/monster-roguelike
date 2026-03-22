@echo off
:: バッチファイルのディレクトリに移動
cd /d "%~dp0\monster_roguelike_web"

:: ブラウザを開く
start http://localhost:8000

:: サーバーを起動 (Windowsの場合は通常 python コマンドを使用します)
python -m http.server 8000
