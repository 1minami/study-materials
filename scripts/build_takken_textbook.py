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
<meta name="theme-color" content="#2563eb">
<title>宅建士試験 要点整理テキスト</title>
<style>
:root {{
  --bg: #fafaf8;
  --fg: #1a1a1a;
  --fg-muted: #64748b;
  --accent: #2563eb;
  --accent-light: #dbeafe;
  --border: #e5e5e5;
  --card-bg: #ffffff;
  --star: #f59e0b;
  --success: #16a34a;
  --danger: #dc2626;
  --toc-bg: #f8fafc;
  --sidebar-w: 280px;
  --header-h: 56px;
  --content-max-w: 860px;
  --radius: 12px;
}}
@media (prefers-color-scheme: dark) {{
  :root {{
    --bg: #0f172a;
    --fg: #e2e8f0;
    --fg-muted: #94a3b8;
    --accent: #60a5fa;
    --accent-light: #1e3a5f;
    --border: #334155;
    --card-bg: #1e293b;
    --toc-bg: #1e293b;
  }}
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html {{
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--header-h) + 20px);
  -webkit-text-size-adjust: 100%;
}}
body {{
  font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.85;
  font-size: clamp(14px, 0.9vw + 11px, 16px);
  overflow-x: hidden;
}}

/* ========== Header ========== */
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
  gap: 8px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}}
.header h1 {{
  font-size: clamp(14px, 1.8vw + 6px, 18px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}}
.header .subtitle {{
  font-size: 12px;
  opacity: .8;
  white-space: nowrap;
}}
.menu-toggle {{
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  border-radius: 8px;
  flex-shrink: 0;
  transition: background .15s;
  -webkit-tap-highlight-color: transparent;
}}
.menu-toggle:hover {{ background: rgba(255,255,255,.15); }}

/* ========== Sidebar Overlay ========== */
.sidebar-overlay {{
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  z-index: 899;
  opacity: 0;
  transition: opacity .3s ease;
  -webkit-tap-highlight-color: transparent;
}}
.sidebar-overlay.visible {{
  display: block;
  opacity: 1;
}}

/* ========== Sidebar ========== */
.sidebar {{
  position: fixed;
  top: var(--header-h);
  left: 0;
  width: var(--sidebar-w);
  height: calc(100vh - var(--header-h));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--toc-bg);
  border-right: 1px solid var(--border);
  padding: 12px 0 24px;
  z-index: 900;
  transition: transform .3s cubic-bezier(.4,0,.2,1), visibility .3s;
}}
.sidebar .toc h2 {{ display: none; }}
.toc-section {{ margin-bottom: 4px; }}
.toc-section-title {{
  display: block;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: .04em;
  transition: background .15s;
}}
.toc-section-title:hover {{ background: var(--accent-light); }}
.toc-section ul {{
  list-style: none;
  padding: 0;
  margin: 0;
}}
.toc-section li a {{
  display: block;
  padding: 6px 16px 6px 32px;
  font-size: 13px;
  color: var(--fg);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: all .15s;
  min-height: 36px;
  display: flex;
  align-items: center;
}}
.toc-section li a:hover,
.toc-section li a.active {{
  background: var(--accent-light);
  border-left-color: var(--accent);
  color: var(--accent);
}}

/* ========== Main ========== */
.main {{
  margin-left: var(--sidebar-w);
  margin-top: var(--header-h);
  padding: 32px 40px 100px;
}}

/* ========== Parts & Chapters ========== */
.part {{
  max-width: var(--content-max-w);
  margin: 0 auto 48px;
}}
.part-title {{
  font-size: clamp(20px, 2.5vw + 8px, 26px);
  font-weight: 800;
  color: var(--accent);
  border-bottom: 3px solid var(--accent);
  padding-bottom: 8px;
  margin-bottom: 28px;
}}
.chapter {{
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}}
.chapter > h2:first-of-type {{
  font-size: clamp(17px, 1.8vw + 8px, 22px);
  font-weight: 800;
  color: var(--accent);
  border-left: 5px solid var(--accent);
  padding-left: 14px;
  margin-bottom: 20px;
}}

