"""宅建教材MDファイルをHTMLテキストブックに変換するスクリプト

出力ファイル:
  - takken-textbook.html, style.css, script.js (プロジェクトルート)
  - docs/index.html, docs/style.css, docs/script.js (GitHub Pages 用)
"""

import re
import shutil
import markdown
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
MATERIALS_DIR = PROJECT_DIR / "materials" / "takken"
TEMPLATES_DIR = PROJECT_DIR / "templates"
DOCS_DIR = PROJECT_DIR / "docs"

# 出力先
OUTPUT_HTML = PROJECT_DIR / "takken-textbook.html"
OUTPUT_CSS = PROJECT_DIR / "style.css"
OUTPUT_JS = PROJECT_DIR / "script.js"

# ファイル順序とセクション分類
SECTIONS = {
    "試験概要": {
        "files": ["00-試験概要.md"],
        "icon": "📋",
    },
    "権利関係": {
        "files": [
            "01-民法総則.md",
            "02-民法物権.md",
            "03-民法債権.md",
            "04-民法親族相続.md",
            "05-借地借家法.md",
            "06-区分所有法.md",
            "07-不動産登記法.md",
        ],
        "icon": "⚖️",
    },
    "宅建業法": {
        "files": [
            "08-宅建業法①総則・免許.md",
            "09-宅建業法②業務規制.md",
            "10-宅建業法③報酬・監督.md",
        ],
        "icon": "🏢",
    },
    "法令上の制限": {
        "files": [
            "11-都市計画法.md",
            "12-建築基準法.md",
            "13-国土利用計画法.md",
            "14-農地法.md",
            "15-土地区画整理法.md",
            "16-盛土規制法.md",
        ],
        "icon": "📐",
    },
    "税・価格": {
        "files": ["17-税・価格.md"],
        "icon": "💰",
    },
    "免除科目": {
        "files": ["18-免除科目.md"],
        "icon": "📝",
    },
    "過去問演習": {
        "files": [
            "19-過去問-権利関係.md",
            "20-過去問-宅建業法.md",
            "21-過去問-法令上の制限.md",
            "22-過去問-税その他.md",
        ],
        "icon": "✏️",
    },
    "用語索引": {
        "files": ["99-用語索引.md"],
        "icon": "🔍",
    },
}


def slugify(text: str) -> str:
    """日本語テキストをIDに変換"""
    text = re.sub(r"[^\w\s\u3000-\u9fff\uff00-\uffef-]", "", text)
    text = re.sub(r"[\s\u3000]+", "-", text.strip())
    return text


def extract_title(md_text: str) -> str:
    """MDの最初の H1 タイトルを取得"""
    m = re.search(r"^#\s+(.+)$", md_text, re.MULTILINE)
    return m.group(1).strip() if m else "Untitled"


def shift_headings(html: str, level: int = 1) -> str:
    """HTML見出しレベルをシフト (h1->h2, h2->h3, etc.)"""
    for i in range(6, 0, -1):
        new = min(i + level, 6)
        html = html.replace(f"<h{i}>", f"<h{new}>")
        html = html.replace(f"<h{i} ", f"<h{new} ")
        html = html.replace(f"</h{i}>", f"</h{new}>")
    return html


def convert_md_to_html(md_text: str) -> str:
    """Markdown→HTML変換"""
    extensions = ["tables", "fenced_code", "nl2br", "sane_lists", "smarty"]
    return markdown.markdown(md_text, extensions=extensions)


def add_ids_to_headings(html: str, prefix: str) -> str:
    """見出しにIDを付与"""
    counter = [0]

    def replacer(m):
        tag = m.group(1)
        attrs = m.group(2) or ""
        text = m.group(3)
        counter[0] += 1
        slug = f"{prefix}-{counter[0]}"
        return f'<{tag}{attrs} id="{slug}">{text}</{tag}>'

    return re.sub(r"<(h[2-6])(\s[^>]*)?>(.*?)</\1>", replacer, html)


