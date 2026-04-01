import type { CollectionEntry } from "astro:content";
import type { Locale } from "@/i18n";
import getSortedPosts from "./getSortedPosts";
import { slugifyAll } from "./slugify";
import { getLangFromId } from "./getLangFromId";

const getPostsByTag = (
  posts: CollectionEntry<"blog">[],
  tag: string,
  lang?: Locale
) => {
  const filtered = lang
    ? posts.filter(p => getLangFromId(p.id) === lang)
    : posts;
  return getSortedPosts(
    filtered.filter(post => slugifyAll(post.data.tags).includes(tag))
  );
};

export default getPostsByTag;
