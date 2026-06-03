import { useEffect, useState } from "react";

type ImportModuleT = () => Promise<Record<string, any>>;

const useDynamicModule = (name: string, importModule?: ImportModuleT) => {
  const [module, setModule] = useState<null | Record<string, any>>(null);

  useEffect(() => {
    let isActive = true;

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
  }, [name, importModule]);

  return module;
};

export default useDynamicModule;
