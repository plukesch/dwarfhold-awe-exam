import { describe, expect, it } from "vitest";
import type { ColonyState, Dwarf } from "../types";
import { advanceDay } from "../simulation";
import {
  parseSave,
  resumeAfterRefresh,
  SAVE_VERSION,
  serializeSave,
} from "./persistence";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: "mining", status: "working", hasTool: false, ...overrides,
});

// A colony in the middle of everything: one dwarf travelling (with a tool),
// one at the forge, one at home.
const busyColony = (): ColonyState => ({
  day: 10,
  resources: { wood: 5, stone: 5, food: 10, tools: 0, weapons: 2 },
  dwarves: [
    dwarf({ id: "d1", name: "Brom", status: "expedition", hasTool: true }),
    dwarf({ id: "d2", name: "Yrsa", status: "crafting", assignment: "woodcutting" }),
    dwarf({ id: "d3", name: "Dori", status: "idle", assignment: null }),
  ],
  starving: true,
  forgeTask: { recipeId: "weapon", dwarfId: "d2", completesOnDay: 12 },
  expeditions: [{ id: "e1", dwarfId: "d1", destination: "crystal-cave", departedOnDay: 10 }],
  lastRaid: { day: 8, defended: false, weaponsLost: 0, loot: { wood: 3, stone: 0, food: 6 } },
});

// Saves `colony`, but lets a test break something first.
const saveWith = (change: (colony: Record<string, any>) => void) => {
  const colony = structuredClone(busyColony()) as Record<string, any>;
  change(colony);
  return JSON.stringify({ version: SAVE_VERSION, colony });
};

describe("saving and loading (D5)", () => {
  it("a saved colony comes back exactly the same", () => {
    const colony = busyColony();
    expect(parseSave(serializeSave(colony))).toEqual(colony);
  });

  it("nothing saved yet -> null (new game)", () => {
    expect(parseSave(null)).toBeNull();
  });

  it("text that is not JSON -> null", () => {
    expect(parseSave("{ this is not json")).toBeNull();
    expect(parseSave("")).toBeNull();
  });

  it("a save from another version -> null", () => {
    const raw = JSON.stringify({ version: SAVE_VERSION + 1, colony: busyColony() });
    expect(parseSave(raw)).toBeNull();
    expect(parseSave(JSON.stringify({ colony: busyColony() }))).toBeNull();
  });

  it("missing or wrong fields -> null", () => {
    expect(parseSave(saveWith((c) => delete c.starving))).toBeNull();
    expect(parseSave(saveWith((c) => delete c.resources.weapons))).toBeNull();
    expect(parseSave(saveWith((c) => (c.day = "ten")))).toBeNull();
    expect(parseSave(saveWith((c) => (c.dwarves = "nobody")))).toBeNull();
    expect(parseSave(saveWith((c) => delete c.dwarves[2].hasTool))).toBeNull();
    expect(parseSave(JSON.stringify({ version: SAVE_VERSION, colony: null }))).toBeNull();
  });

  it("negative or broken resource amounts -> null", () => {
    expect(parseSave(saveWith((c) => (c.resources.stone = -3)))).toBeNull();
    expect(parseSave(saveWith((c) => (c.resources.food = 2.5)))).toBeNull();
    expect(parseSave(saveWith((c) => (c.resources.wood = null)))).toBeNull();
  });

  it("unknown status, job, recipe or destination -> null", () => {
    expect(parseSave(saveWith((c) => (c.dwarves[2].status = "sleeping")))).toBeNull();
    expect(parseSave(saveWith((c) => (c.dwarves[2].assignment = "fishing")))).toBeNull();
    expect(parseSave(saveWith((c) => (c.forgeTask.recipeId = "crown")))).toBeNull();
    expect(parseSave(saveWith((c) => (c.expeditions[0].destination = "moon")))).toBeNull();
  });

  it("a broken raid report -> null (D7)", () => {
    expect(parseSave(saveWith((c) => delete c.lastRaid))).toBeNull();
    expect(parseSave(saveWith((c) => (c.lastRaid.defended = "yes")))).toBeNull();
    expect(parseSave(saveWith((c) => (c.lastRaid.loot.food = -6)))).toBeNull();
    expect(parseSave(saveWith((c) => (c.lastRaid.loot.gold = 5)))).toBeNull();
    expect(parseSave(saveWith((c) => (c.lastRaid = null)))).not.toBeNull();
  });

  it("a save from before D7 (version 1, no lastRaid) -> null", () => {
    const old: Partial<ColonyState> = structuredClone(busyColony());
    delete old.lastRaid;
    expect(parseSave(JSON.stringify({ version: 1, colony: old }))).toBeNull();
  });

  it("contradicting data -> null", () => {
    // travelling, but not in the expedition list
    expect(parseSave(saveWith((c) => (c.expeditions = [])))).toBeNull();
    // in the expedition list, but at home
    expect(parseSave(saveWith((c) => (c.dwarves[0].status = "working")))).toBeNull();
    // same dwarf twice on the road
    expect(parseSave(saveWith((c) => c.expeditions.push({ ...c.expeditions[0], id: "e2" })))).toBeNull();
    // forge order without a smith at the forge
    expect(parseSave(saveWith((c) => (c.dwarves[1].status = "working")))).toBeNull();
    // smith at the forge, but no order
    expect(parseSave(saveWith((c) => (c.forgeTask = null)))).toBeNull();
    // two dwarves with the same id
    expect(parseSave(saveWith((c) => (c.dwarves[2].id = "d1")))).toBeNull();
  });
});

describe("work interrupted by a refresh (D5 policy)", () => {
  it("travellers come home without loot and go back to their job", () => {
    const colony = busyColony();
    const { colony: resumed, returnedHome } = resumeAfterRefresh(colony);

    expect(returnedHome).toEqual(["Brom"]);
    expect(resumed.expeditions).toEqual([]);
    expect(resumed.dwarves[0]).toMatchObject({ status: "working", hasTool: true });
    expect(resumed.resources).toEqual(colony.resources);
  });

  it("a forge order is kept and finishes on its day", () => {
    const { colony: resumed } = resumeAfterRefresh(busyColony());
    expect(resumed.forgeTask).toEqual({ recipeId: "weapon", dwarfId: "d2", completesOnDay: 12 });

    const afterTwoDays = advanceDay(advanceDay(resumed));
    expect(afterTwoDays.forgeTask).toBeNull();
    expect(afterTwoDays.resources.weapons).toBe(3);
  });

  it("nothing interrupted -> nothing changes", () => {
    const colony = { ...busyColony(), expeditions: [], dwarves: busyColony().dwarves.slice(1) };
    const result = resumeAfterRefresh(colony);
    expect(result.colony).toBe(colony);
    expect(result.returnedHome).toEqual([]);
  });

  it("an interrupted journey to HCW brings no attack (D7)", () => {
    const colony = busyColony();
    colony.expeditions[0].destination = "hcw";
    const { colony: resumed } = resumeAfterRefresh(colony);
    expect(resumed.lastRaid).toEqual(colony.lastRaid);
    expect(resumed.resources).toEqual(colony.resources);
  });

  it("a restored save can be resumed and saved again", () => {
    const loaded = parseSave(serializeSave(busyColony()));
    expect(loaded).not.toBeNull();
    const { colony } = resumeAfterRefresh(loaded!);
    expect(parseSave(serializeSave(colony))).toEqual(colony);
  });
});
