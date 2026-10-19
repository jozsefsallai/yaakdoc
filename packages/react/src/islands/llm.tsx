import { createIsland } from "../island";
import type { LlmProvider } from "../types";
import { resolveUrl } from "./browser";

export const LLM_PROVIDERS: Record<
  LlmProvider,
  { label: string; url: (prompt: string) => string }
> = {
  chatgpt: {
    label: "ChatGPT",
    url: (q) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(q)}`,
  },
  claude: { label: "Claude", url: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  perplexity: {
    label: "Perplexity",
    url: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
  },
};

export const llmPrompt = (markdownUrl: string) =>
  `Read ${markdownUrl} so I can ask questions about this API documentation.`;

/** URL that opens an assistant with a prompt pointing at the (absolute) Markdown URL. */
export function openInUrl(provider: LlmProvider, markdownUrl: string): string {
  return LLM_PROVIDERS[provider].url(llmPrompt(markdownUrl));
}

export type OpenInLinkProps = {
  provider: LlmProvider;
  /** Markdown URL; relative URLs are made absolute on click using the current location. */
  markdownUrl: string;
  className?: string;
  label?: string;
};

function OpenInLinkImpl({ provider, markdownUrl, className, label }: OpenInLinkProps) {
  return (
    <a
      data-yd="open-in"
      data-provider={provider}
      className={className}
      href={openInUrl(provider, markdownUrl)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        const absolute = resolveUrl(markdownUrl);
        if (absolute === markdownUrl) {
          return;
        }

        event.preventDefault();
        window.open(openInUrl(provider, absolute), "_blank", "noopener,noreferrer");
      }}
    >
      {label ?? `Open in ${LLM_PROVIDERS[provider].label}`}
    </a>
  );
}

/** Link that opens ChatGPT/Claude/... with the page's Markdown as context. */
export const OpenInLink = createIsland("yd:open-in", OpenInLinkImpl);
