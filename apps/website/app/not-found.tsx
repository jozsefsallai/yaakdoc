import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RequestedPath, SearchButton } from "@/components/not-found-actions";
import { baseOptions } from "@/lib/layout.shared";

export const metadata: Metadata = {
  title: "Page not found",
};

const body = `{
  "error": "not_found",
  "message": "No page lives at this URL."
}`;

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-24 sm:px-6">
        <p className="font-semibold text-7xl text-yd-orange tracking-tight sm:text-8xl">404</p>

        <h1 className="mt-4 font-semibold text-3xl tracking-tight">Page not found</h1>

        <p className="mt-3 text-fd-muted-foreground text-lg">
          This request didn't match any page. Here's what the server had to say:
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border bg-fd-card">
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <span className="rounded-md bg-yd-green/10 px-2 py-0.5 font-mono font-semibold text-xs text-yd-green">
              GET
            </span>

            <RequestedPath />

            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-mono text-xs">
              <span className="size-1.5 rounded-full bg-yd-orange" />
              404 Not Found
            </span>
          </div>

          <ServerCodeBlock
            code={body}
            lang="json"
            themes={{ light: "github-light", dark: "github-dark" }}
            codeblock={{ className: "my-0 rounded-none border-0 bg-transparent" }}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
          >
            Read the docs
            <ArrowRight className="size-4" />
          </Link>

          <SearchButton />

          <Link
            href="/"
            className="inline-flex items-center rounded-lg px-5 py-2.5 font-medium text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground"
          >
            Back home
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
