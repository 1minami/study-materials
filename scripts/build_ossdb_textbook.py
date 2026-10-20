"""OSS-DB Silver 教材MDファイルをHTMLテキストブックに変換するスクリプト

テキスト本文 + 穴埋め演習（4択・一問一答の演習モーダルは持たない）。
MD → HTML の変換処理・穴埋め抽出は build_takken_textbook.py の関数を共用する。

出力ファイル（GitHub Pages 用）:
  - docs/ossdb/index.html, docs/ossdb/style.css, docs/ossdb/script.js, docs/ossdb/fillin.json

  python scripts/build_ossdb_textbook.py
"""

import json
import shutil
from pathlib import Path

from build_takken_textbook import TEMPLATES_DIR, DOCS_DIR, build_toc, build_body, parse_fillin_from_md

PROJECT_DIR = Path(__file__).parent.parent
MATERIALS_DIR = PROJECT_DIR / "materials" / "ossdb"
OUTPUT_DIR = DOCS_DIR / "ossdb"

# ファイル順序とセクション分類（学習計画の順: 一般知識 → SQL → 運用管理）
SECTIONS = {
    "試験概要": {
        "files": ["00-試験概要.md"],
        "icon": "📋",
    },
    "一般知識": {
        "files": ["01-一般知識.md"],
        "icon": "📚",
    },
    "開発/SQL": {
        "files": [
            "02-SQL①定義・更新.md",
            "03-SQL②検索・オブジェクト.md",
            "04-関数・トランザクション.md",
        ],
        "icon": "🧮",
    },
    "運用管理": {
        "files": [
            "05-インストール・標準付属ツール.md",
            "06-設定ファイル.md",
            "07-バックアップ.md",
            "08-運用管理作業.md",
        ],
        "icon": "🛠️",
    },
}

# script.js へ渡す設定。localStorage は github.io 上で宅建版と同一オリジンになるため接頭辞を分ける
TEXTBOOK_CONFIG = '{storagePrefix: "ossdb", ttsChapters: [0, 98]}'

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#2563eb">
<title>OSS-DB Silver 要点整理テキスト</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<header class="header">
  <button class="menu-toggle" onclick="toggleSidebar()" aria-label="メニュー">☰</button>
  <h1>OSS-DB Silver 要点整理テキスト</h1>
  <span class="subtitle">Ver.3.0 / PostgreSQL 14 基準</span>
</header>

<div class="sidebar-overlay" onclick="closeSidebar()"></div>

<aside class="sidebar">
{toc}
</aside>

<main class="main">
{body}
</main>

<aside class="right-sidebar">
  <div class="right-sidebar-title">学習メモ</div>
  <div class="right-sidebar-chapter" id="note-chapter-name">—</div>
  <textarea class="right-sidebar-textarea" id="note-textarea" placeholder="この章のメモを入力..."></textarea>
  <div class="right-sidebar-status" id="note-status"></div>
</aside>

<div class="quiz-overlay" id="fillin-overlay">
  <div class="quiz-modal" onclick="event.stopPropagation()">
    <div class="quiz-header">
      <div class="quiz-title">✍️ 穴埋め演習</div>
      <div class="quiz-progress" id="fillin-progress"></div>
      <button class="quiz-close" onclick="closeFillin()" aria-label="閉じる">✕</button>
    </div>
    <div class="quiz-body" id="fillin-body"></div>
    <div class="quiz-footer">
      <button class="quiz-btn quiz-btn-primary" id="fillin-submit-btn" onclick="submitFillin()" disabled>採点する</button>
      <button class="quiz-btn quiz-btn-primary" id="fillin-next-btn" onclick="nextFillin()" hidden>次の問題 ▶</button>
    </div>
  </div>
</div>

<button class="back-top" onclick="scrollTo({{top:0,behavior:'smooth'}})" title="トップへ戻る">↑</button>

<script>window.TEXTBOOK_CONFIG = {config};</script>
<script src="script.js"></script>

</body>
</html>
"""


def build_fillin_json(sections: dict) -> list:
    """教材本文の太字から穴埋め問題を抽出（試験概要は除外。カテゴリ = セクション名）。

    宅建の用語索引に相当するものは無いため、重要度は見出しの★と数字の有無だけで付く。
    """
    questions = []
    for sec_name, sec in sections.items():
        if sec_name == "試験概要":
            continue
        for fname in sec["files"]:
            md = (MATERIALS_DIR / fname).read_text(encoding="utf-8")
            qs = parse_fillin_from_md(md, fname.replace(".md", ""), sec_name, set())
            print(f"  parsed {len(qs)} fillin from {fname}")
            questions.extend(qs)
    return questions


def main():
    css_src = TEMPLATES_DIR / "style.css"
    js_src = TEMPLATES_DIR / "script.js"

    # 章は学習計画に合わせて順次追加するため、未作成の章・空になるセクションは出さない
    missing = [f for sec in SECTIONS.values() for f in sec["files"] if not (MATERIALS_DIR / f).exists()]
    sections = {}
    for name, sec in SECTIONS.items():
        files = [f for f in sec["files"] if f not in missing]
        if files:
            sections[name] = {**sec, "files": files}

    toc = build_toc(sections, MATERIALS_DIR, launchers=("fillin",))
    # SQL の文字列リテラル（'...'）やオプション（--）を原文のまま見せるため smarty は使わない
    body = build_body(sections, MATERIALS_DIR, smarty=False)
    html = HTML_TEMPLATE.format(toc=toc, body=body, config=TEXTBOOK_CONFIG)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(css_src, OUTPUT_DIR / "style.css")
    shutil.copy2(js_src, OUTPUT_DIR / "script.js")
    fillin = build_fillin_json(sections)
    (OUTPUT_DIR / "fillin.json").write_text(json.dumps(fillin, ensure_ascii=False, indent=2), encoding="utf-8")

    html_kb = (OUTPUT_DIR / "index.html").stat().st_size / 1024
    print(f"Generated {OUTPUT_DIR / 'index.html'} ({html_kb:.0f} KB) + style.css + script.js + fillin.json ({len(fillin)} 問)")
    if missing:
        print(f"  未作成の章（スキップ）: {', '.join(missing)}")


if __name__ == "__main__":
    main()
