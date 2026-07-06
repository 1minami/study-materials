"""
e-Gov法令API v2 から資格試験の重要法令の条文テキストを取得し、
NotebookLMに投入しやすいMarkdown形式で保存するスクリプト。

対応試験: 宅建士 / 不動産鑑定士 / 行政書士

--asof で時点指定が可能。資格試験は「試験年の4月1日時点で施行されている法令」が
出題基準のため、試験対策データは --asof <試験年>-04-01 で取得すること。
（旧 API v1 はデータ更新が停止しており、未施行改正の先取り混入もあるため使用しない）

Usage:
    python scripts/fetch_egov.py                              # 全法令を取得（現時点の施行版）
    python scripts/fetch_egov.py --exam takken --asof 2026-04-01  # 宅建士: 2026年度試験基準
    python scripts/fetch_egov.py --exam kanteishi             # 不動産鑑定士関連のみ
    python scripts/fetch_egov.py --exam gyoseishoshi          # 行政書士関連のみ
    python scripts/fetch_egov.py --law 民法                   # 特定の法令のみ取得
    python scripts/fetch_egov.py --list                       # 取得対象の法令一覧を表示

Output:
    data/laws/ ディレクトリに法令ごとのMarkdownファイルを出力
"""

import argparse
import datetime
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import quote

