import { useEffect, useState } from "react";

import { warnDevelopment } from "../utils/devWarnings";

type DynamicModuleLoader<Module> = () => Promise<Module>;

const useDynamicModule = <Module,>(
  name: string,
  importModule?: DynamicModuleLoader<Module>,
  options: { enabled?: boolean } = {},
) => {
  const [module, setModule] = useState<Module | null>(null);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      return () => {
        isActive = false;
      };
    }

    if (!name || !importModule) {
      setModule(null);
      return;
    }

    (async () => {
      try {
        const data = await importModule();

        if (isActive) {
          setModule(data);
        }
      } catch (error) {
        if (isActive) {
          warnDevelopment(
            `dynamic-module-load:${name}`,
            `module "${name}" failed to load.`,
            error,
          );
          setModule(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [enabled, name, importModule]);

  return module;
};

export default useDynamicModule;
