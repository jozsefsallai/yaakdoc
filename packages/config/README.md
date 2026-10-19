# @yaakdoc/config

The configuration schema for [yaakdoc](https://github.com/jozsefsallai/yaakdoc#readme).

```ts
// yaakdoc.config.ts
import { defineConfig } from "@yaakdoc/config"; // also re-exported from "yaakdoc"

export default defineConfig({
  branding: {
    title: "Acme API",

    colors: {
      primary: "#0f766e"
    }
  },

  pages: "per-request",
});
```

Most projects use `yaakdoc.config.json` with `"$schema": "./node_modules/yaakdoc/config.schema.json"` for editor autocomplete. Every field is optional. See the [configuration reference](https://github.com/jozsefsallai/yaakdoc#configuration).

## API

- `configSchema`: the Zod schema. `YaakdocConfig` is the input type and `ResolvedConfig` is the type with defaults applied.
- `parseConfig(input)` validates input and applies defaults. Errors are readable `ConfigError`s.
- `getConfigJsonSchema()` returns the JSON schema used by `$schema`.
- `loadConfig({ cwd, configFile, overrides })` from `@yaakdoc/config/node` loads the config:
  - It finds `yaakdoc.config.{json,jsonc,ts,js,...}` with [c12](https://github.com/unjs/c12).
  - It applies overrides such as CLI flags. Arrays are replaced, not merged.
  - It resolves local paths relative to the config file.
