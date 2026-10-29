import Image from "next/image";
import { cn } from "@/lib/cn";

export function ThemedImage({
  light,
  dark,
  alt,
  priority,
  width = 2000,
  height = 1250,
  sizes = "(min-width: 1152px) 1152px, 100vw",
}: {
  light: string;
  dark?: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}) {
  return (
    <>
      <Image
        src={light}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={cn("block h-auto w-full", dark && "dark:hidden")}
      />
      {dark ? (
        <Image
          src={dark}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className="hidden h-auto w-full dark:block"
        />
      ) : null}
    </>
  );
}

export function Screenshot({
  url,
  className,
  ...image
}: Parameters<typeof ThemedImage>[0] & { url?: string; className?: string }) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border bg-fd-card shadow-2xl shadow-black/10",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-fd-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-fd-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-fd-muted-foreground/25" />
        {url ? (
          <span className="mx-auto truncate rounded-md bg-fd-muted px-3 py-0.5 font-mono text-fd-muted-foreground text-xs">
            {url}
          </span>
        ) : null}
      </div>
      <ThemedImage {...image} />
    </figure>
  );
}
