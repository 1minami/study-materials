"""宅建教材MDファイルをHTMLテキストブックに変換するスクリプト

出力ファイル:
  - takken-textbook.html, style.css, script.js, quiz.json (プロジェクトルート)
  - docs/index.html, docs/style.css, docs/script.js, docs/quiz.json (GitHub Pages 用)
"""

import re
import json
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
OUTPUT_QUIZ = PROJECT_DIR / "quiz.json"

# 過去問パース対象（カテゴリも保持）
PASTQ_FILES = {
    "19-過去問-権利関係.md": "権利関係",
    "20-過去問-宅建業法.md": "宅建業法",
    "21-過去問-法令上の制限.md": "法令上の制限",
    "22-過去問-税その他.md": "税・その他",
}

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
    toc += '<div class="toc-section">\n'
    toc += '  <a href="#" class="toc-section-title quiz-launcher" onclick="openQuiz();return false;">📝 ランダム問題演習</a>\n'
    toc += '</div>\n'
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

<div class="quiz-overlay" id="quiz-overlay" onclick="closeQuiz(event)">
  <div class="quiz-modal" onclick="event.stopPropagation()">
    <div class="quiz-header">
      <div class="quiz-title">📝 ランダム問題演習</div>
      <div class="quiz-progress" id="quiz-progress"></div>
      <button class="quiz-close" onclick="closeQuiz()" aria-label="閉じる">✕</button>
    </div>
    <div class="quiz-body" id="quiz-body"></div>
    <div class="quiz-footer">
      <button class="quiz-btn quiz-btn-primary" id="quiz-next-btn" onclick="nextQuiz()" disabled>次の問題 ▶</button>
      <button class="quiz-btn" id="quiz-retry-btn" onclick="openQuiz()">もう10問</button>
    </div>
  </div>
</div>

<script src="script.js"></script>

