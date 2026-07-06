# Mengshen Font Studio (webapp)

拼音フォント生成パイプラインをブラウザから操作するローカル Web アプリ。


## 構成

- `backend/` — FastAPI。既存の `src/refactored` パイプラインを再利用
- `frontend/` — Vite + React 18 + TypeScript + Tailwind CSS（ダークテーマ）

## 必要環境

- Python 3.11+（venv 推奨）と `pip install -e ".[webapp]"`
- Node.js 18+（フロントエンドのビルド用）
- `otfccdump` / `otfccbuild` / `jq`（フォント変換。`brew tap caryll/tap && brew install otfcc-mac64 jq`）

## 起動

```bash
# 初回のみ: フロントエンドをビルド
cd webapp/frontend && npm install && npm run build && cd ../..

# サーバー起動（リポジトリルートから）
./scripts/webapp.sh
# または
.venv/bin/uvicorn webapp.backend.main:app --port 8000
```

http://localhost:8000 を開く。

開発時はフロントエンドを Vite で動かす（`/api` は :8000 にプロキシ）:

```bash
uvicorn webapp.backend.main:app --port 8000 --reload &
cd webapp/frontend && npm run dev   # http://localhost:5173
```

## ワークフロー

1. **フォント選択** — 同梱プリセット（Source Han Serif / Xiaolai）または任意の TTF/OTF をアップロード
2. **ライセンス確認** — name テーブル（nameID 0/7/13/14）を表示し、承認を記録
3. **位置調整** — PinyinCanvas（width/height/base_line/tracking）と重なり回避をスライダーで調整。
   本番の配置計算（`PinyinGlyphGenerator`）をそのまま使った SVG プレビューが即時反映
4. **グリフ一覧** — 全グリフを検索・カテゴリフィルタ付きで閲覧、詳細から読み編集へ
5. **多音字 / GSUB** — 対応多音字の読み組み合わせと rclt (GSUB) テーブルのルールを表示
6. **読みの編集** — 文字ごとの拼音を置換/追加（ビルド時に反映）
7. **ビルド** — テンプレート準備（otfccdump）→ フルビルド（otfccbuild）→ TTF ダウンロード

## プロジェクトごとの保存データ

各プロジェクトは `tmp/projects/<id>/` に自己完結して保存されます（gitignore 済み）:

| パス | 内容 |
|---|---|
| `tmp/projects/<id>/project.json` | プロジェクト状態（フォント選択・ライセンス合意・canvas・読みの変更・タスク） |
| `tmp/projects/<id>/fonts/` | アップロード / 正規化されたフォント |
| `tmp/projects/<id>/json/` | 中間ファイル（テンプレート JSON・ビルド中間の template_output.json） |
| `tmp/projects/<id>/glyph_index.json` | グリフ一覧のインデックスキャッシュ |
| `outputs/webapp/<id>/<family>.ttf` | ビルド成果物 |

ビルド画面の「プロジェクトの保存データ」カードでファイル一覧とサイズを確認できます。
プロジェクト削除でこれらすべて（成果物含む）が削除されます。
旧レイアウト（`tmp/json/*_proj_<id>.json`）のテンプレートは読み取り時にフォールバックされ、
次回の prepare 実行時にプロジェクト配下へ移動されます。

## テスト

```bash
.venv/bin/python -m pytest tests/webapp_api --no-cov
cd webapp/frontend && npx tsc --noEmit && npm run build
```
