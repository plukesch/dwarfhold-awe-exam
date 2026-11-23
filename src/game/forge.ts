import { isAtHome } from "./dwarves";
import { speciesRules } from "./species";
import type {
  ColonyState,
  Dwarf,
  RecipeId,
  ResourceKey,
  Resources,
} from "../types";

export type { RecipeId };

export interface Recipe {
  id: RecipeId;
  name: string;
  icon: string;
  cost: Partial<Resources>;
  output: ResourceKey; // the forged item goes into this store
  days: number; // how many days the forging takes (D3)
}

// All forge recipes in one place. Team decisions:
// - a weapon costs 2 wood + 4 stone (more stone than a tool, so mining matters
//   for the colony's defense in D7)
// - a tool takes 2 days, a weapon 3 days at the forge
export const recipes: Record<RecipeId, Recipe> = {
  tool: {
    id: "tool",
    name: "Tool",
    icon: "⚒️",
    cost: { wood: 3, stone: 2 },
    output: "tools",
    days: 2,
  },
  weapon: {
    id: "weapon",
    name: "Weapon",
    icon: "🗡️",
    cost: { wood: 2, stone: 4 },
    output: "weapons",
    days: 3,
  },
};

export function isForgeFree(state: ColonyState): boolean {
  return state.forgeTask === null;
}

// Which materials are missing? Empty list = the colony can afford the recipe.
export function missingMaterials(
  resources: Resources,
  recipe: Recipe,
): ResourceKey[] {
  return Object.entries(recipe.cost)
    .filter(([key, amount]) => resources[key as ResourceKey] < (amount ?? 0))
    .map(([key]) => key as ResourceKey);
}

export function canAfford(resources: Resources, recipe: Recipe): boolean {
  return missingMaterials(resources, recipe).length === 0;
}

// Who may work the forge? Any dwarf who is at home (idle or working).
// Dwarves on an expedition or already crafting are not eligible.
export function canForge(dwarf: Dwarf): boolean {
  return isAtHome(dwarf);
}

// D6: may this smith forge this recipe at all? (Leon cannot forge tools.)
export function canForgeRecipe(dwarf: Dwarf, recipeId: RecipeId): boolean {
  return !speciesRules[dwarf.species].cannotForge.includes(recipeId);
}

// D6: how many days this smith needs for the recipe. Normally the days of the
// recipe; a species may be faster (Leon forges a weapon in 2 days).
export function forgeDays(recipe: Recipe, dwarf: Dwarf): number {
  return speciesRules[dwarf.species].forgeDays[recipe.id] ?? recipe.days;
}

// Why can't this order start? null = everything is fine.
export function forgeProblem(
  state: ColonyState,
  recipeId: RecipeId,
  dwarfId: string,
): string | null {
  const recipe = recipes[recipeId];
  const dwarf = state.dwarves.find((item) => item.id === dwarfId);

  if (!isForgeFree(state)) return "The forge is already in use.";
  if (!dwarf) return "Choose a smith first.";
  if (!canForge(dwarf))
    return `${dwarf.name} is busy and cannot work the forge.`;
  if (!canForgeRecipe(dwarf, recipeId))
    return `${dwarf.name} cannot forge a ${recipe.name.toLowerCase()}.`;
  const missing = missingMaterials(state.resources, recipe);
  if (missing.length > 0) {
    return `The forge needs more ${missing.join(" and ")} for a ${recipe.name.toLowerCase()}.`;
  }
  return null;
}

// Starts a forge order (D3). Everything happens at once or not at all:
// - materials are paid immediately (the smith takes them to the forge)
// - the smith gets status "crafting" (no production, no job change)
// - the order remembers on which day the item is ready
// Invalid request -> unchanged state (no worker or resource changes).
export function startForging(
  state: ColonyState,
  recipeId: RecipeId,
  dwarfId: string,
): ColonyState {
  if (forgeProblem(state, recipeId, dwarfId) !== null) return state;

  const recipe = recipes[recipeId];
  const smith = state.dwarves.find((item) => item.id === dwarfId)!; // checked above
  const resources = { ...state.resources };
  for (const [key, amount] of Object.entries(recipe.cost)) {
    resources[key as ResourceKey] -= amount ?? 0;
  }

  return {
    ...state,
    resources,
    dwarves: state.dwarves.map((item) =>
      item.id === dwarfId ? { ...item, status: "crafting" } : item,
    ),
    forgeTask: {
      recipeId,
      dwarfId,
      completesOnDay: state.day + forgeDays(recipe, smith),
    },
  };
}

// Finishes the running order once its day is reached (called by advanceDay):
// the item goes into the store, the smith goes back to their job (or idle)
// and the forge is free again. Nothing to finish -> unchanged state.
export function finishForging(state: ColonyState): ColonyState {
  const task = state.forgeTask;
  if (!task || state.day < task.completesOnDay) return state;

  const recipe = recipes[task.recipeId];
  return {
    ...state,
    resources: {
      ...state.resources,
      [recipe.output]: state.resources[recipe.output] + 1,
    },
    dwarves: state.dwarves.map((dwarf) =>
      dwarf.id === task.dwarfId
        ? { ...dwarf, status: dwarf.assignment ? "working" : "idle" }
        : dwarf,
    ),
    forgeTask: null,
  };
}

// How many days until the running order is done (0 = finishes now).
export function daysLeft(state: ColonyState): number {
  return state.forgeTask
    ? Math.max(0, state.forgeTask.completesOnDay - state.day)
    : 0;
}
