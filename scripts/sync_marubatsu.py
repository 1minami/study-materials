"""一問一答データ（marubatsu.json）を docs/ からプロジェクトルートへ同期するスクリプト

一問一答は docs/marubatsu.json が唯一の正（takken-marubatsu スキルの追記先）。
ルートの marubatsu.json は takken-textbook.html をローカルで開いたときに
script.js が相対パスで fetch する複製であり、同期を忘れると内容が乖離する。

出力ファイル:
  - marubatsu.json (プロジェクトルート)

検証に失敗した場合はルートを書き換えずに終了する（exit 1）。
"""

import json
import sys
from collections import Counter
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
SOURCE = PROJECT_DIR / "docs" / "marubatsu.json"
TARGET = PROJECT_DIR / "marubatsu.json"

REQUIRED_FIELDS = ["id", "category", "section", "statement", "answer", "explanation"]
# script.js の絞り込みUIがプールから動的生成するため、表記ゆれは別カテゴリ扱いになる
VALID_CATEGORIES = {"権利関係", "宅建業法", "法令上の制限", "税・価格", "免除科目"}


def validate(questions):
    """問題リストを検証し、エラーメッセージのリストを返す。"""
    errors = []

    if not isinstance(questions, list) or not questions:
        return ["docs/marubatsu.json がリストでない、または空"]

    for i, q in enumerate(questions):
        where = f"[{i}] id={q.get('id', '?')}"
        for field in REQUIRED_FIELDS:
            if field not in q:
                errors.append(f"{where}: 必須フィールド '{field}' が無い")
        if "answer" in q and not isinstance(q["answer"], bool):
            errors.append(f"{where}: answer が bool でない ({q['answer']!r})")
        if q.get("category") not in VALID_CATEGORIES:
            errors.append(f"{where}: category が既定5値でない ({q.get('category')!r})")
        for field in ("statement", "explanation"):
            if not str(q.get(field, "")).strip():
                errors.append(f"{where}: {field} が空")

    dups = [k for k, c in Counter(q.get("id") for q in questions).items() if c > 1]
    if dups:
        errors.append(f"id が重複: {', '.join(map(str, dups))}")

    return errors


def main():
    questions = json.loads(SOURCE.read_text(encoding="utf-8"))

    errors = validate(questions)
    if errors:
        print(f"validation failed ({len(errors)} 件):")
        for e in errors:
            print(f"  - {e}")
        return 1

    before = 0
    if TARGET.exists():
        before = len(json.loads(TARGET.read_text(encoding="utf-8")))

    TARGET.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"synced {SOURCE.name}: docs -> root ({before} -> {len(questions)} 問)")
    for cat, n in Counter(q["category"] for q in questions).most_common():
        print(f"  {cat}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
