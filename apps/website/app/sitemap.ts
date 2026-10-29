import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...source.getPages().map((page) => ({
      url: new URL(page.url, site.url).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
