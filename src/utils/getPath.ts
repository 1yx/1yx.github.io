import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import { getLangFromId } from "./getLangFromId";
import { isLocale } from "@/i18n";

/**
 * Get full path of a blog post
 * @param id - id of the blog post (e.g. "zh-CN/running/my-article")
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include base path in return value
 * @param category - optional category override for the base path
 * @returns blog post path (e.g. "/zh-CN/running/my-article/")
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true,
  category?: string
) {
  const lang = getLangFromId(id);

  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter(path => path !== "")
    .filter(path => !path.startsWith("_"))
    .filter(path => !isLocale(path)) // exclude locale directory from path segments
    .slice(0, -1) // remove filename
    .slice(category ? 1 : 0) // remove category segment (already in basePath)
    .map(segment => slugifyStr(segment));

  const basePath = includeBase ? `/${lang}/${category || "posts"}` : "";

  // Making sure `id` does not contain the directory
  const blogId = id.split("/");
  const lastSegment =
    blogId.length > 0 ? blogId[blogId.length - 1] : blogId[0];
  const slug = lastSegment.replace(/\.(md|mdx)$/, "");

  // If not inside the sub-dir, simply return the file path
  if (!pathSegments || pathSegments.length < 1) {
    return [basePath, slug].join("/") + "/";
  }

  return [basePath, ...pathSegments, slug].join("/") + "/";
}
