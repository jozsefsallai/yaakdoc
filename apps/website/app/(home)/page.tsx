import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Code,
  FileText,
  KeyRound,
  Layers,
  Paintbrush,
  Play,
  Search,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyCommand } from "@/components/home/copy-command";
import { Screenshot, ThemedImage } from "@/components/home/screenshot";
import { ShowcaseVideo } from "@/components/home/showcase-video";
import { LogoMark, Wordmark } from "@/components/logo";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";
import { getThemes } from "@/lib/themes";

const codeThemes = { themes: { light: "github-light", dark: "github-dark" } } as const;

function Snippet({ code, lang, title }: { code: string; lang: string; title?: string }) {
  return (
    <ServerCodeBlock
      code={code}
      lang={lang}
      {...codeThemes}
      codeblock={{ title, className: "my-0" }}
    />
  );
}

export default async function HomePage() {
  const themes = await getThemes();

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <WaysToRun />
      <Features />
      <ExportToSite />
      <Themes themes={themes} />
      <CallToAction />
      <Footer />
    </main>
  );
}

function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28", className)}
    >
      <div className="mb-12 max-w-2xl">
        <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-4 text-pretty text-fd-muted-foreground text-lg">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 text-center sm:px-6 md:pt-24">
        <Link
          href="/docs/yaak-plugin"
          className="mb-8 inline-flex items-center gap-2 rounded-full border bg-fd-card/60 py-1 pr-3 pl-1 text-fd-muted-foreground text-sm backdrop-blur transition-colors hover:text-fd-foreground"
        >
          <span className="rounded-full bg-yd-blue/15 px-2 py-0.5 font-medium text-xs text-yd-blue">
            New
          </span>
          Build your docs right from Yaak with the plugin
          <ArrowRight className="size-3.5" />
        </Link>

        <h1 className="max-w-4xl text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
          Beautiful API docs, straight from your <span className="text-yd-yellow">Yaak</span>{" "}
          <span className="text-yd-green">workspace</span>
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-fd-muted-foreground text-lg sm:text-xl">
          yaakdoc turns the requests, folders and environments you already have in{" "}
          <a href={site.yaak} className="text-fd-foreground underline-offset-4 hover:underline">
            Yaak
          </a>{" "}
          into a fast, static documentation site that people and AI agents both love to read.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/quickstart"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight className="size-4" />
          </Link>

          <a
            href={site.demo}
            className="inline-flex items-center gap-2 rounded-lg border bg-fd-card px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fd-accent"
          >
            Live demo
            <ArrowUpRight className="size-4" />
          </a>

          <CopyCommand command="npx yaakdoc" />
        </div>

        <div className="relative mt-16 w-full md:mt-20">
          <div
            aria-hidden
            className="absolute -inset-x-6 -top-6 bottom-12 -z-10 rounded-[2rem] bg-[linear-gradient(135deg,#4bc38c,#4771c5_50%,#b91ab7)] opacity-25 blur-3xl"
          />

          <Screenshot
            light="/screenshots/kiseki-light.webp"
            dark="/screenshots/kiseki-dark.webp"
            alt="An API reference built with yaakdoc's default theme: navigation, a request with its parameters, and code examples with example responses."
            url="docs.acme.dev/reference"
            priority
          />
        </div>
      </div>
    </section>
  );
}

const stepAccents = ["text-yd-yellow", "text-yd-purple", "text-yd-green"];

