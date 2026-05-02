import pathlib
import re


ROOT = pathlib.Path(".")
OUT = ROOT / "salesforce-adm201-practice.html"


def main() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    data = (ROOT / "questions-data.js").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")

    html = re.sub(r'\s*<link rel="stylesheet" href="\./styles\.css">\s*', "\n    <style>\n" + css + "\n    </style>\n", html)
    html = re.sub(
        r'\s*<script src="\./questions-data\.js"></script>\s*<script src="\./app\.js"></script>\s*',
        "\n    <script>\n" + data + "\n    </script>\n    <script>\n" + app + "\n    </script>\n",
        html,
    )
    OUT.write_text(html, encoding="utf-8")
    print(f"Generated {OUT}")


if __name__ == "__main__":
    main()
