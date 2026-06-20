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
const translations = {
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
