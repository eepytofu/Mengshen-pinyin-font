# Task: Issue #16 - 拼音の "z" が常に欠落する

## GitHub Issue

<https://github.com/MaruTama/Mengshen-pinyin-font/issues/16>

## 状態

✅ 完了（テスト追加・動作確認済み）

## 問題

拼音表示において "z" の文字が常に欠落している（v1.x 時代に報告）。

## 調査結果

- [x] "z" を含む拼音グリフ（zā, zī など）の生成を確認 → 生成済み
- [x] グリフ名のマッピングに "z" が含まれているか確認 → `py_alphabet_z` として正しくマップ
- [x] フォント生成後の実際のグリフを検査 → 2080 グリフが `py_alphabet_z` を参照
- [x] 他の似た文字（s, x など）では問題が発生していないか確認 → 問題なし

## 根本原因

リファクタリング後のコード（`glyph_manager.py`）では正しく修正済み。
`load_alphabet_glyphs` の `else` ブランチで `"z"` → `"py_alphabet_z"` にマップされる。
`DELTA_4_REFLECTION = 0.001` により a ≠ d が保証され、グリフ消失も防止されている。

## TDD サイクル

- [x] 🔴 Red: z を含む拼音グリフが存在することを検証するテスト追加
  - `tests/unit/generation/test_z_glyph.py` を新規作成（5テスト）
- [x] 🟢 Green: 現行コードで全テスト通過（5/5 passed）
- [x] 🔵 Refactor: タスクファイル更新
