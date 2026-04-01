import type { CollectionEntry } from "astro:content";
import type { Locale } from "@/i18n";
import getSortedPosts from "./getSortedPosts";
import { getLangFromId } from "./getLangFromId";

export default function getPostsByLang(
  posts: CollectionEntry<"blog">[],
  lang: Locale
) {
  return getSortedPosts(posts.filter(p => getLangFromId(p.id) === lang));
}
