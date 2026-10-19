import type { Header, KeyValue, PreparedRequest } from "@yaakdoc/core";
import { methodLabel, usePageActions, useRunInYaak } from "@yaakdoc/react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageActions, RunInYaakButton } from "./islands";

/** Method badge, used everywhere (registered as the `MethodBadge` override, so the nav uses it too). */
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
        "inline-flex h-[1.125rem] min-w-[2.6rem] shrink-0 items-center justify-center rounded-[4px] px-1 font-mono text-[0.625rem] leading-none font-semibold tracking-tight text-(--method)",
        "bg-[color-mix(in_oklch,var(--method)_13%,transparent)]",
        className,
      )}
    >
      {label === "DELETE" ? "DEL" : label === "OPTIONS" ? "OPT" : label}
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-2/5">{columns[0]}</TableHead>
          <TableHead>{columns[1]}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat
          <TableRow key={index}>
            <TableCell className="font-mono text-[0.8125rem] font-medium break-all">
              {item.name}

              {!item.enabled ? (
                <Badge
                  variant="outline"
                  className="ml-2 align-middle font-sans font-normal text-muted-foreground"
                  title="Not sent by default"
                >
                  optional
                </Badge>
              ) : null}

              {"inheritedFrom" in item && item.inheritedFrom ? (
                <Badge
                  variant="secondary"
                  className="ml-2 align-middle font-sans font-normal text-muted-foreground"
                  title={`Inherited from ${item.inheritedFrom.model} "${item.inheritedFrom.name}"`}
                >
                  {item.inheritedFrom.model === "workspace" ? "workspace" : item.inheritedFrom.name}
                </Badge>
              ) : null}
            </TableCell>

            <TableCell className="font-mono text-[0.8125rem] break-all text-muted-foreground">
              {item.value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
