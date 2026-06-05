import { useEffect } from "react";
import type { ReactNode } from "react";

import { useWorkbenchValue } from "../state/WorkbenchState";

export default function WorkbenchTitle({
  title = "Template",
}: {
  title?: string;
  children?: ReactNode;
}) {
  const activePage = useWorkbenchValue("activePage") as string | undefined;

  useEffect(() => {
    document.title = `${activePage || title}`;
  }, [activePage, title]);

  return null;
}
