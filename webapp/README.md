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

## 中間ファイル

すべて `tmp/` 以下の JSON（gitignore 済み）:

| パス | 内容 |
|---|---|
| `tmp/projects/<id>/project.json` | プロジェクト状態（フォント・承認・canvas・読み・タスク） |
| `tmp/projects/<id>/fonts/` | アップロードされたフォント |
| `tmp/projects/<id>/glyph_index.json` | グリフ一覧のインデックスキャッシュ |
| `tmp/json/template_*_proj_<id>.json` | otfccdump 由来のテンプレート |
| `outputs/webapp/<id>/<family>.ttf` | ビルド成果物 |

プロジェクト削除時にこれらの成果物も GC されます。

## テスト

```bash
.venv/bin/python -m pytest tests/webapp_api --no-cov
cd webapp/frontend && npx tsc --noEmit && npm run build
```
