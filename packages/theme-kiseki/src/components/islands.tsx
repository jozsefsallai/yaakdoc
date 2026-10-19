/**
 * Kiseki islands: small interactive components hydrated on the client. Props must be serializable,
 * and islands can't use yaakdoc context hooks (pass data through props instead).
 */
import {
  createIsland,
  type EnvironmentOption,
  LLM_PROVIDERS,
  type LlmProvider,
  openInUrl,
  RUN_IN_YAAK_BADGE,
  resolveUrl,
  useColorMode,
  useCopy,
  useEnvironment,
  useNavToggle,
  useRunInYaakHref,
} from "@yaakdoc/react/islands";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Radix returns focus to the menu trigger without `preventScroll`, which makes browsers scroll
 * when the trigger is in the sticky header. Restore focus ourselves, without scrolling.
 */
function useRestoreFocus() {
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    triggerRef.current?.focus({ preventScroll: true });
  };

  return { triggerRef, onCloseAutoFocus };
}

export const ThemeToggle = createIsland("kiseki:theme-toggle", function ThemeToggle() {
  const { resolved, toggle } = useColorMode();

  const label = resolved === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={label} title={label}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
});

export const CopyCode = createIsland(
  "kiseki:copy-code",
  function CopyCode({ target, className }: { target: string; className?: string }) {
    const { copied, copy } = useCopy();

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "text-code-panel-foreground/70 hover:bg-white/10 hover:text-code-panel-foreground",
          className,
        )}
        onClick={() => copy({ target })}
        aria-label={copied ? "Copied" : "Copy code"}
        title={copied ? "Copied" : "Copy code"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    );
  },
);

export type PageActionsProps = {
  markdownUrl: string;
  /** Absolute Markdown URL when the site URL is known; resolved from the location otherwise. */
  absoluteUrl: string | null;
  openIn: LlmProvider[];
  label?: string;
};

export const PageActions = createIsland(
  "kiseki:page-actions",
  function PageActions({
    markdownUrl,
    absoluteUrl,
    openIn,
    label = "Copy page",
  }: PageActionsProps) {
    const { copied, copy } = useCopy();
    const { triggerRef, onCloseAutoFocus } = useRestoreFocus();

    const open = (provider: LlmProvider) => {
      const url = absoluteUrl ?? resolveUrl(markdownUrl);
      window.open(openInUrl(provider, url), "_blank", "noopener,noreferrer");
    };

    return (
      <div className="inline-flex shrink-0 items-center rounded-md border bg-background shadow-xs">
        <Button
          variant="ghost"
          size="xs"
          className="rounded-r-none border-r font-normal text-muted-foreground"
          onClick={() => copy({ url: markdownUrl })}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : label}
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild ref={triggerRef}>
            <Button
              variant="ghost"
              size="xs"
              className="rounded-l-none text-muted-foreground"
              aria-label="More page actions"
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={onCloseAutoFocus}>
            <DropdownMenuLabel>Use with AI</DropdownMenuLabel>

            <DropdownMenuItem onSelect={() => copy({ url: markdownUrl })}>
              <CopyIcon />
              Copy as Markdown
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <a href={markdownUrl} target="_blank" rel="noopener">
                <FileTextIcon />
                View as Markdown
              </a>
            </DropdownMenuItem>

            {openIn.length > 0 ? <DropdownMenuSeparator /> : null}

            {openIn.map((provider) => (
              <DropdownMenuItem key={provider} onSelect={() => open(provider)}>
                <ExternalLinkIcon />
                Open in {LLM_PROVIDERS[provider].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);

export const MobileNavToggle = createIsland(
  "kiseki:mobile-nav",
  function MobileNavToggle({ target }: { target: string }) {
    const { open, setOpen, toggle } = useNavToggle(target);

    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls={target.replace(/^#/, "")}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={toggle}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </Button>

        {open
          ? createPortal(
              <div
                aria-hidden="true"
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
                onClick={() => setOpen(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  },
);

/** Small colored dot for an environment (its Yaak color). */
export const EnvironmentDot = ({ color }: { color: string | null }) => (
  <span
    aria-hidden="true"
    className="size-1.5 shrink-0 rounded-full bg-(--env)"
    style={{ "--env": color ?? "var(--method-get)" } as React.CSSProperties}
  />
);

/** Header dropdown to switch the environment used in examples and the variables table. */
export const EnvironmentMenu = createIsland(
  "kiseki:environment",
  function EnvironmentMenu({
    environments,
    defaultId,
  }: {
    environments: EnvironmentOption[];
    defaultId: string;
  }) {
    const { selected, select, current } = useEnvironment(environments, defaultId);
    const { triggerRef, onCloseAutoFocus } = useRestoreFocus();

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild ref={triggerRef}>
          <Button
            variant="outline"
            size="xs"
            className="mr-2 rounded-full font-normal text-muted-foreground"
            aria-label={`Environment: ${current?.name ?? ""}. Change environment`}
            title="Environment used for examples"
          >
            <EnvironmentDot color={current?.color ?? null} />
            {current?.name}
            <ChevronDownIcon className="size-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={onCloseAutoFocus}>
          <DropdownMenuLabel>Environment</DropdownMenuLabel>

          <DropdownMenuRadioGroup value={selected} onValueChange={select}>
            {environments.map((env) => (
              <DropdownMenuRadioItem key={env.id} value={env.id}>
                <EnvironmentDot color={env.color} />
                {env.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

/** Small icon button copying a literal text (e.g. a request URL). */
export const CopyText = createIsland(
  "kiseki:copy-text",
  function CopyText({ text, label }: { text: string; label: string }) {
    const { copied, copy } = useCopy();

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => copy({ text })}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    );
  },
);

/** Opens Yaak and prompts to import the documented API. */
export const RunInYaakButton = createIsland(
  "kiseki:run-in-yaak",
  function RunInYaakButton({ name, dataUrl }: { name: string; dataUrl: string }) {
    const href = useRunInYaakHref(name, dataUrl);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        title="Import this API into Yaak"
        className="block shrink-0 rounded-[4px] transition-opacity hover:opacity-90"
      >
        <img
          src={RUN_IN_YAAK_BADGE}
          alt="Run in Yaak"
          width={140}
          height={32}
          className="h-7 w-auto"
        />
      </a>
    );
  },
);
