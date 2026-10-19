import { z } from "zod";

/**
 * Zod schemas for raw Yaak exports.
 *
 * Every object is a `looseObject` and most fields are optional with defaults, so that exports from
 * older Yaak versions (schema v1–v4) and fields added by newer versions never break parsing.
 */

const text = z
  .string()
  .nullish()
  .transform((value) => value ?? "");

const sortPriority = z
  .number()
  .nullish()
  .transform((value) => value ?? 0);

export const rawKeyValueSchema = z.looseObject({
  enabled: z.boolean().optional(),
  name: z.string().default(""),
  value: z.string().default(""),
  id: z.string().nullish(),
});

export const rawMultipartFieldSchema = rawKeyValueSchema.extend({
  file: z.string().nullish(),
  contentType: z.string().nullish(),
});

const authFields = {
  authentication: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? {}),
  authenticationType: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
};

export const rawWorkspaceSchema = z.looseObject({
  model: z.literal("workspace").optional(),
  id: z.string(),
  name: z.string().default("Untitled workspace"),
  description: text,
  headers: z.array(rawKeyValueSchema).default([]),
  /** Removed in schema v3 – migrated into a base environment. */
  variables: z.array(rawKeyValueSchema).optional(),
  ...authFields,
});

export const rawEnvironmentSchema = z.looseObject({
  model: z.literal("environment").optional(),
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().default("Environment"),
  /** Missing in older exports. `false` marks a private (unshared) environment. */
  public: z.boolean().optional(),
  color: z.string().nullish(),
  sortPriority,
  variables: z.array(rawKeyValueSchema).default([]),
  /** Schema v5+: "workspace" (base), "environment" (sub environment) or "folder". */
  parentModel: z.string().nullish(),
  parentId: z.string().nullish(),
  /** Schema v4. */
  base: z.boolean().optional(),
  /** Schema ≤ v3. `null` meant base environment. */
  environmentId: z.string().nullish(),
});

export const rawFolderSchema = z.looseObject({
  model: z.literal("folder").optional(),
  id: z.string(),
  workspaceId: z.string(),
  folderId: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  name: z.string().default("Untitled folder"),
  description: text,
  headers: z.array(rawKeyValueSchema).default([]),
  sortPriority,
  ...authFields,
});

const rawRequestBase = {
  id: z.string(),
  workspaceId: z.string(),
  folderId: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  name: z.string().default(""),
  description: text,
  url: text,
  sortPriority,
  ...authFields,
};

export const rawHttpRequestSchema = z.looseObject({
  model: z.literal("http_request").optional(),
  ...rawRequestBase,
  method: z
    .string()
    .nullish()
    .transform((value) => (value ?? "GET").toUpperCase()),
  headers: z.array(rawKeyValueSchema).default([]),
  urlParameters: z.array(rawKeyValueSchema).default([]),
  bodyType: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  body: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? {}),
});

export const rawGrpcRequestSchema = z.looseObject({
  model: z.literal("grpc_request").optional(),
  ...rawRequestBase,
  service: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  method: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  message: text,
  metadata: z.array(rawKeyValueSchema).default([]),
});

export const rawWebsocketRequestSchema = z.looseObject({
  model: z.literal("websocket_request").optional(),
  ...rawRequestBase,
  headers: z.array(rawKeyValueSchema).default([]),
  urlParameters: z.array(rawKeyValueSchema).default([]),
  message: text,
});

export const rawResourcesSchema = z.looseObject({
  workspaces: z.array(rawWorkspaceSchema).default([]),
  environments: z.array(rawEnvironmentSchema).default([]),
  folders: z.array(rawFolderSchema).default([]),
  httpRequests: z.array(rawHttpRequestSchema).default([]),
  grpcRequests: z.array(rawGrpcRequestSchema).default([]),
  websocketRequests: z.array(rawWebsocketRequestSchema).default([]),
});

export const rawYaakExportSchema = z.looseObject({
  yaakVersion: z.string().default("unknown"),
  yaakSchema: z.number(),
  timestamp: z.string().nullish(),
  resources: z.preprocess((value) => {
    // Schema v1 stored HTTP requests under `requests`.
    if (value && typeof value === "object" && "requests" in value && !("httpRequests" in value)) {
      const { requests, ...rest } = value as Record<string, unknown>;
      return { ...rest, httpRequests: requests };
    }
    return value;
  }, rawResourcesSchema),
});

export type RawKeyValue = z.infer<typeof rawKeyValueSchema>;
export type RawMultipartField = z.infer<typeof rawMultipartFieldSchema>;
export type RawWorkspace = z.infer<typeof rawWorkspaceSchema>;
export type RawEnvironment = z.infer<typeof rawEnvironmentSchema>;
export type RawFolder = z.infer<typeof rawFolderSchema>;
export type RawHttpRequest = z.infer<typeof rawHttpRequestSchema>;
export type RawGrpcRequest = z.infer<typeof rawGrpcRequestSchema>;
export type RawWebsocketRequest = z.infer<typeof rawWebsocketRequestSchema>;
export type RawYaakExport = z.infer<typeof rawYaakExportSchema>;
export type RawYaakExportInput = z.input<typeof rawYaakExportSchema>;
