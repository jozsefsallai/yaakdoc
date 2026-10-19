/**
 * Yaak template support. Yaak templates look like `${[ variableName ]}` or `${[ fn(arg, ...) ]}`.
 */

const TEMPLATE_RE = /\$\{\[\s*([\s\S]*?)\s*\]\}/g;
const VARIABLE_RE = /^[A-Za-z_$][\w.$-]*$/;

export type TemplateToken =
  | { type: "text"; value: string }
  | { type: "variable"; name: string; raw: string }
  | { type: "function"; name: string; expression: string; raw: string };

/** Splits a string into text, variable and function tokens. */
export function tokenizeTemplate(input: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(TEMPLATE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: "text", value: input.slice(lastIndex, index) });
    }

    const expression = (match[1] ?? "").trim();
    if (VARIABLE_RE.test(expression)) {
      tokens.push({ type: "variable", name: expression, raw: match[0] });
    } else {
      const name = expression.match(/^([\w.$-]+)\s*\(/)?.[1] ?? expression;
      tokens.push({ type: "function", name, expression, raw: match[0] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: "text", value: input.slice(lastIndex) });
  }

  return tokens;
}

export function hasTemplate(input: string): boolean {
  TEMPLATE_RE.lastIndex = 0;
  return TEMPLATE_RE.test(input);
}

export type ResolveTemplateOptions = {
  /** Variables available for resolution (later entries win when built from several scopes). */
  variables: ReadonlyMap<string, string>;
  /** Return `true` for variables that must never be inlined (secrets). */
  isHidden?: (name: string) => boolean;
  /** Formats unresolved variables and template functions. Defaults to `{{name}}`. */
  placeholder?: (name: string) => string;
};

const defaultPlaceholder = (name: string) => `{{${name}}}`;
const MAX_DEPTH = 16;

/**
 * Resolves Yaak template tags in `input`.
 *
 * - Known, non-hidden variables are replaced by their (recursively resolved) values.
 * - Hidden, unknown or cyclic variables become placeholders.
 * - Variables whose value relies on a template function (e.g. `secure(...)`, `response.body.path(...)`)
 *   become placeholders named after the variable, so secrets never leak into the docs.
 * - Template functions used directly become placeholders named after the function.
 */
export function resolveTemplate(input: string, options: ResolveTemplateOptions): string {
  const placeholder = options.placeholder ?? defaultPlaceholder;
  const isHidden = options.isHidden ?? (() => false);

  const resolveVariable = (name: string, stack: string[]): string => {
    const value = options.variables.get(name);
    if (value === undefined || isHidden(name) || stack.includes(name) || stack.length > MAX_DEPTH) {
      return placeholder(name);
    }

    const tokens = tokenizeTemplate(value);
    if (tokens.some((token) => token.type === "function")) {
      return placeholder(name);
    }

    let out = "";

    for (const token of tokens) {
      if (token.type === "text") {
        out += token.value;
      } else if (token.type === "variable") {
        const resolved = resolveVariable(token.name, [...stack, name]);

        // A nested secret makes the whole value secret.
        if (resolved === placeholder(token.name) && options.variables.has(token.name)) {
          return placeholder(name);
        }

        out += resolved;
      }
    }

    return out;
  };

  let out = "";

  for (const token of tokenizeTemplate(input)) {
    if (token.type === "text") {
      out += token.value;
    } else if (token.type === "variable") {
      out += resolveVariable(token.name, []);
    } else {
      out += placeholder(token.name);
    }
  }

  return out;
}

/** Converts Yaak template tags into readable placeholders without resolving anything. */
export function formatTemplate(input: string, placeholder = defaultPlaceholder): string {
  return input.replace(TEMPLATE_RE, (_, expression: string) => {
    const trimmed = expression.trim();

    if (VARIABLE_RE.test(trimmed)) {
      return placeholder(trimmed);
    }

    return placeholder(trimmed.match(/^([\w.$-]+)\s*\(/)?.[1] ?? trimmed);
  });
}

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Creates an `isHidden` predicate: a variable is hidden when its normalized name contains any of the
 * normalized patterns (e.g. `api_key` hides `apiKey` and `X-API-KEY`).
 */
export function createSecretMatcher(patterns: readonly string[]): (name: string) => boolean {
  const normalized = patterns.map(normalizeName).filter(Boolean);

  return (name) => {
    const candidate = normalizeName(name);
    return normalized.some((pattern) => candidate.includes(pattern));
  };
}
