(() => {
  const STORAGE_KEY = "nvatlas-language";
  const supported = new Set(["en", "zh"]);
  const messages = {
    en: {
      brandTagline: "Corpus explorer",
      navOverview: "Overview",
      navNetwork: "Network",
      navTerms: "Context",
      navDistribution: "Distribution",
      navData: "Data",
      navReport: "Learning report",
      navCodebook: "Codebook",
      navAI: "AI use",
      footerProject: "2026R1 Translation Technology in the Age of AI",
      footerSource: "Built from the supplied NVAtlas-AI-Agent.csv",
      filterAllCategories: "All categories",
      filterAllLengths: "All lengths",
      filterAnyCheck: "Any check status",
      filterChecked: "Human-checked: yes",
      filterUnchecked: "Needs review",
      categoryAction: "Action / process nominal",
      categoryResult: "Result / product nominal",
      categoryState: "State / quality nominal",
      categoryRoot: "Lexical / root-coded noun",
      lengthShort: "Short (1-8 words)",
      lengthMedium: "Medium (9-16 words)",
      lengthLong: "Long (17+ words)",
      humanCheckedYes: "Yes",
      humanCheckedNo: "No",
      tableId: "ID",
      tableSourceText: "Source text",
      tableTargetText: "Target text",
      tableKeyPair: "Key pair",
      tableCategory: "Category",
      tableChecked: "Checked",
      tablePrevious: "Previous",
      tableNext: "Next",
      tablePage: "Page {page} of {pages}",
      tableEmpty: "No records match the current search and filters.",
      termBrowserEmpty: "No key terms are available for this selection.",
      contextEmpty: "No contexts match this selection.",
      graphEmpty: "No network edges meet the current controls.",
      results: "{shown} matching records · {total} total",
      loading: "Loading corpus…",
      loadError: "The corpus could not be loaded. Start a local server before opening the site.",
      linkCopied: "Shareable view copied.",
      shareUnavailable: "Copy the browser address to share this view.",
      networkSource: "English key term",
      networkTarget: "Chinese verb correspondence",
      recordedPair: "{count} recorded pair",
      recordedPairs: "{count} recorded pairs",
      showMoreTerms: "Show top {count} terms per side",
      minLinkWeight: "Minimum link weight",
      heatCaption: "Counts: {count} records",
      termClickLabel: "Search for {term}",
      categoryFigure: "Category composition",
      reportBarsEmpty: "Corpus summary is unavailable.",
      totalRecords: "records",
    },
    zh: {
      brandTagline: "語料探索器",
      navOverview: "概覽",
      navNetwork: "網絡圖",
      navTerms: "上下文",
      navDistribution: "分佈",
      navData: "資料表",
      navReport: "學習報告",
      navCodebook: "分類手冊",
      navAI: "AI 使用聲明",
      footerProject: "2026R1 AI 時代的翻譯科技",
      footerSource: "根據提供的 NVAtlas-AI-Agent.csv 建置",
      filterAllCategories: "所有類別",
      filterAllLengths: "所有長度",
      filterAnyCheck: "所有核查狀態",
      filterChecked: "人工核查：是",
      filterUnchecked: "待人工複核",
      categoryAction: "動作／過程名詞化",
      categoryResult: "結果／成品名詞化",
      categoryState: "狀態／性質名詞化",
      categoryRoot: "詞根式名詞",
      lengthShort: "短（1–8 詞）",
      lengthMedium: "中（9–16 詞）",
      lengthLong: "長（17 詞以上）",
      humanCheckedYes: "是",
      humanCheckedNo: "否",
      tableId: "編號",
      tableSourceText: "原文",
      tableTargetText: "譯文",
      tableKeyPair: "關鍵詞對",
      tableCategory: "類別",
      tableChecked: "人工核查",
      tablePrevious: "上一頁",
      tableNext: "下一頁",
      tablePage: "第 {page} 頁，共 {pages} 頁",
      tableEmpty: "目前搜尋及篩選條件沒有相符語料。",
      termBrowserEmpty: "目前選項沒有可用的關鍵詞。",
      contextEmpty: "目前選項沒有相符的上下文。",
      graphEmpty: "目前控制項沒有符合條件的網絡連線。",
      results: "{shown} 筆相符語料 · 共 {total} 筆",
      loading: "正在載入語料…",
      loadError: "無法載入語料。請先啟動本機伺服器再開啟網站。",
      linkCopied: "已複製可分享的檢視連結。",
      shareUnavailable: "請複製瀏覽器網址以分享此檢視。",
      networkSource: "英文關鍵詞",
      networkTarget: "中文動詞對應",
      recordedPair: "記錄 {count} 次",
      recordedPairs: "記錄 {count} 次",
      showMoreTerms: "每邊顯示前 {count} 個詞",
      minLinkWeight: "最低連線次數",
      heatCaption: "共 {count} 筆記錄",
      termClickLabel: "搜尋「{term}」",
      categoryFigure: "類別構成",
      reportBarsEmpty: "無法顯示語料摘要。",
      totalRecords: "筆記錄",
    },
  };

  function normalizeLanguage(value) {
    return supported.has(value) ? value : "en";
  }

  function initialLanguage() {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage) return normalizeLanguage(fromStorage);
    return "en";
  }

  function format(template, values = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : `{${key}}`,
    );
  }

  function t(key, values) {
    const language = normalizeLanguage(document.documentElement.dataset.lang);
    const template = messages[language][key] ?? messages.en[key] ?? key;
    return values ? format(template, values) : template;
  }

  function syncNavigationState() {
    const current = new URLSearchParams(window.location.search);
    const preservedKeys = ["q", "category", "checked", "length", "term", "terms", "links"];
    document.querySelectorAll("a[data-preserve-query]").forEach((link) => {
      const destination = new URL(link.getAttribute("href"), window.location.href);
      preservedKeys.forEach((key) => {
        if (current.has(key)) destination.searchParams.set(key, current.get(key));
        else destination.searchParams.delete(key);
      });
      const query = destination.searchParams.toString();
      link.setAttribute(
        "href",
        `${destination.pathname}${query ? `?${query}` : ""}${destination.hash}`,
      );
    });
  }

  function applyLanguage(value, emit = true) {
    const language = normalizeLanguage(value);
    const oldLanguage = document.documentElement.dataset.lang || "en";
    document.documentElement.dataset.lang = language;
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    localStorage.setItem(STORAGE_KEY, language);

    document.querySelectorAll("[data-en][data-zh]").forEach((element) => {
      element.textContent = element.dataset[language === "en" ? "en" : "zh"];
    });
    document.querySelectorAll("[data-aria-en][data-aria-zh]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        element.dataset[language === "en" ? "ariaEn" : "ariaZh"],
      );
    });
    document.querySelectorAll("[data-placeholder-en][data-placeholder-zh]").forEach((element) => {
      element.setAttribute(
        "placeholder",
        element.dataset[language === "en" ? "placeholderEn" : "placeholderZh"],
      );
    });
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll(".lang-version").forEach((element) => {
      element.hidden = element.dataset.lang !== language;
    });

    const languageSelect = document.getElementById("languageSelect");
    if (languageSelect) languageSelect.value = language;

    const currentPage = document.body.dataset.page;
    document.querySelectorAll(".site-nav a").forEach((link) => {
      if (link.dataset.page === currentPage) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    syncNavigationState();

    if (emit && oldLanguage !== language) {
      document.dispatchEvent(
        new CustomEvent("nvatlas:language", { detail: { language } }),
      );
    }
  }

  window.NVSite = {
    applyLanguage,
    getLanguage: () => normalizeLanguage(document.documentElement.dataset.lang),
    syncNavigationState,
    t,
  };

  applyLanguage(initialLanguage(), false);
  document.addEventListener("DOMContentLoaded", () => {
    const languageSelect = document.getElementById("languageSelect");
    if (languageSelect) {
      languageSelect.addEventListener("change", () => {
        applyLanguage(languageSelect.value);
      });
    }
    syncNavigationState();
  });
})();
