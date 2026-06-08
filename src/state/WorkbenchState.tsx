import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import nexus, { type WorkbenchState, type WorkbenchStateUpdate } from "./nexus";
import generatedWorkbenchRegistry from "./generatedWorkbenchRegistry";
import type { DemoWorkbenchInitialState } from "../types/public";

export function WorkbenchStateProvider({
  initialState,
  children,
}: {
  initialState?: DemoWorkbenchInitialState;
  children: ReactNode;
}) {
  const appliedInitialStateKeyRef = useRef<string | null>(null);
  const resolvedInitialState = useMemo(
    () => ({
      fileRegistry: generatedWorkbenchRegistry,
      ...(initialState as Partial<WorkbenchState> | undefined),
    }),
    [initialState],
  );
  const resolvedInitialStateKey = JSON.stringify(resolvedInitialState);

  if (appliedInitialStateKeyRef.current !== resolvedInitialStateKey) {
    appliedInitialStateKeyRef.current = resolvedInitialStateKey;
    nexus.set(resolvedInitialState);
  }

  return children;
}

export function useWorkbenchStore(): {
  state: WorkbenchState;
  setWorkbenchState: (state: WorkbenchStateUpdate) => void;
} {
  const state = nexus.use();
  const setWorkbenchState = useMemo(() => nexus.set.bind(nexus), []);

  return { state, setWorkbenchState };
}

export function useWorkbenchValue<Key extends keyof WorkbenchState>(
  key: Key,
): WorkbenchState[Key] {
  return nexus.use(key as any);
}

export function useWorkbenchActions(): (state: WorkbenchStateUpdate) => void {
  return useMemo(() => nexus.set.bind(nexus), []);
}

export { nexus };
