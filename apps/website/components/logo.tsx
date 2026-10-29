import Image from "next/image";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image src="/icon.svg" alt="" width={24} height={24} className={cn("size-6", className)} />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      <span className="text-yd-yellow">yaak</span>
      <span className="text-yd-green">doc</span>
    </span>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <Wordmark className="text-[1.05rem]" />
    </span>
  );
}
