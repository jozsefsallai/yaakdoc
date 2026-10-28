/**
 * Kiseki islands: small interactive components hydrated on the client. Props must be serializable,
 * and islands can't use yaakdoc context hooks (pass data through props instead).
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
  SearchShortcut,
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
  CopyIcon,
  CornerDownLeftIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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

export const ThemeToggle = createIsland("kiseki:theme-toggle", function ThemeToggle() {
  const { resolved, toggle } = useColorMode();

  const label = resolved === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={label} title={label}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
});

export const CopyCode = createIsland(
  "kiseki:copy-code",
  function CopyCode({ target, className }: { target: string; className?: string }) {
    const { copied, copy } = useCopy();

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "text-code-panel-foreground/70 hover:bg-white/10 hover:text-code-panel-foreground",
          className,
        )}
        onClick={() => copy({ target })}
        aria-label={copied ? "Copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
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
  "kiseki:page-actions",
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
      <div className="inline-flex shrink-0 items-center rounded-md border bg-background shadow-xs">
        <Button
          variant="ghost"
          size="xs"
          className="rounded-r-none border-r font-normal text-muted-foreground"
          onClick={() => copy({ url: markdownUrl })}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : label}
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild ref={triggerRef}>
            <Button
              variant="ghost"
              size="xs"
              className="rounded-l-none text-muted-foreground"
              aria-label="More page actions"
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={onCloseAutoFocus}>
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
  "kiseki:mobile-nav",
  function MobileNavToggle({ target }: { target: string }) {
    const { open, setOpen, toggle } = useNavToggle(target);

    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls={target.replace(/^#/, "")}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={toggle}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </Button>

        {open
          ? createPortal(
              <div
                aria-hidden="true"
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
                onClick={() => setOpen(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  },
);

/** Small colored dot for an environment (its Yaak color). */
export const EnvironmentDot = ({ color }: { color: string | null }) => (
  <span
    aria-hidden="true"
    className="size-1.5 shrink-0 rounded-full bg-(--env)"
    style={{ "--env": color ?? "var(--method-get)" } as React.CSSProperties}
  />
);

/** Header dropdown to switch the environment used in examples and the variables table. */
export const EnvironmentMenu = createIsland(
  "kiseki:environment",
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
          <Button
            variant="outline"
            size="xs"
            className="mr-2 rounded-full font-normal text-muted-foreground"
            aria-label={`Environment: ${current?.name ?? ""}. Change environment`}
            title="Environment used for examples"
          >
            <EnvironmentDot color={current?.color ?? null} />
            {current?.name}
            <ChevronDownIcon className="size-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={onCloseAutoFocus}>
          <DropdownMenuLabel>Environment</DropdownMenuLabel>

          <DropdownMenuRadioGroup value={selected} onValueChange={select}>
            {environments.map((env) => (
              <DropdownMenuRadioItem key={env.id} value={env.id}>
                <EnvironmentDot color={env.color} />
                {env.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

/** Small icon button copying a literal text (e.g. a request URL). */
export const CopyText = createIsland(
  "kiseki:copy-text",
  function CopyText({ text, label }: { text: string; label: string }) {
    const { copied, copy } = useCopy();

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => copy({ text })}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    );
  },
);

/** Opens Yaak and prompts to import the documented API. */
export const RunInYaakButton = createIsland(
  "kiseki:run-in-yaak",
  function RunInYaakButton({ name, dataUrl }: { name: string; dataUrl: string }) {
    const href = useRunInYaakHref(name, dataUrl);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        title="Import this API into Yaak"
        className="block shrink-0 rounded-[4px] transition-opacity hover:opacity-90"
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

/** Opens the search dialog: a wide field (sidebar) or an icon button (header on small screens). */
export const SearchButton = createIsland(
  "kiseki:search-button",
  function SearchButton({ variant = "field" }: { variant?: "field" | "icon" }) {
    const shortcut = useSearchShortcutLabel();

    if (variant === "icon") {
      return (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          title={`Search (${shortcut})`}
          aria-haspopup="dialog"
          onClick={openSearch}
        >
          <SearchIcon />
        </Button>
      );
    }

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openSearch}
        className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-[0.8125rem] text-muted-foreground shadow-xs transition-colors outline-none hover:text-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <SearchIcon className="size-3.5" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-sm border bg-muted px-1 font-sans text-[0.6875rem] leading-4">
          <SearchShortcut />
        </kbd>
      </button>
    );
  },
);

const KIND_LABELS = { page: "Pages", folder: "Sections", request: "Endpoints" } as const;

/** Cmd+K search over page, folder and request titles and descriptions. */
export const SearchCommand = createIsland(
  "kiseki:search",
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

          <div className="flex items-center gap-2 border-b px-4">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />

            <input
              type="search"
              autoFocus
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
              onKeyDown={search.onKeyDown}
              placeholder="Search the docs..."
              aria-label="Search the docs"
              aria-controls="kiseki-search-results"
              aria-activedescendant={
                search.results.length > 0 ? `kiseki-search-${search.active}` : undefined
              }
              role="combobox"
              aria-expanded={search.results.length > 0}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />

            <kbd className="rounded-sm border bg-muted px-1.5 font-sans text-[0.6875rem] leading-5 text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div
            ref={list}
            id="kiseki-search-results"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2 empty:hidden"
          >
            {search.results.map((entry, index) => {
              const previous = search.results[index - 1];
              const heading = previous?.kind !== entry.kind ? KIND_LABELS[entry.kind] : null;

              return (
                <div key={entry.href} role="presentation">
                  {heading ? (
                    <p
                      role="presentation"
                      className="px-2 pt-2 pb-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {heading}
                    </p>
                  ) : null}

                  <a
                    href={entry.href}
                    id={`kiseki-search-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === search.active}
                    onMouseMove={() => search.setActive(index)}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    {entry.kind === "request" && entry.method ? (
                      <MethodBadgeLabel method={entry.method} />
                    ) : entry.kind === "folder" ? (
                      <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{entry.title}</span>

                      {entry.description || entry.section ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.section ? `${entry.section}${entry.description ? " · " : ""}` : ""}
                          {entry.description}
                        </span>
                      ) : null}
                    </span>

                    {index === search.active ? (
                      <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : null}
                  </a>
                </div>
              );
            })}
          </div>

          {search.query.trim() && search.results.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {search.loading
                ? "Loading..."
                : search.error
                  ? "Search is unavailable right now."
                  : `No results for “${search.query.trim()}”`}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  },
);

/** Method badge from a label (search results only carry the label). */
function MethodBadgeLabel({ method }: { method: string }) {
  const label = method === "DELETE" ? "DEL" : method === "OPTIONS" ? "OPT" : method;

  return (
    <span
      data-yd="method"
      data-method={method.toLowerCase()}
      className="inline-flex h-[1.125rem] min-w-[2.6rem] shrink-0 items-center justify-center rounded-[4px] bg-[color-mix(in_oklch,var(--method)_13%,transparent)] px-1 font-mono text-[0.625rem] leading-none font-semibold tracking-tight text-(--method)"
    >
      {label}
    </span>
  );
}
