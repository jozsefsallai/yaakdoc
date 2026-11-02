import { ArrowRight, ArrowUpRight, Download, Paintbrush } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemedImage } from "@/components/home/screenshot";
import { cn } from "@/lib/cn";
import { defaultThemePackage, type Theme } from "@/lib/themes";
import { ThemeInstall } from "./theme-install";

const compact = new Intl.NumberFormat("en", { notation: "compact" });

function Preview({ theme, sizes }: { theme: Theme; sizes: string }) {
  const { preview } = theme;
  const alt = `${theme.displayName} theme`;

  if (!preview) {
    return (
      <div className="flex aspect-16/10 items-center justify-center bg-fd-muted text-fd-muted-foreground">
        <Paintbrush className="size-8 opacity-40" />
      </div>
    );
  }

  if (preview.light.startsWith("/")) {
    return <ThemedImage light={preview.light} dark={preview.dark} alt={alt} sizes={sizes} />;
  }

  // Previews come from any host the theme's author chose, so they skip next/image's optimizer.
  return (
    // biome-ignore lint/performance/noImgElement: remote previews from arbitrary hosts
    <img
      src={preview.light}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="block aspect-16/10 w-full bg-fd-muted object-cover object-top"
    />
  );
}

function CardLink({ href, children }: { href: string; children: ReactNode }) {
  const className =
    "inline-flex items-center gap-1 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
        <ArrowRight className="size-3" />
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight className="size-3" />
    </a>
  );
}

export function ThemeCard({
  theme,
  sizes = "(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw",
  className,
}: {
  theme: Theme;
  sizes?: string;
  className?: string;
}) {
  const meta = [
    theme.version ? `v${theme.version}` : null,
    theme.author ? `by ${theme.author}` : null,
  ].filter(Boolean);

  return (
    <article
      className={cn("flex flex-col overflow-hidden rounded-xl border bg-fd-card", className)}
    >
      <div className="border-b">
        <Preview theme={theme} sizes={sizes} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-lg">{theme.displayName}</h3>
          {theme.official ? (
            <span className="rounded-full border border-yd-purple/25 bg-yd-purple/10 px-2 py-0.5 text-xs text-yd-purple">
              Official
            </span>
          ) : null}
          {theme.package === defaultThemePackage ? (
            <span className="rounded-full border px-2 py-0.5 text-fd-muted-foreground text-xs">
              Default
            </span>
          ) : null}
        </div>

        {meta.length || theme.downloads !== undefined ? (
          <p className="flex flex-wrap items-center gap-x-3 text-fd-muted-foreground text-xs">
            {meta.length ? <span>{meta.join(" · ")}</span> : null}
            {theme.downloads !== undefined ? (
              <span className="inline-flex items-center gap-1" title="Downloads in the last month">
                <Download className="size-3" />
                {compact.format(theme.downloads)}/month
              </span>
            ) : null}
          </p>
        ) : null}

        <p className="text-fd-muted-foreground text-sm">{theme.description}</p>

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {theme.docs ? <CardLink href={theme.docs}>Docs</CardLink> : null}
            {theme.demo ? <CardLink href={theme.demo}>Demo</CardLink> : null}
            <CardLink href={theme.npm}>npm</CardLink>
            {theme.repository ? <CardLink href={theme.repository}>Source</CardLink> : null}
          </div>
          <ThemeInstall theme={theme} />
        </div>
      </div>
    </article>
  );
}
