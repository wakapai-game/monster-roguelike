# Monster Rogue: Web Edition — Claude Code ガイド

## セッション開始時にやること
新しいセッションを開始したら、必ず以下を読んでから作業を始めること：
- `~/.claude/projects/-Users-user-Documents-GitHub-monster-roguelike/memory/MEMORY.md`（インデックス）
- インデックスに記載された関連ファイル

## セッション終了時にやること
「今日はここまで」「ここまでにする」など作業終了を示す発言があったら必ず以下を実行すること：
1. gitコミット用サマリー（1行）とディスクリプション（箇条書き）を出力する
2. セッションで決定した設計・世界観・仕様などをメモリファイルに記録・更新する

## 作業ルール
- メインコード: `karakuri_web/`。`monster_roguelike_web/`・`monster_roguelike/` は参照のみ
- ゲームデザイン・技術リファレンスは `design.md` を参照すること