function WaysToRun() {
  return (
    <Section
      id="get-started"
      title="Run it wherever your docs belong"
      description="Build from inside Yaak, from the command line, or serve the docs from the app you already have."
    >
      <Tabs items={["Yaak plugin", "CLI", "Next.js", "Vite", "Node"]} className="my-0">
        <Tab value="Yaak plugin">
          <ol className="grid gap-4 py-2 sm:grid-cols-3">
            {[
              ["Install", "In Yaak, open Settings › Plugins and install @yaakdoc/yaakdoc."],
              [
                "Configure",
                'Choose "Build docs with yaakdoc..." in the workspace menu and fill in the form.',
              ],
              ["Build", "Pick a folder. The site is built inside Yaak, with no Node.js needed."],
            ].map(([title, text], index) => (
              <li key={title} className="rounded-lg border bg-fd-background p-4">
                <span className={cn("font-mono text-xs", stepAccents[index])}>
                  Step {index + 1}
                </span>
                <p className="mt-1 font-medium">{title}</p>
                <p className="mt-1 text-fd-muted-foreground text-sm">{text}</p>
              </li>
            ))}
          </ol>

          <DocsLink href="/docs/yaak-plugin">Yaak plugin docs</DocsLink>
        </Tab>

        <Tab value="CLI">
          <Snippet
            lang="bash"
            code={`# Next to your Yaak export (yaak.json):
npx yaakdoc          # dev server at http://localhost:4000
npx yaakdoc build    # static site in dist/`}
          />
          <DocsLink href="/docs/quickstart">Quickstart</DocsLink>
        </Tab>

        <Tab value="Next.js">
          <Snippet
            lang="ts"
            title="next.config.ts"
            code={`import { createNextYaakdoc } from "@yaakdoc/next";

const withYaakdoc = createNextYaakdoc({
  path: "/docs",
  export: "./yaak.json",
});

export default withYaakdoc({});`}
          />
          <DocsLink href="/docs/integrations/nextjs">Next.js integration</DocsLink>
        </Tab>

        <Tab value="Vite">
          <Snippet
            lang="ts"
            title="vite.config.ts"
            code={`import { defineConfig } from "vite";
import yaakdoc from "yaakdoc/vite";

export default defineConfig({
  plugins: [
    yaakdoc({
      path: "/docs",
      export: "./yaak.json",
    }),
  ],
});`}
          />
          <DocsLink href="/docs/integrations/vite">Vite plugin</DocsLink>
        </Tab>

        <Tab value="Node">
          <Snippet
            lang="ts"
            title="server.ts"
            code={`import express from "express";
import { yaakdocMiddleware } from "yaakdoc";

const app = express();
app.use(
  await yaakdocMiddleware({
    path: "/docs",
    export: "./yaak.json",
  })
);`}
          />
          <DocsLink href="/docs/integrations/node-middleware">Node middleware</DocsLink>
        </Tab>
      </Tabs>
    </Section>
  );
}

function DocsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-1.5 font-medium text-fd-primary text-sm hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

type Media =
  | { type: "video"; src: string; width: number; height: number; label: string }
  | { type: "image"; src: string; width: number; height: number; label: string };

const showcases: {
  icon: typeof Zap;
  /** Color classes of the icon chip. */
  accent: string;
  title: string;
  text: string;
  points: string[];
  href: string;
  media: Media;
}[] = [
  {
    icon: KeyRound,
    accent: "border-yd-blue/25 bg-yd-blue/10 text-yd-blue",
    title: "Switch environments, keep secrets secret",
    text: "Readers pick between your environments, then the page updates the base URL, variables, and examples instantly.",
    points: [
      "Prerendered per environment, so it works on any static host",
      "secure(...) values and secret-like variables are never inlined",
      "Private environments stay private",
    ],
    href: "/docs/guides/environments",
    media: {
      type: "video",
      src: "/showcase/environments",
      width: 980,
      height: 600,
      label:
        "Switching the environment from Production to Staging updates the request URL and the code examples.",
    },
  },
  {
    icon: Code,
    accent: "border-yd-orange/25 bg-yd-orange/10 text-yd-orange",
    title: "Code examples in multiple language",
    text: "Every request gets ready-to-run examples, and the language a reader picks sticks across the page.",
    points: [
      "cURL, JavaScript, Python, Go, grpcurl and wscat",
      "HTTP, gRPC and WebSocket requests",
      "Easy API for adding your own languages",
      "Example responses per status code, from your descriptions",
    ],
    href: "/docs/reference/snippets",
    media: {
      type: "image",
      src: "/showcase/code",
      width: 1600,
      height: 1045,
      label:
        "A POST request with its Python example, where the password stays a placeholder, and its example responses.",
    },
  },
  {
    icon: Bot,
    accent: "border-yd-purple/25 bg-yd-purple/10 text-yd-purple",
    title: "Made for agents too",
    text: "Your docs are as easy for an AI assistant to read as they are for humans.",
    points: [
      "llms.txt, llms-full.txt, and a Markdown version of every page",
      "Copy page or section as Markdown",
      "Open in ChatGPT or Claude, with the page as context",
    ],
    href: "/docs/guides/llms",
    media: {
      type: "image",
      src: "/showcase/agents",
      width: 1480,
      height: 840,
      label:
        "The page actions menu: Copy as Markdown, View as Markdown, Open in ChatGPT, and Open in Claude.",
    },
  },
  {
    icon: Search,
    accent: "border-yd-pink/25 bg-yd-pink/10 text-yd-pink",
    title: "Search built in",
    text: "Press Cmd+K and find any page, folder or endpoint. No search service is necessary - the search index is statically generated!",
    points: [
      "Guides and the API reference in one place",
      "Keyboard navigation from start to finish",
    ],
    href: "/docs/guides/search",
    media: {
      type: "video",
      src: "/showcase/search",
      width: 760,
      height: 480,
      label: "Searching the docs for orders and pagination with the Cmd+K dialog.",
    },
  },
  {
    icon: FileText,
    accent: "border-yd-green/25 bg-yd-green/10 text-yd-green",
    title: "Guides next to the reference",
    text: "Don't limit yourself to API docs. Write a quickstart, guides or a changelog in Markdown, and arrange them with the API reference in tabs and groups.",
    points: [
      "Yaak variables work in pages, and follow the environment switcher",
      "Relative links and images just work",
    ],
    href: "/docs/guides/custom-pages",
    media: {
      type: "image",
      src: "/showcase/guides",
      width: 1600,
      height: 800,
      label: "An authentication guide written in Markdown, in the Guides tab of the docs.",
    },
  },
];

