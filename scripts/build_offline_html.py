"""宅建Webテキストブックをオフライン用の自己完結HTMLに変換するスクリプト

docs/ の公開中ファイル（index.html / style.css / script.js / quiz.json /
marubatsu.json / fillin.json）をソースとし、CSS・JS・JSONをすべてインライン化した
1ファイルの takken-offline.html を生成する。file:// で開いても演習機能が動作する
（fetch をシムして埋め込みJSONを返す）。

出力ファイル:
  - docs/takken-offline.html (GitHub Pages からダウンロード可能)

注意: templates/ と build_takken_textbook.py は一問一答機能が未反映（陳腐化）のため、
本スクリプトは docs/ の現行ファイルのみを参照する。
"""

import json
import re
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
DOCS_DIR = PROJECT_DIR / "docs"

OUTPUT_HTML = DOCS_DIR / "takken-offline.html"

# fetch でロードされる埋め込み対象データ
DATA_FILES = ["quiz.json", "marubatsu.json", "fillin.json"]

FETCH_SHIM_TEMPLATE = """\
// オフライン用 fetch シム: 埋め込みJSONを返し、それ以外は元の fetch に委譲
(function () {
  const OFFLINE_DATA = __OFFLINE_DATA__;
  const origFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, ...args) {
    const key = String(url).split(/[?#]/)[0];
    if (key in OFFLINE_DATA) {
      const data = OFFLINE_DATA[key];
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
      });
    }
    if (origFetch) return origFetch(url, ...args);
    return Promise.reject(new Error("offline: " + url));
  };
})();
"""


def escape_json_payload(s: str) -> str:
    """JSON文字列を <script> 内に埋め込むためのエスケープ。

    JSON.stringify 出力では `<` は文字列値の中にしか現れないため、
    `</` → `<\\/`（JS文字列として同値）の一括置換で安全。
    """
    return s.replace("</", "<\\/").replace("<!--", "<\\!--")


def escape_js_body(s: str) -> str:
    """JSソースを <script> 内に埋め込むためのエスケープ。

    `</` の一括置換は正規表現リテラル（例: /</g）を壊すため、
    HTMLパーサがscript終端と誤認する `</script` と `<!--` のみ置換する。
    どちらも文字列・正規表現内では同値（\\/ と \\! は恒等エスケープ）。
    """
    return re.sub(r"</(script)", r"<\\/\1", s, flags=re.IGNORECASE).replace(
        "<!--", "<\\!--"
    )


def build_fetch_shim() -> str:
    data = {}
    for name in DATA_FILES:
        data[name] = json.loads((DOCS_DIR / name).read_text(encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return FETCH_SHIM_TEMPLATE.replace("__OFFLINE_DATA__", escape_json_payload(payload))


def main():
    html = (DOCS_DIR / "index.html").read_text(encoding="utf-8")
    css = (DOCS_DIR / "style.css").read_text(encoding="utf-8")
    js = (DOCS_DIR / "script.js").read_text(encoding="utf-8")

    # CSS インライン化
    link_tag = '<link rel="stylesheet" href="style.css">'
    assert link_tag in html, "style.css の link タグが見つからない"
    html = html.replace(link_tag, "<style>\n" + css + "\n</style>")

    # JS インライン化（fetch シム → script.js 本文の順）
    script_tag = '<script src="script.js"></script>'
    assert script_tag in html, "script.js の script タグが見つからない"
    inline_js = (
        "<script>\n" + build_fetch_shim() + "\n"
        + escape_js_body(js) + "\n</script>"
    )
    html = html.replace(script_tag, inline_js)

    # オンライン版専用のオフライン版DLリンクを除去
    html = re.sub(
        r'<div class="toc-section">\s*<a [^>]*offline-download[^>]*>.*?</a>\s*</div>\n?',
        "",
        html,
    )

    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"生成完了: {OUTPUT_HTML} ({OUTPUT_HTML.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
