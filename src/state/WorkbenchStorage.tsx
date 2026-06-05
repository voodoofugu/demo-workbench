import useStorageItems from "../hooks/useStorageItems.js";
import type { DemoWorkbenchStorageEntry } from "../types/public";
import workbenchNexus from "./workbenchNexus";

export default function WorkbenchStorage({
  storageData = [],
}: {
  storageData?: DemoWorkbenchStorageEntry[];
}) {
  useStorageItems(storageData, workbenchNexus, false);

  return null;
}
