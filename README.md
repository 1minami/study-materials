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
  ├── script.js        # JS（ビルド時に自動コピー）
  ├── quiz.json        # 過去問データ（ビルド時に自動生成）
  ├── marubatsu.json   # 一問一答データ（docs/ 直接管理）
  ├── fillin.json      # 穴埋め問題データ（ビルド時に自動生成）
  └── takken-offline.html  # オフライン版（build_offline_html.py で生成）
scripts/
  ├── fetch_egov.py           # e-Gov 法令取得スクリプト（3試験統合版）
  ├── build_takken_textbook.py  # 宅建教材 → HTML テキストブック + quiz.json 変換
  └── build_offline_html.py     # docs/ → 自己完結オフラインHTML 変換
```

## Web テキストブック

宅建教材を要点整理型の HTML テキストブックとして公開中。

**URL**: https://1minami.github.io/study-materials/

- 全科目 + 過去問演習（23ファイル統合）
- 左サイドバー目次、スクロール追従ハイライト
- スマホ対応（レスポンシブ）、ダークモード対応、印刷対応
- 章ごとの学習メモ（右サイドバー、`localStorage` 保存）
- **ランダム問題演習**: 過去問128問プールから10問ランダム出題、1問ずつ即時採点+解説表示
- **穴埋め演習**: 教材本文の太字キーワードを空欄化（362問プール、テキスト入力で完全一致判定）

### ランダム問題演習

サイドバー上部「📝 ランダム問題演習」リンクからモーダルを起動。

- ソース: `materials/takken/19-22*.md`（権利関係/宅建業法/法令上の制限/税・その他）
- 出題形式: 4択、全範囲ランダム10問
- 採点: 選択肢クリックで即時正誤判定 → 解説展開 → 「次の問題」で進行 → 最終スコア表示
- データ: ビルド時に `quiz.json` を自動生成（`fetch` でロード）

### 一問一答（○×）

サイドバー上部「⭕ 一問一答」リンクからモーダルを起動。

- データ: `docs/marubatsu.json`（317問、docs/ 直接管理・ビルド対象外）
- 出題形式: カテゴリ絞り込み + 問題数選択（10/20/50/100問）でランダム出題、⭕❌の2択即時採点
- 問題追加: `/takken-marubatsu` スキル（`.claude/skills/takken-marubatsu/`）— 論点提案 → 承認 → 追記 → オフライン版再生成 → push まで対話形式で実行。難問・引っ掛け設計ガイドライン付き

### 穴埋め演習

サイドバー上部「✍️ 穴埋め演習」リンクからモーダルを起動。

- ソース: `materials/takken/00-18*.md`（教材本文全範囲、過去問・索引除外）
- 抽出ルール: 段落内の `**太字**` キーワードを空欄化（長さ 2〜30 文字、純記号除外）
- 出題形式: 全範囲ランダム10問、テキスト入力 → 完全一致判定（NFKC正規化＋空白除去で比較）
- 同一段落内に同じ太字が複数出現 → 全箇所空欄化、1問に集約（1つ入力で全箇所判定）
- 採点: 「採点する」ボタン or Enter → 即時正誤判定 → 不正解時は正解併記 → 「次の問題」で進行 → 最終スコア表示
- データ: ビルド時に `fillin.json` を自動生成（`fetch` でロード）

### テキストブックの再生成

教材ファイル（`materials/takken/`）またはテンプレート（`templates/`）を更新した場合:

```bash
python scripts/build_takken_textbook.py   # HTML + CSS + JS + quiz.json を生成（docs/ にも自動コピー）
git add docs/ && git commit -m "update textbook" && git push
```

> **注意**: 一問一答（`marubatsu.json`）機能は `docs/` 配下に直接実装されており、`templates/` と `build_takken_textbook.py` には未反映。`build_takken_textbook.py` を再実行すると `docs/index.html`・`docs/script.js` が上書きされ一問一答が消えるため、実行前にテンプレートへの反映が必要。

### オフライン版（takken-offline.html）

CSS・JS・演習データ（quiz / 一問一答 / 穴埋め）をすべて 1 ファイルに埋め込んだ自己完結 HTML。ネット接続なしで全機能が動作する（`fetch` をシムして埋め込み JSON を返す）。

```bash
python scripts/build_offline_html.py   # docs/ の現行ファイルから docs/takken-offline.html を生成（約 1MB）
```

- **入手方法**: 公開ページのサイドバー「📥 オフライン版」からダウンロード、または `docs/takken-offline.html` を直接コピー
- **使い方**: スマホ / PC のブラウザでファイルを開くだけ（機内モードでも動作）
- **再生成タイミング**: `docs/` 配下（index.html / script.js / style.css / 各 JSON）を更新したら再実行して commit + push
- 音声回答などネット必須の機能はオフラインでは動作しない

## 使い方

### 法令原文の取得

e-Gov 法令 API **v2** を使用（旧 v1 はデータ更新停止・未施行改正の先取り混入があり使用禁止）。
資格試験は「試験年の4月1日時点で施行されている法令」が出題基準のため、試験対策データは必ず `--asof <試験年>-04-01` を付けて取得する。

```bash
cd projects/study-materials
python scripts/fetch_egov.py --exam takken --asof 2026-04-01   # 宅建士: 2026年度試験基準（15法令）
python scripts/fetch_egov.py                       # 全37法令を取得（現時点の施行版）
python scripts/fetch_egov.py --exam kanteishi       # 不動産鑑定士関連のみ（25法令）
python scripts/fetch_egov.py --exam gyoseishoshi    # 行政書士関連のみ（11法令）
python scripts/fetch_egov.py --law 民法             # 特定法令のみ
python scripts/fetch_egov.py --list                 # 取得対象の一覧
```

各出力ファイルの冒頭に取得日・時点指定（asof）・法令リビジョン・直近改正が記録される。
`data/laws/` は `.gitignore` 済み（ローカル生成物。必要時に再取得する）。

### 法令・教材の鮮度監査

`/study-audit` スキル（`.claude/skills/study-audit/`）で、法令の再取得 → 前年度基準日との差分抽出（= 当年度試験の改正論点）→ `materials/` への反映漏れチェック → 修正までを実行できる。

### NotebookLM への投入

1. `materials/` 配下の学習資料と `data/` 配下の法令原文をコピー
2. NotebookLM で「ソースを追加」→「テキストを貼り付け」
3. 試験ごとに別のノートブックに分けると効果的
