import type {
  ColonyState,
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

// Pays ALL materials and adds the item – or, if anything is missing,
// returns the unchanged state (no partial payment, nothing goes negative).
export function craft(state: ColonyState, recipeId: RecipeId): ColonyState {
  const recipe = recipes[recipeId];
  if (!canAfford(state.resources, recipe)) return state;

  const resources = { ...state.resources };
  for (const [key, amount] of Object.entries(recipe.cost)) {
    resources[key as ResourceKey] -= amount ?? 0;
  }
  resources[recipe.output] += 1;

  return { ...state, resources };
}
