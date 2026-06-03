import { useEffect, useMemo } from "react";

import workbenchNexus from "./workbenchNexus";

export function WorkbenchStateProvider({ initialState, children }) {
  useEffect(() => {
    if (initialState) {
      workbenchNexus.set(initialState);
    }
  }, [initialState]);

  return children;
}

export function useWorkbenchStore() {
  const state = workbenchNexus.use();
  const setWorkbenchState = useMemo(() => workbenchNexus.set.bind(workbenchNexus), []);

  return { state, setWorkbenchState };
}

export function useWorkbenchValue(key) {
  return workbenchNexus.use(key);
}

export function useWorkbenchActions() {
  return useMemo(() => workbenchNexus.set.bind(workbenchNexus), []);
}

export { workbenchNexus };
