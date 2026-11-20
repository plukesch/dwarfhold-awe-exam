export type ResourceKey = "wood" | "stone" | "food" | "tools" | "weapons";
export type JobType = "woodcutting" | "mining" | "farming" | null;
// crafting = busy at the forge (D3) – produces nothing, cannot change job
export type DwarfStatus = "idle" | "working" | "expedition" | "crafting";
export type RecipeId = "tool" | "weapon";

// tools   = tools lying in the store (NOT equipped). Equipped tools are counted
//           via Dwarf.hasTool -> total tools = resources.tools + equipped dwarves.
// weapons = colony weapon stock, not assigned to anyone (D2, used in D7).
export interface Resources {
  wood: number;
  stone: number;
  food: number;
  tools: number;
  weapons: number;
}

export interface Dwarf {
  id: string;
  name: string;
  title: string;
  icon: string;
  assignment: JobType;
  status: DwarfStatus;
  specialty?: Exclude<JobType, null>;
  // true if this dwarf carries a tool from the store (max. one per dwarf)
  hasTool: boolean;
}

export interface ColonyState {
  day: number;
  resources: Resources;
  dwarves: Dwarf[];
  // true if the last day's meals could not be served completely (D1 hunger rule)
  starving: boolean;
  // the one running forge order, or null if the forge is free (D3)
  forgeTask: ForgeTask | null;
}

// D3: Stonehome has exactly one forge -> at most one order at a time.
export interface ForgeTask {
  recipeId: RecipeId;
  dwarfId: string; // who is crafting
  completesOnDay: number; // the item is added when this day is reached
}

export interface ExpeditionResult {
  expeditionId: string;
  status: "completed";
  rewards: Partial<Resources>;
  message: string;
}

export interface Activity {
  id: string;
  day: number;
  message: string;
  tone?: "good" | "warning";
}
