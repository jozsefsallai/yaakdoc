"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  criteriaParams,
  defaultCriteria,
  filterThemes,
  paginate,
  parseCriteria,
  type ThemeCriteria,
  type ThemeSort,
  type ThemeType,
} from "@/lib/theme-filter";
import { defaultThemePackage, type Theme } from "@/lib/themes";
import { ThemeCard } from "./theme-card";

type State = ThemeCriteria & { page: number };

const typeLabels: Record<ThemeType, string> = {
  all: "All",
  official: "Official",
  community: "Community",
};

const sortLabels: Record<ThemeSort, string> = {
  popular: "Most downloaded",
  updated: "Recently updated",
  name: "Name",
};

/** The theme list, with its search, filters and page kept in the URL. */
export function ThemeBrowser({ themes }: { themes: Theme[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const state = parseCriteria(useSearchParams());

  const [draft, setDraft] = useState(state.query);

  function update(next: Partial<State>) {
    const params = criteriaParams({ ...state, page: 1, ...next }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  // Debounce typing into the URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the draft should trigger this
  useEffect(() => {
    if (draft.trim() === state.query) {
      return;
    }

    const timeout = setTimeout(() => update({ query: draft.trim() }), 200);
    return () => clearTimeout(timeout);
  }, [draft]);

  return (
    <ThemeBrowserView
      themes={themes}
      state={state}
      draft={draft}
      onDraft={setDraft}
      onChange={update}
      onReset={() => {
        setDraft("");
        update(defaultCriteria);
      }}
    />
  );
}

/** The unfiltered first page, rendered on the server until the URL is known. */
export function ThemeBrowserFallback({ themes }: { themes: Theme[] }) {
  return <ThemeBrowserView themes={themes} state={{ ...defaultCriteria, page: 1 }} draft="" />;
}

function ThemeBrowserView({
  themes,
  state,
  draft,
  onDraft,
  onChange,
  onReset,
}: {
  themes: Theme[];
  state: State;
  draft: string;
  onDraft?: (query: string) => void;
  onChange?: (next: Partial<State>) => void;
  onReset?: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const results = filterThemes(themes, state, defaultThemePackage);
  const { items, page, pages } = paginate(results, state.page);
  const disabled = !onChange;

  function goTo(next: number) {
    onChange?.({ page: next });

    const top = listRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div ref={listRef} className="scroll-mt-24">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search themes</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fd-muted-foreground" />
          <input
            type="search"
            value={draft}
            onChange={(event) => onDraft?.(event.target.value)}
            disabled={disabled}
            placeholder="Search themes"
            className="w-full rounded-lg border bg-fd-card py-2 pr-3 pl-9 text-sm outline-none placeholder:text-fd-muted-foreground focus-visible:ring-2 focus-visible:ring-fd-ring"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="inline-flex rounded-lg border bg-fd-card p-0.5">
            <legend className="sr-only">Type</legend>
            {(Object.keys(typeLabels) as ThemeType[]).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={state.type === type}
                disabled={disabled}
                onClick={() => onChange?.({ type })}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                  state.type === type
                    ? "bg-fd-primary text-fd-primary-foreground"
                    : "text-fd-muted-foreground hover:text-fd-foreground",
                )}
              >
                {typeLabels[type]}
              </button>
            ))}
          </fieldset>

          <label className="inline-flex items-center gap-2 text-fd-muted-foreground text-sm">
            Sort by
            <select
              value={state.sort}
              disabled={disabled}
              onChange={(event) => onChange?.({ sort: event.target.value as ThemeSort })}
              className="rounded-lg border bg-fd-card px-2.5 py-2 text-fd-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
            >
              {(Object.keys(sortLabels) as ThemeSort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabels[sort]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mb-4 text-fd-muted-foreground text-sm" aria-live="polite">
        {results.length === 1 ? "1 theme" : `${results.length} themes`}
      </p>

      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((theme) => (
            <ThemeCard key={theme.package} theme={theme} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-fd-muted-foreground">No themes match your search.</p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-fd-card px-4 py-2 font-medium text-sm transition-colors hover:bg-fd-accent"
          >
            <X className="size-4" />
            Clear filters
          </button>
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
          <PageButton
            label="Previous page"
            disabled={disabled || page === 1}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </PageButton>
          {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
            <PageButton
              key={number}
              label={`Page ${number}`}
              current={number === page}
              disabled={disabled}
              onClick={() => goTo(number)}
            >
              {number}
            </PageButton>
          ))}
          <PageButton
            label="Next page"
            disabled={disabled || page === pages}
            onClick={() => goTo(page + 1)}
          >
            <ChevronRight className="size-4" />
          </PageButton>
        </nav>
      ) : null}
    </div>
  );
}

function PageButton({
  label,
  current,
  disabled,
  onClick,
  children,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg font-medium text-sm transition-colors disabled:pointer-events-none disabled:opacity-40",
        current
          ? "bg-fd-primary text-fd-primary-foreground"
          : "border bg-fd-card hover:bg-fd-accent",
      )}
    >
      {children}
    </button>
  );
}