def build_toc(sections: dict) -> str:
    """目次HTMLを生成"""
    toc = '<nav id="toc" class="toc">\n<h2>目次</h2>\n'
    for sec_name, sec_data in sections.items():
        sec_id = slugify(sec_name)
        icon = sec_data["icon"]
        toc += f'<div class="toc-section">\n'
        toc += f'  <a href="#{sec_id}" class="toc-section-title">{icon} {sec_name}</a>\n'
        toc += f"  <ul>\n"
        for fname in sec_data["files"]:
            fpath = MATERIALS_DIR / fname
            if fpath.exists():
                md = fpath.read_text(encoding="utf-8")
                title = extract_title(md)
                chap_id = slugify(fname.replace(".md", ""))
                toc += f'    <li><a href="#{chap_id}">{title}</a></li>\n'
        toc += f"  </ul>\n</div>\n"
    toc += "</nav>\n"
    return toc


def build_body(sections: dict) -> str:
    """本文HTMLを生成"""
    body = ""
    for sec_name, sec_data in sections.items():
        sec_id = slugify(sec_name)
        icon = sec_data["icon"]
        body += f'<section class="part" id="{sec_id}">\n'
        body += f'<h1 class="part-title">{icon} {sec_name}</h1>\n'
        for fname in sec_data["files"]:
            fpath = MATERIALS_DIR / fname
            if not fpath.exists():
                continue
            md = fpath.read_text(encoding="utf-8")
            chap_id = slugify(fname.replace(".md", ""))
            html = convert_md_to_html(md)
            html = shift_headings(html, 1)
            html = add_ids_to_headings(html, chap_id)
            body += f'<article class="chapter" id="{chap_id}">\n'
            body += html
            body += "\n</article>\n"
        body += "</section>\n"
    return body


HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#2563eb">
<title>宅建士試験 要点整理テキスト</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<header class="header">
  <button class="menu-toggle" onclick="toggleSidebar()" aria-label="メニュー">☰</button>
  <h1>宅建士試験 要点整理テキスト</h1>
  <span class="subtitle">全科目 + 過去問演習</span>
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

<button class="back-top" onclick="scrollTo({{top:0,behavior:'smooth'}})" title="トップへ戻る">↑</button>

<script src="script.js"></script>

</body>
</html>
"""


def main():
    # テンプレートファイル読み込み
    css_src = TEMPLATES_DIR / "style.css"
    js_src = TEMPLATES_DIR / "script.js"
    if not css_src.exists():
        raise FileNotFoundError(f"テンプレートが見つかりません: {css_src}")
    if not js_src.exists():
        raise FileNotFoundError(f"テンプレートが見つかりません: {js_src}")

    # HTML 生成
    toc = build_toc(SECTIONS)
    body = build_body(SECTIONS)
    html = HTML_TEMPLATE.format(toc=toc, body=body)

    # プロジェクトルートに出力
    OUTPUT_HTML.write_text(html, encoding="utf-8")
    shutil.copy2(css_src, OUTPUT_CSS)
    shutil.copy2(js_src, OUTPUT_JS)

    # docs/ にコピー（GitHub Pages 用）
    DOCS_DIR.mkdir(exist_ok=True)
    (DOCS_DIR / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(css_src, DOCS_DIR / "style.css")
    shutil.copy2(js_src, DOCS_DIR / "script.js")

    # .nojekyll 維持
    nojekyll = DOCS_DIR / ".nojekyll"
    if not nojekyll.exists():
        nojekyll.touch()

    html_kb = OUTPUT_HTML.stat().st_size / 1024
    css_kb = OUTPUT_CSS.stat().st_size / 1024
    js_kb = OUTPUT_JS.stat().st_size / 1024
    print(f"Generated ({html_kb:.0f} KB + {css_kb:.0f} KB + {js_kb:.0f} KB):")
    print(f"  {OUTPUT_HTML}")
    print(f"  {OUTPUT_CSS}")
    print(f"  {OUTPUT_JS}")
    print(f"Copied to docs/:")
    print(f"  {DOCS_DIR / 'index.html'}")
    print(f"  {DOCS_DIR / 'style.css'}")
    print(f"  {DOCS_DIR / 'script.js'}")


if __name__ == "__main__":
    main()
