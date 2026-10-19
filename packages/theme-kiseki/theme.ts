import { defineTheme } from "@yaakdoc/react/theme";
import { z } from "zod";

export const kisekiOptions = z.object({
  /** Where code examples go: a sticky column next to each request, or inline below it. */
  codePanel: z.enum(["right", "inline"]).default("right"),
  /** Sidebar width (any CSS length). */
  sidebarWidth: z.string().default("18rem"),
  /** Folder levels expanded in the navigation by default (folders containing the current page always are). */
  navOpenDepth: z.number().int().min(0).default(2),
  /** Show the environment name in the header. */
  showEnvironment: z.boolean().default(true),
});

export type KisekiOptions = z.output<typeof kisekiOptions>;

export default defineTheme({
  name: "kiseki",
  entry: "./src/entry.tsx",
  client: "./src/client.ts",
  styles: ["./src/styles.css"],
  highlight: { light: "github-light", dark: "github-dark-dimmed" },
  options: kisekiOptions,
  vitePlugins: async () => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return [tailwindcss()];
  },
  eject: {
    files: ["theme.ts", "src/**", "components.json", "tsconfig.json", "README.md"],
    dependencies: [
      "@yaakdoc/react",
      "tailwindcss",
      "@tailwindcss/vite",
      "radix-ui",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@fontsource-variable/geist",
      "@fontsource-variable/geist-mono",
      "zod",
    ],
  },
});
