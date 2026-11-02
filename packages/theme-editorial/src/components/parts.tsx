import type { Header, KeyValue, PreparedRequest } from "@yaakdoc/core";
import { methodLabel, usePageActions, useRunInYaak } from "@yaakdoc/react";
import { cn } from "@/lib/utils";
import { PageActions, RunInYaakButton } from "./islands";

/** Method in small caps, used everywhere (registered as the `MethodBadge` override). */
export function MethodBadge({
  request,
  className,
}: {
  request: Pick<PreparedRequest, "kind"> & { method?: string | null };
  className?: string;
}) {
  const label = methodLabel(request);

  return (
    <span
      data-yd="method"
      data-method={label.toLowerCase()}
      className={cn(
        "inline-block min-w-[2.75rem] shrink-0 font-sans text-[0.625rem] font-semibold tracking-[0.12em] text-(--method)",
        className,
      )}
    >
      {label === "DELETE" ? "DEL" : label === "OPTIONS" ? "OPT" : label}
    </span>
  );
}

function Remarks({ item }: { item: KeyValue | Header }) {
  const inherited = "inheritedFrom" in item ? item.inheritedFrom : null;

  if (item.enabled && !inherited) {
    return null;
  }

  return (
    <span className="ml-2 font-sans text-xs font-normal text-muted-foreground italic">
      {[
        !item.enabled ? "optional" : null,
        inherited
          ? inherited.model === "workspace"
            ? "from the workspace"
            : `from ${inherited.name}`
          : null,
      ]
        .filter(Boolean)
        .join(", ")}
    </span>
  );
}

/** Name/value pairs as a table with rules above and below (and none between columns). */
export function KeyValueTable({
  items,
  columns = ["Name", "Value"],
}: {
  items: Array<KeyValue | Header>;
  columns?: [string, string];
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border-y-2 border-rule text-sm">
        <thead>
          <tr>
            <th className="ed-kicker w-2/5 border-b border-rule py-2 pr-4 text-left">
              {columns[0]}
            </th>
            <th className="ed-kicker border-b border-rule py-2 text-left">{columns[1]}</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat
            <tr key={index} className="border-b border-border last:border-b-0">
              <td className="py-2 pr-4 align-top font-mono text-[0.8125rem] [overflow-wrap:anywhere]">
                {item.name}
                <Remarks item={item} />
              </td>

              <td className="py-2 align-top font-mono text-[0.8125rem] break-all text-muted-foreground">
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Name/value pairs as side notes in the margin: the name, then its value in a smaller size. */
export function Notes({ title, items }: { title: string; items: Array<KeyValue | Header> }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 first:mt-0">
      <h4 className="ed-kicker mb-2 border-b border-rule pb-1.5 text-foreground">{title}</h4>

      <dl className="divide-y divide-border">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat
          <div key={index} className="py-2">
            <dt className="font-mono text-[0.8125rem] font-medium [overflow-wrap:anywhere]">
              {item.name}
              <Remarks item={item} />
            </dt>
            <dd className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
              {item.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "Run in Yaak" button (when enabled in the config). */
export function RunInYaak({ className }: { className?: string }) {
  const runInYaak = useRunInYaak();
  if (!runInYaak) {
    return null;
  }

  return (
    <div className={className}>
      <RunInYaakButton name={runInYaak.name} dataUrl={runInYaak.dataUrl} />
    </div>
  );
}

/** "Copy page" split button. Rendered only when LLM features are enabled. */
export function CopyPage({
  markdownUrl,
  label = "Copy page",
  className,
}: {
  markdownUrl: string | null;
  /** "Copy page" for the page itself, "Copy section" for sections within a page. */
  label?: string;
  className?: string;
}) {
  const actions = usePageActions(markdownUrl);
  if (!actions) {
    return null;
  }

  return (
    <div className={className}>
      <PageActions
        markdownUrl={actions.markdownUrl}
        absoluteUrl={actions.absoluteUrl}
        openIn={actions.openIn}
        label={label}
      />
    </div>
  );
}
