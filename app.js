(() => {
  "use strict";

  const els = {
    appSectionButtons: document.querySelectorAll("[data-app-section]"),
    articleCount: document.querySelector("#header-article-count"),
    articleIndex: document.querySelector("#article-index"),
    aiConcepts: document.querySelector("#ai-concepts"),
    aiFacts: document.querySelector("#ai-facts"),
    aiForm: document.querySelector("#ai-form"),
    aiInput: document.querySelector("#ai-input"),
    aiMessage: document.querySelector("#ai-message"),
    aiPanel: document.querySelector("#ai-search-panel"),
    aiQuestions: document.querySelector("#ai-questions"),
    aiResultsCount: document.querySelector("#ai-results-count"),
    aiResultsList: document.querySelector("#ai-results-list"),
    aiResultsView: document.querySelector("#ai-results"),
    aiSubmit: document.querySelector("#ai-submit"),
    backButton: document.querySelector("#back-button"),
    backLabel: document.querySelector("#back-label"),
    categoryFilter: document.querySelector("#category-filter"),
    clearButton: document.querySelector("#search-clear"),
    docCount: document.querySelector("#header-doc-count"),
    documentHeader: document.querySelector("#document-view #document-header"),
    documentList: document.querySelector("#document-list"),
    documentView: document.querySelector("#document-view"),
    exactPanel: document.querySelector("#exact-search-panel"),
    homeContent: document.querySelector("#home-content"),
    homeView: document.querySelector("#home-view"),
    guideCodeButtons: document.querySelectorAll("[data-guide-doc]"),
    guideKoapCount: document.querySelector("#guide-koap-count"),
    guideResultCount: document.querySelector("#guide-result-count"),
    guideScopeButtons: document.querySelectorAll("[data-guide-scope]"),
    guideSearchInput: document.querySelector("#guide-search-input"),
    guideTable: document.querySelector("#guide-table"),
    guideTableBody: document.querySelector("#guide-table-body"),
    guideUkCount: document.querySelector("#guide-uk-count"),
    guideUpdated: document.querySelector("#guide-updated"),
    guideView: document.querySelector("#guide-view"),
    lawContent: document.querySelector("#law-content"),
    navBackdrop: document.querySelector("#nav-backdrop"),
    navToggle: document.querySelector("#nav-toggle"),
    resultsCount: document.querySelector("#results-count"),
    resultsList: document.querySelector("#results-list"),
    resultsView: document.querySelector("#search-results"),
    searchModeButtons: document.querySelectorAll("[data-search-mode]"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
    sidebarCount: document.querySelector("#sidebar-count"),
    topSearchButton: document.querySelector("#document-view #doc-search-button"),
  };

  const state = {
    appSection: "base",
    category: "Все",
    corpus: null,
    currentDocId: null,
    documentReturn: "base",
    aiAnalysis: null,
    guideDocId: "uk",
    guideQuery: "",
    guideScope: "frequent",
    pocketGuide: null,
    query: "",
    searchMode: "exact",
    semanticAnalyzer: null,
  };

  const categoryOrder = ["Все", "Основы", "Кодексы", "ФКЗ", "ФЗ", "Законы Москвы"];
  const numberFormat = new Intl.NumberFormat("ru-RU");

  function pluralForm(count, forms) {
    const value = Math.abs(Number(count)) % 100;
    const last = value % 10;
    if (value > 10 && value < 20) return forms[2];
    if (last === 1) return forms[0];
    if (last > 1 && last < 5) return forms[1];
    return forms[2];
  }

  function formatCorpusDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return String(value || "—");
    return new Intl.DateTimeFormat("ru-RU").format(new Date(Date.UTC(year, month - 1, day)));
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .replace(/[«»„“”"']/g, " ")
      .replace(/[^a-zа-я0-9.\-]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(value, query) {
    const safe = escapeHtml(value);
    const terms = String(query || "")
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 1)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    if (!terms.length) return safe;
    return safe.replace(new RegExp(`(${terms.join("|")})`, "giu"), "<mark>$1</mark>");
  }

  function articleDomId(key) {
    return `article-${String(key).replace(/[^a-zа-я0-9]+/gi, "-")}`;
  }

  function shortDocumentTitle(doc) {
    return doc.title
      .replace(/^Федеральный конституционный закон №\s*\d+-ФКЗ\s*/i, "")
      .replace(/^Федеральный закон №\s*\d+-ФЗ\s*/i, "")
      .replace(/^Закон города Москвы\s*/i, "")
      .replace(/^«|»$/g, "");
  }

  function findDocument(docId) {
    return state.corpus?.documents.find((doc) => doc.id === docId) || null;
  }

  function findArticle(doc, articleReference) {
    const reference = String(articleReference);
    return (
      doc?.articles.find((article) => article.key === reference) ||
      doc?.articles.find((article) => article.number === reference) ||
      null
    );
  }

  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    els.navToggle.setAttribute("aria-expanded", String(open));
  }

  function renderCategoryFilters() {
    const counts = new Map();
    for (const doc of state.corpus.documents) {
      counts.set(doc.category, (counts.get(doc.category) || 0) + 1);
    }

    els.categoryFilter.innerHTML = categoryOrder
      .filter((category) => category === "Все" || counts.has(category))
      .map((category) => {
        const count = category === "Все" ? state.corpus.stats.documents : counts.get(category);
        return `
          <button type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === state.category}">
            ${escapeHtml(category)} · ${count}
          </button>`;
      })
      .join("");
  }

  function renderDocumentList() {
    const documents = state.corpus.documents.filter(
      (doc) => state.category === "Все" || doc.category === state.category,
    );
    const groups = new Map();
    for (const doc of documents) {
      if (!groups.has(doc.category)) groups.set(doc.category, []);
      groups.get(doc.category).push(doc);
    }

    els.sidebarCount.textContent = numberFormat.format(documents.length);
    els.documentList.innerHTML = Array.from(groups.entries())
      .map(
        ([category, docs]) => `
          <section class="document-group">
            <span class="document-group-label">${escapeHtml(category)}</span>
            ${docs
              .map(
                (doc) => `
                  <button
                    class="document-link"
                    type="button"
                    data-doc="${escapeHtml(doc.id)}"
                    title="${escapeHtml(doc.title)}"
                    ${state.currentDocId === doc.id ? 'aria-current="page"' : ""}
                  >
                    <span class="document-badge">${escapeHtml(doc.shortLabel)}</span>
                    <span class="document-link-title">${escapeHtml(shortDocumentTitle(doc))}</span>
                    <span class="document-article-count">${doc.articles.length}</span>
                  </button>`
              )
              .join("")}
          </section>`,
      )
      .join("");
  }

  function renderStats() {
    const { documents, articles } = state.corpus.stats;
    els.docCount.textContent = numberFormat.format(documents);
    els.articleCount.textContent = numberFormat.format(articles);
    els.sidebarCount.textContent = numberFormat.format(documents);
  }

  function makeSnippet(article, tokens) {
    const body = String(article.body || article.title || "").replace(/\s+/g, " ").trim();
    if (!body) return "Открыть статью";
    const normalizedBody = normalize(body);
    let firstMatch = -1;
    for (const token of tokens) {
      const index = normalizedBody.indexOf(token);
      if (index !== -1 && (firstMatch === -1 || index < firstMatch)) firstMatch = index;
    }
    const start = Math.max(0, firstMatch === -1 ? 0 : firstMatch - 95);
    const end = Math.min(body.length, start + 310);
    return `${start > 0 ? "…" : ""}${body.slice(start, end).trim()}${end < body.length ? "…" : ""}`;
  }

  function scoreResult(doc, article, query, tokens) {
    const docText = normalize(`${doc.shortLabel} ${doc.title} ${doc.id}`);
    const titleText = normalize(article.title);
    const bodyText = normalize(article.body);
    const numberText = normalize(`статья ${article.number} ${article.number}`);
    const haystack = `${docText} ${numberText} ${titleText} ${bodyText}`;
    if (!tokens.every((token) => haystack.includes(token))) return null;

    let score = 0;
    if (titleText === query) score += 120;
    if (titleText.startsWith(query)) score += 80;
    if (titleText.includes(query)) score += 50;
    if (numberText.includes(query)) score += 48;
    if (docText.includes(query)) score += 32;
    for (const token of tokens) {
      if (article.number === token) score += 55;
      if (titleText.includes(token)) score += 24;
      else if (bodyText.includes(token)) score += 6;
      if (docText.split(" ").includes(token)) score += 18;
    }
    score -= Math.min(bodyText.length / 40000, 5);
    return score;
  }

  function searchCorpus(rawQuery) {
    const query = normalize(rawQuery);
    const tokens = query.split(" ").filter(Boolean);
    if (!query || !tokens.length) return [];

    const results = [];
    for (const doc of state.corpus.documents) {
      for (const article of doc.articles) {
        const score = scoreResult(doc, article, query, tokens);
        if (score === null) continue;
        results.push({ article, doc, score, snippet: makeSnippet(article, tokens) });
      }
    }
    return results.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, "ru"));
  }

  function renderSearch(rawQuery) {
    state.query = rawQuery;
    els.searchForm.classList.toggle("has-value", Boolean(rawQuery.trim()));

    if (!rawQuery.trim()) {
      els.homeContent.hidden = false;
      els.resultsView.hidden = true;
      els.resultsList.innerHTML = "";
      return;
    }

    els.homeContent.hidden = true;
    els.resultsView.hidden = false;

    const normalizedQuery = normalize(rawQuery);
    if (normalizedQuery.length < 2) {
      els.resultsCount.textContent = "Нужно больше букв";
      els.resultsList.innerHTML = `
        <div class="empty-results">
          <strong>Продолжите запрос</strong>
          <p>Введите хотя бы два символа: например, «обыск» или «УПК 52».</p>
        </div>`;
      return;
    }

    const results = searchCorpus(rawQuery);
    const visibleResults = results.slice(0, 120);
    els.resultsCount.textContent = `${numberFormat.format(results.length)} совпадений`;

    if (!visibleResults.length) {
      els.resultsList.innerHTML = `
        <div class="empty-results">
          <strong>Ничего не найдено</strong>
          <p>Попробуйте название действия, органа или номер статьи.</p>
        </div>`;
      return;
    }

    els.resultsList.innerHTML = visibleResults
      .map(
        ({ doc, article, snippet }) => `
          <button
            class="result-card"
            type="button"
            data-doc="${escapeHtml(doc.id)}"
            data-article="${escapeHtml(article.key)}"
          >
            <span class="result-ref">${escapeHtml(doc.shortLabel)} · ${escapeHtml(article.number)}</span>
            <span class="result-copy">
              <strong>${highlight(article.title || `Статья ${article.number}`, rawQuery)}</strong>
              <small>${escapeHtml(doc.title)}</small>
              <p>${highlight(snippet, rawQuery)}</p>
            </span>
            <span class="result-arrow" aria-hidden="true">→</span>
          </button>`,
      )
      .join("");

    if (results.length > visibleResults.length) {
      els.resultsList.insertAdjacentHTML(
        "beforeend",
        `<div class="empty-results"><p>Показаны первые ${visibleResults.length} результатов. Уточните запрос, чтобы сузить список.</p></div>`,
      );
    }
  }

  function syncSearchViews() {
    const isExact = state.searchMode === "exact";
    els.exactPanel.hidden = !isExact;
    els.aiPanel.hidden = isExact;
    els.resultsView.hidden = !isExact || !state.query.trim();
    els.aiResultsView.hidden = isExact || !state.aiAnalysis;
    els.homeContent.hidden = isExact ? Boolean(state.query.trim()) : Boolean(state.aiAnalysis);
    for (const button of els.searchModeButtons) {
      const active = button.dataset.searchMode === state.searchMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
  }

  function setSearchMode(mode, { focus = true } = {}) {
    const nextMode = mode === "ai" ? "ai" : "exact";
    state.searchMode = nextMode;
    syncSearchViews();
    if (focus) {
      window.requestAnimationFrame(() => {
        (state.searchMode === "ai" ? els.aiInput : els.searchInput).focus();
      });
    }
  }

  function initializeSemanticAnalyzer() {
    if (state.semanticAnalyzer) return true;
    if (!state.corpus) return false;
    try {
      if (!window.LawSemanticSearch?.createAnalyzer) {
        throw new Error("Модуль смыслового анализа не загрузился");
      }
      state.semanticAnalyzer = window.LawSemanticSearch.createAnalyzer(state.corpus);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function setAiBusy(isBusy) {
    els.aiForm.setAttribute("aria-busy", String(isBusy));
    els.aiSubmit.disabled = isBusy;
    els.aiInput.readOnly = isBusy;
    const label = els.aiSubmit.querySelector("span");
    if (label) label.textContent = isBusy ? "Сопоставляю с базой…" : "Подобрать статьи";
  }

  function renderAiLoading() {
    state.aiAnalysis = { status: "loading" };
    syncSearchViews();
    els.aiResultsCount.textContent = "проверка базы";
    els.aiMessage.textContent =
      "Определяю правовую тему, расширяю описание близкими юридическими понятиями и сравниваю его со всем корпусом.";
    els.aiConcepts.innerHTML = '<span class="is-processing">Определение темы</span><span class="is-processing">Ранжирование норм</span>';
    els.aiFacts.innerHTML = "";
    els.aiQuestions.hidden = true;
    els.aiQuestions.innerHTML = "";
    els.aiResultsList.innerHTML = `
      <div class="ai-loading" role="status">
        <span class="ai-loading-mark" aria-hidden="true"></span>
        <div><strong>Сопоставляю ситуацию с законодательной базой</strong><p>Вычисления выполняются прямо на этом устройстве.</p></div>
      </div>`;
  }

  function renderAiError(message) {
    state.aiAnalysis = { status: "error", message };
    syncSearchViews();
    els.aiResultsCount.textContent = "разбор не выполнен";
    els.aiMessage.textContent = "Запрос не был квалифицирован. Точные статьи не подставлялись автоматически.";
    els.aiConcepts.innerHTML = '<span class="is-muted">Нет результата</span>';
    els.aiFacts.innerHTML = "";
    els.aiQuestions.hidden = true;
    els.aiQuestions.innerHTML = "";
    els.aiResultsList.innerHTML = `
      <div class="empty-results ai-error">
        <strong>Не удалось выполнить смысловой анализ</strong>
        <p>${escapeHtml(message)}</p>
      </div>`;
  }

  function renderAiSuccess(analysis, scenario) {
    const results = Array.isArray(analysis.results) ? analysis.results : [];
    state.aiAnalysis = { status: "success", ...analysis };
    syncSearchViews();

    els.aiResultsCount.textContent = `${numberFormat.format(results.length)} ${
      results.length === 1 ? "норма" : results.length > 1 && results.length < 5 ? "нормы" : "норм"
    }`;
    els.aiMessage.textContent = analysis.message;

    const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
    els.aiConcepts.innerHTML = concepts.length
      ? concepts.map((concept) => `<span>${escapeHtml(concept.label)}</span>`).join("")
      : '<span class="is-muted">Явная тема не определена</span>';
    els.aiFacts.innerHTML = "";
    els.aiQuestions.hidden = true;
    els.aiQuestions.innerHTML = "";

    if (!results.length) {
      els.aiResultsList.innerHTML = `
        <div class="empty-results">
          <strong>Нужно больше подробностей</strong>
          <p>Укажите участников, действия, порядок событий и последствия.</p>
        </div>`;
      return;
    }

    els.aiResultsList.innerHTML = results
      .map(
        ({ doc, article, matchPercent, reason, excerpt }, index) => `
          <button
            class="ai-result-card"
            type="button"
            data-doc="${escapeHtml(doc.id)}"
            data-article="${escapeHtml(article.key)}"
          >
            <span class="ai-result-rank">${String(index + 1).padStart(2, "0")}</span>
            <span class="ai-result-copy">
              <span class="ai-result-topline">
                <span class="result-ref">${escapeHtml(doc.shortLabel)} · ${escapeHtml(article.number)}</span>
                <span class="ai-match">
                  <i style="--match: ${matchPercent}%"></i>
                  релевантность ${matchPercent}/100
                </span>
              </span>
              <strong>${escapeHtml(article.title || `Статья ${article.number}`)}</strong>
              <small>${escapeHtml(doc.title)}</small>
              <span class="ai-reason">${escapeHtml(reason)}</span>
              <p>${highlight(excerpt, scenario)}</p>
            </span>
            <span class="result-arrow" aria-hidden="true">→</span>
          </button>`,
      )
      .join("");
  }

  async function renderAiAnalysis(rawScenario) {
    const scenario = String(rawScenario || "").trim();
    els.aiForm.classList.toggle("has-value", Boolean(scenario));
    if (scenario.length < 12) {
      renderAiError("Опишите подробнее: кто, что сделал и при каких обстоятельствах.");
      return;
    }

    setAiBusy(true);
    renderAiLoading();

    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (!initializeSemanticAnalyzer()) throw new Error("Локальный модуль не загрузился. Обновите страницу.");
      const analysis = state.semanticAnalyzer.analyze(scenario, { limit: 10 });
      renderAiSuccess(analysis, scenario);
    } catch (error) {
      console.error(error);
      renderAiError(error?.message || "Обновите страницу и повторите запрос.");
    } finally {
      setAiBusy(false);
    }
  }

  function syncAppSectionTabs() {
    for (const button of els.appSectionButtons) {
      const active = button.dataset.appSection === state.appSection;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }

  function renderGuide() {
    if (!state.pocketGuide) return;
    const guide = state.pocketGuide.getDocument(state.guideDocId);
    const rows = state.pocketGuide.filterRows(state.guideDocId, {
      scope: state.guideScope,
      query: state.guideQuery,
    });

    for (const button of els.guideCodeButtons) {
      const active = button.dataset.guideDoc === state.guideDocId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const button of els.guideScopeButtons) {
      const active = button.dataset.guideScope === state.guideScope;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }

    els.guideTable.setAttribute("aria-labelledby", `guide-${state.guideDocId}-tab`);
    const countLabel = state.guideQuery.trim()
      ? pluralForm(rows.length, ["совпадение", "совпадения", "совпадений"])
      : state.guideScope === "frequent"
        ? pluralForm(rows.length, ["основная", "основные", "основных"])
        : pluralForm(rows.length, ["статья", "статьи", "статей"]);
    els.guideResultCount.textContent = `${numberFormat.format(rows.length)} ${countLabel}`;

    if (!rows.length) {
      els.guideTableBody.innerHTML = `
        <div class="guide-empty">
          <strong>Статья не найдена</strong>
          <p>Проверьте номер или попробуйте более короткую формулировку.</p>
        </div>`;
      return;
    }

    let currentChapter = "";
    const blocks = [];
    for (const row of rows) {
      if (row.chapter !== currentChapter) {
        currentChapter = row.chapter;
        blocks.push(`<div class="guide-chapter"><span>${escapeHtml(currentChapter)}</span></div>`);
      }

      const title = row.article.title || `Статья ${row.article.number}`;
      const focus = row.focus
        ? `<small class="guide-row-focus">${escapeHtml(row.focus)}</small>`
        : "";
      const jurisdictions = row.jurisdictions
        .map((tag) => `<span class="jurisdiction-badge">${escapeHtml(tag)}</span>`)
        .join("");
      const consequences = row.consequence.lines
        .map((line) => `<span>${highlight(line, state.guideQuery)}</span>`)
        .join("");
      const moreConsequences = row.consequence.extra
        ? `<small>+ ещё ${row.consequence.extra} ${pluralForm(row.consequence.extra, ["вариант", "варианта", "вариантов"])}</small>`
        : "";
      const priority = row.priority
        ? `<span class="priority-stars" aria-label="Приоритет: ${row.priority} из 5">${"★".repeat(row.priority)}</span><small>${row.priority}/5</small>`
        : '<span class="priority-none" aria-label="Приоритет не указан">—</span>';

      blocks.push(`
        <button
          class="guide-row${row.frequent ? " is-frequent" : ""}"
          type="button"
          data-doc="${escapeHtml(guide.doc.id)}"
          data-article="${escapeHtml(row.article.key)}"
          data-guide-return="true"
          aria-label="Открыть ${escapeHtml(guide.shortLabel)}, статью ${escapeHtml(row.article.number)}: ${escapeHtml(title)}"
        >
          <span class="guide-row-ref">
            <strong>${escapeHtml(row.article.number)}</strong>
            ${focus}
            ${row.frequent ? '<span class="frequent-badge">Часто</span>' : ""}
          </span>
          <span class="guide-row-title">
            ${jurisdictions ? `<span class="jurisdiction-list">${jurisdictions}</span>` : ""}
            <strong>${highlight(title, state.guideQuery)}</strong>
          </span>
          <span class="guide-row-consequence${row.consequence.isSanction ? " is-sanction" : ""}">
            ${consequences}${moreConsequences}
          </span>
          <span class="guide-row-priority">${priority}</span>
          <span class="guide-row-arrow" aria-hidden="true">→</span>
        </button>`);
    }
    els.guideTableBody.innerHTML = blocks.join("");
  }

  function openGuide(docId = state.guideDocId, options = {}) {
    if (!state.pocketGuide) return;
    state.guideDocId = state.pocketGuide.ids.includes(docId) ? docId : "uk";
    state.appSection = "guide";
    state.currentDocId = null;
    renderGuide();
    renderDocumentList();
    els.homeView.hidden = true;
    els.documentView.hidden = true;
    els.guideView.hidden = false;
    document.title = `Памятка · ${state.pocketGuide.getDocument(state.guideDocId).shortLabel} — Законка РО`;
    syncAppSectionTabs();
    setNavOpen(false);
    if (options.updateUrl !== false) setUrl("guide", state.guideDocId);
    if (options.focusSearch) {
      window.requestAnimationFrame(() => els.guideSearchInput.focus());
    } else if (options.preserveScroll !== true) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function renderDocument(doc, targetArticleKey = null) {
    els.documentHeader.dataset.shortLabel = doc.shortLabel;
    els.documentHeader.innerHTML = `
      <span class="section-kicker">${escapeHtml(doc.category)} · игровое законодательство</span>
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="document-meta">
        <span>${numberFormat.format(doc.articles.length)} статей</span>
        <span>Корпус от ${escapeHtml(formatCorpusDate(state.corpus?.generatedAt))}</span>
        <a href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">Открыть первоисточник ↗</a>
      </div>`;

    els.articleIndex.innerHTML = `
      <span class="article-index-title">Статьи документа</span>
      ${doc.articles
        .map(
          (article) => `
            <a href="#${encodeURIComponent(doc.id)}/${encodeURIComponent(article.key)}" data-jump-article="${escapeHtml(article.key)}">
              <strong>${escapeHtml(article.number)}</strong>${article.title ? ` · ${escapeHtml(article.title)}` : ""}
            </a>`,
        )
        .join("")}`;

    const blocks = [];
    for (const block of doc.blocks) {
      if (block.type === "heading") {
        blocks.push(
          `<h2 class="law-section-heading level-${block.level}">${escapeHtml(block.text)}</h2>`,
        );
        continue;
      }
      if (block.type === "paragraph") {
        blocks.push(`<p class="law-preface">${escapeHtml(block.text)}</p>`);
        continue;
      }
      if (block.type === "article") {
        const article = doc.articles[block.index];
        if (!article) continue;
        const isTarget = targetArticleKey && article.key === String(targetArticleKey);
        const title = article.title ? escapeHtml(article.title) : "";
        const paragraphs = String(article.body || "")
          .split("\n")
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("");
        blocks.push(`
          <section
            class="law-article${isTarget ? " target-article" : ""}"
            id="${articleDomId(article.key)}"
            data-article-number="${escapeHtml(article.number)}"
          >
            <h2><span class="law-article-number">Статья ${escapeHtml(article.number)}</span>${title}</h2>
            ${paragraphs || "<p>Текст статьи отсутствует в сохранённой странице.</p>"}
          </section>`);
      }
    }
    els.lawContent.innerHTML = blocks.join("");
  }

  function setUrl(docId = null, articleNumber = null, { replace = false } = {}) {
    const base = `${window.location.pathname}${window.location.search}`;
    const hash = docId
      ? `#${encodeURIComponent(docId)}${articleNumber ? `/${encodeURIComponent(articleNumber)}` : ""}`
      : "";
    window.history[replace ? "replaceState" : "pushState"](null, "", `${base}${hash}`);
  }

  function openDocument(docId, articleNumber = null, options = {}) {
    const doc = findDocument(docId);
    if (!doc) return;
    const targetArticle = articleNumber ? findArticle(doc, articleNumber) : null;

    state.documentReturn = options.returnTo || (state.appSection === "guide" ? "guide" : "base");
    state.currentDocId = doc.id;
    renderDocument(doc, targetArticle?.key || null);
    renderDocumentList();
    els.homeView.hidden = true;
    els.guideView.hidden = true;
    els.documentView.hidden = false;
    els.backLabel.textContent = state.documentReturn === "guide" ? "К памятке" : "К базе";
    document.title = `${doc.shortLabel} — Законка РО`;
    syncAppSectionTabs();
    setNavOpen(false);

    if (options.updateUrl !== false) setUrl(doc.id, targetArticle?.key || null);

    window.requestAnimationFrame(() => {
      if (targetArticle) {
        document.getElementById(articleDomId(targetArticle.key))?.scrollIntoView({ block: "start" });
      } else if (options.preserveScroll !== true) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }

  function openHome(options = {}) {
    state.appSection = "base";
    state.currentDocId = null;
    renderDocumentList();
    els.documentView.hidden = true;
    els.guideView.hidden = true;
    els.homeView.hidden = false;
    document.title = "Законка РО — памятка по законодательству";
    syncAppSectionTabs();
    setNavOpen(false);
    if (options.updateUrl !== false) setUrl(null, null);
    if (options.focusSearch) {
      window.requestAnimationFrame(() => {
        (state.searchMode === "ai" ? els.aiInput : els.searchInput).focus();
      });
    } else if (options.preserveScroll !== true) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function routeFromLocation() {
    if (!state.corpus) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      openHome({ updateUrl: false });
      return;
    }
    const [rawDocId, rawArticleNumber] = hash.split("/");
    const docId = decodeURIComponent(rawDocId || "");
    const articleNumber = rawArticleNumber ? decodeURIComponent(rawArticleNumber) : null;
    if (docId === "guide") {
      openGuide(articleNumber || "uk", { updateUrl: false });
    } else if (findDocument(docId)) {
      openDocument(docId, articleNumber, { updateUrl: false });
    } else {
      openHome({ updateUrl: false });
    }
  }

  function bindEvents() {
    els.searchForm.addEventListener("submit", (event) => event.preventDefault());
    els.searchInput.addEventListener("input", () => renderSearch(els.searchInput.value));
    els.clearButton.addEventListener("click", () => {
      els.searchInput.value = "";
      renderSearch("");
      els.searchInput.focus();
    });
    els.aiForm.addEventListener("submit", (event) => {
      event.preventDefault();
      renderAiAnalysis(els.aiInput.value);
    });
    els.aiInput.addEventListener("input", () => {
      els.aiForm.classList.toggle("has-value", Boolean(els.aiInput.value.trim()));
    });

    for (const button of els.searchModeButtons) {
      button.addEventListener("click", () => setSearchMode(button.dataset.searchMode));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setSearchMode(state.searchMode === "exact" ? "ai" : "exact");
      });
    }

    for (const button of els.appSectionButtons) {
      button.addEventListener("click", () => {
        if (button.dataset.appSection === "guide") openGuide();
        else openHome();
      });
    }

    for (const button of els.guideCodeButtons) {
      button.addEventListener("click", () => openGuide(button.dataset.guideDoc));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const nextId = state.guideDocId === "uk" ? "koap" : "uk";
        openGuide(nextId);
        document.querySelector(`[data-guide-doc="${nextId}"]`)?.focus();
      });
    }

    for (const button of els.guideScopeButtons) {
      button.addEventListener("click", () => {
        state.guideScope = button.dataset.guideScope === "all" ? "all" : "frequent";
        renderGuide();
      });
    }

    els.guideSearchInput.addEventListener("input", () => {
      state.guideQuery = els.guideSearchInput.value;
      renderGuide();
    });

    document.addEventListener("click", (event) => {
      const queryButton = event.target.closest("[data-query]");
      if (queryButton) {
        setSearchMode("exact", { focus: false });
        els.searchInput.value = queryButton.dataset.query || "";
        renderSearch(els.searchInput.value);
        els.searchInput.focus();
        return;
      }

      const aiExampleButton = event.target.closest("[data-ai-example]");
      if (aiExampleButton) {
        setSearchMode("ai", { focus: false });
        els.aiInput.value = aiExampleButton.dataset.aiExample || "";
        renderAiAnalysis(els.aiInput.value);
        els.aiInput.focus();
        return;
      }

      const articleButton = event.target.closest("[data-doc]");
      if (articleButton) {
        const returnTo =
          articleButton.dataset.guideReturn === "true" || !els.guideView.hidden ? "guide" : "base";
        openDocument(articleButton.dataset.doc, articleButton.dataset.article || null, { returnTo });
      }
    });

    els.categoryFilter.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = button.dataset.category;
      renderCategoryFilters();
      renderDocumentList();
    });

    els.articleIndex.addEventListener("click", (event) => {
      const link = event.target.closest("[data-jump-article]");
      if (!link || !state.currentDocId) return;
      event.preventDefault();
      const articleKey = link.dataset.jumpArticle;
      const currentTarget = els.lawContent.querySelector(".target-article");
      currentTarget?.classList.remove("target-article");
      const target = document.getElementById(articleDomId(articleKey));
      target?.classList.add("target-article");
      target?.scrollIntoView({ block: "start" });
      setUrl(state.currentDocId, articleKey);
    });

    els.backButton.addEventListener("click", () => {
      if (state.documentReturn === "guide") openGuide(state.guideDocId);
      else openHome();
    });
    els.topSearchButton.addEventListener("click", () => openHome({ focusSearch: true }));
    els.navToggle.addEventListener("click", () => setNavOpen(!document.body.classList.contains("nav-open")));
    els.navBackdrop.addEventListener("click", () => setNavOpen(false));

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        openHome({ focusSearch: true, preserveScroll: true });
      }
      if (event.key === "Escape") {
        if (document.body.classList.contains("nav-open")) {
          setNavOpen(false);
        } else if (state.currentDocId) {
          if (state.documentReturn === "guide") openGuide(state.guideDocId, { focusSearch: true });
          else openHome({ focusSearch: true });
        } else if (state.appSection === "guide" && state.guideQuery) {
          state.guideQuery = "";
          els.guideSearchInput.value = "";
          renderGuide();
          els.guideSearchInput.focus();
        } else if (state.searchMode === "ai" && (els.aiInput.value || state.aiAnalysis)) {
          setAiBusy(false);
          els.aiInput.value = "";
          state.aiAnalysis = null;
          els.aiForm.classList.remove("has-value");
          syncSearchViews();
          els.aiInput.focus();
        } else if (els.searchInput.value) {
          els.searchInput.value = "";
          renderSearch("");
          els.searchInput.focus();
        }
      }
    });

    window.addEventListener("popstate", routeFromLocation);
  }

  async function loadCorpus() {
    const embeddedCorpus = document.getElementById("law-corpus");
    if (embeddedCorpus?.textContent) {
      return JSON.parse(embeddedCorpus.textContent);
    }

    const manifestResponse = await fetch("./documents-manifest.json", { cache: "no-store" });
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      if (manifest.format !== "gzip-chunks-v1" || !Array.isArray(manifest.parts)) {
        throw new Error("Unsupported corpus manifest");
      }
      if (!("DecompressionStream" in window)) {
        throw new Error("This browser does not support local corpus decompression");
      }

      const chunks = await Promise.all(
        manifest.parts.map(async (path) => {
          const response = await fetch(path, { cache: "force-cache" });
          if (!response.ok) throw new Error(`Corpus chunk ${path}: HTTP ${response.status}`);
          return new Uint8Array(await response.arrayBuffer());
        }),
      );
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const compressed = new Uint8Array(totalLength);
      let offset = 0;
      chunks.forEach((chunk) => {
        compressed.set(chunk, offset);
        offset += chunk.byteLength;
      });

      const decompressed = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return new Response(decompressed).json();
    }

    const response = await fetch("./documents.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function init() {
    bindEvents();
    els.searchInput.setAttribute("aria-busy", "true");
    try {
      state.corpus = await loadCorpus();
      if (!window.LawPocketGuide?.createGuide) throw new Error("Pocket guide module is unavailable");
      state.pocketGuide = window.LawPocketGuide.createGuide(state.corpus);
      const ukGuide = state.pocketGuide.getDocument("uk");
      const koapGuide = state.pocketGuide.getDocument("koap");
      els.guideUkCount.textContent = `${numberFormat.format(ukGuide.rows.length)} ${pluralForm(ukGuide.rows.length, ["статья", "статьи", "статей"])}`;
      els.guideKoapCount.textContent = `${numberFormat.format(koapGuide.rows.length)} ${pluralForm(koapGuide.rows.length, ["статья", "статьи", "статей"])}`;
      els.guideUpdated.textContent = formatCorpusDate(state.pocketGuide.generatedAt);
      els.guideUpdated.dateTime = state.pocketGuide.generatedAt;
      renderStats();
      renderCategoryFilters();
      renderDocumentList();
      renderGuide();
      routeFromLocation();
      syncSearchViews();
      const warmSemanticSearch = () => initializeSemanticAnalyzer();
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(warmSemanticSearch, { timeout: 2_500 });
      } else {
        window.setTimeout(warmSemanticSearch, 250);
      }
    } catch (error) {
      console.error(error);
      els.homeContent.hidden = true;
      els.resultsView.hidden = false;
      els.resultsCount.textContent = "Ошибка загрузки";
      els.resultsList.innerHTML = `
        <div class="load-error">
          <strong>База не загрузилась</strong>
          <p>Обновите страницу. Если ошибка повторится, откройте первоисточник на форуме.</p>
        </div>`;
    } finally {
      els.searchInput.removeAttribute("aria-busy");
    }
  }

  init();
})();
