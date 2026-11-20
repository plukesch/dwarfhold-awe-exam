import { isAtHome } from "./dwarves";
import type { ColonyState, Dwarf } from "../types";

// A tool lives either in the store (resources.tools) or with exactly one dwarf
// (dwarf.hasTool). Equipping/returning moves it between those two places, so the
// total number of tools never changes.
// Tools can only be handed out or returned while the dwarf is at home.

export function canEquipTool(state: ColonyState, dwarf: Dwarf): boolean {
  return isAtHome(dwarf) && !dwarf.hasTool && state.resources.tools > 0;
}

export function canReturnTool(dwarf: Dwarf): boolean {
  return isAtHome(dwarf) && dwarf.hasTool;
}

// Store -1, dwarf gets the tool. Invalid -> unchanged state.
export function equipTool(state: ColonyState, dwarfId: string): ColonyState {
  const dwarf = state.dwarves.find((item) => item.id === dwarfId);
  if (!dwarf || !canEquipTool(state, dwarf)) return state;

  return {
    ...state,
    resources: { ...state.resources, tools: state.resources.tools - 1 },
    dwarves: state.dwarves.map((item) =>
      item.id === dwarfId ? { ...item, hasTool: true } : item,
    ),
  };
}

// Dwarf gives the tool back, store +1. Invalid -> unchanged state.
export function returnTool(state: ColonyState, dwarfId: string): ColonyState {
  const dwarf = state.dwarves.find((item) => item.id === dwarfId);
  if (!dwarf || !canReturnTool(dwarf)) return state;

  return {
    ...state,
    resources: { ...state.resources, tools: state.resources.tools + 1 },
    dwarves: state.dwarves.map((item) =>
      item.id === dwarfId ? { ...item, hasTool: false } : item,
    ),
  };
}

export function equippedToolCount(dwarves: Dwarf[]): number {
  return dwarves.filter((dwarf) => dwarf.hasTool).length;
}
