# NVAtlas Corpus Explorer

A bilingual English and Traditional Chinese corpus explorer built for the
2026R1 Translation Technology in the Age of AI final project.

## What is included

- Search across English and Chinese sentence pairs.
- Filters for translation category and human-check status.
- Linked network, keyword-in-context, heatmap, and table views.
- Shareable URL state and CSV export of the current table view.
- Learning report, codebook, AI-use declaration, and a fixed 50-row spot-check list.

## Run locally

Browsers do not load the JSON corpus reliably from a direct `file://` URL. Start
a local server from this directory:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>.

## Rebuild the corpus

The supplied `NVAtlas-AI-Agent.csv` remains the source of truth:

```powershell
python scripts/build_corpus.py
```

This creates `data/corpus.json` and a reproducible 50-row sample in
`data/spot-check.csv` using random seed `2026`.

## Human check

All records currently use `human_checked = no`. Compare the 50 sampled records
with the original source, apply any corrections to the source CSV, and add
verified IDs to `data/checked_ids.txt` (one ID per line) before rerunning the
build. The site does not claim that an AI completed a person's required quality
check.

## GitHub Pages

In the repository, open **Settings > Pages**, choose **Deploy from a branch**,
select `main` and `/ (root)`, then save. The expected site URL is
<https://snowlet.github.io/nvatlas-test/>.

Before enabling public GitHub Pages, confirm the original corpus source, its
licence, and whether the supplied sentence pairs may be displayed publicly. The
local build cannot establish those facts from the CSV alone. The attached course
brief is excluded by `.gitignore` and is not needed by the website.
