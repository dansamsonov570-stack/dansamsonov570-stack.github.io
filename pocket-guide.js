(function attachPocketGuide(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LawPocketGuide = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function pocketGuideFactory() {
  "use strict";

  const DOCUMENTS = {
    uk: {
      shortLabel: "УК",
      label: "Уголовный кодекс",
      frequent: [
        "51", "54", "56", "57", "58", "65", "66", "67", "68", "70", "73", "73.1",
        "74", "75", "76", "80", "82", "84", "86", "87", "88", "94", "100", "100.1",
        "102", "104", "105", "107", "110",
      ],
      focus: {
        "51": "ч. 1",
        "66": "ч. 1–3",
        "74": "ч. 1",
        "75": "ч. 1–3",
        "94": "ч. 1–2",
        "105": "ч. 1",
      },
    },
    koap: {
      shortLabel: "КоАП",
      label: "Кодекс об административных правонарушениях",
      frequent: [
        "5.4", "6.1", "6.4", "7.1", "8.2", "8.3", "8.5", "8.10", "8.11", "8.12",
        "8.15", "8.17", "10.1", "10.2", "10.4", "11.1", "11.5", "11.6", "11.7", "11.8",
      ],
      focus: {
        "8.2": "ч. 2",
        "8.3": "ч. 2",
        "8.5": "ч. 1",
        "8.10": "ч. 1–2",
        "8.11": "ч. 1–2",
        "8.12": "ч. 1",
      },
    },
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .replace(/[^a-zа-я0-9.]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripLawMarkers(value) {
    return String(value || "")
      .replace(/\[(?:[РФВ](?:\/[РФВ])*)\]/gu, "")
      .replace(/\[[^\]]*★[^\]]*\]/gu, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+([,.;:])/g, "$1")
      .trim();
  }

  function priorityOf(body) {
    let priority = 0;
    for (const match of String(body || "").matchAll(/\[([^\]]*★[^\]]*)\]/gu)) {
      for (const run of match[1].match(/★+/gu) || []) priority = Math.max(priority, run.length);
    }
    return priority;
  }

  function jurisdictionsOf(body) {
    const tags = [];
    for (const match of String(body || "").matchAll(/\[([РФВ](?:\/[РФВ])*)\]/gu)) {
      if (!tags.includes(match[1])) tags.push(match[1]);
    }
    return tags;
  }

  function truncateAtWord(value, limit) {
    const clean = String(value || "").replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    const slice = clean.slice(0, limit + 1);
    const cut = slice.lastIndexOf(" ");
    return `${slice.slice(0, cut > limit * 0.65 ? cut : limit).trim()}…`;
  }

  function consequenceOf(body) {
    const lines = String(body || "")
      .split(/\n+/)
      .map((line) => stripLawMarkers(line).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const sanctions = [];
    let currentPart = "";
    let implicitPart = 0;

    for (const line of lines) {
      if (/^Примечани(?:е|я)\b/iu.test(line)) continue;
      const explicitPart = line.match(/^(\d+(?:\.\d+)*)\.\s/u)?.[1];
      if (explicitPart) currentPart = explicitPart;
      const match = line.match(/(наказывается|наказываются|влечет|влекут)\s+(.+)$/iu);
      if (!match) continue;
      if (!explicitPart && !currentPart) implicitPart += 1;
      const part = explicitPart || currentPart || String(implicitPart);
      const raw = `${match[1][0].toLocaleUpperCase("ru-RU")}${match[1].slice(1)} ${match[2]}`
        .replace(/\s*Примечани(?:е|я)\b.*$/iu, "")
        .replace(/\.$/u, "")
        .trim();
      const text = `${part ? `Ч. ${part} · ` : ""}${truncateAtWord(raw, 190)}`;
      if (text && !sanctions.includes(text)) sanctions.push(text);
    }

    if (sanctions.length) {
      const showPart = sanctions.length > 1 || sanctions.some((line) => !line.startsWith("Ч. 1 ·"));
      return {
        lines: sanctions
          .map((line) => (showPart ? line : line.replace(/^Ч\. 1 ·\s*/u, "")))
          .slice(0, 2),
        extra: Math.max(0, sanctions.length - 2),
        isSanction: true,
      };
    }

    const fallback = lines
      .map((line) => line.replace(/^\d+(?:\.\d+)*\.\s+/u, ""))
      .find((line) => line.length > 12);
    return {
      lines: [truncateAtWord(fallback || "Открыть статью для полного текста.", 210)],
      extra: 0,
      isSanction: false,
    };
  }

  function chapterOf(article) {
    return article.chapter || article.section || "Общие положения";
  }

  function createGuide(corpus) {
    if (!corpus?.documents?.length) throw new Error("Corpus is empty");
    const guides = new Map();

    for (const [id, config] of Object.entries(DOCUMENTS)) {
      const doc = corpus.documents.find((item) => item.id === id);
      if (!doc) throw new Error(`Document ${id} is missing`);
      const frequent = new Set(config.frequent);
      const rows = doc.articles.map((article) => ({
        article,
        chapter: chapterOf(article),
        consequence: consequenceOf(article.body),
        focus: config.focus?.[article.number] || "",
        frequent: frequent.has(article.number),
        jurisdictions: jurisdictionsOf(article.body),
        priority: priorityOf(article.body),
        searchText: normalize(`${article.number} ${article.title} ${article.body}`),
      }));
      guides.set(id, {
        id,
        doc,
        label: config.label,
        shortLabel: config.shortLabel,
        rows,
        frequentCount: rows.filter((row) => row.frequent).length,
      });
    }

    function getDocument(id) {
      return guides.get(id) || guides.get("uk");
    }

    function filterRows(id, { scope = "frequent", query = "" } = {}) {
      const guide = getDocument(id);
      const normalizedQuery = normalize(query);
      const terms = normalizedQuery.split(" ").filter(Boolean);
      return guide.rows.filter((row) => {
        if (!normalizedQuery && scope === "frequent" && !row.frequent) return false;
        return terms.every((term) => row.searchText.includes(term));
      });
    }

    return {
      generatedAt: corpus.generatedAt,
      getDocument,
      filterRows,
      ids: [...guides.keys()],
    };
  }

  return { createGuide, consequenceOf, jurisdictionsOf, normalize, priorityOf, stripLawMarkers };
});
