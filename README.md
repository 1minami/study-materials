# 資格試験学習資料

宅建士・不動産鑑定士・行政書士の学習資料を統合管理し、NotebookLM に投入するためのプロジェクト。

## 構成

```
materials/
  ├── takken/          # 宅建士（22ファイル）
  ├── kanteishi/       # 不動産鑑定士（試験概要 + 短答式/ + 論文式/）
  └── gyoseishoshi/    # 行政書士（14ファイル）
data/
  ├── laws/            # e-Gov API から取得した法令原文（37法令・重複排除済み）
  └── standards/       # 不動産鑑定評価基準等（非法令資料）
scripts/
  └── fetch_egov.py    # e-Gov 法令取得スクリプト（3試験統合版）
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
