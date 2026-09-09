(function attachSemanticSearch(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LawSemanticSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function semanticSearchFactory() {
  "use strict";

  const STOP_WORDS = new Set(
    [
      "а", "без", "более", "бы", "был", "была", "были", "было", "быть", "в", "вам", "вас", "весь",
      "во", "вот", "все", "всего", "вы", "где", "да", "для", "до", "его", "ее", "если", "есть",
      "еще", "же", "за", "здесь", "и", "из", "или", "им", "их", "к", "как", "когда", "кто", "ли",
      "либо", "мне", "может", "мой", "мы", "на", "над", "надо", "наш", "не", "него", "нее", "нет",
      "ни", "но", "ну", "о", "об", "один", "он", "она", "они", "оно", "от", "по", "под", "при",
      "про", "с", "сам", "свой", "так", "также", "там", "те", "тем", "то", "того", "тоже", "той",
      "только", "том", "ты", "у", "уже", "что", "чтобы", "эта", "эти", "это", "я", "человек",
      "гражданин", "лицо", "случай", "действие", "статья", "часть", "пункт", "кодекс", "закон", "ро",
    ].map((word) => word.replaceAll("ё", "е")),
  );

  const SUFFIXES = [
    "иями", "ями", "ами", "ьего", "ьему", "ьими", "ость", "ение", "ания", "ировать", "ываться", "иваться",
    "оваться", "еваться", "аться", "яться", "иться", "ыться", "еться", "овать", "евать", "ивать", "ывать",
    "ющий", "ющая", "ющее", "ющие", "вший", "вшая", "вшее", "вшие", "енный", "енная", "енное", "енные",
    "ого", "ему", "ому", "ыми", "ими", "его", "ей", "ий", "ый", "ой", "ая", "яя", "ое", "ее", "ые",
    "ие", "ую", "юю", "иям", "ием", "иях", "иях", "ами", "ями", "ах", "ях", "ию", "ью", "ия", "ья",
    "ила", "ыла", "ена", "ейте", "уйте", "ите", "или", "ыли", "ей", "уй", "ил", "ыл", "им", "ым",
    "ен", "ило", "ыло", "ено", "ят", "ует", "уют", "ит", "ыт", "ены", "ить", "ыть", "ишь", "ую", "ю",
    "ов", "ев", "ие", "ье", "еи", "ии", "ей", "ой", "ий", "ям", "ем", "ам", "ом", "о", "у", "ах",
    "ях", "ы", "ь", "ию", "ью", "ю", "ия", "ья", "я", "а", "евы", "овы", "ев", "ов", "е", "и",
  ].sort((a, b) => b.length - a.length);

  const CONCEPTS = [
    {
      id: "detention",
      label: "задержание",
      triggers: ["задержали", "задержание", "скрутили", "наручники", "доставили в отдел", "арестовали", "поймали"],
      terms: ["задержание", "подозреваемый", "доставление", "лишение свободы", "основания задержания"],
      docs: ["upk", "fz-6", "constitution"],
      refs: [["upk", "51", 46], ["upk", "52", 48], ["upk", "53", 40], ["fz-6", "14", 30]],
    },
    {
      id: "search",
      label: "обыск и осмотр",
      triggers: ["обыск", "обыскали", "досмотр", "карманы", "ордер", "вошли в квартиру", "проникли в дом", "изъяли вещи"],
      terms: ["личный обыск", "обыск жилища", "осмотр", "выемка", "судебное решение", "неприкосновенность жилища"],
      docs: ["upk", "constitution", "fz-6"],
      refs: [["upk", "9", 34], ["upk", "89", 30], ["upk", "93", 52], ["upk", "94", 38]],
    },
    {
      id: "defense",
      label: "право на защиту",
      triggers: ["адвокат", "защитник", "юрист", "не дали позвонить", "не пустили адвоката", "отказался давать показания", "молчать"],
      terms: ["право на защиту", "адвокат", "защитник", "телефонный звонок", "отказ от показаний", "юридическая помощь"],
      docs: ["upk", "fz-13", "constitution"],
      refs: [["upk", "13", 32], ["upk", "26", 46], ["upk", "28", 38], ["upk", "29", 32], ["constitution", "44", 36], ["constitution", "47", 32]],
    },
    {
      id: "force",
      label: "сила и спецсредства",
      triggers: ["ударил", "избил", "дубинка", "электрошокер", "шокер", "спецсредство", "применил силу", "без предупреждения", "выстрелил сотрудник"],
      terms: ["физическая сила", "специальные средства", "огнестрельное оружие", "предупредить", "минимизация ущерба", "медицинская помощь"],
      docs: ["fz-6", "fz-8", "uk"],
      refs: [["fz-6", "17", 36], ["fz-6", "18", 52], ["fz-6", "19", 38], ["fz-6", "20", 40], ["fz-6", "21", 40]],
    },
    {
      id: "weapon",
      label: "оружие",
      triggers: ["оружие", "пистолет", "автомат", "винтовка", "патроны", "боеприпасы", "стрелял", "выстрел", "вооружен", "лицензия на оружие"],
      terms: ["огнестрельное оружие", "боеприпасы", "ношение оружия", "хранение оружия", "лицензия", "угроза оружием"],
      docs: ["fz-8", "uk", "fz-6"],
      refs: [],
    },
    {
      id: "traffic",
      label: "дорожное нарушение",
      triggers: ["машина", "автомобиль", "водитель", "дорога", "пдд", "водительские права", "показать права", "предъявить права", "без прав", "остановили авто", "не остановился", "погоня", "превысил скорость", "ехал быстро"],
      terms: ["водитель", "транспортное средство", "требование остановиться", "скорость движения", "документы водителя", "правила дорожного движения"],
      docs: ["fz-15", "koap", "fz-6"],
      refs: [["fz-15", "2.1", 30], ["fz-15", "2.5", 34], ["fz-15", "8.2", 30], ["fz-15", "8.3", 30]],
    },
    {
      id: "accident",
      label: "ДТП",
      triggers: ["дтп", "авария", "столкновение", "сбил", "наехал", "уехал с места", "место аварии"],
      terms: ["дорожно транспортное происшествие", "место ДТП", "аварийная сигнализация", "вызвать ДПС", "оставление места"],
      docs: ["fz-15", "koap"],
      refs: [["fz-15", "2.6", 58]],
    },
    {
      id: "official",
      label: "особый статус госслужащего",
      triggers: ["госслужащий", "госник", "чиновник", "прокурор", "судья", "депутат", "задержали сотрудника", "служебное удостоверение"],
      terms: ["государственный служащий", "должностное лицо", "особый правовой статус", "руководство задержанного", "прокурор"],
      docs: ["fz-10", "fz-1", "upk", "ethics"],
      refs: [["fz-10", "1", 32]],
    },
    {
      id: "identification",
      label: "представление и удостоверение",
      triggers: [
        "не представился", "не назвал должность", "не назвал звание", "не назвал фамилию",
        "не показал удостоверение", "предъявить удостоверение", "служебное удостоверение",
        "удостоверить личность", "обратился к гражданину",
      ],
      terms: [
        "представиться", "назвать должность звание фамилию", "служебное удостоверение",
        "причина и цель обращения", "идентификация государственного служащего",
      ],
      docs: ["fz-1", "fz-2", "fz-4", "fz-5", "fz-6", "fz-7"],
      refs: [["fz-6", "5", 46], ["fz-1", "40", 36], ["fz-1", "41", 34], ["fz-2", "9", 38]],
    },
    {
      id: "lawful-order",
      label: "законное требование",
      triggers: [
        "неповиновение", "не подчинился", "отказался выполнить", "игнорировал требование",
        "не выполнил требование", "воспрепятствовал сотруднику", "мешал исполнению обязанностей",
        "законное требование", "законный приказ",
      ],
      terms: [
        "неповиновение законному требованию", "законное распоряжение", "воспрепятствование",
        "исполнение служебных обязанностей", "охрана общественного порядка",
      ],
      docs: ["uk", "fz-6", "fz-4", "fz-5"],
      refs: [["uk", "105", 58]],
    },
    {
      id: "orm",
      label: "оперативно-розыскные мероприятия",
      triggers: [
        "орм", "оперативно розыскное мероприятие", "оперативно-розыскное мероприятие",
        "оперативная работа", "под прикрытием", "негласно", "наблюдение", "наружка",
        "проверочная закупка", "наведение справок", "конфиденциальное сотрудничество",
        "вербовка", "информатор", "агентурная работа", "прослушка",
      ],
      terms: [
        "оперативно розыскная деятельность", "гласные и негласные мероприятия", "опрос",
        "наблюдение", "обследование помещений", "проверочная закупка", "основания проведения",
        "судебное решение", "результаты оперативно розыскной деятельности", "доказывание",
      ],
      docs: ["fz-14", "fz-5", "upk"],
      refs: [
        ["fz-14", "6", 58], ["fz-14", "7", 54], ["fz-14", "8", 48],
        ["fz-14", "9", 44], ["fz-14", "10", 32], ["fz-5", "15", 38], ["upk", "49", 34],
      ],
    },
    {
      id: "fsb-dvkr",
      label: "полномочия ФСБ и ДВКР",
      triggers: [
        "фсб", "двкр", "военная контрразведка", "первая служба фсб", "оперативно поисковая служба",
        "оперативно-поисковая служба", "контрразведка", "сотрудник фсб",
      ],
      terms: [
        "права отделов ФСБ", "оперативно розыскные мероприятия", "дознание", "предварительное следствие",
        "военные объекты", "режимный объект", "исполнение должностных обязанностей", "подследственность",
      ],
      docs: ["fz-5", "fz-14", "upk", "moscow-property"],
      refs: [["fz-5", "15", 60], ["moscow-property", "39", 48], ["upk", "80", 34]],
    },
    {
      id: "restricted-facility",
      label: "режимный объект",
      triggers: [
        "режимный объект", "режимная территория", "военная часть", "территория армии",
        "объект фсо", "объект фсб", "проход на объект", "пропуск на объект", "вошел на территорию",
      ],
      terms: [
        "режимный объект", "право беспрепятственного доступа", "служебная необходимость",
        "приглашение уполномоченного сотрудника", "действительный пропуск", "личный досмотр",
        "незаконное проникновение на режимный объект",
      ],
      docs: ["moscow-property", "uk", "fz-7", "fz-5"],
      refs: [
        ["moscow-property", "36", 52], ["moscow-property", "38", 46],
        ["moscow-property", "39", 50], ["uk", "73.1", 42],
      ],
    },
    {
      id: "closed-territory",
      label: "закрытая территория",
      triggers: [
        "закрытая территория", "закрытый объект", "оцепленная территория", "место оцепления",
        "проник на закрытую", "режим посещения", "беспрепятственный доступ",
      ],
      terms: [
        "закрытая территория", "правила доступа", "сопровождение сотрудниками ФСО",
        "незаконное проникновение", "нарушение режима посещения",
      ],
      docs: ["moscow-property", "koap", "fz-7"],
      refs: [
        ["moscow-property", "22", 42], ["moscow-property", "23", 44],
        ["moscow-property", "24", 38], ["moscow-property", "25", 34], ["koap", "11.8", 46],
      ],
    },
    {
      id: "investigative-committee",
      label: "полномочия Следственного комитета",
      triggers: [
        "следственный комитет", "сотрудник ск", "следователь ск", "председатель ск",
        "ск расследует", "полномочия ск", "права ск",
      ],
      terms: [
        "Следственный комитет", "проверка сообщения о преступлении", "предварительное следствие",
        "осмотр места происшествия", "документы и материалы", "служебное удостоверение", "подследственность",
      ],
      docs: ["fz-4", "upk", "fz-14", "moscow-property"],
      refs: [["fz-4", "6", 48], ["fz-4", "7", 58], ["upk", "80", 40], ["fz-14", "10", 30]],
    },
    {
      id: "interrogation",
      label: "допрос и опрос",
      triggers: [
        "допрос", "допросили", "вызвали на допрос", "повестка", "задавали вопросы",
        "наводящие вопросы", "опрос дознавателя", "опросили свидетеля", "очная ставка",
      ],
      terms: [
        "место и время допроса", "порядок вызова", "общие правила допроса", "видеозапись",
        "адвокат при допросе", "показания свидетеля", "показания подозреваемого", "опрос",
      ],
      docs: ["upk", "fz-14"],
      refs: [["upk", "96", 44], ["upk", "97", 38], ["upk", "98", 56], ["fz-14", "6", 28]],
    },
    {
      id: "insult-authority",
      label: "оскорбление представителя власти",
      triggers: [
        "оскорбил сотрудника", "оскорбление сотрудника", "оскорбил представителя власти",
        "матом на полицейского", "матом на сотрудника", "унижал госслужащего", "оскорбление власти",
      ],
      terms: [
        "оскорбление представителя власти", "государственная служба", "исполнение должностных обязанностей",
        "публичное оскорбление", "группа трех и более человек", "средства массовой информации",
      ],
      docs: ["uk", "koap"],
      refs: [["uk", "104", 48], ["koap", "10.1", 44]],
    },
    {
      id: "organized-group",
      label: "соучастие и группа лиц",
      triggers: [
        "группа лиц", "толпа", "банда", "опс", "преступное сообщество", "организованная группа",
        "по предварительному сговору", "приказал напасть", "заказал нападение", "подстрекал",
        "соучастник", "одинаковая одежда", "втроем", "три человека",
      ],
      terms: [
        "соучастие", "организатор", "подстрекатель", "пособник", "исполнитель", "предварительный сговор",
        "организованная группа", "преступное сообщество", "бандитизм", "отягчающее обстоятельство",
      ],
      docs: ["uk", "upk", "fz-5", "fz-14"],
      refs: [
        ["uk", "22", 42], ["uk", "23", 50], ["uk", "24", 56],
        ["uk", "43", 34], ["uk", "72", 38],
      ],
    },
    {
      id: "official-abuse",
      label: "превышение полномочий",
      triggers: [
        "превысил полномочия", "превышение полномочий", "злоупотребил полномочиями",
        "использовал должность", "действовал вне полномочий", "без законных оснований",
        "незаконный приказ", "халатность", "не исполнил обязанности",
      ],
      terms: [
        "злоупотребление должностными полномочиями", "превышение должностных полномочий",
        "существенное нарушение прав", "личная заинтересованность", "халатность", "служебные обязанности",
      ],
      docs: ["uk", "ethics", "fz-1"],
      refs: [["uk", "82", 44], ["uk", "84", 54], ["uk", "88", 34]],
    },
    {
      id: "multiple-offenses",
      label: "совокупность нарушений",
      triggers: [
        "две статьи", "несколько статей", "несколько преступлений", "совокупность преступлений",
        "суммируется розыск", "складывается наказание", "итоговое наказание",
      ],
      terms: [
        "совокупность преступлений", "одно действие содержит признаки нескольких преступлений",
        "назначение наказания по совокупности", "частичное или полное сложение наказаний",
      ],
      docs: ["uk", "upk"],
      refs: [["uk", "12", 52], ["uk", "41", 58], ["upk", "80.1", 32]],
    },
    {
      id: "corruption",
      label: "коррупция и взятка",
      triggers: ["взятка", "подкуп", "коррупция", "деньги сотруднику", "передал деньги", "служебное положение"],
      terms: ["дача взятки", "получение взятки", "посредничество", "злоупотребление полномочиями", "должностное преступление"],
      docs: ["uk", "ethics", "fz-1", "fz-3", "fz-4"],
      refs: [],
    },
    {
      id: "theft",
      label: "хищение имущества",
      triggers: ["украл", "кража", "ограбил", "грабеж", "разбой", "отобрал", "угнал", "похитил имущество", "вынес деньги"],
      terms: ["кража", "грабеж", "разбой", "хищение", "угон", "чужое имущество"],
      docs: ["uk", "upk"],
      refs: [],
    },
    {
      id: "threat",
      label: "угроза насилием",
      triggers: ["угрожал", "угрожает", "угроза убийством", "угрожал убить", "запугивал расправой"],
      terms: ["угроза убийством", "причинение тяжкого вреда здоровью", "основания опасаться осуществления угрозы"],
      docs: ["uk", "upk"],
      refs: [["uk", "57", 48]],
    },
    {
      id: "violence",
      label: "вред жизни и здоровью",
      triggers: ["убил", "убийство", "ранил", "избил", "ударил", "напал", "угрожал убить", "тяжкий вред", "телесные повреждения"],
      terms: ["убийство", "причинение вреда здоровью", "угроза убийством", "нападение", "насилие"],
      docs: ["uk", "upk"],
      refs: [],
    },
    {
      id: "hostage",
      label: "похищение или заложник",
      triggers: ["заложник", "взял в заложники", "похитил человека", "насильно удерживал", "связал человека"],
      terms: ["захват заложника", "похищение человека", "незаконное лишение свободы", "насильственное удержание"],
      docs: ["uk", "fz-6", "upk"],
      refs: [],
    },
    {
      id: "drugs",
      label: "наркотики",
      triggers: ["наркотики", "наркота", "закладка", "запрещенные вещества", "продал вещества", "хранил вещества"],
      terms: ["наркотические средства", "хранение наркотиков", "сбыт наркотиков", "запрещенные вещества"],
      docs: ["uk", "koap", "upk"],
      refs: [],
    },
    {
      id: "public-event",
      label: "митинг и публичное мероприятие",
      triggers: ["митинг", "протест", "пикет", "демонстрация", "шествие", "публичное мероприятие", "собрание граждан"],
      terms: ["собрание", "митинг", "демонстрация", "шествие", "пикетирование", "публичное мероприятие"],
      docs: ["fz-16", "constitution", "koap"],
      refs: [["constitution", "30", 30]],
    },
    {
      id: "secret",
      label: "государственная тайна",
      triggers: ["гостайна", "государственная тайна", "секретные сведения", "слил информацию", "засекречено", "допуск к тайне"],
      terms: ["государственная тайна", "секретные сведения", "разглашение", "допуск", "защита сведений"],
      docs: ["fz-12", "uk", "fz-5"],
      refs: [],
    },
    {
      id: "secret-disclosure",
      label: "разглашение гостайны",
      triggers: ["разгласил государственную тайну", "разглашение государственной тайны", "слил секретные сведения", "передал секретные сведения"],
      terms: ["разглашение государственной тайны", "доверенные сведения", "секретные сведения"],
      docs: ["uk", "fz-12", "fz-5"],
      refs: [["uk", "80", 52]],
    },
    {
      id: "investigation",
      label: "следствие и доказательства",
      triggers: ["доказательства", "видеозапись", "свидетель", "допрос", "экспертиза", "следователь", "дознаватель", "уголовное дело"],
      terms: ["доказательства", "недопустимые доказательства", "допрос", "свидетель", "предварительное расследование", "экспертиза"],
      docs: ["upk", "fz-4", "fz-3"],
      refs: [["upk", "43", 28], ["upk", "44", 32]],
    },
    {
      id: "court",
      label: "суд и обжалование",
      triggers: ["суд", "судья", "обжаловать", "жалоба", "приговор", "судебное решение", "иск"],
      terms: ["судебное решение", "обжалование", "судопроизводство", "жалоба", "приговор"],
      docs: ["fkz-4", "upk", "constitution", "fz-3"],
      refs: [["constitution", "42", 30], ["upk", "64", 28]],
    },
    {
      id: "service",
      label: "государственная служба",
      triggers: ["уволили", "выговор", "дисциплинарное взыскание", "служебная этика", "рабочее время", "госслужба", "нарушил субординацию"],
      terms: ["государственная служба", "дисциплинарная ответственность", "служебное поведение", "увольнение", "рабочее время"],
      docs: ["fz-1", "tk", "ethics"],
      refs: [],
    },
    {
      id: "health",
      label: "здравоохранение",
      triggers: ["врач", "больница", "медик", "медицинская помощь", "лечение", "здоровье пациента"],
      terms: ["медицинская помощь", "здравоохранение", "врач", "пациент", "охрана здоровья"],
      docs: ["moscow-health", "constitution", "tk"],
      refs: [["constitution", "38", 26]],
    },
    {
      id: "media",
      label: "СМИ и «Вести Москвы»",
      triggers: ["журналист", "сми", "новости", "пресса", "вести москвы", "репортер", "публикация"],
      terms: ["средства массовой информации", "журналист", "новостная организация", "распространение информации"],
      docs: ["moscow-news", "constitution"],
      refs: [],
    },
  ];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е")
      .replace(/[^a-zа-я0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stemWord(source) {
    const word = normalizeText(source);
    if (!word || /^\d+$/.test(word) || word.length < 4) return word;
    let stem = word.replace(/(ся|сь)$/u, "");
    for (const suffix of SUFFIXES) {
      if (stem.endsWith(suffix) && stem.length - suffix.length >= 3) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }
    return stem;
  }

  function tokenize(value, keepStopWords = false) {
    return normalizeText(value)
      .split(" ")
      .filter(Boolean)
      .filter((word) => keepStopWords || !STOP_WORDS.has(word))
      .map(stemWord)
      .filter((word) => word.length > 1 && (keepStopWords || !STOP_WORDS.has(word)));
  }

  function countTerms(value, multiplier = 1, target = new Map()) {
    for (const term of tokenize(value)) {
      target.set(term, (target.get(term) || 0) + multiplier);
    }
    return target;
  }

  function triggerMatches(normalizedScenario, scenarioTerms, trigger) {
    const normalizedTrigger = normalizeText(trigger);
    if (!normalizedTrigger) return false;
    if (normalizedTrigger.includes(" ")) {
      if (normalizedScenario.includes(normalizedTrigger)) return true;
      const scenarioSequence = tokenize(normalizedScenario, true);
      const triggerSequence = tokenize(normalizedTrigger, true);
      return scenarioSequence.some((_, start) =>
        triggerSequence.every((term, offset) => scenarioSequence[start + offset] === term),
      );
    }
    if (normalizedTrigger === "судья") {
      return /(?:^| )(?:судья|судьи|судью|судье|судьей|судей)(?: |$)/u.test(normalizedScenario);
    }
    return scenarioTerms.has(stemWord(normalizedTrigger));
  }

  function makeExcerpt(body, preferredTerms) {
    const clean = String(body || "").replace(/\s+/g, " ").trim();
    if (!clean) return "Откройте статью, чтобы прочитать полную формулировку.";
    const lower = normalizeText(clean);
    let position = -1;
    for (const term of preferredTerms) {
      const candidate = lower.indexOf(term);
      if (candidate !== -1 && (position === -1 || candidate < position)) position = candidate;
    }
    const start = Math.max(0, position === -1 ? 0 : position - 90);
    const end = Math.min(clean.length, start + 340);
    return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
  }

  function createAnalyzer(corpus) {
    if (!corpus?.documents?.length) throw new Error("Corpus is empty");

    const index = [];
    const documentFrequency = new Map();
    const byReference = new Map();

    for (const doc of corpus.documents) {
      for (const article of doc.articles) {
        const counts = new Map();
        countTerms(article.body, 1, counts);
        countTerms(article.section, 1.6, counts);
        countTerms(article.chapter, 1.8, counts);
        countTerms(article.title, 4.2, counts);
        countTerms(`${doc.shortLabel} ${doc.title}`, 2.1, counts);
        const length = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
        const item = {
          uid: `${doc.id}:${article.key}`,
          doc,
          article,
          counts,
          length,
          normalizedTitle: normalizeText(article.title),
          normalizedText: normalizeText(`${article.title} ${article.body}`),
        };
        index.push(item);
        for (const term of counts.keys()) {
          documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
        }
        const ref = `${doc.id}:${article.number}`;
        if (!byReference.has(ref)) byReference.set(ref, []);
        byReference.get(ref).push(item);
      }
    }

    const totalDocuments = index.length;
    const averageLength = index.reduce((sum, item) => sum + item.length, 0) / totalDocuments;

    function analyze(scenario, options = {}) {
      const limit = Math.max(1, Math.min(Number(options.limit) || 8, 12));
      const normalizedScenario = normalizeText(scenario);
      const rawWords = normalizedScenario.split(" ").filter(Boolean);
      const rawTerms = tokenize(scenario);
      const scenarioTerms = new Set(rawTerms);
      if (rawTerms.length < 2) {
        return {
          concepts: [],
          results: [],
          message: "Опишите событие подробнее: кто что сделал, где и при каких обстоятельствах.",
        };
      }

      const matchedConcepts = CONCEPTS.filter((concept) =>
        concept.triggers.some((trigger) => triggerMatches(normalizedScenario, scenarioTerms, trigger)),
      );

      const queryWeights = new Map();
      for (const term of rawTerms) queryWeights.set(term, (queryWeights.get(term) || 0) + 3.4);
      for (const concept of matchedConcepts) {
        for (const term of tokenize(concept.terms.join(" "))) {
          queryWeights.set(term, Math.max(queryWeights.get(term) || 0, 1.25));
        }
      }

      const directBoosts = new Map();
      const directConcepts = new Map();
      function addDirectReference(docId, articleNumber, boost, conceptLabel) {
        for (const item of byReference.get(`${docId}:${articleNumber}`) || []) {
          directBoosts.set(item.uid, (directBoosts.get(item.uid) || 0) + boost);
          if (!directConcepts.has(item.uid)) directConcepts.set(item.uid, []);
          directConcepts.get(item.uid).push(conceptLabel);
        }
      }
      for (const concept of matchedConcepts) {
        for (const [docId, articleNumber, boost] of concept.refs) {
          addDirectReference(docId, articleNumber, boost, concept.label);
        }
      }
      const matchedConceptIds = new Set(matchedConcepts.map((concept) => concept.id));
      if (matchedConceptIds.has("detention") && matchedConceptIds.has("official")) {
        addDirectReference("upk", "83", 50, "задержание госслужащего");
      }
      if (matchedConceptIds.has("identification")) {
        if (/(?:^| )(?:полици|полицей|мвд|дпс|гибдд)/u.test(normalizedScenario)) {
          addDirectReference("fz-6", "5", 64, "представление сотрудника полиции");
        }
        if (/(?:^| )(?:военнослужащ|армии|вооруженн|военн)/u.test(normalizedScenario)) {
          addDirectReference("fz-2", "9", 64, "представление военнослужащего");
        }
        if (/(?:^| )(?:фсб|двкр|контрразвед)/u.test(normalizedScenario)) {
          addDirectReference("fz-5", "5", 64, "представление сотрудника ФСБ");
        }
        if (/следственн.{0,12}комитет|сотрудник ск|следователь ск/u.test(normalizedScenario)) {
          addDirectReference("fz-4", "6", 48, "обязанности сотрудника СК");
        }
      }
      if (matchedConceptIds.has("restricted-facility") && matchedConceptIds.has("fsb-dvkr")) {
        addDirectReference("moscow-property", "39", 74, "доступ ДВКР на режимный объект");
      }
      if (matchedConceptIds.has("restricted-facility") && matchedConceptIds.has("investigative-committee")) {
        addDirectReference("fz-4", "7", 74, "доступ СК при исполнении полномочий");
        addDirectReference("moscow-property", "36", 48, "общий режим доступа на объект");
      }
      if (matchedConceptIds.has("insult-authority")) {
        if (/(?:^| )(?:публичн|сми|толп|три|3|свидетел|людях|групп)/u.test(normalizedScenario)) {
          addDirectReference("uk", "104", 54, "публичное оскорбление представителя власти");
        } else {
          addDirectReference("koap", "10.1", 40, "оскорбление государственного служащего");
        }
      }

      const candidates = [];
      const k1 = 1.45;
      const b = 0.72;
      for (const item of index) {
        let lexicalScore = 0;
        const matchedTerms = [];
        for (const [term, queryWeight] of queryWeights) {
          const frequency = item.counts.get(term) || 0;
          if (!frequency) continue;
          matchedTerms.push(term);
          const df = documentFrequency.get(term) || 0;
          const idf = Math.log(1 + (totalDocuments - df + 0.5) / (df + 0.5));
          const saturation =
            (frequency * (k1 + 1)) /
            (frequency + k1 * (1 - b + b * (item.length / averageLength)));
          lexicalScore += queryWeight * idf * saturation;
        }

        let score = lexicalScore;
        const directBoost = directBoosts.get(item.uid) || 0;
        score += directBoost;
        for (const concept of matchedConcepts) {
          if (concept.docs.includes(item.doc.id) && (lexicalScore > 0 || directBoost)) score += 2.8;
        }
        if (item.normalizedTitle && normalizedScenario.includes(item.normalizedTitle)) score += 20;
        if (/общие положения|основные понятия|правовая основа/u.test(item.normalizedTitle) && !directBoost) {
          score *= 0.72;
        }
        if (score < 1.2) continue;

        const conceptLabels = new Set(directConcepts.get(item.uid) || []);
        for (const concept of matchedConcepts) {
          const conceptTerms = tokenize(concept.terms.join(" "));
          if (conceptTerms.some((term) => item.counts.has(term))) conceptLabels.add(concept.label);
        }
        candidates.push({ item, score, lexicalScore, directBoost, matchedTerms, conceptLabels: [...conceptLabels] });
      }

      candidates.sort((a, bValue) => bValue.score - a.score);
      const selected = [];
      const perDocument = new Map();
      const seenReferences = new Set();
      for (const candidate of candidates) {
        const docCount = perDocument.get(candidate.item.doc.id) || 0;
        const referenceKey = `${candidate.item.doc.id}:${candidate.item.article.number}`;
        if (docCount >= 4) continue;
        if (seenReferences.has(referenceKey)) continue;
        selected.push(candidate);
        perDocument.set(candidate.item.doc.id, docCount + 1);
        seenReferences.add(referenceKey);
        if (selected.length >= limit) break;
      }

      const topScore = selected[0]?.score || 1;
      const results = selected.map((candidate) => {
        const ratio = Math.max(0, Math.min(1, candidate.score / topScore));
        const matchPercent = Math.round(50 + 45 * Math.sqrt(ratio));
        const visibleTerms = rawWords
          .filter((word) => candidate.item.counts.has(stemWord(word)))
          .filter((word, indexValue, values) => values.indexOf(word) === indexValue)
          .slice(0, 4);
        const concepts = candidate.conceptLabels.slice(0, 3);
        const reasonParts = [];
        if (candidate.directBoost && concepts.length) {
          reasonParts.push(`Ключевая норма по теме «${concepts[0]}»`);
        } else if (concepts.length) {
          reasonParts.push(`Связана с темой «${concepts.join("», «") }»`);
        }
        if (visibleTerms.length) reasonParts.push(`учтены признаки: ${visibleTerms.join(", ")}`);
        return {
          article: candidate.item.article,
          doc: candidate.item.doc,
          matchPercent,
          matchLevel: matchPercent >= 82 ? "высокое" : matchPercent >= 68 ? "среднее" : "возможное",
          reason: `${reasonParts.join("; ") || "Подобрана по смысловой близости к описанию"}.`,
          excerpt: makeExcerpt(candidate.item.article.body, [...rawWords, ...candidate.matchedTerms]),
          concepts,
        };
      });

      return {
        concepts: matchedConcepts.map((concept) => ({ id: concept.id, label: concept.label })),
        results,
        message: matchedConcepts.length
          ? "Локальный анализатор распознал правовые темы и расширил запрос близкими юридическими понятиями. Это предварительный подбор: проверьте условия и полный текст норм."
          : "Тема не распознана словарём правовых ситуаций. Показаны нормы, наиболее близкие по контекстным признакам текста; добавьте участников, действия и последствия для точности.",
      };
    }

    return {
      analyze,
      stats: { articles: index.length, concepts: CONCEPTS.length },
    };
  }

  return { createAnalyzer, normalizeText, stemWord, tokenize };
});