# ============================================================
# 資格試験 重要法令リスト（3試験統合・重複排除済み）
# exams: その法令が関連する試験のリスト
# ============================================================
LAWS = [
    # --- 憲法 ---
    {
        "name": "日本国憲法",
        "law_num": "昭和二十一年憲法",
        "filename": "01-日本国憲法.md",
        "category": "憲法",
        "exams": ["gyoseishoshi"],
    },
    # --- 民法 ---
    {
        "name": "民法",
        "law_num": "明治二十九年法律第八十九号",
        "filename": "02-民法.md",
        "category": "民法",
        "exams": ["takken", "gyoseishoshi"],
    },
    # --- 権利関係 ---
    {
        "name": "借地借家法",
        "law_num": "平成三年法律第九十号",
        "filename": "03-借地借家法.md",
        "category": "権利関係",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "建物の区分所有等に関する法律",
        "law_num": "昭和三十七年法律第六十九号",
        "filename": "04-区分所有法.md",
        "category": "権利関係",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "不動産登記法",
        "law_num": "平成十六年法律第百二十三号",
        "filename": "05-不動産登記法.md",
        "category": "権利関係",
        "exams": ["takken", "kanteishi"],
    },
    # --- 宅建業法 ---
    {
        "name": "宅地建物取引業法",
        "law_num": "昭和二十七年法律第百七十六号",
        "filename": "06-宅地建物取引業法.md",
        "category": "宅建業法",
        "exams": ["takken", "kanteishi"],
    },
    # --- 都市計画・建築 ---
    {
        "name": "都市計画法",
        "law_num": "昭和四十三年法律第百号",
        "filename": "07-都市計画法.md",
        "category": "都市計画・建築",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "建築基準法",
        "law_num": "昭和二十五年法律第二百一号",
        "filename": "08-建築基準法.md",
        "category": "都市計画・建築",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "国土利用計画法",
        "law_num": "昭和四十九年法律第九十二号",
        "filename": "09-国土利用計画法.md",
        "category": "都市計画・建築",
        "exams": ["takken", "kanteishi"],
    },
    # --- 農地・土地利用 ---
    {
        "name": "農地法",
        "law_num": "昭和二十七年法律第二百二十九号",
        "filename": "10-農地法.md",
        "category": "農地・土地利用",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "土地区画整理法",
        "law_num": "昭和二十九年法律第百十九号",
        "filename": "11-土地区画整理法.md",
        "category": "農地・土地利用",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "宅地造成及び特定盛土等規制法",
        "law_num": "昭和三十六年法律第百九十一号",
        "filename": "12-盛土規制法.md",
        "category": "農地・土地利用",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "都市再開発法",
        "law_num": "昭和四十四年法律第三十八号",
        "filename": "13-都市再開発法.md",
        "category": "都市計画・建築",
        "exams": ["kanteishi"],
    },
    {
        "name": "都市緑地法",
        "law_num": "昭和四十八年法律第七十二号",
        "filename": "14-都市緑地法.md",
        "category": "都市計画・建築",
        "exams": ["kanteishi"],
    },
    # --- 税 ---
    {
        "name": "所得税法",
        "law_num": "昭和四十年法律第三十三号",
        "filename": "15-所得税法.md",
        "category": "税",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "印紙税法",
        "law_num": "昭和四十二年法律第二十三号",
        "filename": "16-印紙税法.md",
        "category": "税",
        "exams": ["takken"],
    },
    {
        "name": "登録免許税法",
        "law_num": "昭和四十二年法律第三十五号",
        "filename": "17-登録免許税法.md",
        "category": "税",
        "exams": ["takken", "kanteishi"],
    },
    {
        "name": "地方税法",
        "law_num": "昭和二十五年法律第二百二十六号",
        "filename": "18-地方税法.md",
        "category": "税",
        "exams": ["takken", "kanteishi"],
    },
    # --- 鑑定評価関連 ---
    {
        "name": "不動産の鑑定評価に関する法律",
        "law_num": "昭和三十八年法律第百五十二号",
        "filename": "19-不動産鑑定評価法.md",
        "category": "鑑定評価関連",
        "exams": ["kanteishi"],
    },
    {
        "name": "不動産の鑑定評価に関する法律施行令",
        "law_num": "昭和三十九年政令第五号",
        "filename": "20-不動産鑑定評価法施行令.md",
        "category": "鑑定評価関連",
        "exams": ["kanteishi"],
    },
    {
        "name": "地価公示法",
        "law_num": "昭和四十四年法律第四十九号",
        "filename": "21-地価公示法.md",
        "category": "鑑定評価関連",
        "exams": ["kanteishi"],
    },
    # --- 土地・不動産基本法 ---
    {
        "name": "土地基本法",
        "law_num": "平成元年法律第八十四号",
        "filename": "22-土地基本法.md",
        "category": "土地・不動産基本法",
        "exams": ["kanteishi"],
    },
    {
        "name": "土壌汚染対策法",
        "law_num": "平成十四年法律第五十三号",
        "filename": "23-土壌汚染対策法.md",
        "category": "農地・土地利用",
        "exams": ["kanteishi"],
    },
    # --- 住宅関連 ---
    {
        "name": "住宅の品質確保の促進等に関する法律",
        "law_num": "平成十一年法律第八十一号",
        "filename": "24-品確法.md",
        "category": "宅建・住宅関連",
        "exams": ["kanteishi"],
    },
    {
        "name": "マンションの管理の適正化の推進に関する法律",
        "law_num": "平成十二年法律第百四十九号",
        "filename": "25-マンション管理適正化法.md",
        "category": "宅建・住宅関連",
        "exams": ["kanteishi"],
    },
    {
        "name": "マンションの建替え等の円滑化に関する法律",
        "law_num": "平成十四年法律第七十八号",
        "filename": "26-マンション建替え円滑化法.md",
        "category": "宅建・住宅関連",
        "exams": ["kanteishi"],
    },
    # --- 環境・文化財 ---
    {
        "name": "文化財保護法",
        "law_num": "昭和二十五年法律第二百十四号",
        "filename": "27-文化財保護法.md",
        "category": "環境・文化財",
        "exams": ["kanteishi"],
    },
    {
        "name": "自然公園法",
        "law_num": "昭和三十二年法律第百六十一号",
        "filename": "28-自然公園法.md",
        "category": "環境・文化財",
        "exams": ["kanteishi"],
    },
    # --- 行政法 ---
    {
        "name": "行政手続法",
        "law_num": "平成五年法律第八十八号",
        "filename": "29-行政手続法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "行政不服審査法",
        "law_num": "平成二十六年法律第六十八号",
        "filename": "30-行政不服審査法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "行政事件訴訟法",
        "law_num": "昭和三十七年法律第百三十九号",
        "filename": "31-行政事件訴訟法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "国家賠償法",
        "law_num": "昭和二十二年法律第百二十五号",
        "filename": "32-国家賠償法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "行政代執行法",
        "law_num": "昭和二十三年法律第四十三号",
        "filename": "33-行政代執行法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "地方自治法",
        "law_num": "昭和二十二年法律第六十七号",
        "filename": "34-地方自治法.md",
        "category": "行政法",
        "exams": ["gyoseishoshi"],
    },
    # --- 商法・会社法 ---
    {
        "name": "商法",
        "law_num": "明治三十二年法律第四十八号",
        "filename": "35-商法.md",
        "category": "商法・会社法",
        "exams": ["gyoseishoshi"],
    },
    {
        "name": "会社法",
        "law_num": "平成十七年法律第八十六号",
        "filename": "36-会社法.md",
        "category": "商法・会社法",
        "exams": ["gyoseishoshi"],
    },
    # --- 一般知識 ---
    {
        "name": "個人情報の保護に関する法律",
        "law_num": "平成十五年法律第五十七号",
        "filename": "37-個人情報保護法.md",
        "category": "一般知識",
        "exams": ["gyoseishoshi"],
    },
]

