# @yaakdoc/next

Serve [yaakdoc](https://yaakdoc.dev) API documentation from a Next.js app, e.g. at `/docs`.

```sh
npm i @yaakdoc/next
```

```ts
// next.config.ts
import type { NextConfig } from "next";
import { createNextYaakdoc } from "@yaakdoc/next";

const withYaakdoc = createNextYaakdoc({
  path: "/docs",
  export: "./yaak.json",
  config: {
    branding: {
      title: "Acme API",
    },
  },
});

const nextConfig: NextConfig = {};

export default withYaakdoc(nextConfig);
```

`next dev` proxies the docs to a yaakdoc dev server, and `next build` prerenders them into `public/docs` (add that folder to `.gitignore`).

See the [Next.js integration docs](https://yaakdoc.dev/docs/integrations/nextjs) for all options and how it works.
