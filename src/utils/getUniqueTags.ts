import type { CollectionEntry } from "astro:content";
import type { Locale } from "@/i18n";
import { slugifyStr } from "./slugify";
import postFilter from "./postFilter";
import { getLangFromId } from "./getLangFromId";

interface Tag {
  tag: string;
  tagName: string;
}

const getUniqueTags = (
  posts: CollectionEntry<"blog">[],
  lang?: Locale
) => {
  const filtered = lang
    ? posts.filter(p => getLangFromId(p.id) === lang)
    : posts;

  const tags: Tag[] = filtered
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .map(tag => ({ tag: slugifyStr(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex(tag => tag.tag === value.tag) === index
    )
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
  return tags;
};

export default getUniqueTags;
