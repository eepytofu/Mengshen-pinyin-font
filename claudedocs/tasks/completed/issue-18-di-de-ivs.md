# Task: Issue #18 - 地 (dì/de) 多音字サポート

## GitHub Issue

<https://github.com/MaruTama/Mengshen-pinyin-font/issues/18>

## 状態

✅ 方針決定済み（未実装）

## 問題

「地」が de としてのみ認識され、dì（地铁 など）が正しく表示されない。
GSUB rclt による文脈判定は、必要な文脈が多すぎて現実的でない。

## 解決方針

**IVS（Ideographic Variation Sequences）を使って対応する。**

- ユーザーが IVS で異体字セレクタを付与することで読みを明示的に指定する
- GSUB rclt によるコンテキスト自動判定は行わない（文脈が複雑すぎるため）
- dì / de のデフォルト読みをどちらにするかは別途検討

## 備考

IVS 対応は他の多音字にも共通する仕組みのため、汎用的な実装が必要。
