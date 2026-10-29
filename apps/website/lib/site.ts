import { createGetUrl } from "fumadocs-core/source";

export const site = {
  name: "yaakdoc",
  description:
    "Static, themable and LLM-friendly API documentation, generated from your Yaak workspace.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://yaakdoc.dev",
  github: "https://github.com/jozsefsallai/yaakdoc",
  npm: "https://www.npmjs.com/package/yaakdoc",
  demo: "https://demo.yaakdoc.dev",
  yaak: "https://yaak.app",
  disclaimer:
    "yaakdoc is an independent project. It isn't affiliated with, endorsed by or sponsored by Yaak or Mountain Loop.",
};

export const git = {
  user: "jozsefsallai",
  repo: "yaakdoc",
  branch: "master",
  contentDir: "apps/website/content/docs",
};

export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

const getContentUrl = createGetUrl(docsContentRoute);
const getImageUrl = createGetUrl(docsImageRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: getContentUrl(segments, page.locale),
  };
}

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: getImageUrl(segments, page.locale),
  };
}

export function getPageGithubUrl(path: string) {
  return `${site.github}/blob/${git.branch}/${git.contentDir}/${path}`;
}
