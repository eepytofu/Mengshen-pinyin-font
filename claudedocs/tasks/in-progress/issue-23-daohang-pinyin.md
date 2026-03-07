# Task: Issue #23 - 道行 の拼音が表示されない

## GitHub Issue

<https://github.com/MaruTama/Mengshen-pinyin-font/issues/23>

## 状態

未着手

## 問題

「道行」の拼音が v1.02 で正しく表示されない。
辞書への登録は確認済みだが、フォント出力に反映されていない。

## 調査チェックリスト

- [x] 辞書エントリの存在確認（済み）
- [ ] フォントマッピングプロセスの確認
- [ ] グリフ生成の検証
- [ ] 複数アプリでのテスト

## 調査方針

- duo_yin_zi のパターンファイルで「道行」のエントリを確認
- make_pattern_table.py の出力に含まれているか確認
- GSUB feature への変換過程を追跡する

## TDD サイクル

- [ ] 🔴 Red: 道行 → dào háng のテストケースを追加
- [ ] 🟢 Green: マッピング修正
- [ ] 🔵 Refactor

## 関連

- #8 での議論中に発見された問題
