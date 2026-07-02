export const LOCALES = ["zh-CN", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function getOtherLocale(locale: Locale): Locale {
  return locale === "zh-CN" ? "en" : "zh-CN";
}

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Generate a locale-aware path. Default locale (zh-CN) has no prefix, others get /en/ etc. */
export function getLocalePath(lang: Locale, path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  if (lang === DEFAULT_LOCALE) return `/${p}`;
  return `/${lang}/${p}`;
}

/** Strip the locale prefix from a pathname. "/en/running/" → "/running/", "/running/" → "/running/" */
export function removeLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    return "/" + segments.slice(1).join("/") + (pathname.endsWith("/") ? "/" : "");
  }
  return pathname;
}

// Tag translations: canonical English ID → display name per locale
export const TAG_TRANSLATIONS = {
  marathon: { "zh-CN": "马拉松比赛", en: "Marathon Race" },
  running: { "zh-CN": "跑步", en: "Running" },
  "marathon-training": { "zh-CN": "马拉松训练", en: "Marathon Training" },
  psychology: { "zh-CN": "心理学", en: "Psychology" },
  "self-esteem": { "zh-CN": "自尊", en: "Self-Esteem" },
  self: { "zh-CN": "自我", en: "Self" },
  python: { "zh-CN": "Python", en: "Python" },
  uv: { "zh-CN": "uv", en: "uv" },
  "package-management": { "zh-CN": "包管理", en: "Package Management" },
  macos: { "zh-CN": "macOS", en: "macOS" },
  "ai-agents": { "zh-CN": "AI Agents", en: "AI Agents" },
  cli: { "zh-CN": "命令行", en: "CLI" },
  bsd: { "zh-CN": "BSD", en: "BSD" },
  gnu: { "zh-CN": "GNU", en: "GNU" },
  "claude-code": { "zh-CN": "Claude Code", en: "Claude Code" },
  pypi: { "zh-CN": "PyPI", en: "PyPI" },
  tty: { "zh-CN": "电传打字机（TTY）", en: "TTY" },
  termios: { "zh-CN": "termios", en: "termios" },
  readline: { "zh-CN": "Readline", en: "Readline" },
  terminal: { "zh-CN": "终端", en: "Terminal" },
  posix: { "zh-CN": "POSIX", en: "POSIX" },
  "keyboard-input": { "zh-CN": "快捷键", en: "Keyboard Shortcuts" },
} as const;

export type TagId = keyof typeof TAG_TRANSLATIONS;

