import { describe, expect, it } from "vitest";
import { advanceDay, dailyProduction } from "./simulation";
import type { ColonyState, Dwarf } from "./types";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: null, status: "idle", ...overrides,
});

describe("colony simulation", () => {
  it("produces assigned resources and feeds the company", () => {
    const state: ColonyState = { day: 1, resources: { wood: 0, stone: 0, food: 5, tools: 0 }, dwarves: [dwarf({ assignment: "woodcutting", status: "working" })] };
    expect(advanceDay(state)).toMatchObject({ day: 2, resources: { wood: 3, food: 4 } });
    expect(state.resources.wood).toBe(0);
  });

  it("does not let a dwarf on an expedition produce for their assignment", () => {
    const state: ColonyState = {
      day: 1,
      resources: { wood: 0, stone: 0, food: 10, tools: 0 },
      dwarves: [
        dwarf({ id: "d1", assignment: "woodcutting", status: "expedition" }),
        dwarf({ id: "d2", assignment: "mining", status: "working" }),
      ],
    };
    const next = advanceDay(state);
    expect(next.resources.wood).toBe(0);
    expect(next.resources.stone).toBe(2);
  });

  it("dwarves on an expedition still eat their ration", () => {
    const state: ColonyState = {
      day: 1,
      resources: { wood: 0, stone: 0, food: 10, tools: 0 },
      dwarves: [
        dwarf({ id: "d1", status: "expedition" }),
        dwarf({ id: "d2", status: "idle" }),
      ],
    };
    expect(advanceDay(state).resources.food).toBe(8);
  });

  it("dailyProduction only counts dwarves that are at work", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "farming", status: "working" }),
      dwarf({ id: "d2", assignment: "farming", status: "expedition" }),
      dwarf({ id: "d3", assignment: null, status: "idle" }),
    ])).toEqual({ wood: 0, stone: 0, food: 4, tools: 0 });
  });
});
