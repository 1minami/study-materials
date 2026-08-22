"""quiz.json の「正解が1つに定まらない問題」を検出する監査スクリプト。

問題文の設問形式（正しいものはどれか / 誤っているものはどれか 等）と、
解説中の各肢の正誤判定（○×／✓✕／「正しい」「誤り」）を突合し、以下を検出する。

  [A] 正解が複数   … 設問が1つを問うのに、解説上の該当肢が2つ以上（または0）
  [B] 不一致       … answer フィールドと解説の判定が食い違う
  [C] 判定抽出不可 … 解説フォーマットが不揃いで自動判定できない（要目視）

使い方:
    python scripts/audit_quiz.py            # docs/quiz.json を監査
    python scripts/audit_quiz.py <path>     # 任意の quiz.json を監査

[A] または [B] が1件でもあれば exit 1。
"""

import re
import sys
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
DEFAULT_QUIZ = PROJECT_DIR / "docs" / "quiz.json"

# 「誤っているものを選ばせる」設問を示す語。
# 「〜する必要があるものはどれか」「〜に違反するものはどれか」等は、解説側で該当肢を
# ○ と表記するため誤り指摘型には含めない（含めると誤検出になる）。
WRONG_TYPE_MARKERS = ("誤っている", "誤りは", "不適切")
# 各肢の判定記号
OK_MARKS = "○◯✓✔"
NG_MARKS = "✕✗×╳"
OK_WORDS = ("正しい", "適切")
NG_WORDS = ("誤り", "誤って", "不適切")


def extract_marks(explanation: str) -> dict:
    """解説から {肢番号: 'O'|'X'} を抽出する。判定できない行は無視。"""
    marks = {}
    for line in explanation.splitlines():
        s = line.strip().lstrip("-").strip().replace("**", "")
        m = re.match(r"^(?:選択肢|肢)?\s*([1-4])\s*[.：:、]?\s*(.*)$", s)
        if not m:
            continue
        num = int(m.group(1))
        head = m.group(2)[:14]
        if re.search(f"[{OK_MARKS}]", head) or head.startswith(OK_WORDS):
            marks[num] = "O"
        elif re.search(f"[{NG_MARKS}]", head) or head.startswith(NG_WORDS):
            marks[num] = "X"
    return marks


def audit(questions: list) -> tuple:
    ambiguous, mismatch, unparsed = [], [], []
    for q in questions:
        marks = extract_marks(q["explanation"])
        is_wrong_type = any(w in q["question"] for w in WRONG_TYPE_MARKERS)
        label = "誤り" if is_wrong_type else "正しい"
        target_mark = "X" if is_wrong_type else "O"
        hits = sorted(k for k, v in marks.items() if v == target_mark)

        if len(marks) != len(q["choices"]):
            unparsed.append((q, f"判定抽出 {len(marks)}/{len(q['choices'])}"))
        elif len(hits) != 1:
            ambiguous.append((q, f"{label}と判定された肢が {len(hits)} 個 {hits} / answer={q['answer']}"))
        elif hits[0] != q["answer"]:
            mismatch.append((q, f"answer={q['answer']} だが解説では{label}=肢{hits[0]}"))
    return ambiguous, mismatch, unparsed


def report(title: str, rows: list) -> None:
    print(f"\n{title}: {len(rows)} 件")
    for q, note in rows:
        print(f"  {q['id']} | {q['source']} | {note}")


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_QUIZ
    questions = json.loads(path.read_text(encoding="utf-8"))
    ambiguous, mismatch, unparsed = audit(questions)

    print(f"監査対象: {path} ({len(questions)} 問)")
    report("[A] 正解が複数（要修正）", ambiguous)
    report("[B] answer と解説の不一致（要修正）", mismatch)
    report("[C] 判定抽出不可（要目視）", unparsed)

    ng = len(ambiguous) + len(mismatch)
    print(f"\n結果: 要修正 {ng} 件 / 要目視 {len(unparsed)} 件")
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
