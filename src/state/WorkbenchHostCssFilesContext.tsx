import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const WorkbenchHostCssFilesContext = createContext<string[]>([]);

export function WorkbenchHostCssFilesProvider({
  files,
  children,
}: {
  files: string[];
  children: ReactNode;
}) {
  return (
    <WorkbenchHostCssFilesContext.Provider value={files}>
      {children}
    </WorkbenchHostCssFilesContext.Provider>
  );
}

export function useWorkbenchHostCssFiles(): string[] {
  return useContext(WorkbenchHostCssFilesContext);
}
