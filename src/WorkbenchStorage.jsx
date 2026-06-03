import { useMemo } from "react";

import useStorageItems from "./useStorageItems";
import { useWorkbenchStore } from "./WorkbenchState";

export default function WorkbenchStorage({ storageData = [] }) {
  const { state, setWorkbenchState } = useWorkbenchStore();

  const items = useMemo(
    () =>
      storageData.map((item) => {
        const name = item[0];
        const type = item[1] || "session";

        return {
          name,
          type,
          value: state[name],
          onLoad: (value) => setWorkbenchState({ [name]: value }),
        };
      }),
    [state, storageData, setWorkbenchState],
  );

  useStorageItems(items);

  return null;
}
