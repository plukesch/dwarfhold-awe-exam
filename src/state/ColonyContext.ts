import { createContext, useContext } from "react";
import type { Activity, ColonyState, DestinationId, JobType } from "../types";
import type { RecipeId } from "../game/forge";

export interface ColonyContextValue {
  colony: ColonyState;
  paused: boolean;
  activities: Activity[];
  togglePaused: () => void;
  assignDwarf: (id: string, assignment: JobType) => void;
  equipToolTo: (dwarfId: string) => void;
  returnToolFrom: (dwarfId: string) => void;
  forge: (recipeId: RecipeId, dwarfId: string) => void;
  sendExpedition: (dwarfId: string, destination: DestinationId) => Promise<void>;
}

export const ColonyContext = createContext<ColonyContextValue | null>(null);

export function useColony(): ColonyContextValue {
  const context = useContext(ColonyContext);
  if (!context) {
    throw new Error("useColony must be used inside <ColonyProvider>");
  }
  return context;
}
