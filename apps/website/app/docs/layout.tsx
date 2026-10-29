import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{
        footer: <p className="px-2 pt-2 text-fd-muted-foreground text-xs">{site.disclaimer}</p>,
      }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
