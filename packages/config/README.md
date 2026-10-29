# @yaakdoc/config

The configuration schema for [yaakdoc](https://yaakdoc.dev).

```ts
// yaakdoc.config.ts
import { defineConfig } from "@yaakdoc/config"; // also re-exported from "yaakdoc"

export default defineConfig({
  branding: {
    title: "Acme API",
    colors: {
      primary: "#0f766e",
    },
  },

  pages: "per-request",
});
```

Most projects use `yaakdoc.config.json` with `"$schema": "./node_modules/yaakdoc/config.schema.json"` for editor autocomplete. Every field is optional.

- `configSchema`: the Zod schema. `YaakdocConfig` is the input type and `ResolvedConfig` is the type with defaults applied.
- `parseConfig(input)` validates input and applies defaults.
- `getConfigJsonSchema()` returns the JSON schema used by `$schema`.
- `loadConfig({ cwd, configFile, overrides })` from `@yaakdoc/config/node` finds and loads the config file.

See the [configuration reference](https://yaakdoc.dev/docs/reference/configuration), which is generated from this schema.
