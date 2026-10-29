import { notFound } from "next/navigation";
import { ogImage } from "@/lib/og";
import { getPageImageUrl } from "@/lib/site";
import { source } from "@/lib/source";

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;

  const page = source.getPage(slug.slice(0, -1));
  if (!page) {
    notFound();
  }

  return ogImage({
    title: page.data.title,
    description: page.data.description,
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: getPageImageUrl(page).segments }));
}
