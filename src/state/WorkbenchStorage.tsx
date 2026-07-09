import nexus from "./nexus";

import useStorageItems from "../hooks/useStorageItems.js";
import type { DemoWorkbenchStorageEntry } from "../types/internal";

export default function WorkbenchStorage({
  storageData = [],
}: {
  storageData?: DemoWorkbenchStorageEntry[];
}) {
  useStorageItems(storageData, nexus);

  return null;
}
