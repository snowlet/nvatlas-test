"""Build the browser-ready corpus and fixed manual-check sample.

The source CSV has no upstream provenance beyond the supplied file. This script
therefore records only traceability that can be verified locally; it does not
invent an original dataset name, URL, or collection date.
"""

from __future__ import annotations

import csv
import json
import random
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = ROOT / "NVAtlas-AI-Agent.csv"
DATA_DIR = ROOT / "data"
CORPUS_JSON = DATA_DIR / "corpus.json"
SPOT_CHECK_CSV = DATA_DIR / "spot-check.csv"
CHECKED_IDS = DATA_DIR / "checked_ids.txt"
SUPPLIED_DATE = "2026-11-05"
SPOT_CHECK_SEED = 2026
ROOT_CODED_EXCEPTIONS = {"chance", "dance", "romance", "trance"}


def classify_nominal(term: str) -> str:
    """Apply the codebook's ordered, form-based decision rules."""
    lowered = term.strip().lower()
    if lowered.endswith(("tion", "sion")):
        return "action_process"
    if lowered.endswith("ment"):
        return "result_process"
    if lowered in ROOT_CODED_EXCEPTIONS:
        return "lexical_root"
    if lowered.endswith(("ance", "ence")):
        return "state_quality"
    return "lexical_root"


def length_band(source_text: str) -> str:
    word_count = len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", source_text))
    if word_count <= 8:
        return "short"
    if word_count <= 16:
        return "medium"
    return "long"


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with SOURCE_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))

    required_columns = {"id", "English", "Chinese", "English_Nominal", "Chinese_Verb"}
    missing_columns = required_columns.difference(source_rows[0].keys() if source_rows else {})
    if missing_columns:
        raise ValueError(f"Missing source columns: {sorted(missing_columns)}")

    pair_counts = Counter((row["English"], row["Chinese"]) for row in source_rows)
    checked_ids = set()
    if CHECKED_IDS.exists():
        checked_ids = {
            line.strip()
            for line in CHECKED_IDS.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }

    records = []
    for row in source_rows:
        record_id = row["id"].strip()
        records.append(
            {
                "id": f"nva-{record_id}",
                "source_id": record_id,
                "source_text": row["English"].strip(),
                "target_text": row["Chinese"].strip(),
                "source": (
                    f"NVAtlas-AI-Agent.csv, record {record_id}, "
                    f"supplied {SUPPLIED_DATE}"
                ),
                "category": classify_nominal(row["English_Nominal"]),
                "human_checked": "yes" if record_id in checked_ids else "no",
                "unit": "sentence pair",
                "key_term_source": row["English_Nominal"].strip(),
                "key_term_target": row["Chinese_Verb"].strip(),
                "source_word_count": len(
                    re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", row["English"])
                ),
                "target_char_count": len(row["Chinese"].strip()),
                "length_band": length_band(row["English"]),
                "duplicate_group_size": pair_counts[(row["English"], row["Chinese"])],
            }
        )

    category_counts = Counter(record["category"] for record in records)
    payload = {
        "meta": {
            "title": "NVAtlas corpus explorer",
            "generated": SUPPLIED_DATE,
            "source_file": SOURCE_CSV.name,
            "record_count": len(records),
            "unique_sentence_pairs": len(pair_counts),
            "duplicate_extra_rows": sum(count - 1 for count in pair_counts.values()),
            "human_checked_count": sum(
                record["human_checked"] == "yes" for record in records
            ),
            "category_counts": dict(sorted(category_counts.items())),
            "spot_check_seed": SPOT_CHECK_SEED,
            "provenance_note": (
                "Upstream corpus name and URL were not included in the supplied "
                "CSV. The local file and row ID are the only verifiable lineage."
            ),
        },
        "records": records,
    }
    CORPUS_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    sample = random.Random(SPOT_CHECK_SEED).sample(source_rows, 50)
    with SPOT_CHECK_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "English",
                "Chinese",
                "English_Nominal",
                "Chinese_Verb",
                "checked",
                "corrected_source_text",
                "corrected_target_text",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(sample)

    print(
        f"Wrote {len(records)} records to {CORPUS_JSON.relative_to(ROOT)} "
        f"({len(pair_counts)} unique pairs); "
        f"wrote {len(sample)} fixed-sample rows to {SPOT_CHECK_CSV.relative_to(ROOT)}."
    )


if __name__ == "__main__":
    main()
