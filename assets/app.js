(() => {
  const PAGE_SIZE = 20;
  const CATEGORY_KEYS = [
    "action_process",
    "result_process",
    "state_quality",
    "lexical_root",
  ];
  const LENGTH_KEYS = ["short", "medium", "long"];
  const CATEGORY_LABELS = {
    action_process: "categoryAction",
    result_process: "categoryResult",
    state_quality: "categoryState",
    lexical_root: "categoryRoot",
  };
  const LENGTH_LABELS = {
    short: "lengthShort",
    medium: "lengthMedium",
    long: "lengthLong",
  };
  const TABLE_COLUMNS = [
    { key: "source_id", label: "tableId" },
    { key: "source_text", label: "tableSourceText" },
    { key: "target_text", label: "tableTargetText" },
    { key: "key_term_source", label: "tableKeyPair" },
    { key: "category", label: "tableCategory" },
    { key: "human_checked", label: "tableChecked" },
    { key: "source", label: "footerSource" },
  ];

  const elements = {
    form: document.getElementById("filterForm"),
    search: document.getElementById("searchInput"),
    category: document.getElementById("categoryFilter"),
    checked: document.getElementById("checkedFilter"),
    length: document.getElementById("lengthFilter"),
    resultSummary: document.getElementById("resultSummary"),
    tableSummary: document.getElementById("tableSummary"),
    reset: document.getElementById("resetFilters"),
    share: document.getElementById("shareView"),
    exportCsv: document.getElementById("exportCsv"),
    visibleCount: document.getElementById("visibleCount"),
    termCount: document.getElementById("termCount"),
    targetTermCount: document.getElementById("targetTermCount"),
    categoryCount: document.getElementById("categoryCount"),
    networkSvg: document.getElementById("networkSvg"),
    termLimit: document.getElementById("termLimit"),
    linkLimit: document.getElementById("linkLimit"),
    termLimitOutput: document.getElementById("termLimitOutput"),
    linkLimitOutput: document.getElementById("linkLimitOutput"),
    termBrowser: document.getElementById("termBrowser"),
    contextList: document.getElementById("contextList"),
    clearTerm: document.getElementById("clearTerm"),
    heatmap: document.getElementById("heatmap"),
    tableHead: document.getElementById("tableHead"),
    tableBody: document.getElementById("tableBody"),
    tablePagination: document.getElementById("pagination"),
    toast: document.getElementById("toast"),
    heroRecordCount: document.getElementById("heroRecordCount"),
    heroPairCount: document.getElementById("heroPairCount"),
    heroCheckedCount: document.getElementById("heroCheckedCount"),
  };

  const params = new URLSearchParams(window.location.search);
  const validSet = (value, allowed) => (allowed.includes(value) ? value : "");
  const state = {
    q: params.get("q") || "",
    category: validSet(params.get("category") || "", CATEGORY_KEYS),
    checked: validSet(params.get("checked") || "", ["yes", "no"]),
    length: validSet(params.get("length") || "", LENGTH_KEYS),
    term: params.get("term") || "",
    sort: params.get("sort") || "source_id",
    direction: params.get("dir") === "desc" ? "desc" : "asc",
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    termLimit: Math.min(14, Math.max(4, Number(params.get("terms")) || 8)),
    linkLimit: Math.min(8, Math.max(1, Number(params.get("links")) || 1)),
  };

  let records = [];
  let meta = {};
  let toastTimer;

  function t(key, values) {
    return window.NVSite.t(key, values);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase();
  }

  function categoryLabel(category) {
    return t(CATEGORY_LABELS[category] || category);
  }

  function lengthLabel(length) {
    return t(LENGTH_LABELS[length] || length);
  }

  function checkedLabel(value) {
    return value === "yes" ? t("humanCheckedYes") : t("humanCheckedNo");
  }

  function selectedTermParts() {
    const separator = state.term.indexOf(":");
    if (separator < 1) return null;
    return {
      type: state.term.slice(0, separator),
      value: state.term.slice(separator + 1),
    };
  }

  function baseMatches(record, includeTerm = true) {
    if (state.category && record.category !== state.category) return false;
    if (state.checked && record.human_checked !== state.checked) return false;
    if (state.length && record.length_band !== state.length) return false;

    if (state.q.trim()) {
      const haystack = normalize(
        [
          record.id,
          record.source_id,
          record.source_text,
          record.target_text,
          record.key_term_source,
          record.key_term_target,
          record.category,
          record.source,
        ].join(" "),
      );
      if (!haystack.includes(normalize(state.q.trim()))) return false;
    }

    const selected = selectedTermParts();
    if (includeTerm && selected) {
      if (selected.type === "en" && record.key_term_source !== selected.value) {
        return false;
      }
      if (selected.type === "zh" && record.key_term_target !== selected.value) {
        return false;
      }
    }
    return true;
  }

  function filteredRecords(includeTerm = true) {
    return records.filter((record) => baseMatches(record, includeTerm));
  }

  function getSortedRecords(subset) {
    const sorted = [...subset];
    const direction = state.direction === "asc" ? 1 : -1;
    const key = state.sort;
    sorted.sort((left, right) => {
      let a = left[key];
      let b = right[key];
      if (key === "source_id") {
        const aNumber = Number(a);
        const bNumber = Number(b);
        if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
          return (aNumber - bNumber) * direction;
        }
      }
      return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    });
    return sorted;
  }

  function syncUrl() {
    const next = new URLSearchParams(window.location.search);
    const stateFields = {
      q: state.q,
      category: state.category,
      checked: state.checked,
      length: state.length,
      term: state.term,
      sort: state.sort === "source_id" ? "" : state.sort,
      dir: state.direction === "asc" ? "" : state.direction,
      page: state.page > 1 ? String(state.page) : "",
      terms: state.termLimit !== 8 ? String(state.termLimit) : "",
      links: state.linkLimit !== 1 ? String(state.linkLimit) : "",
    };
    Object.entries(stateFields).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    window.NVSite.syncNavigationState();
  }

  function buildUrlState() {
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }

  async function copyCurrentView() {
    const url = buildUrlState();
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("linkCopied"));
    } catch {
      showToast(t("shareUnavailable"));
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function setTerm(type, value) {
    state.term = `${type}:${value}`;
    state.q = value;
    state.page = 1;
    elements.search.value = state.q;
    renderAll();
  }

  function openTerm(type, value) {
    const target = new URL("terms.html", window.location.href);
    target.searchParams.set("q", value);
    target.searchParams.set("term", `${type}:${value}`);
    if (state.category) target.searchParams.set("category", state.category);
    if (state.checked) target.searchParams.set("checked", state.checked);
    if (state.length) target.searchParams.set("length", state.length);
    window.location.href = target.href;
  }

  function renderSummary(subset) {
    if (elements.visibleCount) elements.visibleCount.textContent = subset.length.toLocaleString();
    if (elements.termCount) elements.termCount.textContent = new Set(
      subset.map((record) => record.key_term_source),
    ).size.toLocaleString();
    if (elements.targetTermCount) elements.targetTermCount.textContent = new Set(
      subset.map((record) => record.key_term_target),
    ).size.toLocaleString();
    if (elements.categoryCount) elements.categoryCount.textContent = new Set(
      subset.map((record) => record.category),
    ).size.toLocaleString();

    const summary = t("results", {
      shown: subset.length.toLocaleString(),
      total: records.length.toLocaleString(),
    });
    if (elements.resultSummary) elements.resultSummary.textContent = summary;
    if (elements.tableSummary) elements.tableSummary.textContent = summary;
  }

  function topCounts(values, limit) {
    const counts = new Map();
    values.forEach((value) => {
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit);
  }

  function renderNetwork(subset) {
    if (!elements.networkSvg) return;
    elements.termLimitOutput.textContent = state.termLimit;
    elements.linkLimitOutput.textContent = state.linkLimit;
    elements.termLimit.value = state.termLimit;
    elements.linkLimit.value = state.linkLimit;

    const sourceTerms = topCounts(
      subset.map((record) => record.key_term_source),
      state.termLimit,
    );
    const targetTerms = topCounts(
      subset.map((record) => record.key_term_target),
      state.termLimit,
    );
    const sourceSet = new Set(sourceTerms.map(([term]) => term));
    const targetSet = new Set(targetTerms.map(([term]) => term));
    const edgeCounts = new Map();

    subset.forEach((record) => {
      if (
        !sourceSet.has(record.key_term_source) ||
        !targetSet.has(record.key_term_target)
      ) {
        return;
      }
      const key = `${record.key_term_source}\u0000${record.key_term_target}`;
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    });

    const edges = [...edgeCounts.entries()]
      .map(([key, count]) => {
        const [source, target] = key.split("\u0000");
        return { source, target, count };
      })
      .filter((edge) => edge.count >= state.linkLimit)
      .sort((left, right) => right.count - left.count);

    if (!edges.length) {
      elements.networkSvg.innerHTML = `
        <text x="410" y="255" text-anchor="middle" fill="currentColor" opacity=".65">
          ${escapeHtml(t("graphEmpty"))}
        </text>
      `;
      return;
    }

    const rowCount = Math.max(sourceTerms.length, targetTerms.length);
    const width = 820;
    const height = Math.max(430, 72 + rowCount * 38);
    const top = 66;
    const step = rowCount > 1 ? (height - top - 38) / (rowCount - 1) : 0;
    const leftX = 172;
    const rightX = width - 172;
    const sourcePositions = new Map(
      sourceTerms.map(([term, count], index) => [
        term,
        { x: leftX, y: top + index * step, count },
      ]),
    );
    const targetPositions = new Map(
      targetTerms.map(([term, count], index) => [
        term,
        { x: rightX, y: top + index * step, count },
      ]),
    );

    const edgeMarkup = edges
      .map((edge) => {
        const start = sourcePositions.get(edge.source);
        const end = targetPositions.get(edge.target);
        if (!start || !end) return "";
        const bend = Math.max(70, (end.x - start.x) * 0.44);
        return `
          <path
            class="network-edge"
            d="M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}"
            stroke-width="${Math.min(1 + edge.count * 1.2, 7)}"
          >
            <title>${escapeHtml(edge.source)} → ${escapeHtml(edge.target)}: ${edge.count}</title>
          </path>
        `;
      })
      .join("");

    const nodeMarkup = (items, positions, type) =>
      items
        .map(([term, count]) => {
          const point = positions.get(term);
          const radius = Math.min(5 + Math.sqrt(count), 11);
          const anchor = type === "en" ? "end" : "start";
          const textX = type === "en" ? point.x - radius - 8 : point.x + radius + 8;
          const className = type === "en" ? "network-node source" : "network-node target";
          return `
            <g
              class="${className}"
              role="button"
              tabindex="0"
              data-term-type="${type}"
              data-term-value="${escapeHtml(term)}"
              aria-label="${escapeHtml(t("termClickLabel", { term }))}"
            >
              <circle cx="${point.x}" cy="${point.y}" r="${radius}"></circle>
              <text x="${textX}" y="${point.y + 4}" text-anchor="${anchor}">
                ${escapeHtml(term)}
              </text>
              <title>${escapeHtml(term)} · ${escapeHtml(t("recordedPairs", { count }))}</title>
            </g>
          `;
        })
        .join("");

    elements.networkSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    elements.networkSvg.innerHTML = `
      <text class="network-column-label" x="${leftX}" y="24" text-anchor="end">${escapeHtml(t("networkSource"))}</text>
      <text class="network-column-label" x="${rightX}" y="24" text-anchor="start">${escapeHtml(t("networkTarget"))}</text>
      ${edgeMarkup}
      ${nodeMarkup(sourceTerms, sourcePositions, "en")}
      ${nodeMarkup(targetTerms, targetPositions, "zh")}
    `;
  }

  function renderTermBrowser(subset) {
    if (!elements.termBrowser) return;
    const sourceTerms = topCounts(
      subset.map((record) => record.key_term_source),
      6,
    );
    const targetTerms = topCounts(
      subset.map((record) => record.key_term_target),
      6,
    );
    const items = [
      ...sourceTerms.map(([term, count]) => ({ type: "en", term, count })),
      ...targetTerms.map(([term, count]) => ({ type: "zh", term, count })),
    ];

    if (!items.length) {
      elements.termBrowser.innerHTML = `<span class="result-summary">${escapeHtml(t("termBrowserEmpty"))}</span>`;
      return;
    }

    elements.termBrowser.innerHTML = items
      .map((item) => {
        const isActive =
          state.term === `${item.type}:${item.term}` ||
          (!state.term && normalize(state.q) === normalize(item.term));
        return `
          <button
            class="term-chip${isActive ? " is-active" : ""}"
            type="button"
            data-term-type="${item.type}"
            data-term-value="${escapeHtml(item.term)}"
            aria-label="${escapeHtml(t("termClickLabel", { term: item.term }))}"
          >
            ${item.type === "en" ? "EN" : "中"} · ${escapeHtml(item.term)} · ${item.count}
          </button>
        `;
      })
      .join("");
  }

  function highlightedText(text, query) {
    const safeText = escapeHtml(text);
    const cleanQuery = query.trim();
    if (!cleanQuery) return safeText;
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safeText.replace(new RegExp(`(${escapedQuery})`, "gi"), "<mark>$1</mark>");
  }

  function renderContext(subset) {
    if (!elements.contextList) return;
    const selected = selectedTermParts();
    const query = selected?.value || state.q.trim();
    const contexts = subset.slice(0, 8);
    if (!contexts.length) {
      elements.contextList.innerHTML = `<div class="viz-empty">${escapeHtml(t("contextEmpty"))}</div>`;
      return;
    }

    elements.contextList.innerHTML = contexts
      .map(
        (record) => `
          <article class="context-item">
            <span class="context-id">${escapeHtml(record.source_id)} · ${escapeHtml(record.key_term_source)} → ${escapeHtml(record.key_term_target)}</span>
            <p class="context-en">${highlightedText(record.source_text, query)}</p>
            <p class="context-zh">${highlightedText(record.target_text, query)}</p>
          </article>
        `,
      )
      .join("");
  }

  function renderHeatmap(subset) {
    if (!elements.heatmap) return;
    const counts = new Map();
    let maximum = 0;
    CATEGORY_KEYS.forEach((category) => {
      LENGTH_KEYS.forEach((length) => {
        const key = `${category}\u0000${length}`;
        counts.set(key, 0);
      });
    });
    subset.forEach((record) => {
      const key = `${record.category}\u0000${record.length_band}`;
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      maximum = Math.max(maximum, count);
    });

    const headers = CATEGORY_KEYS.map(
      (category) =>
        `<div class="heatmap-header">${escapeHtml(categoryLabel(category))}</div>`,
    ).join("");
    const rows = LENGTH_KEYS.map((length) => {
      const cells = CATEGORY_KEYS.map((category) => {
        const count = counts.get(`${category}\u0000${length}`) || 0;
        const heat = maximum ? 0.08 + (count / maximum) * 0.5 : 0.08;
        const active =
          state.category === category && state.length === length
            ? " is-active"
            : "";
        return `
          <button
            class="heat-cell${active}"
            type="button"
            data-category="${category}"
            data-length="${length}"
            style="--heat:${heat}"
            aria-label="${escapeHtml(`${categoryLabel(category)}, ${lengthLabel(length)}, ${t("heatCaption", { count })}`)}"
          >
            <strong>${count}</strong>
            <small>${escapeHtml(t("heatCaption", { count }))}</small>
          </button>
        `;
      }).join("");
      return `
        <div class="heatmap-row-label">${escapeHtml(lengthLabel(length))}</div>
        ${cells}
      `;
    }).join("");

    elements.heatmap.innerHTML = `<div></div>${headers}${rows}`;
  }

  function tableCellContent(record, column) {
    if (column.key === "source_text") {
      return `<div class="source-cell">${escapeHtml(record.source_text)}</div>`;
    }
    if (column.key === "target_text") {
      return `<div class="translation-cell">${escapeHtml(record.target_text)}</div>`;
    }
    if (column.key === "key_term_source") {
      return `
        <button
          class="pair-button"
          type="button"
          data-term-type="en"
          data-term-value="${escapeHtml(record.key_term_source)}"
        >${escapeHtml(record.key_term_source)} → ${escapeHtml(record.key_term_target)}</button>
      `;
    }
    if (column.key === "category") {
      return `<span class="tag">${escapeHtml(categoryLabel(record.category))}</span>`;
    }
    if (column.key === "human_checked") {
      const className = record.human_checked === "yes" ? "tag" : "tag tag-no";
      return `<span class="${className}">${escapeHtml(checkedLabel(record.human_checked))}</span>`;
    }
    return escapeHtml(record[column.key]);
  }

  function renderTable(subset) {
    if (!elements.tableHead) return;
    elements.tableHead.innerHTML = `
      <tr>
        ${TABLE_COLUMNS.map((column) => {
          const active = state.sort === column.key;
          return `
            <th scope="col">
              <button
                class="sort-button"
                type="button"
                data-sort="${column.key}"
                data-sort-active="${active}"
                data-direction="${active ? state.direction : ""}"
              >${escapeHtml(t(column.label))}</button>
            </th>
          `;
        }).join("")}
      </tr>
    `;

    const sorted = getSortedRecords(subset);
    const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const rows = sorted.slice(start, start + PAGE_SIZE);

    if (!rows.length) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="${TABLE_COLUMNS.length}">${escapeHtml(t("tableEmpty"))}</td>
        </tr>
      `;
    } else {
      elements.tableBody.innerHTML = rows
        .map(
          (record) => `
            <tr>
              ${TABLE_COLUMNS.map(
                (column) => `<td>${tableCellContent(record, column)}</td>`,
              ).join("")}
            </tr>
          `,
        )
        .join("");
    }

    elements.tablePagination.innerHTML = `
      <button class="btn btn-small" id="previousPage" type="button" ${state.page <= 1 ? "disabled" : ""}>
        ${escapeHtml(t("tablePrevious"))}
      </button>
      <span>${escapeHtml(t("tablePage", { page: state.page, pages }))}</span>
      <button class="btn btn-small" id="nextPage" type="button" ${state.page >= pages ? "disabled" : ""}>
        ${escapeHtml(t("tableNext"))}
      </button>
    `;
  }

  function renderAll() {
    const subset = filteredRecords();
    renderSummary(subset);
    renderNetwork(subset);
    renderTermBrowser(subset);
    renderContext(subset);
    renderHeatmap(subset);
    renderTable(subset);
    syncUrl();
  }

  function resetFilters() {
    Object.assign(state, {
      q: "",
      category: "",
      checked: "",
      length: "",
      term: "",
      page: 1,
      sort: "source_id",
      direction: "asc",
    });
    if (elements.search) elements.search.value = "";
    if (elements.category) elements.category.value = "";
    if (elements.checked) elements.checked.value = "";
    if (elements.length) elements.length.value = "";
    renderAll();
  }

  function exportCsv() {
    if (!records.length) return;
    const subset = getSortedRecords(filteredRecords());
    const fields = [
      "id",
      "source_text",
      "target_text",
      "source",
      "category",
      "human_checked",
      "unit",
      "key_term_source",
      "key_term_target",
      "length_band",
    ];
    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [
      fields.join(","),
      ...subset.map((record) =>
        fields.map((field) => escapeCsv(record[field] ?? "")).join(","),
      ),
    ];
    const blob = new Blob([`\ufeff${lines.join("\r\n")}\r\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nvatlas-corpus-filtered.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    elements.search?.addEventListener("input", () => {
      state.q = elements.search.value;
      state.term = "";
      state.page = 1;
      renderAll();
    });
    elements.category?.addEventListener("change", () => {
      state.category = elements.category.value;
      state.page = 1;
      renderAll();
    });
    elements.checked?.addEventListener("change", () => {
      state.checked = elements.checked.value;
      state.page = 1;
      renderAll();
    });
    elements.length?.addEventListener("change", () => {
      state.length = elements.length.value;
      state.page = 1;
      renderAll();
    });
    elements.form?.addEventListener("submit", (event) => event.preventDefault());
    elements.reset?.addEventListener("click", resetFilters);
    elements.share?.addEventListener("click", copyCurrentView);
    elements.exportCsv?.addEventListener("click", exportCsv);
    elements.clearTerm?.addEventListener("click", () => {
      state.term = "";
      state.q = "";
      elements.search.value = "";
      state.page = 1;
      renderAll();
    });
    elements.termLimit?.addEventListener("input", () => {
      state.termLimit = Number(elements.termLimit.value);
      renderNetwork(filteredRecords());
      syncUrl();
    });
    elements.linkLimit?.addEventListener("input", () => {
      state.linkLimit = Number(elements.linkLimit.value);
      renderNetwork(filteredRecords());
      syncUrl();
    });

    elements.networkSvg?.addEventListener("click", (event) => {
      const node = event.target.closest("[data-term-type][data-term-value]");
      if (node) openTerm(node.dataset.termType, node.dataset.termValue);
    });
    elements.networkSvg?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const node = event.target.closest("[data-term-type][data-term-value]");
      if (!node) return;
      event.preventDefault();
      openTerm(node.dataset.termType, node.dataset.termValue);
    });
    elements.termBrowser?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term-type][data-term-value]");
      if (button) setTerm(button.dataset.termType, button.dataset.termValue);
    });
    elements.heatmap?.addEventListener("click", (event) => {
      const cell = event.target.closest("[data-category][data-length]");
      if (!cell) return;
      state.category = cell.dataset.category;
      state.length = cell.dataset.length;
      state.page = 1;
      elements.category.value = state.category;
      elements.length.value = state.length;
      renderAll();
    });
    elements.tableHead?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sort]");
      if (!button) return;
      if (state.sort === button.dataset.sort) {
        state.direction = state.direction === "asc" ? "desc" : "asc";
      } else {
        state.sort = button.dataset.sort;
        state.direction = "asc";
      }
      state.page = 1;
      renderAll();
    });
    elements.tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term-type][data-term-value]");
      if (button) openTerm(button.dataset.termType, button.dataset.termValue);
    });
    elements.tablePagination?.addEventListener("click", (event) => {
      if (event.target.closest("#previousPage")) {
        state.page = Math.max(1, state.page - 1);
        renderAll();
      }
      if (event.target.closest("#nextPage")) {
        state.page += 1;
        renderAll();
      }
    });
    document.addEventListener("nvatlas:language", renderAll);
  }

  async function init() {
    if (elements.search) elements.search.value = state.q;
    if (elements.category) elements.category.value = state.category;
    if (elements.checked) elements.checked.value = state.checked;
    if (elements.length) elements.length.value = state.length;
    if (elements.resultSummary) elements.resultSummary.textContent = t("loading");
    bindEvents();

    try {
      const response = await fetch("data/corpus.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      records = payload.records;
      meta = payload.meta;
      if (elements.heroRecordCount) {
        elements.heroRecordCount.textContent = meta.record_count.toLocaleString();
      }
      if (elements.heroPairCount) {
        elements.heroPairCount.textContent = meta.unique_sentence_pairs.toLocaleString();
      }
      if (elements.heroCheckedCount) {
        elements.heroCheckedCount.textContent = meta.human_checked_count.toLocaleString();
      }
      renderAll();
    } catch (error) {
      console.error(error);
      if (elements.resultSummary) elements.resultSummary.textContent = t("loadError");
      if (elements.contextList) {
        elements.contextList.innerHTML = `<div class="viz-empty">${escapeHtml(t("loadError"))}</div>`;
      }
      if (elements.tableBody) {
        elements.tableBody.innerHTML = `
          <tr><td colspan="${TABLE_COLUMNS.length}">${escapeHtml(t("loadError"))}</td></tr>
        `;
      }
      if (elements.networkSvg) {
        elements.networkSvg.innerHTML = `
          <text x="410" y="255" text-anchor="middle" fill="currentColor" opacity=".65">
            ${escapeHtml(t("loadError"))}
          </text>
        `;
      }
    }
  }

  init();
})();
