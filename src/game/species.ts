import type { JobType, RecipeId, Resources, Species } from "../types";

// D6: everything that differs between the species, in one table.
// Everything else (food, status, tools, expeditions, saving) is the same for
// every resident and therefore not in here.

type Job = Exclude<JobType, null>;

export interface SpeciesRules {
  label: string;
  // short explanation for the player (shown on the resident's card)
  note: string;
  // what one resident of this species produces per day on each job
  production: Record<Job, Partial<Resources>>;
  // recipes this species cannot forge at all (crafting limitation)
  cannotForge: RecipeId[];
  // recipes this species forges in a different number of days (crafting
  // capability). Not listed -> the normal days of the recipe.
  forgeDays: Partial<Record<RecipeId, number>>;
}

// Team decisions for Leon (lecturer):
// - Deep Mining 4 stone (knows his geology lectures), Woodcutting only 1 wood,
//   Mushroom Farm only 2 food
// - cannot forge tools ("only theory, never practice")
// - forges a weapon in 2 instead of 3 days (knows how the HCW lecturers fight)
export const speciesRules: Record<Species, SpeciesRules> = {
  dwarf: {
    label: "Dwarf",
    note: "",
    production: {
      woodcutting: { wood: 3 },
      mining: { stone: 2 },
      farming: { food: 4 },
    },
    cannotForge: [],
    forgeDays: {},
  },
  lecturer: {
    label: "Lecturer",
    note: "Escaped from HCW. Strong miner, weak woodcutter and farmer. Forges a weapon in 2 days, but cannot forge tools.",
    production: {
      woodcutting: { wood: 1 },
      mining: { stone: 4 },
      farming: { food: 2 },
    },
    cannotForge: ["tool"],
    forgeDays: { weapon: 2 },
  },
};
