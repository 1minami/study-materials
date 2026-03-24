"""宅建教材MDファイルを単一HTMLテキストブックに変換するスクリプト"""

import os
import re
import markdown
from pathlib import Path

MATERIALS_DIR = Path(__file__).parent.parent / "materials" / "takken"
OUTPUT_PATH = Path(__file__).parent.parent / "takken-textbook.html"

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
        return f"<{tag}{attrs} id=\"{slug}\">{text}</{tag}>"

    return re.sub(r"<(h[2-6])(\s[^>]*)?>(.*?)</\1>", replacer, html)


def build_toc(sections: dict) -> str:
    """目次HTMLを生成"""
    toc = '<nav id="toc" class="toc">\n<h2>目次</h2>\n'
    for sec_name, sec_data in sections.items():
        sec_id = slugify(sec_name)
        icon = sec_data["icon"]
        toc += f'<div class="toc-section">\n'
        toc += f'  <a href="#{sec_id}" class="toc-section-title">{icon} {sec_name}</a>\n'
        toc += f'  <ul>\n'
        for fname in sec_data["files"]:
            fpath = MATERIALS_DIR / fname
            if fpath.exists():
                md = fpath.read_text(encoding="utf-8")
                title = extract_title(md)
                chap_id = slugify(fname.replace(".md", ""))
                toc += f'    <li><a href="#{chap_id}">{title}</a></li>\n'
        toc += f'  </ul>\n</div>\n'
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
            title = extract_title(md)
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
<title>宅建士試験 要点整理テキスト</title>
<style>
:root {{
  --bg: #fafaf8;
  --fg: #1a1a1a;
  --accent: #2563eb;
  --accent-light: #dbeafe;
  --border: #e5e5e5;
  --card-bg: #ffffff;
  --star: #f59e0b;
  --success: #16a34a;
  --danger: #dc2626;
  --toc-bg: #f1f5f9;
  --sidebar-w: 280px;
  --header-h: 56px;
}}
@media (prefers-color-scheme: dark) {{
  :root {{
    --bg: #0f172a;
    --fg: #e2e8f0;
    --accent: #60a5fa;
    --accent-light: #1e3a5f;
    --border: #334155;
    --card-bg: #1e293b;
    --toc-bg: #1e293b;
  }}
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html {{ scroll-behavior: smooth; scroll-padding-top: calc(var(--header-h) + 16px); }}
body {{
  font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  font-size: 15px;
}}
/* Header */
.header {{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-h);
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 24px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}}
.header h1 {{ font-size: 18px; font-weight: 700; }}
.header .subtitle {{ font-size: 12px; opacity: .85; margin-left: 12px; }}
.menu-toggle {{
  display: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  margin-right: 12px;
}}
/* Sidebar */
.sidebar {{
  position: fixed;
  top: var(--header-h);
  left: 0;
  width: var(--sidebar-w);
  height: calc(100vh - var(--header-h));
  overflow-y: auto;
  background: var(--toc-bg);
  border-right: 1px solid var(--border);
  padding: 16px 0;
  z-index: 900;
  transition: transform .3s ease;
}}
.sidebar .toc h2 {{ display: none; }}
.toc-section {{ margin-bottom: 8px; }}
.toc-section-title {{
  display: block;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: .04em;
}}
.toc-section-title:hover {{ background: var(--accent-light); }}
.toc-section ul {{
  list-style: none;
  padding: 0;
  margin: 0;
}}
.toc-section li a {{
  display: block;
  padding: 4px 20px 4px 36px;
  font-size: 13px;
  color: var(--fg);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: all .15s;
}}
.toc-section li a:hover,
.toc-section li a.active {{
  background: var(--accent-light);
  border-left-color: var(--accent);
  color: var(--accent);
}}
/* Main */
.main {{
  margin-left: var(--sidebar-w);
  margin-top: var(--header-h);
  padding: 32px 40px 80px;
  max-width: 900px;
}}
/* Parts & Chapters */
.part {{ margin-bottom: 48px; }}
.part-title {{
  font-size: 26px;
  font-weight: 800;
  color: var(--accent);
  border-bottom: 3px solid var(--accent);
  padding-bottom: 8px;
  margin-bottom: 32px;
}}
.chapter {{
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}}
.chapter > h2:first-of-type {{
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
  border-left: 5px solid var(--accent);
  padding-left: 14px;
  margin-bottom: 20px;
}}
/* Headings */
h3 {{ font-size: 18px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 4px; border-bottom: 2px solid var(--border); }}
h4 {{ font-size: 16px; font-weight: 700; margin: 20px 0 8px; color: var(--accent); }}
h5 {{ font-size: 15px; font-weight: 700; margin: 16px 0 8px; }}
h6 {{ font-size: 14px; font-weight: 700; margin: 12px 0 6px; }}
/* Text */
p {{ margin: 8px 0; }}
blockquote {{
  background: var(--accent-light);
  border-left: 4px solid var(--accent);
  padding: 12px 16px;
  margin: 12px 0;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
}}
strong {{ color: var(--accent); font-weight: 700; }}
/* Lists */
ul, ol {{ margin: 8px 0 8px 24px; }}
li {{ margin: 4px 0; }}
li > ul, li > ol {{ margin: 4px 0 4px 20px; }}
/* Tables */
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}}
thead {{ background: var(--accent); color: #fff; }}
th {{
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}}
td {{
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}}
tbody tr:nth-child(even) {{ background: rgba(0,0,0,.02); }}
tbody tr:hover {{ background: var(--accent-light); }}
/* Code */
code {{
  background: rgba(0,0,0,.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: "Consolas", "Monaco", monospace;
}}
pre {{
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
}}
pre code {{ background: none; padding: 0; color: inherit; }}
/* Horizontal rule */
hr {{
  border: none;
  border-top: 2px dashed var(--border);
  margin: 28px 0;
}}
/* Star importance markers */
.chapter h3, .chapter h4 {{
  position: relative;
}}
/* Back to top */
.back-top {{
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  display: none;
  z-index: 999;
  transition: opacity .2s;
}}
.back-top:hover {{ opacity: .85; }}
/* Mobile */
@media (max-width: 768px) {{
  .menu-toggle {{ display: block; }}
  .sidebar {{
    transform: translateX(-100%);
    width: 260px;
    box-shadow: 4px 0 20px rgba(0,0,0,.15);
  }}
  .sidebar.open {{ transform: translateX(0); }}
  .main {{ margin-left: 0; padding: 20px 16px 60px; }}
  .chapter {{ padding: 20px 18px; }}
  table {{ font-size: 12px; }}
  th, td {{ padding: 6px 8px; }}
}}
/* Print */
@media print {{
  .header, .sidebar, .back-top, .menu-toggle {{ display: none !important; }}
  .main {{ margin: 0; padding: 0; max-width: 100%; }}
  .chapter {{ break-inside: avoid; border: none; box-shadow: none; padding: 0; margin-bottom: 16px; }}
  .part {{ break-before: page; }}
  body {{ font-size: 11pt; line-height: 1.6; }}
}}
</style>
</head>
<body>

<header class="header">
  <button class="menu-toggle" onclick="toggleSidebar()" aria-label="メニュー">☰</button>
  <h1>宅建士試験 要点整理テキスト</h1>
  <span class="subtitle">全科目 + 過去問演習</span>
</header>

<aside class="sidebar">
{toc}
</aside>

<main class="main">
{body}
</main>

<button class="back-top" onclick="scrollTo({{top:0,behavior:'smooth'}})" title="トップへ戻る">↑</button>

<script>
// Sidebar toggle (mobile)
function toggleSidebar() {{
  document.querySelector('.sidebar').classList.toggle('open');
}}
document.querySelector('.main').addEventListener('click', () => {{
  document.querySelector('.sidebar').classList.remove('open');
}});
// Back to top button
window.addEventListener('scroll', () => {{
  document.querySelector('.back-top').style.display = window.scrollY > 400 ? 'block' : 'none';
}});
// Active TOC highlight
const tocLinks = document.querySelectorAll('.toc-section li a');
const chapters = document.querySelectorAll('.chapter');
const observer = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{
    if (e.isIntersecting) {{
      tocLinks.forEach(l => l.classList.remove('active'));
      const id = e.target.id;
      const link = document.querySelector(`.toc-section li a[href="#${{id}}"]`);
      if (link) {{
        link.classList.add('active');
        link.scrollIntoView({{ block: 'nearest', behavior: 'smooth' }});
      }}
    }}
  }});
}}, {{ rootMargin: '-80px 0px -60% 0px', threshold: 0 }});
chapters.forEach(ch => observer.observe(ch));
</script>

</body>
</html>
"""


def main():
    toc = build_toc(SECTIONS)
    body = build_body(SECTIONS)
    html = HTML_TEMPLATE.format(toc=toc, body=body)
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"Generated: {OUTPUT_PATH}")
    print(f"Size: {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
