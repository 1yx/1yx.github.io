import { SITE } from "@/config";

interface SchemaPerson {
  name: string;
  url?: string;
}

export type SchemaType =
  | "WebSite"
  | "BlogPosting"
  | "Person"
  | "CollectionPage"
  | "WebPage"
  | "BreadcrumbList";

interface BreadcrumbItem {
  name: string;
  href?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaOutput = Record<string, any>;

const authorObj: Record<string, string> = {
  "@type": "Person",
  name: SITE.author,
  ...(SITE.profile ? { url: SITE.profile } : {}),
};

export function buildSchema(
  type: "WebSite",
  data: { url: string; description: string; inLanguage: string[] }
): SchemaOutput;
export function buildSchema(
  type: "BlogPosting",
  data: {
    headline: string;
    image?: string;
    datePublished?: Date;
    dateModified?: Date | null;
    description?: string;
    author?: SchemaPerson;
  }
): SchemaOutput;
export function buildSchema(
  type: "Person",
  data: {
    url: string;
    jobTitle?: string;
    knowsAbout?: string[];
    sameAs?: string[];
  }
): SchemaOutput;
export function buildSchema(
  type: "CollectionPage",
  data: { name: string; url: string; description?: string }
): SchemaOutput;
export function buildSchema(
  type: "WebPage",
  data: { name: string; url: string }
): SchemaOutput;
export function buildSchema(
  type: "BreadcrumbList",
  data: { items: BreadcrumbItem[] }
): SchemaOutput;

export function buildSchema(type: SchemaType, data: Record<string, unknown>): SchemaOutput {
  switch (type) {
    case "WebSite":
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.title,
        url: data.url,
        description: data.description,
        inLanguage: data.inLanguage,
        author: { ...authorObj },
      };

    case "BlogPosting": {
      const result: SchemaOutput = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: data.headline,
        author: [{ ...authorObj }],
        publisher: { ...authorObj },
      };
      if (data.image) result.image = data.image;
      if (data.datePublished) {
        result.datePublished = (data.datePublished as Date).toISOString();
      }
      if (data.dateModified) {
        result.dateModified = (data.dateModified as Date).toISOString();
      }
      if (data.description) result.description = data.description;
      return result;
    }

    case "Person": {
      const result: SchemaOutput = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: SITE.author,
        url: data.url,
      };
      if (data.jobTitle) result.jobTitle = data.jobTitle;
      if (data.knowsAbout) result.knowsAbout = data.knowsAbout;
      if (data.sameAs) result.sameAs = data.sameAs;
      return result;
    }

    case "CollectionPage": {
      const result: SchemaOutput = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: data.name,
        url: data.url,
        isPartOf: {
          "@type": "WebSite",
          url: SITE.website,
        },
      };
      if (data.description) result.description = data.description;
      return result;
    }

    case "WebPage":
      return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: data.name,
        url: data.url,
        isPartOf: {
          "@type": "WebSite",
          url: SITE.website,
        },
      };

    case "BreadcrumbList": {
      const items = data.items as BreadcrumbItem[];
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => {
          const listItem: SchemaOutput = {
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
          };
          if (item.href) listItem.item = item.href;
          return listItem;
        }),
      };
    }
  }
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): SchemaOutput {
  return buildSchema("BreadcrumbList", { items });
}
