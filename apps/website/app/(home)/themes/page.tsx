import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeBrowser, ThemeBrowserFallback } from "@/components/themes/theme-browser";
import { getThemes } from "@/lib/themes";

export const revalidate = 3600;

const description =
  "Browse yaakdoc themes published on npm, from the official Kiseki theme to community themes.";

export const metadata: Metadata = {
  title: "Themes",
  description,
  openGraph: { title: "Themes", description },
};

export default async function ThemesPage() {
  const themes = await getThemes();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">Themes</h1>
        <p className="mt-4 text-pretty text-fd-muted-foreground text-lg">
          Pick a look for your docs. Every package on npm with the{" "}
          <code className="rounded bg-fd-muted px-1 py-0.5 text-base">yaakdoc-theme</code> keyword
          shows up here. Use one by setting its name as <code className="text-base">"theme"</code>{" "}
          in your config.
        </p>
        <div className="flex flex-wrap gap-x-5">
          <ThemeDocsLink href="/docs/theming">Using themes</ThemeDocsLink>
          <ThemeDocsLink href="/docs/theming/authoring">Writing a theme</ThemeDocsLink>
          <ThemeDocsLink href="/docs/theming/publishing">Publishing</ThemeDocsLink>
        </div>
      </div>

      <Suspense fallback={<ThemeBrowserFallback themes={themes} />}>
        <ThemeBrowser themes={themes} />
      </Suspense>
    </main>
  );
}

function ThemeDocsLink({ href, children }: { href: string; children: React.ReactNode }) {
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
