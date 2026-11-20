import type { Dwarf } from "../types";

// "At home" = not busy with something else (expedition, crafting).
// Shared by the simulation, tools and forge, so it lives in its own file
// (avoids circular imports between simulation.ts and game/*.ts).
export function isAtHome(dwarf: Dwarf): boolean {
  return dwarf.status === "idle" || dwarf.status === "working";
}
