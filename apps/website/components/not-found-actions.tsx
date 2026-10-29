"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function RequestedPath() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  return (
    <span className="min-w-0 truncate font-mono text-sm">
      {path ?? <span className="text-fd-muted-foreground">…</span>}
    </span>
  );
}

export function SearchButton() {
  const { enabled, setOpenSearch } = useSearchContext();
  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="inline-flex items-center gap-2 rounded-lg border bg-fd-card px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fd-accent"
    >
      <Search className="size-4" />
      Search the docs
    </button>
  );
}
