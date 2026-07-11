# 多音字について

pattern one は 熟語の中で 0~1 文字だけ拼音が変化するパターン  
pattern two は 熟語の中で 2 文字以上拼音が変化するパターン  
exception pattern は 例外的なパターン  

# ファイル構成

```text
outputs
   ├── duoyinzi_pattern_one.txt          <- make_pattern_table.py によって生成される
   ├── duoyinzi_pattern_two.json         <- make_pattern_table.py によって生成される
   └── duoyinzi_exceptional_pattern.json <- 特別なパターンのみで使う
```

現在は、duoyinzi_exceptional_pattern.json の生成は手動にて生成している.
-> [生成箇所](https://github.com/MaruTama/Mengshen-pinyin-font/blob/e5d6e9e1770d849d6c17016683faf7c04d028473/res/phonics/duo_yin_zi/scripts/make_pattern_table.py#L237-L276)

## duoyinzi_pattern_one.txt の番号（order）について

各行は `order, 漢字, 拼音, [パターン...]` の形式で、先頭の `order` は
その拼音が `merged-mapping-table.txt`（＝その漢字が持つ読みのリスト、GSUB の
`ss` 番号に対応）の中で何番目に登録されているか（添字 + 1）を表す。
パターンを持つ読みだけを連番で振り直したものではない。

そのため、ある漢字の読みの中にパターンを持たない読み（用例が乏しい異読み等）
が挟まっていると、`order` の番号は欠番を含んだまま歯抜けになる。

例えば `豁`（U+8C41）は `merged-mapping-table.txt` 上で
`huò, huá, huō, hè` の順で4つの読みを持つが、`huá` は熟語辞書
（`phrase_of_pattern_one.txt` 等）に用例が無くパターンを作れないため、
`duoyinzi_pattern_one.txt` には行として出力されない。しかし `huō` は
読み順で3番目（`huò`=1, `huá`=2, `huō`=3）なので、`order` は
`2` ではなく `3` になる。

```text
1, 豁, huò, [~亮|~免|~然|~达]
3, 豁, huō, [~口|~出去]
```

もしパターン無しの読みに用例（実在の熟語・人名等）を追加できるなら
`phrase_of_pattern_one.txt` に1行追加して `make_pattern_table.py` を
再実行すれば、その番号の歯抜けは解消される。実際に `种`（U+79CD）は
かつて `chóng` 読み（北宋の武将の姓氏「种」）の用例が無く歯抜けだったが、
史実の人名 `种谔`（Chóng È）をパターンとして追加したことで
`1, 种, zhǒng` → `2, 种, chóng` → `3, 种, zhòng` と連続するようになった。

この `order` がフォント内の `ss` スロット番号と直接対応しているため、
`make_pattern_table.py` の `export_pattern_one_table()` を書き換える場合や
手動でこのファイルを編集する場合は、パターンの有無に関わらず
**読み順（merged-mapping-table.txt の並び）に揃えた番号を維持すること**。
連番に詰め直すと GSUB の `ss` 参照とズレて誤った拼音バリアントに
置換される（過去に実際発生した不具合。詳細はコミット
`fix: correct GSUB ss indices to match merged-mapping-table reading order` を参照）。

```text
.
├── NOTE.md
├── phrase_of_exceptional_pattern.txt <- 例外的な置換パターンを含む熟語集（編集可能）  
├── phrase_of_pattern_one.txt         <- 熟語の中で 0~1文字だけ拼音が変化する熟語集（編集可能）  
├── phrase_of_pattern_two.txt         <- 熟語の中で 2文字以上拼音が変化する熟語集（編集可能）
├── phrase_testcase.txt               <- validate_phrase.py が有効的に働くかどうかの確認に使ったテストケース
└── scripts
    ├── check_exsit_duoyinsi_on_word.py
    ├── make_pattern_table.py
    ├── phrase.py
    ├── phrase_holder.py
    ├── pinyin_getter.py
    └── validate_phrase.py
```

# 生成手順

```sh
# 最初に辞書のチェックを行う
$ python validate_phrase.py

# パターンテーブル生成
$ python make_pattern_table.py
```

## make_pattern_table.py の概略

```mermaid
flowchart TB
    classDef noteclass fill:#fff5ad,stroke:#decc93;

    id0["単語の重複がある<br/>validate_phrase.get_duplicate_word()"] -- yes --> 重複を削除する
    id0 -- no --> id1["他の単語に影響するパターンがある<br/>validate_phrase.get_duplicate_pattern_of_word()"]
    id1 -- yes --> id2["
        書き込み先は phrase_of_exceptional_pattern.txt になる

        基本的に小さいパターンに合わせる
        例えば、「阿谀」と「胶阿谀」なら阿谀を残す
    "]
    id1 -- no --> id3["単語中で置き換わる文字（多音字)は2文字以上か<br/>validate_phrase.get_multiple_replacement_by_duoyinzi()"]
    id3 -- yes --> id4["
                        書き込み先はphrase_of_pattern_two.txtになる

                        文脈依存の複数置換のパターンを作成する
                        make_pattern_table.set_pattern_two()
                        
                        #グリフの名前は、'ss01'~'ss20'にする。
                        #ss00 は何も付いていない漢字のグリフにする
                        #ss01は標準的な拼音
                        #ss02 以降は異読的な拼音"]
    id3 -- no --> id5["
                        書き込み先はphrase_of_pattern_one.txtになる

                        置き換わる文字（多音字）に対して、パターンを作成する
                        make_pattern_table.set_pattern_one()

                        ・すべての文字が標準的なピンイン（多音字ではない）のみで構成される単語のとき
                        　　ピンインを複数持つ(かつ今回は標準的なピンインで読む）漢字を見つけ次第入れる。つまり先勝ちで詰めていく。
                        　　もし、すべて単一の読みしか持たない漢字で構成される単語ならパターンテーブルから除外する
                        ・ 単語中に置き換わる文字（多音字)が一文字のとき
                        　　対象の漢字のパターンに単語を入れる

                        "]
    %% フローチャートだとNOTEが使えないので、nodeで代用する
    id2 -.- SEVLNOTE0["
        e.g.:

        [轴子]と[大轴子,压轴子]
        [着手]と[背着手]
        
        例外パターンは下記のように calt feature を記述する
        lookup calt {
        　　ignore sub uni80CC uni7740' uni624B;
        　　sub uni7740' uni624B by d;
        } calt;

        すると
        着手->着手
        背着手->背d手
        のように、それぞれ別パターンに置換される
        "]:::noteclass
    id4 -.- SEVLNOTE1["
        e.g.:

        'lookup_table': {
        　　# 異読的なピンイン
        　　# 数字の並びは、marged-mapping-table.txt の配列の添字順にする。
        　　'lookup_10': {
        　　　　'占' : '占.ss02',
        　　　　'卜' : '卜.ss02',
        　　　　'少' : '少.ss02',
        　　　　'更' : '更.ss02'
        　　}
        }"]:::noteclass
    id4 -.- SEVLNOTE2["
            e.g.:
            
            兴兴头头: xīng/xìng/tou/tóu、
            占卜:zhān/bǔ、吐血:tù/xiě
            
            記述例（2つ以上置き換える）
            lookup calt {
            　　sub A' lookup lookup_0 A' lookup lookup_0 F;
            } calt;

            lookup lookup_0 {
            　　sub A by X;
            } lookup_0;

            すると
            AAF -> XXF
            のように二文字以上置き換えられる
        "]:::noteclass
    %% linkStyle 5 stroke-width:0px;

    style id2 text-align:left
    style id4 text-align:left
    style id5 text-align:left
    style SEVLNOTE0 text-align:left
    style SEVLNOTE1 text-align:left
    style SEVLNOTE2 text-align:left
```
