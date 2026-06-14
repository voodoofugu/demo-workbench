import { useEffect, useState } from "react";

type ImportModuleT = () => Promise<Record<string, any>>;

const useDynamicModule = (
  name: string,
  importModule?: ImportModuleT,
  options: { enabled?: boolean } = {},
) => {
  const [module, setModule] = useState<null | Record<string, any>>(null);
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
          console.error(`Module "${name}" not found`, error);
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
