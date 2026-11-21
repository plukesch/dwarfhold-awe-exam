import { describe, expect, it } from "vitest";
import type { ColonyState, Dwarf } from "../types";
import { assignJob } from "../simulation";
import { equipTool, equippedToolCount, returnTool } from "./tools";

const dwarf = (overrides: Partial<Dwarf>): Dwarf => ({
  id: "d1", name: "Brom", title: "", icon: "", assignment: "mining", status: "working", hasTool: false, ...overrides,
});

const colony = (tools: number, dwarves: Dwarf[]): ColonyState => ({
  day: 1,
  resources: { wood: 0, stone: 0, food: 10, tools, weapons: 0 },
  dwarves,
  starving: false,
  forgeTask: null,
  expeditions: [],
  lastRaid: null,
});

// total tools = store + equipped -> must never change by equipping/returning
const totalTools = (state: ColonyState) =>
  state.resources.tools + equippedToolCount(state.dwarves);

describe("tools (D2)", () => {
  it("equipping moves a tool from the store to the dwarf", () => {
    const state = colony(1, [dwarf({ id: "d1" })]);
    const next = equipTool(state, "d1");
    expect(next.resources.tools).toBe(0);
    expect(next.dwarves[0].hasTool).toBe(true);
    expect(totalTools(next)).toBe(totalTools(state));
  });

  it("returning moves the tool back to the store", () => {
    const state = colony(0, [dwarf({ id: "d1", hasTool: true })]);
    const next = returnTool(state, "d1");
    expect(next.resources.tools).toBe(1);
    expect(next.dwarves[0].hasTool).toBe(false);
  });

  it("cannot equip when the store is empty", () => {
    const state = colony(0, [dwarf({ id: "d1" })]);
    expect(equipTool(state, "d1")).toBe(state);
  });

  it("a dwarf cannot carry two tools", () => {
    const state = colony(2, [dwarf({ id: "d1", hasTool: true })]);
    expect(equipTool(state, "d1")).toBe(state);
  });

  it("one tool cannot go to two dwarves", () => {
    const state = colony(1, [dwarf({ id: "d1" }), dwarf({ id: "d2" })]);
    const afterFirst = equipTool(state, "d1");
    const afterSecond = equipTool(afterFirst, "d2");
    expect(afterSecond).toBe(afterFirst); // second attempt changes nothing
    expect(afterSecond.dwarves.map((d) => d.hasTool)).toEqual([true, false]);
  });

  it("no equipping or returning while on an expedition", () => {
    const away = colony(1, [dwarf({ id: "d1", status: "expedition" })]);
    expect(equipTool(away, "d1")).toBe(away);
    const awayWithTool = colony(0, [dwarf({ id: "d1", status: "expedition", hasTool: true })]);
    expect(returnTool(awayWithTool, "d1")).toBe(awayWithTool);
  });

  it("returning without a tool changes nothing", () => {
    const state = colony(1, [dwarf({ id: "d1" })]);
    expect(returnTool(state, "d1")).toBe(state);
  });
});

describe("tools only for compatible jobs (D2 fix)", () => {
  it("a farmer cannot take a tool", () => {
    const state = colony(1, [dwarf({ id: "d1", assignment: "farming" })]);
    expect(equipTool(state, "d1")).toBe(state);
  });

  it("a dwarf without a job cannot take a tool", () => {
    const state = colony(1, [dwarf({ id: "d1", assignment: null, status: "idle" })]);
    expect(equipTool(state, "d1")).toBe(state);
  });

  it("switching to the farm returns the tool to the store automatically", () => {
    const state = colony(0, [dwarf({ id: "d1", assignment: "mining", hasTool: true })]);
    const next = assignJob(state, "d1", "farming");
    expect(next.dwarves[0].hasTool).toBe(false);
    expect(next.resources.tools).toBe(1);
    expect(totalTools(next)).toBe(totalTools(state));
  });

  it("switching between woodcutting and mining keeps the tool", () => {
    const state = colony(0, [dwarf({ id: "d1", assignment: "mining", hasTool: true })]);
    const next = assignJob(state, "d1", "woodcutting");
    expect(next.dwarves[0].hasTool).toBe(true);
    expect(next.resources.tools).toBe(0);
  });
});
