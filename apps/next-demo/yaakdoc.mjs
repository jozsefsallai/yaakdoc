import { createNextYaakdoc } from "@yaakdoc/next";

// The docs are configured inline, using the main demo's export.
export const withYaakdoc = createNextYaakdoc({
  path: "/docs",
  export: "../demo/yaak.json",
  configFile: false,
  config: {
    pages: "per-request",
    environments: "public",
    branding: { links: [{ label: "Home", href: "/" }] },
  },
});