const moreFeatures: {
  icon: typeof Zap;
  accent: string;
  title: string;
  text: string;
  href: string;
}[] = [
  {
    icon: Zap,
    accent: "text-yd-yellow",
    title: "Static and fast",
    text: "Prerendered HTML. Only small islands hydrate in the browser.",
    href: "/docs#how-it-works",
  },
  {
    icon: Paintbrush,
    accent: "text-yd-pink",
    title: "Super themable",
    text: "Brand it with config, eject the theme, or build your own.",
    href: "/docs/theming",
  },
  {
    icon: Play,
    accent: "text-yd-purple",
    title: "Run in Yaak",
    text: "One click imports the API into Yaak, from a sanitized export.",
    href: "/docs/guides/run-in-yaak",
  },
  {
    icon: Layers,
    accent: "text-yd-blue",
    title: "Zero config",
    text: "The title, description and environment come from Yaak.",
    href: "/docs/project-setup",
  },
];

function Features() {
  return (
    <Section
      title="Everything an API reference needs, without writing it twice"
      description="Use Yaak to document your API, then use yaakdoc to share it with your users."
    >
      <div className="flex flex-col gap-20 md:gap-28">
        {showcases.map((showcase, index) => (
          <Showcase key={showcase.title} {...showcase} reverse={index % 2 === 1} />
        ))}
      </div>

      <div className="mt-20 grid gap-px overflow-hidden rounded-xl border bg-fd-border sm:grid-cols-2 md:mt-28 lg:grid-cols-4">
        {moreFeatures.map(({ icon: Icon, accent, title, text, href }) => (
          <Link
            key={title}
            href={href}
            className="flex flex-col gap-2 bg-fd-background p-6 transition-colors hover:bg-fd-card"
          >
            <Icon className={cn("size-5", accent)} />
            <h3 className="mt-1 font-medium">{title}</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">{text}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Showcase({
  icon: Icon,
  accent,
  title,
  text,
  points,
  href,
  media,
  reverse,
}: (typeof showcases)[number] & { reverse: boolean }) {
  return (
    <div
      className={cn(
        "grid items-center gap-8 md:gap-12",
        reverse ? "md:grid-cols-[3fr_2fr]" : "md:grid-cols-[2fr_3fr]",
      )}
    >
      <div className={cn("flex flex-col", reverse && "md:order-last")}>
        <span className={cn("flex size-10 items-center justify-center rounded-lg border", accent)}>
          <Icon className="size-5" />
        </span>

        <h3 className="mt-5 text-balance font-semibold text-2xl tracking-tight">{title}</h3>

        <p className="mt-3 text-pretty text-fd-muted-foreground">{text}</p>

        <ul className="mt-5 flex flex-col gap-2 text-sm">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground" />
              {point}
            </li>
          ))}
        </ul>

        <DocsLink href={href}>Learn more</DocsLink>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border bg-fd-card shadow-black/5 shadow-xl">
        {media.type === "video" ? (
          <ShowcaseVideo
            src={media.src}
            width={media.width}
            height={media.height}
            label={media.label}
          />
        ) : (
          <ThemedImage
            light={`${media.src}-light.webp`}
            dark={`${media.src}-dark.webp`}
            alt={media.label}
            width={media.width}
            height={media.height}
            sizes="(min-width: 1152px) 660px, (min-width: 768px) 60vw, 100vw"
          />
        )}
      </div>
    </div>
  );
}

const configExample = `{
  "$schema": "./node_modules/yaakdoc/config.schema.json",
  "pagesDir": "./docs",
  "environments": "public",
  "branding": {
    "title": "Acme Store API",
    "url": "https://docs.acme.dev",
    "colors": {
      "primary": "#0f766e"
    }
  },
  "runInYaak": true
}`;

const llmsExample = `# Acme Store API

> Manage products, orders and customers of an Acme storefront.

## Guides › Getting started

- [Introduction](https://docs.acme.dev/index.md): Everything you need to build on the Acme Store API.
- [Quickstart](https://docs.acme.dev/quickstart.md): Make your first request in under a minute.

## Products

- [List products](https://docs.acme.dev/reference/products/list-products.md)
- [Get a product](https://docs.acme.dev/reference/products/get-a-product.md): Retrieve a single product by its id.`;

