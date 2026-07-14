import { useEffect, useMemo } from "react";
import StyledAtom from "styled-atom";

import { StyledAtom as WorkbenchStyledAtom } from "../styles/styledAtom";
import workbenchStyles from "../styles/workbenchStyles";
import { warnDevelopment } from "../utils/devWarnings";
import { useStableStringList } from "../hooks/useStableStringList";
import { useWorkbenchStyleReload } from "../hooks/useWorkbenchStyleReload";
import WorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";

import type { DemoItem, DemoWorkbenchProps } from "../types/public";
import nexus from "../state/nexus.js";

function WorkbenchGlobalStyles({ hostFileNames }: { hostFileNames: string[] }) {
  return hostFileNames.length ? (
    <WorkbenchStyledAtom files={hostFileNames} />
  ) : null;
}

function warnMissingStyleLoader(fileNames: readonly string[]) {
  if (!fileNames.length) return;

  warnDevelopment(
    "missing-style-loader",
    `styleLoader is missing, but baseStyles are requested (${fileNames.join(", ")}). Pass styleLoader or remove baseStyles.`,
  );
}

function warnInvalidDemoModule(name: string) {
  warnDevelopment(
    `invalid-demo-module:${name}`,
    `demo "${name}" loaded a module without a default React component.`,
  );
}

function warnFailedDemoLoad(name: string, error: unknown) {
  warnDevelopment(
    `failed-demo-load:${name}`,
    `demo "${name}" failed to load.`,
    error,
  );
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbench***:
 * searchable React shell for local component and screen demos.
 * @description
 * Renders the full reusable workbench UI: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted shell state. `runWorkbenchCompile` can generate a host-owned demo manifest; the host project supplies demos, style loading and optional render hooks while `demo-workbench` owns the repeated shell behavior. For local style reload, serve the compiled style output directory as `/workbench-css/`.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   title="Project demos"
 *   demos={demos}
 *   styleLoader="/workbench-css/"
 *   baseStyles={["output", "theme"]}
 * />
 * ```
 */
export default function DemoWorkbench({
  title = "Demo Workbench",
  demos,
  styleLoader,
  baseStyles,
  autoScale,
  renderDemoContent,
  bodyBg,
}: DemoWorkbenchProps) {
  // Configures styled-atom's loader and the dev style-reload pipeline.
  useWorkbenchStyleReload(styleLoader);

  const rawHostCssFiles = baseStyles ?? [];
  const hostCssFiles = useStableStringList(rawHostCssFiles);

  // Publish the host base-style names so every DemoCell can build its scoped
  // encapsulation class from them. Done in an effect (not during render) so a
  // late `baseStyles` change never updates DemoCell mid-render.
  useEffect(() => {
    nexus.set({ baseStyles: hostCssFiles });
  }, [hostCssFiles]);

  useEffect(() => {
    if (!styleLoader) {
      warnMissingStyleLoader(hostCssFiles);
    }
  }, [hostCssFiles, styleLoader]);

  const manifestDemos = useMemo<DemoItem[]>(() => {
    return demos.map((demo) => ({
      ...demo,
      load: async () => {
        try {
          const module = await demo.load();

          if (!module?.default) {
            warnInvalidDemoModule(demo.name);
          }

          return module;
        } catch (error) {
          warnFailedDemoLoad(demo.name, error);
          throw error;
        }
      },
    }));
  }, [demos]);

  return (
    <StyledAtom name="demo-workbench" encap styles={workbenchStyles}>
      <WorkbenchGlobalStyles hostFileNames={hostCssFiles} />
      <WorkbenchTitle title={title} />
      <WorkbenchShell
        title={title}
        demos={manifestDemos}
        autoScale={autoScale}
        renderDemoContent={renderDemoContent}
        bodyBg={bodyBg}
      />
    </StyledAtom>
  );
}
