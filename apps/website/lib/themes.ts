export interface Theme {
  package: string;
  shortName: string;
  displayName: string;
  description: string;
  preview?: {
    light: string;
    dark?: string;
  };
  demo?: string;
  docs?: string;
  official: boolean;
}

const themes: Theme[] = [
  {
    package: "@yaakdoc/theme-kiseki",
    shortName: "kiseki",
    displayName: "Kiseki",
    description:
      "The default theme. Tailwind CSS v4 and shadcn/ui, light and dark mode, a sticky code panel, search and tabs.",
    preview: {
      light: "/screenshots/kiseki-light.webp",
      dark: "/screenshots/kiseki-dark.webp",
    },
    demo: "https://demo.yaakdoc.dev",
    docs: "/docs/theming/kiseki",
    official: true,
  },
];

export async function getThemes(): Promise<Theme[]> {
  return themes;
}