function ExportToSite() {
  return (
    <Section
      title="One export in, a whole site out"
      description="Point yaakdoc at your Yaak export, add a few lines of config if you like, and get HTML for people and Markdown for machines."
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <Step
            n={1}
            title="Your workspace"
            text="yaak.json, exported from Yaak or by the plugin"
          />

          <Snippet lang="json" title="yaakdoc.config.json (optional)" code={configExample} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Step
            n={2}
            title="Your site"
            text="HTML pages, a search index, a sitemap, and for LLMs:"
          />

          <Snippet lang="md" title="llms.txt" code={llmsExample} />
        </div>
      </div>
    </Section>
  );
}

const flowAccents = ["bg-yd-yellow", "bg-yd-green"];

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-fd-background text-sm",
          flowAccents[n - 1],
        )}
      >
        {n}
      </span>

      <p>
        <span className="font-medium">{title}</span>{" "}
        <span className="text-fd-muted-foreground text-sm">{text}</span>
      </p>
    </div>
  );
}

function Themes({ themes }: { themes: Awaited<ReturnType<typeof getThemes>> }) {
  return (
    <Section
      title="Make it look like yours"
      description="Start with Kiseki, our default theme, then customize it with config or eject it and make your own, fully custom theme."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {themes.map((theme) => (
          <article
            key={theme.package}
            className="flex flex-col overflow-hidden rounded-xl border bg-fd-card"
          >
            {theme.preview ? (
              <div className="border-b">
                <ThemedImage
                  light={theme.preview.light}
                  dark={theme.preview.dark}
                  alt={`${theme.displayName} theme`}
                  sizes="(min-width: 768px) 560px, 100vw"
                />
              </div>
            ) : null}

            <div className="flex flex-1 flex-col gap-2 p-6">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{theme.displayName}</h3>
                {theme.official ? (
                  <span className="rounded-full border px-2 py-0.5 text-fd-muted-foreground text-xs">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="text-fd-muted-foreground text-sm">{theme.description}</p>

              <code className="mt-1 w-fit rounded bg-fd-muted px-1.5 py-0.5 text-xs">
                "theme": "{theme.shortName}"
              </code>

              <div className="mt-auto flex gap-4 pt-4 text-sm">
                {theme.docs ? <DocsLink href={theme.docs}>Docs</DocsLink> : null}

                {theme.demo ? (
                  <a
                    href={theme.demo}
                    className="mt-4 inline-flex items-center gap-1.5 font-medium text-fd-primary hover:underline"
                  >
                    Demo
                    <ArrowUpRight className="size-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        <article className="flex flex-col justify-center gap-4 rounded-xl border border-dashed p-8">
          <span className="flex size-10 items-center justify-center rounded-lg border border-yd-pink/25 bg-yd-pink/10 text-yd-pink">
            <Paintbrush className="size-5" />
          </span>

          <h3 className="font-semibold text-lg">Build your own</h3>

          <p className="text-fd-muted-foreground text-sm">
            A theme is a manifest plus React components. Unstyled building blocks, data hooks and an
            override system do the heavy lifting, and islands keep pages light. Publish it as{" "}
            <code className="rounded bg-fd-muted px-1 py-0.5 text-xs">yaakdoc-theme-*</code> and
            anyone can use it by name.
          </p>

          <div className="flex flex-wrap gap-x-5">
            <DocsLink href="/docs/theming/authoring">Writing a theme</DocsLink>
            <DocsLink href="/docs/theming/publishing">Publishing</DocsLink>
          </div>
        </article>
      </div>
    </Section>
  );
}

function CallToAction() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="rounded-2xl bg-brand-navy dark:border px-6 py-16 text-center text-white sm:px-12">
        <div className="flex flex-col items-center">
          <LogoMark className="size-12" />

          <h2 className="mt-6 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
            Your API docs are one command away
          </h2>

          <p className="mt-4 max-w-xl text-white/70">
            Free and open source under the MIT license. Bring a Yaak export and try it now.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <code className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-sm">
              npx yaakdoc
            </code>

            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 rounded-lg bg-[#b166ff] px-5 py-2.5 font-medium text-sm text-white transition-opacity hover:opacity-90"
            >
              Read the quickstart
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const links = [
    { label: "Docs", href: "/docs" },
    { label: "GitHub", href: site.github },
    { label: "npm", href: site.npm },
    { label: "Demo", href: site.demo },
    { label: "llms.txt", href: "/llms.txt" },
    { label: "Yaak", href: site.yaak },
  ];

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark />
          <Wordmark />
          <span className="ml-2 text-fd-muted-foreground text-sm">MIT License</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-fd-muted-foreground text-sm">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-fd-foreground">
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <p className="mx-auto max-w-6xl px-4 pb-10 text-fd-muted-foreground text-xs sm:px-6">
        {site.disclaimer}
      </p>
    </footer>
  );
}
