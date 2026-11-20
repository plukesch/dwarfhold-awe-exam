import type { ColonyState, Dwarf, JobType, Resources } from "./types";

export const production: Record<Exclude<JobType, null>, Partial<Resources>> = {
  woodcutting: { wood: 3 }, mining: { stone: 2 }, farming: { food: 4 },
};

// A dwarf only produces if they have a job AND are actually at work.
// Dwarves on an expedition (or later: crafting) keep their assignment,
// but do not contribute to it while they are busy elsewhere.
export function isProducing(dwarf: Dwarf): boolean {
  return dwarf.assignment !== null && dwarf.status === "working";
}

// Total production of one day. Used by advanceDay AND by the Shift Ledger,
// so the UI always shows exactly what the simulation will apply.
export function dailyProduction(dwarves: Dwarf[]): Resources {
  const total: Resources = { wood: 0, stone: 0, food: 0, tools: 0 };

  for (const dwarf of dwarves) {
    if (!isProducing(dwarf) || dwarf.assignment === null) continue;

    const output = production[dwarf.assignment];
    for (const [resource, amount] of Object.entries(output)) {
      total[resource as keyof Resources] += amount ?? 0;
    }
  }

  return total;
}

// Team decision: EVERY dwarf eats 1 ration per day – including dwarves on an
// expedition, because they pack their ration from the hold before leaving.
export const FOOD_PER_DWARF = 1;

export function dailyMeals(dwarves: Dwarf[]): number {
  return dwarves.length * FOOD_PER_DWARF;
}

export function advanceDay(state: ColonyState): ColonyState {
  const produced = dailyProduction(state.dwarves);

  const resources: Resources = {
    wood: state.resources.wood + produced.wood,
    stone: state.resources.stone + produced.stone,
    food: state.resources.food + produced.food,
    tools: state.resources.tools + produced.tools,
  };

  resources.food = Math.max(0, resources.food - dailyMeals(state.dwarves));

  return { ...state, day: state.day + 1, resources };
}

export const jobLabel = (job: JobType) => job ? ({
  woodcutting: "Woodcutting",
  mining: "Deep Mining",
  farming: "Mushroom Farm"
}[job]) : "Unassigned";
