import { useSite } from "../context";
import { SearchDialog, SearchTrigger } from "../islands/search";
import { overridable } from "../overrides";

/** Search button and dialog (renders nothing when search is disabled). */
export const Search = overridable("Search", function Search({ className }: { className?: string }) {
  const site = useSite();

  if (!site.searchUrl) {
    return null;
  }

  return (
    <>
      <SearchTrigger {...(className ? { className } : {})} />
      <SearchDialog url={site.searchUrl} />
    </>
  );
});
