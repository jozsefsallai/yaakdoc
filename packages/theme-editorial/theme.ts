import { defineTheme } from "@yaakdoc/react/theme";
import { z } from "zod";

export const editorialOptions = z.object({
  /** Width of the reading column (any CSS length). */
  measure: z.string().default("68ch"),
  /** Start the overview's introduction with a drop cap. */
  dropCap: z.boolean().default(true),
  /** Folder levels expanded in the contents by default (folders containing the current page always are). */
  navOpenDepth: z.number().int().min(0).default(2),
});

export type EditorialOptions = z.output<typeof editorialOptions>;

export default defineTheme({
  name: "editorial",
  entry: "./src/entry.tsx",
  client: "./src/client.ts",
  styles: ["./src/fonts.css", "./src/styles.css"],
  // The serif reading font plays the `sans` role: `branding.fonts.sans` replaces it.
  preloadFonts: {
    sans: ["source-serif-4-latin-wght-normal.woff2", "inter-latin-wght-normal.woff2"],
    mono: ["jetbrains-mono-latin-wght-normal.woff2"],
  },
  highlight: { light: "rose-pine-dawn", dark: "rose-pine-moon" },
  options: editorialOptions,
  vitePlugins: async () => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return [tailwindcss(), fontDisplay()];
  },
  eject: {
    files: ["theme.ts", "src/**", "components.json", "tsconfig.json", "README.md"],
    dependencies: [
      "@yaakdoc/react",
      "tailwindcss",
      "@tailwindcss/vite",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-slot",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@fontsource-variable/source-serif-4",
      "@fontsource-variable/inter",
      "@fontsource-variable/jetbrains-mono",
      "zod",
    ],
  },
});

/**
 * Fontsource declares its fonts with `font-display: swap`, which paints text in a fallback font
 * first and switches when the fonts arrive. With `optional` (and the preloads above), browsers wait
 * briefly for the fonts instead, and keep the fallback for that page if they're slow: no switch.
 * Runs after Vite's CSS plugin, on `src/fonts.css` with its imports inlined.
 */
function fontDisplay() {
  return {
    name: "editorial:font-display",
    transform(code: string, id: string) {
      if (!/[\\/]src[\\/]fonts\.css(\?|$)/.test(id)) {
        return null;
      }

      return { code: code.replace(/font-display:\s*swap/g, "font-display: optional"), map: null };
    },
  };
}
