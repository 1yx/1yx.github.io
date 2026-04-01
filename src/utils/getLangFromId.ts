import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/i18n";

/**
 * Extract locale from a content entry's `id`.
 * With the directory structure `src/data/blog/{lang}/{category}/slug.mdx`,
 * the glob loader's `id` is `zh-CN/category/slug`.
 * The first segment is always the locale.
 */
export function getLangFromId(id: string): Locale {
  const firstSegment = id.split("/")[0];
  if (isLocale(firstSegment)) {
    return firstSegment;
  }
  // Astro glob loader lowercases content IDs, so also check lowercase match
  const match = LOCALES.find(l => l.toLowerCase() === firstSegment.toLowerCase());
  if (match) {
    return match;
  }
  return DEFAULT_LOCALE;
}
