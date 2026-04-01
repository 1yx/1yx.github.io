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
import { readdirSync } from "node:fs";

const BLOG_DIR = "src/data/blog";

// Build slug → filename map (case-insensitive) at config load time
const slugToFile = new Map<string, string>();
try {
  for (const file of readdirSync(BLOG_DIR)) {
    if (file.endsWith(".md") || file.endsWith(".mdx")) {
      slugToFile.set(file.replace(/\.(md|mdx)$/, "").toLowerCase(), file);
    }
  }
} catch {}

function getGitLastMod(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    // Blog post URLs: /{category}/{slug}/
    const match = pathname.match(/^\/[\w-]+\/([^/]+)\/$/);
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
  integrations: [
    mdx(),
    sitemap({
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