/* ========== Headings ========== */
h3 {{
  font-size: clamp(15px, 1.2vw + 8px, 18px);
  font-weight: 700;
  margin: 24px 0 12px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--border);
}}
h4 {{
  font-size: clamp(14px, 1vw + 8px, 16px);
  font-weight: 700;
  margin: 20px 0 8px;
  color: var(--accent);
}}
h5 {{ font-size: 15px; font-weight: 700; margin: 16px 0 8px; }}
h6 {{ font-size: 14px; font-weight: 700; margin: 12px 0 6px; }}

/* ========== Text ========== */
p {{ margin: 8px 0; }}
blockquote {{
  background: var(--accent-light);
  border-left: 4px solid var(--accent);
  padding: 12px 16px;
  margin: 12px 0;
  border-radius: 0 8px 8px 0;
  font-size: 0.9em;
}}
strong {{ color: var(--accent); font-weight: 700; }}

/* ========== Lists ========== */
ul, ol {{ margin: 8px 0 8px 24px; }}
li {{ margin: 4px 0; }}
li > ul, li > ol {{ margin: 4px 0 4px 20px; }}

/* ========== Tables ========== */
.table-wrap {{
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 12px 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  position: relative;
}}
.table-wrap.scrollable::after {{
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to right, transparent, rgba(0,0,0,.06));
  pointer-events: none;
  border-radius: 0 8px 8px 0;
}}
.table-wrap table {{
  margin: 0;
  border-radius: 0;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: clamp(12px, 0.8vw + 8px, 14px);
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

/* ========== Code ========== */
code {{
  background: rgba(0,0,0,.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: "Consolas", "Monaco", monospace;
}}
pre {{
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.6;
}}
pre code {{ background: none; padding: 0; color: inherit; }}

/* ========== Horizontal rule ========== */
hr {{
  border: none;
  border-top: 2px dashed var(--border);
  margin: 28px 0;
}}

/* ========== Back to top ========== */
.back-top {{
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0,0,0,.2);
  opacity: 0;
  visibility: hidden;
  transform: translateY(12px);
  transition: opacity .25s, visibility .25s, transform .25s;
  z-index: 999;
  -webkit-tap-highlight-color: transparent;
}}
.back-top.visible {{
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}}
.back-top:hover {{ opacity: .85; }}

/* ========== Tablet (<=1024px) ========== */
@media (max-width: 1024px) {{
  :root {{ --sidebar-w: 240px; }}
  .main {{ padding: 28px 28px 80px; }}
  .chapter {{ padding: 24px; }}
  .toc-section-title {{ font-size: 12px; }}
  .toc-section li a {{ padding: 5px 14px 5px 26px; font-size: 12px; }}
}}

/* ========== Mobile (<=768px) ========== */
@media (max-width: 768px) {{
  .menu-toggle {{ display: flex; }}
  .sidebar {{
    transform: translateX(-100%);
    visibility: hidden;
    width: 280px;
    box-shadow: 4px 0 24px rgba(0,0,0,.2);
  }}
  .sidebar.open {{
    transform: translateX(0);
    visibility: visible;
  }}
  .main {{
    margin-left: 0;
    padding: 20px 16px 80px;
  }}
  .chapter {{ padding: 20px 16px; border-radius: 10px; }}
  .header .subtitle {{ display: none; }}
  th, td {{ padding: 8px 10px; }}
  ul, ol {{ margin-left: 18px; }}
  .toc-section li a {{
    padding: 8px 16px 8px 28px;
    font-size: 14px;
    min-height: 44px;
  }}
  .toc-section-title {{
    padding: 10px 16px;
    font-size: 14px;
  }}
}}

/* ========== Small phone (<=480px) ========== */
@media (max-width: 480px) {{
  .header h1 {{ font-size: 14px; }}
  .main {{ padding: 16px 10px 80px; }}
  .chapter {{ padding: 16px 12px; border-radius: 8px; }}
  th, td {{ padding: 6px 8px; }}
  .sidebar {{ width: 260px; }}
  .back-top {{ bottom: 16px; right: 16px; }}
}}

/* ========== Very small phone (<=360px) ========== */
@media (max-width: 360px) {{
  .main {{ padding: 12px 8px 80px; }}
  .chapter {{ padding: 14px 10px; border-radius: 6px; }}
  .header {{ padding: 0 8px; gap: 4px; }}
  .header h1 {{ font-size: 13px; }}
  th, td {{ padding: 4px 6px; }}
  .sidebar {{ width: 240px; }}
}}

/* ========== Landscape phone ========== */
@media (max-width: 768px) and (orientation: landscape) {{
  :root {{ --header-h: 44px; }}
  .back-top {{ bottom: 12px; right: 12px; width: 40px; height: 40px; font-size: 16px; }}
}}

/* ========== Print ========== */
@media print {{
  .header, .sidebar, .back-top, .menu-toggle, .sidebar-overlay {{ display: none !important; }}
  .main {{ margin: 0; padding: 0; max-width: 100%; }}
  .chapter {{ break-inside: avoid; border: none; box-shadow: none; padding: 0; margin-bottom: 16px; }}
  .part {{ break-before: page; }}
  body {{ font-size: 11pt; line-height: 1.6; }}
  table {{ font-size: 10pt; }}
}}
</style>
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

<button class="back-top" onclick="scrollTo({{top:0,behavior:'smooth'}})" title="トップへ戻る">↑</button>

<script>
(function() {{
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const main = document.querySelector('.main');
  const backTop = document.querySelector('.back-top');
  const isMobile = () => window.innerWidth <= 768;

  // --- Sidebar toggle ---
  window.toggleSidebar = function() {{
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }};
  window.closeSidebar = function() {{
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }};

  main.addEventListener('click', () => {{ if (isMobile()) closeSidebar(); }});
  document.addEventListener('keydown', (e) => {{ if (e.key === 'Escape') closeSidebar(); }});

  // Close sidebar on TOC link click (mobile)
  sidebar.querySelectorAll('.toc-section a').forEach(a => {{
    a.addEventListener('click', () => {{ if (isMobile()) closeSidebar(); }});
  }});

  // --- Touch swipe gestures ---
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', (e) => {{
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }}, {{ passive: true }});
  document.addEventListener('touchend', (e) => {{
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dy > 60) return; // vertical swipe, ignore
    if (dx > 60 && touchStartX < 40 && !sidebar.classList.contains('open')) {{
      toggleSidebar();
    }} else if (dx < -60 && sidebar.classList.contains('open')) {{
      closeSidebar();
    }}
  }}, {{ passive: true }});

  // --- Back to top button ---
  window.addEventListener('scroll', () => {{
    backTop.classList.toggle('visible', window.scrollY > 400);
  }}, {{ passive: true }});

  // --- Table horizontal scroll wrapper ---
  function wrapTables() {{
    document.querySelectorAll('.chapter table:not(.wrapped)').forEach(table => {{
      table.classList.add('wrapped');
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
      checkTableOverflow(wrap);
    }});
  }}
  function checkTableOverflow(wrap) {{
    wrap.classList.toggle('scrollable', wrap.scrollWidth > wrap.clientWidth + 2);
  }}
  function recheckAllTables() {{
    document.querySelectorAll('.table-wrap').forEach(checkTableOverflow);
  }}
  wrapTables();
  window.addEventListener('resize', recheckAllTables);

  // --- Active TOC highlight ---
  const tocLinks = document.querySelectorAll('.toc-section li a');
  const chapters = document.querySelectorAll('.chapter');
  const tocObserver = new IntersectionObserver((entries) => {{
    entries.forEach(e => {{
      if (e.isIntersecting) {{
        tocLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector('.toc-section li a[href="#' + e.target.id + '"]');
        if (link) {{
          link.classList.add('active');
          link.scrollIntoView({{ block: 'nearest', behavior: 'smooth' }});
        }}
      }}
    }});
  }}, {{ rootMargin: '-80px 0px -60% 0px', threshold: 0 }});
  chapters.forEach(ch => tocObserver.observe(ch));
}})();
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
