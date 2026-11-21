import { describe, expect, it } from "vitest";
import type { ColonyState, Dwarf } from "../types";
import { advanceDay } from "../simulation";
import { startForging } from "./forge";
import {
  completeExpedition,
  departExpedition,
  destinations,
  expeditionProblem,
  failExpedition,
} from "./expeditions";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: "mining", status: "working", hasTool: false, ...overrides,
});

const colony = (dwarves: Dwarf[] = [dwarf({})]): ColonyState => ({
  day: 10,
  resources: { wood: 5, stone: 5, food: 10, tools: 0, weapons: 0 },
  dwarves,
  starving: false,
  forgeTask: null,
  expeditions: [],
  lastRaid: null,
});

describe("departing on an expedition (D4)", () => {
  it("the dwarf leaves, keeps the job and the expedition is remembered", () => {
    const next = departExpedition(colony(), "e1", "d1", "crystal-cave");
    expect(next.dwarves[0]).toMatchObject({ status: "expedition", assignment: "mining" });
    expect(next.expeditions).toEqual([
      { id: "e1", dwarfId: "d1", destination: "crystal-cave", departedOnDay: 10 },
    ]);
  });

  it("the tool travels with the dwarf (team decision)", () => {
    const state = colony([dwarf({ hasTool: true })]);
    const next = departExpedition(state, "e1", "d1", "old-mine");
    expect(next.dwarves[0].hasTool).toBe(true);
    expect(next.resources.tools).toBe(0);
  });

  it("several dwarves may travel at the same time", () => {
    let state = colony([dwarf({ id: "d1" }), dwarf({ id: "d2" })]);
    state = departExpedition(state, "e1", "d1", "crystal-cave");
    state = departExpedition(state, "e2", "d2", "old-mine");
    expect(state.expeditions).toHaveLength(2);
  });

  it("the same dwarf cannot be sent twice", () => {
    const once = departExpedition(colony(), "e1", "d1", "crystal-cave");
    expect(departExpedition(once, "e2", "d1", "old-mine")).toBe(once);
  });

  it("a dwarf at the forge cannot leave", () => {
    const forging = startForging(colony(), "tool", "d1");
    expect(expeditionProblem(forging, "d1", "crystal-cave")).toMatch(/busy/);
    expect(departExpedition(forging, "e1", "d1", "crystal-cave")).toBe(forging);
  });

  it("unknown dwarf or destination -> unchanged state", () => {
    const state = colony();
    expect(departExpedition(state, "e1", "nobody", "crystal-cave")).toBe(state);
    expect(departExpedition(state, "e1", "d1", "moon")).toBe(state);
  });
});

describe("returning from an expedition (D4)", () => {
  const away = () => departExpedition(colony(), "e1", "d1", "crystal-cave");

  it("success books the rewards and the dwarf resumes the job", () => {
    const next = completeExpedition(away(), "e1", { stone: 8, tools: 1 });
    expect(next.resources).toMatchObject({ stone: 13, tools: 1 });
    expect(next.dwarves[0].status).toBe("working");
    expect(next.expeditions).toEqual([]);
  });

  it("rewards are booked exactly once, even if the result arrives twice", () => {
    const once = completeExpedition(away(), "e1", { stone: 8 });
    const twice = completeExpedition(once, "e1", { stone: 8 });
    expect(twice).toBe(once);
    expect(twice.resources.stone).toBe(13);
  });

  it("a dwarf without a job comes back idle", () => {
    const state = departExpedition(colony([dwarf({ assignment: null, status: "idle" })]), "e1", "d1", "old-mine");
    expect(completeExpedition(state, "e1", {}).dwarves[0].status).toBe("idle");
  });

  it("failure brings the dwarf back without loot", () => {
    const before = away();
    const next = failExpedition(before, "e1");
    expect(next.resources).toEqual(before.resources);
    expect(next.dwarves[0].status).toBe("working");
    expect(next.expeditions).toEqual([]);
  });

  it("a late success after a failure changes nothing", () => {
    const failed = failExpedition(away(), "e1");
    expect(completeExpedition(failed, "e1", { stone: 8 })).toBe(failed);
  });

  it("only real, positive resource amounts are booked", () => {
    const next = completeExpedition(away(), "e1", { stone: -4, gold: 99, wood: Number.NaN } as never);
    expect(next.resources).toEqual(away().resources);
  });
});

describe("expeditions and the daily simulation", () => {
  it("a travelling dwarf produces nothing but still eats", () => {
    const next = advanceDay(departExpedition(colony(), "e1", "d1", "crystal-cave"));
    expect(next.resources.stone).toBe(5);
    expect(next.resources.food).toBe(9);
  });
});

describe("HCW – the hostile destination (D7)", () => {
  it("is on the map and a dwarf can travel there", () => {
    const next = departExpedition(colony(), "e1", "d1", "hcw");
    expect(next.expeditions).toEqual([
      { id: "e1", dwarfId: "d1", destination: "hcw", departedOnDay: colony().day },
    ]);
  });

  it("is the only destination marked hostile", () => {
    const hostile = Object.values(destinations).filter((place) => place.hostile);
    expect(hostile.map((place) => place.id)).toEqual(["hcw"]);
  });
});

describe("returning from HCW: the lecturers attack (D7)", () => {
  // Brom travels to HCW; the store holds `weapons` weapons.
  const atHcw = (weapons: number) => {
    const start = { ...colony(), resources: { ...colony().resources, weapons } };
    return departExpedition(start, "e1", "d1", "hcw");
  };

  it("success with 3 weapons: loot is stored, one weapon breaks, nothing is looted", () => {
    const next = completeExpedition(atHcw(3), "e1", { wood: 6, food: 4 });
    expect(next.resources).toEqual({ wood: 11, stone: 5, food: 14, tools: 0, weapons: 2 });
    expect(next.lastRaid).toEqual({ day: 10, defended: true, weaponsLost: 1, loot: {} });
    expect(next.dwarves[0].status).toBe("working");
  });

  it("success without enough weapons: half of the store (incl. the new loot) is taken", () => {
    const next = completeExpedition(atHcw(2), "e1", { wood: 6, food: 4 });
    // before the raid: wood 11, stone 5, food 14 -> lecturers take 5, 2, 7
    expect(next.resources).toEqual({ wood: 6, stone: 3, food: 7, tools: 0, weapons: 2 });
    expect(next.lastRaid).toMatchObject({ defended: false, loot: { wood: 5, stone: 2, food: 7 } });
  });

  it("a failed journey to HCW never leads to an attack", () => {
    const before = atHcw(0);
    const next = failExpedition(before, "e1");
    expect(next.lastRaid).toBeNull();
    expect(next.resources).toEqual(before.resources);
  });

  it("the same result arriving twice attacks only once", () => {
    const once = completeExpedition(atHcw(0), "e1", { wood: 6 });
    expect(completeExpedition(once, "e1", { wood: 6 })).toBe(once);
  });

  it("other destinations do not attack", () => {
    const away = departExpedition(colony(), "e1", "d1", "old-mine");
    expect(completeExpedition(away, "e1", { stone: 12 }).lastRaid).toBeNull();
  });
});