EXAM_NAMES = {
    "takken": "宅建士",
    "kanteishi": "不動産鑑定士",
    "gyoseishoshi": "行政書士",
    "all": "全試験",
}

API_BASE = "https://laws.e-gov.go.jp/api/2"
REQUEST_INTERVAL = 1  # API負荷軽減のため1秒間隔


def filter_by_exam(laws, exam):
    """試験名で法令をフィルタリング"""
    if exam == "all":
        return laws
    return [l for l in laws if exam in l["exams"]]


def _api_get(url: str, accept: str) -> bytes:
    req = Request(url, headers={"User-Agent": "study-materials/1.0", "Accept": accept})
    try:
        with urlopen(req, timeout=120) as resp:
            return resp.read()
    except HTTPError as e:
        print(f"  HTTPError {e.code}: {e.reason}")
        raise
    except URLError as e:
        print(f"  URLError: {e.reason}")
        raise


def resolve_revision(law_num: str, asof: str | None) -> dict:
    """e-Gov法令API v2 で法令番号からリビジョン情報を解決する。

    asof を指定するとその時点で施行されていた版、省略時は現時点の施行版。
    """
    url = f"{API_BASE}/laws?law_num={quote(law_num, safe='')}&response_format=json"
    if asof:
        url += f"&asof={asof}"
    data = json.loads(_api_get(url, "application/json"))
    laws = data.get("laws", [])
    if not laws:
        raise RuntimeError(f"法令が見つかりません: {law_num} (asof={asof})")
    return laws[0]["revision_info"]


def fetch_law_xml(law_num: str, asof: str | None = None) -> tuple:
    """e-Gov法令API v2 から法令XMLを取得し、(XML root, revision_info) を返す。

    注意: 旧 v1 API はデータ更新が停止しており、未施行改正の先取り混入も
    あったため使用しないこと。
    """
    rev = resolve_revision(law_num, asof)
    rev_id = rev["law_revision_id"]
    data = _api_get(f"{API_BASE}/law_data/{rev_id}?response_format=xml", "application/xml")
    return ET.fromstring(data), rev


