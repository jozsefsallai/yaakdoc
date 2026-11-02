"use client";

import {
  CodeBlock,
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  Pre,
} from "fumadocs-ui/components/codeblock";
import { Download, X } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useRef } from "react";
import { defaultThemePackage, type Theme } from "@/lib/themes";

const packageManagers = [
  { name: "npm", install: "npm i -D" },
  { name: "pnpm", install: "pnpm add -D" },
  { name: "yarn", install: "yarn add -D" },
  { name: "bun", install: "bun add -d" },
];

function Code({ code, title }: { code: string; title?: string }) {
  return (
    <CodeBlock title={title} className="my-0">
      <Pre>
        {/* Same markup as Shiki's output, which the code block styles (padding is per line). */}
        <code>
          {code.split("\n").map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static lines
            <Fragment key={index}>
              {index > 0 ? "\n" : null}
              <span className="line">{line}</span>
            </Fragment>
          ))}
        </code>
      </Pre>
    </CodeBlock>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-fd-muted font-medium text-sm">
        {number}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h3 className="pt-0.5 font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** The plugin fetches themes by short name or full package name, except unprefixed bare names. */
function pluginInstallsIt(theme: Theme) {
  return theme.package.includes("/") || theme.shortName !== theme.package;
}

/** An "Install" button that opens the steps to use a theme. */
export function ThemeInstall({ theme }: { theme: Theme }) {
  const dialog = useRef<HTMLDialogElement>(null);

  const bundled = theme.package === defaultThemePackage;
  const config = JSON.stringify({ theme: theme.shortName }, null, 2);

  let step = 0;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fd-primary px-4 py-2 font-medium text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
      >
        <Download className="size-4" />
        Install
      </button>

      {/* A modal <dialog> renders in the top layer, so the header's backdrop-filter can't trap it. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: closes on backdrop clicks; Escape is native */}
      <dialog
        ref={dialog}
        aria-labelledby={`install-${theme.shortName}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border bg-fd-background p-0 text-fd-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <h2 id={`install-${theme.shortName}`} className="font-semibold text-lg">
                Install {theme.displayName}
              </h2>
              <p className="text-fd-muted-foreground text-sm">{theme.package}</p>
            </div>

            <button
              type="button"
              aria-label="Close"
              onClick={() => dialog.current?.close()}
              className="rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
            >
              <X className="size-4" />
            </button>
          </header>

          <ol className="flex flex-col gap-6 overflow-y-auto px-6 py-6">
            {bundled ? (
              <li className="text-fd-muted-foreground text-sm">
                {theme.displayName} comes with yaakdoc and is the default theme, so there's nothing
                to install.
              </li>
            ) : (
              <Step number={++step} title="Install the package">
                <p className="text-fd-muted-foreground text-sm">
                  In the folder with your yaakdoc config:
                </p>

                <CodeBlockTabs
                  defaultValue="npm"
                  groupId="package-manager"
                  persist
                  className="my-0"
                >
                  <CodeBlockTabsList>
                    {packageManagers.map(({ name }) => (
                      <CodeBlockTabsTrigger key={name} value={name}>
                        {name}
                      </CodeBlockTabsTrigger>
                    ))}
                  </CodeBlockTabsList>

                  {packageManagers.map(({ name, install }) => (
                    <CodeBlockTab key={name} value={name}>
                      <Code code={`${install} ${theme.package}`} />
                    </CodeBlockTab>
                  ))}
                </CodeBlockTabs>
              </Step>
            )}

            <Step number={++step} title={bundled ? "Select it (optional)" : "Use the theme"}>
              <p className="text-fd-muted-foreground text-sm">
                Set <code className="text-fd-foreground">theme</code> in your config:
              </p>

              <Code code={config} title="yaakdoc.config.json" />

              {bundled ? null : (
                <>
                  <p className="text-fd-muted-foreground text-sm">
                    Or try it without changing your config:
                  </p>

                  <Code code={`npx yaakdoc --theme ${theme.shortName}`} />
                </>
              )}
            </Step>

            {!bundled && pluginInstallsIt(theme) ? (
              <li className="rounded-lg border bg-fd-card px-4 py-3 text-fd-muted-foreground text-sm">
                Building from Yaak? The{" "}
                <Link href="/docs/yaak-plugin#themes-from-npm" className="text-fd-primary">
                  Yaak plugin
                </Link>{" "}
                installs themes from npm for you, so you only need step 2.
              </li>
            ) : null}
          </ol>

          <footer className="flex flex-wrap gap-x-4 border-t px-6 py-3 text-sm">
            <Link href="/docs/theming" className="text-fd-primary hover:underline">
              Using themes
            </Link>

            {theme.docs ? (
              <Link href={theme.docs} className="text-fd-primary hover:underline">
                {theme.displayName} docs
              </Link>
            ) : (
              <a
                href={theme.npm}
                target="_blank"
                rel="noreferrer"
                className="text-fd-primary hover:underline"
              >
                README on npm
              </a>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}
