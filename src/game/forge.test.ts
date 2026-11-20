import { describe, expect, it } from "vitest";
import type { ColonyState, Resources } from "../types";
import { craft, missingMaterials, recipes } from "./forge";

const colony = (resources: Partial<Resources>): ColonyState => ({
  day: 1,
  resources: { wood: 0, stone: 0, food: 10, tools: 0, weapons: 0, ...resources },
  dwarves: [],
  starving: false,
});

describe("forge recipes (D2)", () => {
  it("forging a tool costs 3 wood + 2 stone", () => {
    const next = craft(colony({ wood: 5, stone: 5 }), "tool");
    expect(next.resources).toMatchObject({ wood: 2, stone: 3, tools: 1 });
  });

  it("forging a weapon costs 2 wood + 4 stone and fills the weapon store", () => {
    const next = craft(colony({ wood: 5, stone: 5 }), "weapon");
    expect(next.resources).toMatchObject({ wood: 3, stone: 1, weapons: 1, tools: 0 });
  });

  it("not enough stone -> nothing changes (starter bug: stone went negative)", () => {
    const state = colony({ wood: 10, stone: 1 });
    expect(craft(state, "tool")).toBe(state);
  });

  it("not enough wood -> nothing changes", () => {
    const state = colony({ wood: 1, stone: 10 });
    expect(craft(state, "weapon")).toBe(state);
  });

  it("reports which materials are missing", () => {
    expect(missingMaterials(colony({ wood: 0, stone: 0 }).resources, recipes.weapon)).toEqual(["wood", "stone"]);
    expect(missingMaterials(colony({ wood: 2, stone: 4 }).resources, recipes.weapon)).toEqual([]);
  });
});
