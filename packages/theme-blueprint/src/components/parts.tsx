import type { Header, KeyValue, PreparedRequest } from "@yaakdoc/core";
import { methodLabel, usePageActions, useRunInYaak } from "@yaakdoc/react";
import { cn } from "@/lib/utils";
import { PageActions, RunInYaakButton } from "./islands";

/** Method in an outlined box, used everywhere (registered as the `MethodBadge` override). */
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
        "inline-flex h-[1.125rem] min-w-[2.75rem] shrink-0 items-center justify-center border border-(--method) px-1 font-mono text-[0.625rem] leading-none font-medium tracking-wider text-(--method)",
        className,
      )}
    >
      {label === "DELETE" ? "DEL" : label === "OPTIONS" ? "OPT" : label}
    </span>
  );
}

/** A small outlined note next to a parameter name. */
function Note({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <span
      className="ml-2 inline-block border border-dashed px-1 align-middle font-sans text-[0.6875rem] font-normal whitespace-nowrap text-muted-foreground"
      title={title}
    >
      {children}
    </span>
  );
}

/** Name/value pairs as a numbered parts list. */
export function KeyValueTable({
  items,
  columns = ["Name", "Value"],
}: {
  items: Array<KeyValue | Header>;
  columns?: [string, string];
}) {
  if (items.length === 0) return null;

  const head =
    "border border-border-strong bg-muted/70 px-3 py-1.5 text-left font-mono text-[0.6875rem] font-medium tracking-[0.12em] uppercase";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border-strong text-sm">
        <thead>
          <tr>
            <th className={cn(head, "w-12 text-center")}>Item</th>
            <th className={cn(head, "w-2/5")}>{columns[0]}</th>
            <th className={head}>{columns[1]}</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat
            <tr key={index}>
              <td className="border px-3 py-1.5 text-center align-top font-mono text-xs text-muted-foreground">
                {index + 1}
              </td>

              <td className="border px-3 py-1.5 align-top font-mono text-[0.8125rem] font-medium [overflow-wrap:anywhere]">
                {item.name}

                {!item.enabled ? <Note title="Not sent by default">optional</Note> : null}

                {"inheritedFrom" in item && item.inheritedFrom ? (
                  <Note
                    title={`Inherited from ${item.inheritedFrom.model} "${item.inheritedFrom.name}"`}
                  >
                    {item.inheritedFrom.model === "workspace"
                      ? "workspace"
                      : item.inheritedFrom.name}
                  </Note>
                ) : null}
              </td>

              <td className="border px-3 py-1.5 align-top font-mono text-[0.8125rem] break-all text-muted-foreground">
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
