import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";
import { site } from "./site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
    githubUrl: site.github,
    links: [
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Themes", url: "/docs/theming", active: "nested-url" },
      { text: "Demo", url: site.demo, external: true },
    ],
  };
}
