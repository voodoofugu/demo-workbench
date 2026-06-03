import { useEffect } from "react";

import { useWorkbenchValue } from "./WorkbenchState";

export default function WorkbenchTitle({ title = "Template" }) {
  const activePage = useWorkbenchValue("activePage");

  useEffect(() => {
    document.title = `${activePage || title}`;
  }, [activePage, title]);

  return null;
}
