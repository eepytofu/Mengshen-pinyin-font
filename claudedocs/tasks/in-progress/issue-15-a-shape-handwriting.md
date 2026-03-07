# Task: Issue #15 - 手書き体で「ɑ」（教育規格準拠の a）を使う

## GitHub Issue

<https://github.com/MaruTama/Mengshen-pinyin-font/issues/15>

## 状態

未着手

## 問題

中国の語文教育では手書き体の「a」は「ɑ」（U+0251）の形を使う。
現在の handwritten スタイルは「a」（U+0061）の形になっている。

## 対応方針

- [ ] handwritten フォントスタイルにおいて、a のグリフを ɑ 形状に変更する
- [ ] han_serif（印刷体）は変更不要
- [ ] 影響するグリフ: a を含む拼音（a, ba, pa, ma, fa, da, ta, na, la, ga, ka, ha, za, ca, sa, ya, wa など）

## TDD サイクル

- [ ] 🔴 Red: handwritten スタイルの a グリフ形状を検証するテスト追加
- [ ] 🟢 Green: グリフ差し替え
- [ ] 🔵 Refactor

## 備考

教育現場での使用を想定した変更。han_serif は影響しない。
