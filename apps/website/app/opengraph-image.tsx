import { ogImage } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = "yaakdoc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "API docs from your Yaak workspace",
    description: site.description,
  });
}
