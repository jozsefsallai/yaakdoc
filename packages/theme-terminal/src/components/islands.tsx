/**
 * Terminal islands: small interactive components hydrated on the client. Props must be
 * serializable, and islands can't use yaakdoc context hooks (pass data through props instead).
 */
import {
  createIsland,
  type EnvironmentOption,
  LLM_PROVIDERS,
  type LlmProvider,
  openInUrl,
  openSearch,
  RUN_IN_YAAK_BADGE,
  resolveUrl,
  useColorMode,
  useCopy,
  useEnvironment,
  useNavToggle,
  useRunInYaakHref,
  useSearch,
  useSearchDialog,
  useSearchShortcutLabel,
} from "@yaakdoc/react/islands";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** A bracketed text button: `[ copy ]`. */
const textButton =
  "inline-flex shrink-0 items-center gap-[0.5ch] whitespace-nowrap px-[0.5ch] text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground [&_svg]:size-3.5";

/**
 * Radix returns focus to the menu trigger without `preventScroll`, which makes browsers scroll
 * when the trigger is in the sticky header. Restore focus ourselves, without scrolling.
 */
function useRestoreFocus() {
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    triggerRef.current?.focus({ preventScroll: true });
  };

  return { triggerRef, onCloseAutoFocus };
}

/** Color mode switch in the status line: `light` / `dark`. */
export const ThemeToggle = createIsland("terminal:theme-toggle", function ThemeToggle() {
  const { resolved, toggle } = useColorMode();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="h-full px-[1ch] hover:bg-black/15"
    >
      <span className="hidden dark:inline">dark</span>
      <span className="dark:hidden">light</span>
    </button>
  );
});

export const CopyCode = createIsland(
  "terminal:copy-code",
  function CopyCode({ target, className }: { target: string; className?: string }) {
    const { copied, copy } = useCopy();

    return (
      <button
        type="button"
        className={cn(textButton, "h-full", className)}
        onClick={() => copy({ target })}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        [{copied ? "copied" : "copy"}]
      </button>
    );
  },
);

export type PageActionsProps = {
  markdownUrl: string;
  /** Absolute Markdown URL when the site URL is known; resolved from the location otherwise. */
  absoluteUrl: string | null;
  openIn: LlmProvider[];
  label?: string;
};

