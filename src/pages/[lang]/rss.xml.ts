import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getPostsByLang from "@/utils/getPostsByLang";
import { SITE } from "@/config";
import { LOCALES, type Locale } from "@/i18n";

export async function getStaticPaths() {
  return LOCALES.map(lang => ({ params: { lang } }));
}

export async function GET({ params }: { params: { lang: Locale } }) {
  const { lang } = params;
  const allPosts = await getCollection("blog");
  const sortedPosts = getPostsByLang(allPosts, lang);

  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath, true, data.category),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
