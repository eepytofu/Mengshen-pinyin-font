# Task: Issue #29 - v2.0以降 GSUB テーブル破損の可能性

## GitHub Issue

<https://github.com/MaruTama/Mengshen-pinyin-font/issues/29>

## 状態

未着手

## 問題

v2.0 以降のフォントを cn-font-split で分割しようとするとパニックが発生する。

```
thread '<unnamed>' panicked at harfbuzz_rs_now-2.3.2/src/face.rs:179:46:
called `Option::unwrap()` on a `None` value
```

TTX でデコンパイル時にも GSUB テーブルエラーが発生する：

```
WARNING: Unknown Coverage format: 42792
ERROR: An exception occurred during the decompilation of the 'GSUB' table
```

v1.x では発生しなかった。

## 調査方針

- [ ] TTX で生成フォントの GSUB テーブルを検査する
- [ ] v1.x と v2.0 の GSUB 生成コードの差分を確認する
- [ ] otfcc でのビルド時に Coverage format が正しく出力されているか確認
- [ ] #31（多音字誤読）と同根の可能性を検証する

## TDD サイクル

- [ ] 🔴 Red: GSUB テーブルが valid であることを検証するテストを書く
- [ ] 🟢 Green: 修正実装
- [ ] 🔵 Refactor: コード整理

## 関連

- #31（GSUB rclt 誤読）と同じ原因の可能性あり
