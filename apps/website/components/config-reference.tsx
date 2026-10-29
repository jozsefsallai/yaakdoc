import { getConfigJsonSchema } from "@yaakdoc/config";
import { type TypeNode, TypeTable } from "fumadocs-ui/components/type-table";
import { Fragment, type ReactNode } from "react";

interface JsonSchema {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  anyOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema | boolean;
  required?: string[];
  default?: unknown;
  description?: string;
  format?: string;
  $ref?: string;
}

const root = getConfigJsonSchema() as JsonSchema & { $defs?: Record<string, JsonSchema> };

const refNames: Record<string, string> = {
  __schema0: "NavigationItem",
  NavigationGroup: "NavigationGroup",
};

function resolve(schema: JsonSchema): JsonSchema {
  if (!schema.$ref) {
    return schema;
  }

  const name = schema.$ref.replace("#/$defs/", "");
  return root.$defs?.[name] ?? schema;
}

function typeOf(schema: JsonSchema): string {
  if (schema.$ref) {
    const name = schema.$ref.replace("#/$defs/", "");
    return refNames[name] ?? typeOf(resolve(schema));
  }

  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  if (schema.enum) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.anyOf) {
    return [...new Set(schema.anyOf.map(typeOf))].join(" | ");
  }

  if (schema.type === "array") {
    const item = schema.items ? typeOf(schema.items) : "unknown";
    return item.includes(" ") ? `(${item})[]` : `${item}[]`;
  }

  if (schema.type === "object") {
    if (!schema.properties && schema.additionalProperties) {
      return "Record<string, unknown>";
    }

    return "object";
  }

  if (schema.type === "integer") {
    return "number";
  }

  return Array.isArray(schema.type) ? schema.type.join(" | ") : (schema.type ?? "unknown");
}

function inlineMarkdown(text: string): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts of a fixed string
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts of a fixed string
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function formatDefault(value: unknown): ReactNode {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "object" && value !== null && Object.keys(value).length === 0) {
    return Array.isArray(value) ? "[]" : undefined;
  }

  return <code>{JSON.stringify(value)}</code>;
}

function objectAt(path: string): JsonSchema {
  let schema: JsonSchema = root;

  for (const key of path ? path.split(".") : []) {
    const next = schema.properties?.[key];
    if (!next) {
      throw new Error(`No config property "${key}" in "${path}"`);
    }

    schema = resolve(next);

    if (schema.type === "array" && schema.items) {
      schema = resolve(schema.items);
    }

    if (schema.anyOf) {
      schema = schema.anyOf.map(resolve).find((variant) => variant.properties) ?? schema;
    }
  }

  if (!schema.properties) {
    throw new Error(`Config property "${path}" isn't an object`);
  }

  return schema;
}

export function ConfigReference({ path = "", omit = [] }: { path?: string; omit?: string[] }) {
  const schema = objectAt(path);
  const type: Record<string, TypeNode> = {};

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (name === "$schema" || omit.includes(name)) {
      continue;
    }

    const resolved = resolve(property);

    type[name] = {
      type: typeOf(property),
      description: inlineMarkdown(property.description ?? resolved.description ?? ""),
      default: formatDefault(property.default ?? resolved.default),
      required: schema.required?.includes(name) && property.default === undefined,
    };
  }

  return <TypeTable type={type} />;
}
