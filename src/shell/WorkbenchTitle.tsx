import { useEffect } from "react";
import type { ReactNode } from "react";

import nexus from "../state/nexus";

export default function WorkbenchTitle({
  title = "Template",
}: {
  title?: string;
  children?: ReactNode;
}) {
  const activePage = nexus.use("activePage") as string | undefined;

  useEffect(() => {
    document.title = `${activePage || title}`;
  }, [activePage, title]);

  return null;
}
