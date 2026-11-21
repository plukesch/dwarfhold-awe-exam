import { describe, expect, it } from "vitest";
import type { ColonyState, Resources } from "../types";
import {
  canDefend,
  RAID_DEFENSE_THRESHOLD,
  raidLoot,
  resolveRaid,
} from "./raid";

const colony = (resources: Partial<Resources> = {}): ColonyState => ({
  day: 20,
  resources: { wood: 10, stone: 7, food: 5, tools: 2, weapons: 0, ...resources },
  dwarves: [],
  starving: false,
  forgeTask: null,
  expeditions: [],
  lastRaid: null,
});

describe("defending Stonehome (D7)", () => {
  it("defends itself from the threshold on, not below", () => {
    expect(canDefend(colony({ weapons: RAID_DEFENSE_THRESHOLD }).resources)).toBe(true);
    expect(canDefend(colony({ weapons: RAID_DEFENSE_THRESHOLD - 1 }).resources)).toBe(false);
  });

  it("a defense breaks one weapon and nothing is looted", () => {
    const before = colony({ weapons: 3 });
    const after = resolveRaid(before);

    expect(after.resources).toEqual({ ...before.resources, weapons: 2 });
    expect(after.lastRaid).toEqual({ day: 20, defended: true, weaponsLost: 1, loot: {} });
  });
});

describe("a raid without defense (D7)", () => {
  it("the attackers take half (rounded down) of wood, stone and food", () => {
    expect(raidLoot(colony().resources)).toEqual({ wood: 5, stone: 3, food: 2 });
  });

  it("the loot is removed; tools and weapons stay", () => {
    const after = resolveRaid(colony({ weapons: 2 }));

    expect(after.resources).toEqual({ wood: 5, stone: 4, food: 3, tools: 2, weapons: 2 });
    expect(after.lastRaid).toEqual({
      day: 20,
      defended: false,
      weaponsLost: 0,
      loot: { wood: 5, stone: 3, food: 2 },
    });
  });

  it("an empty store loses nothing and never goes negative", () => {
    const after = resolveRaid(colony({ wood: 0, stone: 1, food: 0 }));
    expect(after.resources).toMatchObject({ wood: 0, stone: 1, food: 0 });
  });

  it("is deterministic: the same colony always gives the same result", () => {
    expect(resolveRaid(colony())).toEqual(resolveRaid(colony()));
  });

  it("does not change the colony it was given", () => {
    const before = colony();
    resolveRaid(before);
    expect(before.resources).toEqual(colony().resources);
  });
});