</body>
</html>
"""


PROBLEM_RE = re.compile(
    r"^###\s+(?:問題?([0-9０-９]+(?:[-－][0-9０-９]+)?)\s*[（(]([^）)]+)[）)]"
    r"|【([^】]+)】)\s*$",
    re.MULTILINE,
)
SECTION_RE = re.compile(r"^##\s+(?:[0-9０-９]+\.\s*)?(.+)$", re.MULTILINE)
CHOICE_RE = re.compile(r"^([1-4１-４])[\.．、]\s*(.+?)$", re.MULTILINE)
ANSWER_RE = re.compile(r"\*\*正解[:：]\s*([1-4１-４])(?:.*?)\*\*")
EXPLAIN_RE = re.compile(r"\*\*解説[:：]\*\*\s*\n(.+?)(?=^---|\Z)", re.DOTALL | re.MULTILINE)


def _normalize_digit(s: str) -> int:
    trans = str.maketrans("０１２３４", "01234")
    return int(s.translate(trans))


def parse_quiz_from_md(md_text: str, file_label: str, category: str) -> list:
    """過去問MDから 4択問題を抽出して JSON 化可能なリストを返す。"""
    questions = []
    # まずセクション境界を取得
    section_starts = [(m.start(), m.group(1).strip()) for m in SECTION_RE.finditer(md_text)]

    def section_for(pos: int) -> str:
        current = ""
        for s_pos, name in section_starts:
            if s_pos <= pos:
                current = name
            else:
                break
        return current

    # 問題ブロック切出: 各 "### 問題X-Y" の開始位置 → 次の "### 問題" or "## " or EOF まで
    problem_starts = [(m.start(), m) for m in PROBLEM_RE.finditer(md_text)]
    next_section_starts = [m.start() for m in re.finditer(r"^##\s+", md_text, re.MULTILINE)]

    for i, (start, m) in enumerate(problem_starts):
        if m.group(1):
            prob_id = m.group(1).replace("－", "-")
            source = m.group(2).strip()
        else:
            prob_id = str(i + 1)
            source = m.group(3).strip()
        # ブロック終端
        end = len(md_text)
        if i + 1 < len(problem_starts):
            end = problem_starts[i + 1][0]
        for ns in next_section_starts:
            if start < ns < end:
                end = ns
                break
        block = md_text[start:end]

        # ヘッダ行除去
        body = block.split("\n", 1)[1] if "\n" in block else ""

        # 選択肢抽出（最初の4つ）
        choices_raw = CHOICE_RE.findall(body)
        if len(choices_raw) < 4:
            continue
        choices = []
        for n, txt in choices_raw[:4]:
            num = _normalize_digit(n)
            if num != len(choices) + 1:
                # 番号が連続していない（誤検出）→ スキップ判定
                continue
            choices.append(txt.strip())
        if len(choices) != 4:
            continue

        # 正解抽出
        am = ANSWER_RE.search(body)
        if not am:
            continue
        answer = _normalize_digit(am.group(1))

        # 解説抽出
        em = EXPLAIN_RE.search(body)
        explanation = em.group(1).strip() if em else ""

        # 問題文: ヘッダ直後〜最初の選択肢「1.」直前まで
        first_choice = re.search(r"^[1１][\.．、]", body, re.MULTILINE)
        if not first_choice:
            continue
        question = body[: first_choice.start()].strip()
        # 末尾の空行除去
        question = re.sub(r"\n{2,}", "\n", question).strip()
        if not question:
            continue

        questions.append({
            "id": f"{file_label}-{prob_id}",
            "category": category,
            "section": section_for(start),
            "source": source,
            "question": question,
            "choices": choices,
            "answer": answer,
            "explanation": explanation,
        })
    return questions


def build_quiz_json() -> list:
    """過去問MD 4ファイルから全問題抽出。"""
    all_q = []
    for fname, category in PASTQ_FILES.items():
        fpath = MATERIALS_DIR / fname
        if not fpath.exists():
            print(f"  [warn] missing: {fname}")
            continue
        md = fpath.read_text(encoding="utf-8")
        label = fname.replace(".md", "")
        qs = parse_quiz_from_md(md, label, category)
        print(f"  parsed {len(qs)} questions from {fname}")
        all_q.extend(qs)
    return all_q


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

    # 過去問パース
    print("Parsing past-exam questions...")
    quiz = build_quiz_json()
    quiz_json_str = json.dumps(quiz, ensure_ascii=False, indent=2)

    # プロジェクトルートに出力
    OUTPUT_HTML.write_text(html, encoding="utf-8")
    shutil.copy2(css_src, OUTPUT_CSS)
    shutil.copy2(js_src, OUTPUT_JS)
    OUTPUT_QUIZ.write_text(quiz_json_str, encoding="utf-8")

    # docs/ にコピー（GitHub Pages 用）
    DOCS_DIR.mkdir(exist_ok=True)
    (DOCS_DIR / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(css_src, DOCS_DIR / "style.css")
    shutil.copy2(js_src, DOCS_DIR / "script.js")
    (DOCS_DIR / "quiz.json").write_text(quiz_json_str, encoding="utf-8")

    # .nojekyll 維持
    nojekyll = DOCS_DIR / ".nojekyll"
    if not nojekyll.exists():
        nojekyll.touch()

    html_kb = OUTPUT_HTML.stat().st_size / 1024
    css_kb = OUTPUT_CSS.stat().st_size / 1024
    js_kb = OUTPUT_JS.stat().st_size / 1024
    quiz_kb = OUTPUT_QUIZ.stat().st_size / 1024
    print(f"Generated ({html_kb:.0f} KB + {css_kb:.0f} KB + {js_kb:.0f} KB + quiz {quiz_kb:.0f} KB / {len(quiz)} 問):")
    print(f"  {OUTPUT_HTML}")
    print(f"  {OUTPUT_CSS}")
    print(f"  {OUTPUT_JS}")
    print(f"  {OUTPUT_QUIZ}")
    print(f"Copied to docs/:")
    print(f"  {DOCS_DIR / 'index.html'}")
    print(f"  {DOCS_DIR / 'style.css'}")
    print(f"  {DOCS_DIR / 'script.js'}")
    print(f"  {DOCS_DIR / 'quiz.json'}")


if __name__ == "__main__":
    main()
