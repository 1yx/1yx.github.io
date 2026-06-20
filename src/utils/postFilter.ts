import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

const postFilter = ({ data }: CollectionEntry<"blog">) => {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
  // In dev, preview everything (drafts + scheduled posts). In prod, only
  // published, non-draft posts.
  return import.meta.env.DEV || (!data.draft && isPublishTimePassed);
};

export default postFilter;
