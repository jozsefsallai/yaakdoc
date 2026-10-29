"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function CopyCommand({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy "${command}"`}
      className={cn(
        "group inline-flex items-center gap-3 rounded-lg border bg-fd-card px-4 py-2.5 font-mono text-sm transition-colors hover:bg-fd-accent",
        className,
      )}
    >
      <span className="select-none text-fd-muted-foreground">$</span>
      <span>{command}</span>
      {copied ? (
        <Check className="size-4 text-yd-green" />
      ) : (
        <Copy className="size-4 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground" />
      )}
    </button>
  );
}
