# 資格試験学習資料

宅建士・不動産鑑定士・行政書士の学習資料を統合管理し、NotebookLM に投入するためのプロジェクト。

## 構成

```
materials/
  ├── takken/          # 宅建士（23ファイル: 教材00-18 + 過去問19-22）
  ├── kanteishi/       # 不動産鑑定士（試験概要 + 短答式/ + 論文式/）
  └── gyoseishoshi/    # 行政書士（14ファイル）
data/
  ├── laws/            # e-Gov API から取得した法令原文（37法令・重複排除済み）
  └── standards/       # 不動産鑑定評価基準等（非法令資料）
templates/
  ├── style.css        # テキストブック用 CSS テンプレート
  └── script.js        # テキストブック用 JS テンプレート
docs/
  ├── index.html       # 宅建テキスト（GitHub Pages で公開）
  ├── style.css        # CSS（ビルド時に自動コピー）
  └── script.js        # JS（ビルド時に自動コピー）
scripts/
  ├── fetch_egov.py           # e-Gov 法令取得スクリプト（3試験統合版）
  └── build_takken_textbook.py  # 宅建教材 → HTML テキストブック変換
```

## Web テキストブック

宅建教材を要点整理型の HTML テキストブックとして公開中。

**URL**: https://1minami.github.io/study-materials/

- 全科目 + 過去問演習（23ファイル統合）
- 左サイドバー目次、スクロール追従ハイライト
- スマホ対応（レスポンシブ）、ダークモード対応、印刷対応

### テキストブックの再生成

教材ファイル（`materials/takken/`）またはテンプレート（`templates/`）を更新した場合:

```bash
python scripts/build_takken_textbook.py   # HTML + CSS + JS を生成（docs/ にも自動コピー）
git add docs/ && git commit -m "update textbook" && git push
```

## 使い方

### 法令原文の取得

```bash
cd projects/study-materials
python scripts/fetch_egov.py                       # 全37法令を取得
python scripts/fetch_egov.py --exam takken          # 宅建士関連のみ（15法令）
python scripts/fetch_egov.py --exam kanteishi       # 不動産鑑定士関連のみ（25法令）
python scripts/fetch_egov.py --exam gyoseishoshi    # 行政書士関連のみ（11法令）
python scripts/fetch_egov.py --law 民法             # 特定法令のみ
python scripts/fetch_egov.py --list                 # 取得対象の一覧
```

### NotebookLM への投入

1. `materials/` 配下の学習資料と `data/` 配下の法令原文をコピー
2. NotebookLM で「ソースを追加」→「テキストを貼り付け」
3. 試験ごとに別のノートブックに分けると効果的
