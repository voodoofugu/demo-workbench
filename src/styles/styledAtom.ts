import { createStyledAtomStore } from "styled-atom";
import type {
  StyledAtomStore,
  StyledAtomStoreOptionsT,
  StyledAtomT,
} from "styled-atom";
import type { FC } from "react";

type WorkbenchStyleAtoms = {
  store: StyledAtomStore;
  StyledAtom: FC<StyledAtomT>;
  configure: (options: StyledAtomStoreOptionsT) => void;
  preload: StyledAtomStore["preload"];
  reload: StyledAtomStore["reload"];
  replace: StyledAtomStore["replace"];
  dispose: StyledAtomStore["dispose"];
};

const createdStyleAtoms = createStyledAtomStore();

export const workbenchStyleAtoms: WorkbenchStyleAtoms = createdStyleAtoms;
export const StyledAtom: FC<StyledAtomT> = createdStyleAtoms.StyledAtom;
