"""一問一答データ（docs/marubatsu.json）に重要度（importance）の既定値を付与するスクリプト

重要度は出題頻度の目安で A（頻出）/ B（標準）/ C（低頻度）の3段階。
script.js の重み付き出題が「重要度 × 誤答履歴」で当選確率を決める。

section 単位の既定値表（SECTION_IMPORTANCE）を持ち、importance が未設定の問題
だけに書き込む。既に importance を持つ問題は触らないので、問題単位で個別に
上書きした値は保持される。表に無い section は DEFAULT_IMPORTANCE（B）。

実行後は scripts/sync_marubatsu.py でルートの複製へ同期すること。
"""

import json
import sys
from collections import Counter
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
SOURCE = PROJECT_DIR / "docs" / "marubatsu.json"

DEFAULT_IMPORTANCE = "B"

_BY_LEVEL = {
    "A": [
        # 権利関係
        "意思表示", "代理", "時効", "物権変動", "抵当権", "契約不適合責任",
        "賃貸借", "不法行為", "相続", "借地借家法", "区分所有法", "不動産登記法",
        # 宅建業法
        "宅建業の定義", "免許制度", "欠格事由", "営業保証金", "保証協会",
        "宅地建物取引士", "重要事項説明", "媒介契約", "37条書面", "クーリング・オフ",
        "8種制限", "報酬", "広告等の規制", "その他の業務規制", "監督処分",
        "住宅瑕疵担保履行法",
        # 法令上の制限
        "都市計画法", "建築基準法", "農地法", "盛土規制法",
    ],
    "B": [
        # 権利関係
        "制限行為能力者", "共有", "債務不履行", "売買", "連帯債務", "保証",
        "債権譲渡", "弁済", "遺言", "遺留分",
        # 宅建業法
        "事務所", "案内所等",
        # 法令上の制限
        "国土利用計画法", "土地区画整理法",
        # 税・価格
        "不動産取得税", "固定資産税", "所得税", "印紙税", "地価公示法", "不動産鑑定評価",
        # 免除科目
        "住宅金融支援機構", "景品表示法", "土地の知識", "建物の知識",
    ],
    "C": [
        # 権利関係
        "条件", "相隣関係", "危険負担", "相殺", "配偶者居住権", "地役権",
        # 税・価格
        "登録免許税",
    ],
}
SECTION_IMPORTANCE = {s: level for level, sections in _BY_LEVEL.items() for s in sections}


def with_importance(q, level):
    """importance を section の直後に差し込んだ新しい dict を返す。"""
    out = {}
    for key, value in q.items():
        out[key] = value
        if key == "section":
            out["importance"] = level
    if "importance" not in out:
        out["importance"] = level
    return out


def main():
    questions = json.loads(SOURCE.read_text(encoding="utf-8"))

    added = 0
    unknown_sections = Counter()
    result = []
    for q in questions:
        if "importance" in q:
            result.append(q)
            continue
        section = q.get("section", "")
        if section not in SECTION_IMPORTANCE:
            unknown_sections[section] += 1
        result.append(with_importance(q, SECTION_IMPORTANCE.get(section, DEFAULT_IMPORTANCE)))
        added += 1

    if added:
        SOURCE.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    print(f"importance 付与: {added} 問（既設定 {len(questions) - added} 問は変更なし）")
    counts = Counter(q["importance"] for q in result)
    print("  " + " / ".join(f"{level}: {counts.get(level, 0)}" for level in "ABC"))
    if unknown_sections:
        print(f"  表に無い section（{DEFAULT_IMPORTANCE} 扱い）:")
        for section, n in unknown_sections.most_common():
            print(f"    {section!r}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
