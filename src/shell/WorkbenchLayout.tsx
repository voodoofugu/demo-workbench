import { memo } from "react";
import type { ReactNode } from "react";

import SearchControl from "../components/SearchControl";
import ToggleButton from "../components/buttons/ToggleButton";
import type { DemoItem } from "../types/public";

export default memo(function WorkbenchLayout({
  title,
  demos,
  children,
}: {
  title?: string;
  demos?: DemoItem[];
  children?: ReactNode;
}) {
  return (
    <main className="fixed h-full w-full bg-indigo-200 dark:bg-indigo-950">
      <div className="relative mx-auto my-30 w-calcFull-80 max-w-1160 rounded-18 bg-indigo-250 p-10 shadow-shadowColor6 animate-appear dark:bg-indigo-1000 dark:shadow-darkColor1">
        <SearchControl demos={demos} />
        <div className="text-center text-2xl font-bold italic text-indigo-400 text-shadow-tS1 dark:text-indigo-500 dark:text-shadow-tS1Black">
          {title}
        </div>
        <ToggleButton />
      </div>
      {children}
    </main>
  );
});
