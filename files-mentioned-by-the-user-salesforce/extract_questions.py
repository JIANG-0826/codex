import json
import pathlib
import re
import sys

from pypdf import PdfReader


DOWNLOADS = pathlib.Path.home() / "Downloads"
PDF_GLOB = "Salesforce-ADM-201*.pdf"
OUT = pathlib.Path("questions-data.js")


OFFICIAL_CATEGORIES = {
    "Data and Analytics Management": {"title": "Data and Analytics Management", "weight": 17},
    "Configuration and Setup": {"title": "Configuration and Setup", "weight": 15},
    "Object Manager and Lightning App Builder": {
        "title": "Object Manager and Lightning App Builder",
        "weight": 15,
    },
    "Automation": {"title": "Automation", "weight": 15},
    "Sales and Marketing Applications": {"title": "Sales and Marketing Applications", "weight": 10},
    "Service and Support Applications": {"title": "Service and Support Applications", "weight": 10},
    "Productivity and Collaboration": {"title": "Productivity and Collaboration", "weight": 10},
    "Agentforce AI": {"title": "Agentforce", "weight": 8},
    "Agentforce": {"title": "Agentforce", "weight": 8},
}


def tidy(text: str) -> str:
    text = re.sub(r"店铺：学习小店66", "", text)
    text = re.sub(r"(?m)^\s*Salesforce - ADM-201\s*$", "", text)
    text = re.sub(r"(?m)^\s*\d+ of \d+\s*$", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    pdfs = sorted(DOWNLOADS.glob(PDF_GLOB))
    if not pdfs:
        print(f"No PDF found in {DOWNLOADS} matching {PDF_GLOB}", file=sys.stderr)
        return 1

    reader = PdfReader(str(pdfs[0]))
    full_text = "\n".join(page.extract_text(extraction_mode="layout") or "" for page in reader.pages)
    full_text = re.sub(r"店铺：学习小店66", "", full_text)
    full_text = re.sub(r"(?m)^\s*Salesforce - ADM-201\s*$", "", full_text)
    full_text = re.sub(r"(?m)^\s*\d+ of \d+\s*$", "", full_text)

    question_re = re.compile(
        r"Question #:(\d+)\s*-\s*\[([^\]]+)\]\s*(.*?)(?=\n\s*Question #:\d+\s*-\s*\[|\Z)",
        re.S,
    )
    option_re = re.compile(r"(?ms)^\s*([A-F])\.\s+(.*?)(?=^\s*[A-F]\.\s+|^\s*Answer:)", re.M)

    questions = []
    issues = []

    for sequence, match in enumerate(question_re.finditer(full_text), start=1):
        number = int(match.group(1))
        raw_category = " ".join(match.group(2).split())
        block = match.group(3)

        answer_match = re.search(r"(?m)^\s*Answer:\s*([A-F](?:\s*,\s*[A-F])*)", block)
        explanation_match = re.search(r"(?s)Explanation\s*(.*)", block)
        first_option_match = re.search(r"(?m)^\s*A\.\s+", block)
        if not answer_match or not explanation_match or not first_option_match:
            issues.append({"id": number, "reason": "missing answer, explanation, or option marker"})
            continue

        question_text = tidy(block[: first_option_match.start()])
        options = []
        for option_match in option_re.finditer(block):
            label = option_match.group(1)
            value = tidy(option_match.group(2))
            value = re.sub(r"\s*Answer:.*", "", value).strip()
            options.append({"label": label, "text": value})

        answer = [part.strip() for part in re.split(r",\s*", answer_match.group(1).strip())]
        explanation = tidy(explanation_match.group(1))
        explanation = re.sub(r"(?=Question #:).*", "", explanation).strip()
        official = OFFICIAL_CATEGORIES.get(raw_category, {"title": raw_category, "weight": 0})

        if len(options) < 2:
            issues.append({"id": number, "reason": f"only {len(options)} options parsed"})

        questions.append(
            {
                "id": number,
                "uid": f"q{sequence:03d}",
                "category": official["title"],
                "sourceCategory": raw_category,
                "weight": official["weight"],
                "question": question_text,
                "options": options,
                "answer": answer,
                "explanation": explanation,
            }
        )

    payload = {
        "sourcePdf": "Salesforce-ADM-201 148题.pdf",
        "generatedFromPages": len(reader.pages),
        "officialOutlineSource": "Salesforce Admins blog, Jan 22 2026, exam refresh effective Dec 15 2025",
        "categories": sorted(
            {
                item["category"]: {
                    "title": item["category"],
                    "weight": item["weight"],
                    "count": sum(1 for q in questions if q["category"] == item["category"]),
                }
                for item in questions
            }.values(),
            key=lambda item: (-item["weight"], item["title"]),
        ),
        "questions": questions,
        "parseIssues": issues,
    }

    OUT.write_text(
        "window.ADM201_QUESTION_BANK = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {OUT} with {len(questions)} questions; issues: {len(issues)}")
    if issues:
        print(json.dumps(issues[:10], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