// UI translation strings
export const translations = {
  "zh-CN": {
    siteTitle: "Lyx 的博客",
    nav: {
      home: "首页",
      stem: "STEM",
      running: "跑步",
      psychology: "心理学",
      tags: "标签",
      about: "关于",
      search: "搜索",
    },
    post: {
      prev: "上一篇",
      next: "下一篇",
    },
    breadcrumb: {
      home: "首页",
    },
    tags: {
      title: "标签",
      desc: "所有文章标签。",
      tagLabel: "标签：",
      tagDesc: (tagName: string) => `所有带有"${tagName}"标签的文章。`,
    },
    search: {
      title: "搜索",
      desc: "搜索站内文章...",
    },
    notFound: {
      title: "页面未找到",
      backHome: "返回首页",
    },
    footer: {
      privacy: "隐私政策",
    },
    categoryDesc: (name: string) => `所有${name}相关的文章。`,
    keyTakeaways: "核心要点",
    training: {
      overviewTitle: "全部训练课程",
      calendarLink: "跑步日志",
      overviewDesc:
        "2026 下半年全马训练计划——按阶段、Block、Microcycle 浏览全部训练课程。",
      dayTitle: "训练日历",
      dayDesc: "按日查看训练计划与 Strava 实际完成情况，含每公里配速。",
      blockTitle: "Block 视图",
      blockDesc: "按 Block 查看各 Microcycle 与每日训练安排。",
      backToOverview: "返回总览",
      backToDay: "返回日视图",
      plannedSection: "计划",
      plannedSectionSub: "当日安排",
      actualSection: "实际",
      actualSectionSub: "当日完成 (Strava)",
      am: "上午 AM",
      pm: "下午 PM",
      rest: "休息",
      pending: "待完成",
      extra: "计划外",
      deload: "减量",
      taper: "taper",
      microcycles: "Microcycles",
      days: "Days",
      microcycleLabel: "Microcycle",
      blockLabel: "Block",
      dayLabel: "Day",
      prevDay: "前一天",
      nextDay: "后一天",
      prevBlock: "上一个 Block",
      nextBlock: "下一个 Block",
      phasesNav: "训练阶段",
      current: "当前",
      calendarNav: "训练日历",
      microcycleView: "微周期",
      weeklyView: "周视图",
      filterAll: "全部",
      filterRegeneration: "恢复再生",
      filterFundamental: "基础有氧",
      filterSpecial: "能力支撑",
      filterSpecific: "马拉松专项",
      weekdayShort: ["一", "二", "三", "四", "五", "六", "日"],
      phaseLabels: {
        "Aerobic Phase": "有氧阶段",
        "Threshold Phase": "乳酸阈值阶段",
        "Marathon Phase": "马拉松专项阶段",
      },
      plannedVolume: "计划总量",
      position: (n: number, total: number) => `${n} / ${total}`,
      paceFastest: (pace: string) => `最快 ${pace}/km`,
      paceSlowest: (pace: string) => `最慢 ${pace}/km`,
      completed: (km: number | string) => `完成 ${km}km`,
      plannedKm: (km: number | string) => `计划 ${km}km`,
    },
  },
  en: {
    siteTitle: "Lyx's blog",
    nav: {
      home: "Home",
      stem: "STEM",
      running: "Running",
      psychology: "Psychology",
      tags: "Tags",
      about: "About",
      search: "Search",
    },
    post: {
      prev: "Previous Post",
      next: "Next Post",
    },
    breadcrumb: {
      home: "Home",
    },
    tags: {
      title: "Tags",
      desc: "All the tags used in posts.",
      tagLabel: "Tag:",
      tagDesc: (tagName: string) =>
        `All the articles with the tag "${tagName}".`,
    },
    search: {
      title: "Search",
      desc: "Search any article on this blog...",
    },
    notFound: {
      title: "Page not found",
      backHome: "Back to Home",
    },
    footer: {
      privacy: "Privacy Policy",
    },
    categoryDesc: (name: string) => `All articles related to ${name}.`,
    keyTakeaways: "Key Takeaways",
    training: {
      overviewTitle: "All Workouts",
      calendarLink: "Running Log",
      overviewDesc:
        "2026 second-half marathon training plan — browse every session by phase, block, and microcycle.",
      dayTitle: "Training Calendar",
      dayDesc: "Day-by-day view of the training plan and Strava actuals, with per-km pace.",
      blockTitle: "Block View",
      blockDesc: "Browse each microcycle and daily schedule within a block.",
      backToOverview: "Back to overview",
      backToDay: "Back to day view",
      plannedSection: "Plan",
      plannedSectionSub: "Today's plan",
      actualSection: "Actual",
      actualSectionSub: "Done (Strava)",
      am: "AM",
      pm: "PM",
      rest: "Rest",
      pending: "Pending",
      extra: "Extra",
      deload: "Deload",
      taper: "Taper",
      microcycles: "Microcycles",
      days: "Days",
      microcycleLabel: "Microcycle",
      blockLabel: "Block",
      dayLabel: "Day",
      prevDay: "Previous day",
      nextDay: "Next day",
      prevBlock: "Previous block",
      nextBlock: "Next block",
      phasesNav: "Phases",
      current: "Current",
      calendarNav: "Training calendar",
      microcycleView: "Microcycle",
      weeklyView: "Weekly",
      filterAll: "All",
      filterRegeneration: "Regeneration",
      filterFundamental: "Fundamental",
      filterSpecial: "Special",
      filterSpecific: "Specific",
      weekdayShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      phaseLabels: {
        "Aerobic Phase": "Aerobic Phase",
        "Threshold Phase": "Threshold Phase",
        "Marathon Phase": "Marathon Phase",
      },
      plannedVolume: "Planned volume",
      position: (n: number, total: number) => `${n} / ${total}`,
      paceFastest: (pace: string) => `Fastest ${pace}/km`,
      paceSlowest: (pace: string) => `Slowest ${pace}/km`,
      completed: (km: number | string) => `Done ${km}km`,
      plannedKm: (km: number | string) => `Planned ${km}km`,
    },
  },
} as const;

export type Translations = (typeof translations)[Locale];

export function t(locale: Locale): Translations {
  return translations[locale];
}

export function getTagDisplayName(tagId: string, locale: Locale): string {
  const entry = TAG_TRANSLATIONS[tagId as TagId];
  return entry ? entry[locale] : tagId;
}
