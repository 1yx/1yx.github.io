import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { LOCALES } from "./src/i18n";

const BLOG_DIR = "src/data/blog";

// Recursively collect all blog .md/.mdx files with their relative paths
function collectBlogFiles(dir: string, base: string): Map<string, string> {
  const map = new Map<string, string>();
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Recurse into subdirectories (locale/category folders)
        for (const [k, v] of collectBlogFiles(full, base)) {
          map.set(k, v);
        }
      } else if (entry.endsWith(".md") || entry.endsWith(".mdx")) {
        const rel = relative(base, full);
        map.set(rel.replace(/\.(md|mdx)$/, "").toLowerCase(), rel);
      }
    }
  } catch {}
  return map;
}

// Build slug → relative path map (case-insensitive) at config load time
const slugToFile = collectBlogFiles(BLOG_DIR, BLOG_DIR);

function getGitLastMod(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    // Blog post URLs: /{lang}/{category}/{slug}/
    const match = pathname.match(/^\/[\w-]+\/[\w-]+\/([^/]+)\/$/);
    if (!match) return undefined;

    const fileName = slugToFile.get(match[1].toLowerCase());
    if (!fileName) return undefined;

    const stdout = execSync(`git log -1 --format="%cI" -- "${BLOG_DIR}/${fileName}"`);
    return stdout.toString().trim() || undefined;
  } catch {
    return undefined;
  }
}

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  trailingSlash: "always",
  i18n: {
    defaultLocale: "zh-CN",
    locales: [...LOCALES],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/zh-CN/"),
      serialize(item) {
        const lastmod = getGitLastMod(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
  },
});
