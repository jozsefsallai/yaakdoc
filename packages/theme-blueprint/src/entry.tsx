import type { ThemeRuntime } from "@yaakdoc/react/theme";
import { contentComponents, Layout } from "@/components/layout";
import { NavIcon } from "@/components/page";
import { KeyValueTable, MethodBadge } from "@/components/parts";

/** Blueprint's server entry: the layout plus overrides for base components. */
const theme: ThemeRuntime = {
  Layout,
  components: { MethodBadge, NavIcon, KeyValueTable, ...contentComponents },
};

export default theme;
