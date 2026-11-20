import { describe, expect, it } from "vitest";
import { advanceDay, assignJob, dailyProduction } from "./simulation";
import type { ColonyState, Dwarf } from "./types";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: null, status: "idle", hasTool: false, ...overrides,
});

const colony = (overrides: Partial<ColonyState>): ColonyState => ({
  day: 1,
  resources: { wood: 0, stone: 0, food: 10, tools: 0, weapons: 0 },
  dwarves: [],
  starving: false,
  forgeTask: null,
  ...overrides,
});

describe("colony simulation", () => {
  it("produces assigned resources and feeds the company", () => {
    const state = colony({ resources: { wood: 0, stone: 0, food: 5, tools: 0, weapons: 0 }, dwarves: [dwarf({ assignment: "woodcutting", status: "working" })] });
    expect(advanceDay(state)).toMatchObject({ day: 2, resources: { wood: 3, food: 4 } });
    expect(state.resources.wood).toBe(0);
  });

  it("does not let a dwarf on an expedition produce for their assignment", () => {
    const state = colony({
      dwarves: [
        dwarf({ id: "d1", assignment: "woodcutting", status: "expedition" }),
        dwarf({ id: "d2", assignment: "mining", status: "working" }),
      ],
    });
    const next = advanceDay(state);
    expect(next.resources.wood).toBe(0);
    expect(next.resources.stone).toBe(2);
  });

  it("dwarves on an expedition still eat their ration", () => {
    const state = colony({
      dwarves: [
        dwarf({ id: "d1", status: "expedition" }),
        dwarf({ id: "d2", status: "idle" }),
      ],
    });
    expect(advanceDay(state).resources.food).toBe(8);
  });

  it("dailyProduction only counts dwarves that are at work", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "farming", status: "working" }),
      dwarf({ id: "d2", assignment: "farming", status: "expedition" }),
      dwarf({ id: "d3", assignment: null, status: "idle" }),
    ])).toEqual({ wood: 0, stone: 0, food: 4, tools: 0, weapons: 0 });
  });
});

describe("job assignment (D1: one activity at a time)", () => {
  it("assigns a job to a dwarf at home and sets them to working", () => {
    const state = colony({ dwarves: [dwarf({ id: "d1" })] });
    const next = assignJob(state, "d1", "mining");
    expect(next.dwarves[0]).toMatchObject({ assignment: "mining", status: "working" });
  });

  it("unassigning sets the dwarf to idle", () => {
    const state = colony({ dwarves: [dwarf({ id: "d1", assignment: "mining", status: "working" })] });
    expect(assignJob(state, "d1", null).dwarves[0]).toMatchObject({ assignment: null, status: "idle" });
  });

  it("does not change a dwarf who is on an expedition", () => {
    const state = colony({ dwarves: [dwarf({ id: "d1", assignment: "woodcutting", status: "expedition" })] });
    const next = assignJob(state, "d1", "mining");
    expect(next).toBe(state); // exactly the same object -> nothing changed
  });

  it("ignores unknown dwarves", () => {
    const state = colony({ dwarves: [dwarf({ id: "d1" })] });
    expect(assignJob(state, "nobody", "mining")).toBe(state);
  });
});

describe("hunger (D1)", () => {
  const company = [
    dwarf({ id: "d1", assignment: "woodcutting", status: "working" }),
    dwarf({ id: "d2", assignment: "mining", status: "working" }),
    dwarf({ id: "d3", assignment: "farming", status: "working" }),
  ];

  it("starts starving when meals cannot be served – food never goes negative", () => {
    const state = colony({
      resources: { wood: 0, stone: 0, food: 1, tools: 0, weapons: 0 },
      dwarves: company.slice(0, 2), // no farmer, 2 meals needed, only 1 food
    });
    const next = advanceDay(state);
    expect(next.starving).toBe(true);
    expect(next.resources.food).toBe(0);
  });

  it("while starving only farmers produce", () => {
    const state = colony({ resources: { wood: 0, stone: 0, food: 0, tools: 0, weapons: 0 }, dwarves: company, starving: true });
    const next = advanceDay(state);
    expect(next.resources.wood).toBe(0);
    expect(next.resources.stone).toBe(0);
    // 4 farmed - 3 meals = 1 left -> everyone was fed, hunger ends
    expect(next.resources.food).toBe(1);
    expect(next.starving).toBe(false);
  });

  it("stays starving if the farm alone cannot feed everyone", () => {
    const state = colony({
      resources: { wood: 0, stone: 0, food: 0, tools: 0, weapons: 0 },
      dwarves: [...company, dwarf({ id: "d4" }), dwarf({ id: "d5" })], // 5 meals, 4 farmed
      starving: true,
    });
    const next = advanceDay(state);
    expect(next.starving).toBe(true);
    expect(next.resources.food).toBe(0);
  });

  it("is deterministic: same state gives the same result", () => {
    const state = colony({ resources: { wood: 0, stone: 0, food: 0, tools: 0, weapons: 0 }, dwarves: company, starving: true });
    expect(advanceDay(state)).toEqual(advanceDay(state));
  });
});

describe("tool bonus (D2)", () => {
  it("an equipped tool adds +1 to woodcutting and mining", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "woodcutting", status: "working", hasTool: true }),
      dwarf({ id: "d2", assignment: "mining", status: "working", hasTool: true }),
    ])).toMatchObject({ wood: 4, stone: 3 });
  });

  it("without a tool there is no bonus", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "woodcutting", status: "working" }),
    ]).wood).toBe(3);
  });

  it("a tool does not help on the Mushroom Farm", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "farming", status: "working", hasTool: true }),
    ]).food).toBe(4);
  });

  it("no bonus while the dwarf is away", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "mining", status: "expedition", hasTool: true }),
    ]).stone).toBe(0);
  });

  it("no bonus for a job halted by hunger", () => {
    expect(dailyProduction([
      dwarf({ id: "d1", assignment: "woodcutting", status: "working", hasTool: true }),
    ], true).wood).toBe(0);
  });

  it("advanceDay applies the bonus", () => {
    const state = colony({ dwarves: [dwarf({ assignment: "woodcutting", status: "working", hasTool: true })] });
    expect(advanceDay(state).resources.wood).toBe(4);
  });
});

describe("crafting status (D3 step 1)", () => {
  const smith = dwarf({ id: "d1", assignment: "mining", status: "crafting", hasTool: true });

  it("a crafting dwarf produces nothing for their job (not even with a tool)", () => {
    expect(dailyProduction([smith]).stone).toBe(0);
  });

  it("a crafting dwarf cannot change their job", () => {
    const state = colony({ dwarves: [smith] });
    expect(assignJob(state, "d1", "farming")).toBe(state);
  });

  it("a crafting dwarf still eats", () => {
    expect(advanceDay(colony({ dwarves: [smith] })).resources.food).toBe(9);
  });
});
