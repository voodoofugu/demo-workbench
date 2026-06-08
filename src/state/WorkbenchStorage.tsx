import nexus from "./nexus";

import useStorageItems from "../hooks/useStorageItems.js";
import type { DemoWorkbenchStorageEntry } from "../types/public";

export default function WorkbenchStorage({
  storageData = [],
}: {
  storageData?: DemoWorkbenchStorageEntry[];
}) {
  useStorageItems(storageData, nexus, false);

  return null;
}