def extract_text(element) -> str:
    """XML要素からテキストを再帰的に抽出"""
    parts = []
    if element.text:
        parts.append(element.text)
    for child in element:
        parts.append(extract_text(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts)


def xml_to_markdown(root: ET.Element, law_name: str, rev: dict = None, asof: str = None) -> str:
    """法令XMLをMarkdown形式に変換"""
    lines = [f"# {law_name}（条文）\n"]
    lines.append("> e-Gov法令API v2 から自動取得\n")
    if rev:
        fetched = datetime.date.today().isoformat()
        lines.append(f"> 取得日: {fetched} / 時点指定(asof): {asof or '指定なし（現時点の施行版）'}")
        lines.append(f"> リビジョン: {rev.get('law_revision_id', '?')}")
        lines.append(f"> 直近改正: {rev.get('amendment_law_num', '?')}"
                     f"（施行 {rev.get('amendment_enforcement_date', '?')}）\n")

    law_body = root.find(".//LawBody")
    if law_body is None:
        law_body = root.find(".//Law/LawBody")
    if law_body is None:
        law_body = root.find(".//LawFullText//LawBody")

    if law_body is None:
        lines.append("\n（法令本体が見つかりませんでした）\n")
        return "\n".join(lines)

    law_title = law_body.find("LawTitle")
    if law_title is not None:
        lines.append(f"\n## {extract_text(law_title)}\n")

    preamble = law_body.find("Preamble")
    if preamble is not None:
        lines.append("\n### 前文\n")
        lines.append(extract_text(preamble).strip())
        lines.append("")

    main = law_body.find("MainProvision")
    if main is not None:
        lines.extend(process_provision(main))

    suppl = law_body.find("SupplProvision")
    if suppl is not None:
        lines.append("\n---\n")
        lines.append("## 附則（抜粋）\n")
        articles = suppl.findall(".//Article")
        for article in articles[:5]:
            lines.extend(process_article(article))
        if len(articles) > 5:
            lines.append(f"\n（以下、附則は全{len(articles)}条のうち5条まで抜粋）\n")

    return "\n".join(lines)


def process_provision(element) -> list:
    """MainProvision / Part / Chapter 等を再帰的に処理"""
    lines = []

    for child in element:
        tag = child.tag

        if tag == "Part":
            title = child.find("PartTitle")
            num = child.get("Num", "")
            if title is not None:
                lines.append(f"\n## 第{num}編　{extract_text(title)}\n")
            lines.extend(process_provision(child))

        elif tag == "Chapter":
            title = child.find("ChapterTitle")
            num = child.get("Num", "")
            if title is not None:
                lines.append(f"\n### 第{num}章　{extract_text(title)}\n")
            lines.extend(process_provision(child))

        elif tag == "Section":
            title = child.find("SectionTitle")
            num = child.get("Num", "")
            if title is not None:
                lines.append(f"\n#### 第{num}節　{extract_text(title)}\n")
            lines.extend(process_provision(child))

        elif tag == "Subsection":
            title = child.find("SubsectionTitle")
            num = child.get("Num", "")
            if title is not None:
                lines.append(f"\n##### 第{num}款　{extract_text(title)}\n")
            lines.extend(process_provision(child))

        elif tag == "Division":
            title = child.find("DivisionTitle")
            num = child.get("Num", "")
            if title is not None:
                lines.append(f"\n###### 第{num}目　{extract_text(title)}\n")
            lines.extend(process_provision(child))

        elif tag == "Article":
            lines.extend(process_article(child))

        elif tag == "Paragraph":
            lines.extend(process_paragraph(child))

    return lines


def process_article(article) -> list:
    """条を処理"""
    lines = []
    caption = article.find("ArticleCaption")
    title = article.find("ArticleTitle")

    header_parts = []
    if title is not None:
        header_parts.append(f"**{extract_text(title)}**")
    if caption is not None:
        header_parts.append(f"（{extract_text(caption)}）")

    if header_parts:
        lines.append("\n" + "".join(header_parts) + "\n")

    for para in article.findall("Paragraph"):
        lines.extend(process_paragraph(para))

    return lines


def process_paragraph(para) -> list:
    """項を処理"""
    lines = []
    num = para.get("Num", "1")

    sentence = para.find("ParagraphSentence")
    if sentence is not None:
        text = extract_text(sentence).strip()
        if text:
            if num == "1":
                lines.append(f"{text}\n")
            else:
                lines.append(f"**{num}**　{text}\n")

    for item in para.findall("Item"):
        item_title = item.find("ItemTitle")
        item_sentence = item.find("ItemSentence")
        title_text = extract_text(item_title).strip() if item_title is not None else ""
        sent_text = extract_text(item_sentence).strip() if item_sentence is not None else ""
        if title_text or sent_text:
            lines.append(f"- {title_text}　{sent_text}".strip())

        for subitem in item.findall("Subitem1"):
            sub_title = subitem.find("Subitem1Title")
            sub_sentence = subitem.find("Subitem1Sentence")
            st = extract_text(sub_title).strip() if sub_title is not None else ""
            ss = extract_text(sub_sentence).strip() if sub_sentence is not None else ""
            if st or ss:
                lines.append(f"  - {st}　{ss}".strip())

    if lines and not lines[-1].endswith("\n"):
        lines.append("")

    return lines


def save_markdown(content: str, filepath: str):
    """Markdownファイルを保存"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    parser = argparse.ArgumentParser(
        description="e-Gov法令APIから資格試験の重要法令を取得（宅建士・不動産鑑定士・行政書士）"
    )
    parser.add_argument("--exam", type=str, default="all",
                        choices=["takken", "kanteishi", "gyoseishoshi", "all"],
                        help="試験を指定してフィルタ（デフォルト: all）")
    parser.add_argument("--law", type=str, help="特定の法令名を指定して取得（部分一致）")
    parser.add_argument("--list", action="store_true", help="取得対象の法令一覧を表示")
    parser.add_argument("--asof", type=str, default=None, metavar="YYYY-MM-DD",
                        help="時点指定。試験対策では試験基準日（例: 2026-04-01）を指定する。省略時は現時点の施行版")
    parser.add_argument("--output", type=str, default="data/laws",
                        help="出力ディレクトリ（デフォルト: data/laws）")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_dir = os.path.join(project_dir, args.output)

    # 試験フィルタ
    targets = filter_by_exam(LAWS, args.exam)
    exam_label = EXAM_NAMES.get(args.exam, args.exam)

    if args.list:
        print(f"取得対象の法令一覧（{exam_label}）:")
        print(f"{'#':<3} {'法令名':<40} {'カテゴリ':<20} {'試験':<25} {'法令番号'}")
        print("-" * 130)
        for i, law in enumerate(targets, 1):
            exams_str = ", ".join(EXAM_NAMES.get(e, e) for e in law["exams"])
            print(f"{i:<3} {law['name']:<40} {law['category']:<20} {exams_str:<25} {law['law_num']}")
        print(f"\n合計: {len(targets)} 件")
        return

    # 法令名フィルタ
    if args.law:
        targets = [l for l in targets if args.law in l["name"]]
        if not targets:
            print(f"'{args.law}' に一致する法令が見つかりません。--list で一覧を確認してください。")
            sys.exit(1)

    print(f"e-Gov法令API v2 から {len(targets)} 件の法令を取得します（{exam_label}）")
    print(f"時点指定(asof): {args.asof or '指定なし（現時点の施行版）'}")
    print(f"出力先: {output_dir}/\n")

    success = 0
    errors = 0

    for i, law in enumerate(targets):
        print(f"[{i+1}/{len(targets)}] {law['name']}（{law['law_num']}）...")

        try:
            xml_root, rev = fetch_law_xml(law["law_num"], asof=args.asof)
            md_content = xml_to_markdown(xml_root, law["name"], rev=rev, asof=args.asof)

            filepath = os.path.join(output_dir, law["filename"])
            save_markdown(md_content, filepath)

            line_count = md_content.count("\n")
            print(f"  [OK] 保存完了: {law['filename']} ({line_count} 行)")
            success += 1

        except Exception as e:
            print(f"  [NG] エラー: {e}")
            errors += 1

        if i < len(targets) - 1:
            time.sleep(REQUEST_INTERVAL)

    print(f"\n完了: {success} 件成功, {errors} 件エラー")
    print(f"出力先: {output_dir}/")

    if success > 0:
        print("\n--- NotebookLMへの投入方法 ---")
        print("1. 出力されたMarkdownファイルの内容をコピー")
        print("2. NotebookLMで「ソースを追加」→「テキストを貼り付け」")
        print("3. 学習資料（materials/）と合わせて使用すると効果的")


if __name__ == "__main__":
    main()