export const PageActions = createIsland(
  "terminal:page-actions",
  function PageActions({
    markdownUrl,
    absoluteUrl,
    openIn,
    label = "Copy page",
  }: PageActionsProps) {
    const { copied, copy } = useCopy();
    const { triggerRef, onCloseAutoFocus } = useRestoreFocus();

    const open = (provider: LlmProvider) => {
      const url = absoluteUrl ?? resolveUrl(markdownUrl);
      window.open(openInUrl(provider, url), "_blank", "noopener,noreferrer");
    };

    return (
      <div className="inline-flex shrink-0 items-center border border-dashed text-xs">
        <button
          type="button"
          className={cn(textButton, "h-6 px-[1ch]")}
          onClick={() => copy({ url: markdownUrl })}
        >
          {copied ? "copied" : label.toLowerCase()}
        </button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild ref={triggerRef}>
            <button
              type="button"
              className={cn(textButton, "h-6 border-l border-dashed px-[1ch]")}
              aria-label="More page actions"
            >
              <ChevronDownIcon />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60" onCloseAutoFocus={onCloseAutoFocus}>
            <DropdownMenuLabel>Use with AI</DropdownMenuLabel>

            <DropdownMenuItem onSelect={() => copy({ url: markdownUrl })}>
              <CopyIcon />
              Copy as Markdown
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <a href={markdownUrl} target="_blank" rel="noopener">
                <FileTextIcon />
                View as Markdown
              </a>
            </DropdownMenuItem>

            {openIn.length > 0 ? <DropdownMenuSeparator /> : null}

            {openIn.map((provider) => (
              <DropdownMenuItem key={provider} onSelect={() => open(provider)}>
                <ExternalLinkIcon />
                Open in {LLM_PROVIDERS[provider].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);

export const MobileNavToggle = createIsland(
  "terminal:mobile-nav",
  function MobileNavToggle({ target }: { target: string }) {
    const { open, setOpen, toggle } = useNavToggle(target);

    return (
      <>
        <button
          type="button"
          className={cn(textButton, "h-7 text-sm lg:hidden")}
          aria-expanded={open}
          aria-controls={target.replace(/^#/, "")}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={toggle}
        >
          {open ? "[x]" : "[≡]"}
        </button>

        {open
          ? createPortal(
              <div
                aria-hidden="true"
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setOpen(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  },
);

/** Status line menu to switch the environment used in examples and the variables table. */
export const EnvironmentMenu = createIsland(
  "terminal:environment",
  function EnvironmentMenu({
    environments,
    defaultId,
  }: {
    environments: EnvironmentOption[];
    defaultId: string;
  }) {
    const { selected, select, current } = useEnvironment(environments, defaultId);
    const { triggerRef, onCloseAutoFocus } = useRestoreFocus();

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild ref={triggerRef}>
          <button
            type="button"
            className="h-full px-[1ch] whitespace-nowrap hover:bg-black/15"
            aria-label={`Environment: ${current?.name ?? ""}. Change environment`}
            title="Environment used for examples"
          >
            env:{current?.name}
            <ChevronUpIcon className="ml-[0.5ch] inline size-3 align-[-0.1em]" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="end"
          className="w-52"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DropdownMenuLabel>Environment</DropdownMenuLabel>

          <DropdownMenuRadioGroup value={selected} onValueChange={select}>
            {environments.map((env) => (
              <DropdownMenuRadioItem key={env.id} value={env.id}>
                {env.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

/** Small button copying a literal text (e.g. a request URL). */
export const CopyText = createIsland(
  "terminal:copy-text",
  function CopyText({ text, label }: { text: string; label: string }) {
    const { copied, copy } = useCopy();

    return (
      <button
        type="button"
        className={cn(textButton, "h-full")}
        onClick={() => copy({ text })}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  },
);

/** Opens Yaak and prompts to import the documented API. */
export const RunInYaakButton = createIsland(
  "terminal:run-in-yaak",
  function RunInYaakButton({ name, dataUrl }: { name: string; dataUrl: string }) {
    const href = useRunInYaakHref(name, dataUrl);

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        title="Import this API into Yaak"
        className="block shrink-0 transition-opacity hover:opacity-90"
      >
        <img
          src={RUN_IN_YAAK_BADGE}
          alt="Run in Yaak"
          width={140}
          height={32}
          className="h-7 w-auto"
        />
      </a>
    );
  },
);

/** Opens the search dialog, styled as a prompt: `/ search…`. */
export const SearchButton = createIsland("terminal:search-button", function SearchButton() {
  const shortcut = useSearchShortcutLabel();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={openSearch}
      className="flex h-8 w-full items-center gap-[1ch] border border-dashed px-[1ch] text-[0.8125rem] text-muted-foreground outline-none hover:border-solid hover:text-foreground focus-visible:border-solid focus-visible:border-primary"
    >
      <span className="text-primary">/</span>
      <span className="flex-1 text-left">search</span>
      <kbd className="text-[0.6875rem]">{shortcut}</kbd>
    </button>
  );
});

const KIND_LABELS = { page: "pages", folder: "sections", request: "endpoints" } as const;

/** Search over page, folder and request titles and descriptions, with a prompt-style input. */
export const SearchCommand = createIsland(
  "terminal:search",
  function SearchCommand({ url }: { url: string }) {
    const { open, setOpen, restoreFocus } = useSearchDialog();
    const search = useSearch(url, { enabled: open });
    const list = useRef<HTMLDivElement>(null);

    // Keep the highlighted result in view while moving with the arrow keys.
    useEffect(() => {
      list.current
        ?.querySelector(`[data-index="${search.active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, [search.active]);

    const onOpenChange = (next: boolean) => {
      setOpen(next);

      if (!next) {
        search.setQuery("");
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            // Return focus without scrolling (triggers live in the sticky header and sidebar).
            event.preventDefault();
            restoreFocus();
          }}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages and endpoints by title and description.
          </DialogDescription>

          <div className="flex items-center gap-[1ch] border-b px-4">
            <span aria-hidden="true" className="text-primary">
              /
            </span>

            <input
              type="search"
              autoFocus
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
              onKeyDown={search.onKeyDown}
              placeholder="grep the docs..."
              aria-label="Search the docs"
              aria-controls="terminal-search-results"
              aria-activedescendant={
                search.results.length > 0 ? `terminal-search-${search.active}` : undefined
              }
              role="combobox"
              aria-expanded={search.results.length > 0}
              className="h-12 min-w-0 flex-1 bg-transparent caret-primary outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />

            <kbd className="text-xs text-muted-foreground">esc</kbd>
          </div>

          <div
            ref={list}
            id="terminal-search-results"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain py-2 empty:hidden"
          >
            {search.results.map((entry, index) => {
              const previous = search.results[index - 1];
              const heading = previous?.kind !== entry.kind ? KIND_LABELS[entry.kind] : null;

              return (
                <div key={entry.href} role="presentation">
                  {heading ? (
                    <p
                      role="presentation"
                      className="px-4 pt-2 pb-1 text-xs text-muted-foreground before:content-['#_']"
                    >
                      {heading}
                    </p>
                  ) : null}

                  <a
                    href={entry.href}
                    id={`terminal-search-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === search.active}
                    onMouseMove={() => search.setActive(index)}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-[1ch] px-4 py-1 text-[0.8125rem] aria-selected:bg-primary aria-selected:text-primary-foreground"
                  >
                    <span aria-hidden="true" className="w-[1ch] shrink-0">
                      {index === search.active ? ">" : ""}
                    </span>

                    {entry.kind === "request" && entry.method ? (
                      <span
                        data-method={entry.method.toLowerCase()}
                        className="w-[6ch] shrink-0 font-bold text-(--method) group-aria-selected:text-primary-foreground"
                      >
                        {entry.method === "OPTIONS" ? "OPTS" : entry.method}
                      </span>
                    ) : (
                      <span className="w-[6ch] shrink-0 text-muted-foreground group-aria-selected:text-primary-foreground">
                        {entry.kind === "folder" ? "dir" : "page"}
                      </span>
                    )}

                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-bold">{entry.title}</span>

                      {entry.description || entry.section ? (
                        <span className="text-muted-foreground group-aria-selected:text-primary-foreground/80">
                          {" — "}
                          {entry.section ? `${entry.section}${entry.description ? " · " : ""}` : ""}
                          {entry.description}
                        </span>
                      ) : null}
                    </span>
                  </a>
                </div>
              );
            })}
          </div>

          {search.query.trim() && search.results.length === 0 ? (
            <p className="px-4 py-8 text-[0.8125rem] text-muted-foreground">
              {search.loading
                ? "searching..."
                : search.error
                  ? "search: unavailable right now"
                  : `search: no matches for '${search.query.trim()}'`}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  },
);

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Keyboard shortcuts: `[` and `]` go to the previous and next page (`/` search is built in). */
export const KeyboardShortcuts = createIsland(
  "terminal:keys",
  function KeyboardShortcuts({ previous, next }: { previous: string | null; next: string | null }) {
    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (
          event.defaultPrevented ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          isTyping(event.target) ||
          document.querySelector("[role=dialog]")
        ) {
          return;
        }

        if (event.key === "[" && previous) {
          window.location.assign(previous);
        } else if (event.key === "]" && next) {
          window.location.assign(next);
        }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [previous, next]);

    return null;
  },
);
