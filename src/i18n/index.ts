export const LOCALES = ["zh-CN", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function getOtherLocale(locale: Locale): Locale {
  return locale === "zh-CN" ? "en" : "zh-CN";
}

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

// UI translation strings
const translations = {
  "zh-CN": {
    nav: {
      home: "首页",
      running: "跑步",
      psychology: "心理学 / 神经科学",
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
  },
  en: {
    nav: {
      home: "Home",
      running: "Running",
      psychology: "Psychology / Neuroscience",
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
  },
} as const;

export type Translations = (typeof translations)[Locale];

export function t(locale: Locale): Translations {
  return translations[locale];
}
