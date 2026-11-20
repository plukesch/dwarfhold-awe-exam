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

// A dwarf can only get a new job while they are at home (idle or working).
// Away on an expedition (or later: crafting) -> the current activity comes first.
export function canChangeAssignment(dwarf: Dwarf): boolean {
  return dwarf.status === "idle" || dwarf.status === "working";
}

// Assigns a job. Invalid request (unknown dwarf or dwarf busy elsewhere)
// -> returns the unchanged state, so nothing is half-updated.
export function assignJob(
  state: ColonyState,
  dwarfId: string,
  assignment: JobType,
): ColonyState {
  const dwarf = state.dwarves.find((item) => item.id === dwarfId);
  if (!dwarf || !canChangeAssignment(dwarf)) return state;

  return {
    ...state,
    dwarves: state.dwarves.map((item) =>
      item.id === dwarfId
        ? { ...item, assignment, status: assignment ? "working" : "idle" }
        : item,
    ),
  };
}

// Team decision (D1 hunger rule): while the colony is starving, only the
// Mushroom Farm keeps working – hungry dwarves have no strength for wood or stone.
export function isHaltedByHunger(job: JobType, starving: boolean): boolean {
  return starving && job !== null && job !== "farming";
}

// Total production of one day. Used by advanceDay AND by the Shift Ledger,
// so the UI always shows exactly what the simulation will apply.
export function dailyProduction(dwarves: Dwarf[], starving = false): Resources {
  const total: Resources = { wood: 0, stone: 0, food: 0, tools: 0 };

  for (const dwarf of dwarves) {
    if (!isProducing(dwarf) || dwarf.assignment === null) continue;
    if (isHaltedByHunger(dwarf.assignment, starving)) continue;

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

// One day of the colony, in a fixed order:
// 1. production (if the colony is starving, only farmers produce)
// 2. meals: if there is enough food, everyone eats and hunger ends;
//    otherwise the remaining food is eaten, food becomes 0 (never negative)
//    and the colony is starving for the next day.
export function advanceDay(state: ColonyState): ColonyState {
  const produced = dailyProduction(state.dwarves, state.starving);

  const resources: Resources = {
    wood: state.resources.wood + produced.wood,
    stone: state.resources.stone + produced.stone,
    food: state.resources.food + produced.food,
    tools: state.resources.tools + produced.tools,
  };

  const meals = dailyMeals(state.dwarves);
  const starving = resources.food < meals;
  resources.food = starving ? 0 : resources.food - meals;

  return { ...state, day: state.day + 1, resources, starving };
}

export const jobLabel = (job: JobType) => job ? ({
  woodcutting: "Woodcutting",
  mining: "Deep Mining",
  farming: "Mushroom Farm"
}[job]) : "Unassigned";
