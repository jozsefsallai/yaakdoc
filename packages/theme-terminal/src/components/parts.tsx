import type { Header, KeyValue, PreparedRequest } from "@yaakdoc/core";
import { methodLabel, usePageActions, useRunInYaak } from "@yaakdoc/react";
import { cn } from "@/lib/utils";
import { PageActions, RunInYaakButton } from "./islands";

/** Method as colored text, used everywhere (registered as the `MethodBadge` override). */
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
      className={cn("inline-block w-[6ch] shrink-0 font-bold text-(--method)", className)}
    >
      {label === "OPTIONS" ? "OPTS" : label}
    </span>
  );
}

/** A `[tag]` next to a parameter name. */
function Tag({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <span
      className="ml-[1ch] inline-block text-xs font-normal whitespace-nowrap text-muted-foreground"
      title={title}
    >
      [{children}]
    </span>
  );
}

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
      <table className="w-full border-collapse border border-dashed text-[0.8125rem]">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column}
                className={cn(
                  "border border-dashed px-3 py-1.5 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase",
                  index === 0 && "w-2/5",
                )}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat
            <tr key={index}>
              <td className="border border-dashed px-3 py-1.5 align-top font-bold [overflow-wrap:anywhere]">
                {item.name}

                {!item.enabled ? <Tag title="Not sent by default">optional</Tag> : null}

                {"inheritedFrom" in item && item.inheritedFrom ? (
                  <Tag
                    title={`Inherited from ${item.inheritedFrom.model} "${item.inheritedFrom.name}"`}
                  >
                    {item.inheritedFrom.model === "workspace"
                      ? "workspace"
                      : `from ${item.inheritedFrom.name}`}
                  </Tag>
                ) : null}
              </td>

              <td className="border border-dashed px-3 py-1.5 align-top break-all text-muted-foreground">
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
