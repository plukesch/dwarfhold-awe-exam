import { describe, expect, it } from "vitest";
import type { ColonyState, Dwarf, Resources } from "../types";
import { forgeProblem, missingMaterials, recipes, startForging } from "./forge";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: "mining", status: "working", hasTool: false, ...overrides,
});

const colony = (resources: Partial<Resources>, dwarves: Dwarf[] = [dwarf({})]): ColonyState => ({
  day: 10,
  resources: { wood: 0, stone: 0, food: 10, tools: 0, weapons: 0, ...resources },
  dwarves,
  starving: false,
  forgeTask: null,
});

describe("forge recipes (D2)", () => {
  it("reports which materials are missing", () => {
    expect(missingMaterials(colony({ wood: 0, stone: 0 }).resources, recipes.weapon)).toEqual(["wood", "stone"]);
    expect(missingMaterials(colony({ wood: 2, stone: 4 }).resources, recipes.weapon)).toEqual([]);
  });
});

describe("starting a forge order (D3)", () => {
  it("pays the materials at the start, the smith starts crafting", () => {
    const next = startForging(colony({ wood: 5, stone: 5 }), "tool", "d1");
    expect(next.resources).toMatchObject({ wood: 2, stone: 3, tools: 0 }); // tool not there yet
    expect(next.dwarves[0].status).toBe("crafting");
    expect(next.dwarves[0].assignment).toBe("mining"); // job is kept for later
  });

  it("remembers who forges what and when it is done (tool 2 days, weapon 3 days)", () => {
    expect(startForging(colony({ wood: 5, stone: 5 }), "tool", "d1").forgeTask)
      .toEqual({ recipeId: "tool", dwarfId: "d1", completesOnDay: 12 });
    expect(startForging(colony({ wood: 5, stone: 5 }), "weapon", "d1").forgeTask)
      .toEqual({ recipeId: "weapon", dwarfId: "d1", completesOnDay: 13 });
  });

  it("not enough materials -> nothing changes (starter bug: stone went negative)", () => {
    const state = colony({ wood: 10, stone: 1 });
    expect(startForging(state, "tool", "d1")).toBe(state);
  });

  it("a dwarf on an expedition cannot forge", () => {
    const state = colony({ wood: 10, stone: 10 }, [dwarf({ status: "expedition" })]);
    expect(startForging(state, "tool", "d1")).toBe(state);
  });

  it("unknown dwarf -> nothing changes", () => {
    const state = colony({ wood: 10, stone: 10 });
    expect(startForging(state, "tool", "nobody")).toBe(state);
  });

  it("only one order at a time (one forge)", () => {
    const state = colony({ wood: 20, stone: 20 }, [dwarf({ id: "d1" }), dwarf({ id: "d2" })]);
    const first = startForging(state, "tool", "d1");
    const second = startForging(first, "weapon", "d2");
    expect(second).toBe(first); // second order is rejected completely
    expect(second.dwarves[1].status).toBe("working");
  });

  it("explains why an order cannot start", () => {
    expect(forgeProblem(colony({ wood: 0, stone: 5 }), "tool", "d1")).toMatch(/wood/);
    expect(forgeProblem(colony({ wood: 5, stone: 5 }), "tool", "d1")).toBeNull();
  });
});
