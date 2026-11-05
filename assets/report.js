(() => {
  const CATEGORY_LABELS = {
    action_process: "categoryAction",
    result_process: "categoryResult",
    state_quality: "categoryState",
    lexical_root: "categoryRoot",
  };
  const bars = document.getElementById("reportBars");
  let payload;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render() {
    if (!payload || !bars) return;
    const counts = payload.meta.category_counts;
    const maximum = Math.max(...Object.values(counts), 1);
    bars.innerHTML = Object.entries(CATEGORY_LABELS)
      .map(([category, labelKey]) => {
        const count = counts[category] || 0;
        const percent = (count / payload.meta.record_count) * 100;
        return `
          <a
            class="report-bar-row"
            href="distribution.html?category=${encodeURIComponent(category)}"
            aria-label="${escapeHtml(`${window.NVSite.t(labelKey)}: ${count}`)}"
          >
            <span>${escapeHtml(window.NVSite.t(labelKey))}</span>
            <span class="bar-track" aria-hidden="true">
              <span class="bar-fill" style="width:${(count / maximum) * 100}%"></span>
            </span>
            <strong>${count}</strong>
          </a>
        `;
      })
      .join("");

    const records = document.getElementById("reportRecords");
    const pairs = document.getElementById("reportPairs");
    const checked = document.getElementById("reportChecked");
    if (records) records.textContent = payload.meta.record_count.toLocaleString();
    if (pairs) pairs.textContent = payload.meta.unique_sentence_pairs.toLocaleString();
    if (checked) checked.textContent = payload.meta.human_checked_count.toLocaleString();
  }

  async function init() {
    try {
      const response = await fetch("data/corpus.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = await response.json();
      render();
    } catch (error) {
      console.error(error);
      if (bars) {
        bars.innerHTML = `<p>${escapeHtml(window.NVSite.t("reportBarsEmpty"))}</p>`;
      }
    }
  }

  document.addEventListener("nvatlas:language", render);
  init();
})();
