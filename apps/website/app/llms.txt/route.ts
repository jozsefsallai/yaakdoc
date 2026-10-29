import type { Node } from "fumadocs-core/page-tree";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const pages = new Map(source.getPages().map((page) => [page.url, page]));

  const lines = [
    "# yaakdoc",
    "",
    `> ${site.description}`,
    "",
    `yaakdoc reads a Yaak export (\`yaak.json\`) and builds a documentation site with the CLI (\`npx yaakdoc\`), the Yaak plugin, or an integration for Next.js, Vite or Node. Every page below is Markdown; append \`.md\` to any docs URL for its Markdown version. The complete docs are in [llms-full.txt](${new URL("/llms-full.txt", site.url)}).`,
  ];

  const visit = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === "separator") {
        lines.push("", `## ${String(node.name ?? "")}`, "");
      } else if (node.type === "folder") {
        if (node.index) {
          visit([node.index]);
        }

        visit(node.children);
      } else {
        const page = pages.get(node.url);
        if (!page) {
          continue;
        }

        const url = new URL(`${page.url}.md`, site.url);
        const description = page.data.description ? `: ${page.data.description}` : "";

        lines.push(`- [${page.data.title}](${url})${description}`);
      }
    }
  };

  visit(source.getPageTree().children);

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
