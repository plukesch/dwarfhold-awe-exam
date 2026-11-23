export type ResourceKey = "wood" | "stone" | "food" | "tools" | "weapons";
export type JobType = "woodcutting" | "mining" | "farming" | null;
// crafting = busy at the forge (D3) – produces nothing, cannot change job
export type DwarfStatus = "idle" | "working" | "expedition" | "crafting";
export type RecipeId = "tool" | "weapon";
// D4: all places a dwarf can travel to (details in game/expeditions.ts)
export type DestinationId = "crystal-cave" | "old-mine" | "blocked-pass" | "hcw";
// D6: who a resident is. "lecturer" = Leon, who joins after the first
// successful expedition to the Crystal Cave (details in game/newcomer.ts).
export type Species = "dwarf" | "lecturer";

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

// One resident of Stonehome. Still called "Dwarf" (used everywhere), but since
// D6 it can also be a non-dwarf – see `species`. All rules (food, status,
// tools, expeditions, saving) apply to every resident in this list.
export interface Dwarf {
  id: string;
  name: string;
  title: string;
  icon: string;
  species: Species;
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
  // every expedition that has left and not yet returned (D4).
  // A list, because several dwarves may travel at the same time.
  expeditions: ActiveExpedition[];
  // the most recent attack on Stonehome, or null if there was none yet (D7)
  lastRaid: RaidReport | null;
}

// D4: one running expedition. The id is created by us when the dwarf departs
// (not by the server). A result is only applied while its id is still in
// ColonyState.expeditions -> rewards can never be booked twice.
export interface ActiveExpedition {
  id: string;
  dwarfId: string;
  destination: DestinationId;
  departedOnDay: number;
}

// D3: Stonehome has exactly one forge -> at most one order at a time.
export interface ForgeTask {
  recipeId: RecipeId;
  dwarfId: string; // who is crafting
  completesOnDay: number; // the item is added when this day is reached
}

// D7: what happened when the lecturers attacked Stonehome.
export interface RaidReport {
  day: number;
  defended: boolean; // true = enough weapons, nothing was looted
  weaponsLost: number; // weapons that broke during the defense
  loot: Partial<Resources>; // what the attackers carried off
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
