import type { ThemeRuntime } from "@yaakdoc/react/theme";
import { contentComponents, Layout } from "@/components/layout";
import { MethodBadge } from "@/components/parts";

/** Kiseki's server entry: the layout plus overrides for base components. */
const theme: ThemeRuntime = {
  Layout,
  components: { MethodBadge, ...contentComponents },
};

export default theme;
