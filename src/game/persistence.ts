import { failExpedition, isDestination } from "./expeditions";
import { recipes } from "./forge";
import type {
  ActiveExpedition,
  ColonyState,
  Dwarf,
  ForgeTask,
  RaidReport,
  ResourceKey,
} from "../types";

// D5: Save and restore. Only pure functions here – no localStorage, no React.
// The provider reads/writes the browser storage and passes the text in/out.

// Key in the browser's localStorage.
export const SAVE_KEY = "dwarfhold-save";

// Raise this number whenever the shape of ColonyState changes (e.g. D6 adds
// the new species). An older save then no longer matches and the game safely
// starts fresh instead of loading half-fitting data.
// 1 = D5, 2 = D7 added `lastRaid`, 3 = D6 added `species` to every resident.
export const SAVE_VERSION = 3;

// What is stored: the version plus the whole colony state.
export function serializeSave(colony: ColonyState): string {
  return JSON.stringify({ version: SAVE_VERSION, colony });
}

// Reads a saved game. Every kind of problem gives null -> the caller starts a
// new colony. Possible problems: nothing saved, not JSON, other version,
// missing or wrong fields, or data that contradicts itself.
export function parseSave(raw: string | null): ColonyState | null {
  if (raw === null) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data) || data.version !== SAVE_VERSION) return null;
  if (!isColony(data.colony) || !isConsistent(data.colony)) return null;
  return data.colony;
}

// ---------------------------------------------------------------------------
// 1. Shape: does every field exist and have the right type?

const resourceKeys: ResourceKey[] = ["wood", "stone", "food", "tools", "weapons"];
const jobs = ["woodcutting", "mining", "farming"];
const statuses = ["idle", "working", "expedition", "crafting"];
const species = ["dwarf", "lecturer"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Whole number, not negative (resources and days can never be negative).
function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isDwarf(value: unknown): value is Dwarf {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.title === "string" &&
    typeof value.icon === "string" &&
    species.includes(value.species as string) &&
    (value.assignment === null || jobs.includes(value.assignment as string)) &&
    statuses.includes(value.status as string) &&
    (value.specialty === undefined || jobs.includes(value.specialty as string)) &&
    typeof value.hasTool === "boolean"
  );
}

function isForgeTask(value: unknown): value is ForgeTask {
  return (
    isRecord(value) &&
    typeof value.recipeId === "string" &&
    value.recipeId in recipes &&
    typeof value.dwarfId === "string" &&
    isCount(value.completesOnDay)
  );
}

function isExpedition(value: unknown): value is ActiveExpedition {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.dwarfId === "string" &&
    typeof value.destination === "string" &&
    isDestination(value.destination) &&
    isCount(value.departedOnDay)
  );
}

// D7: the report of the last attack. The loot may only contain known
// resources with whole, non-negative amounts.
function isRaidReport(value: unknown): value is RaidReport {
  return (
    isRecord(value) &&
    isCount(value.day) &&
    typeof value.defended === "boolean" &&
    isCount(value.weaponsLost) &&
    isRecord(value.loot) &&
    Object.entries(value.loot).every(
      ([key, amount]) => resourceKeys.includes(key as ResourceKey) && isCount(amount),
    )
  );
}

function isColony(value: unknown): value is ColonyState {
  return (
    isRecord(value) &&
    isCount(value.day) &&
    isRecord(value.resources) &&
    resourceKeys.every((key) => isCount((value.resources as Record<string, unknown>)[key])) &&
    Array.isArray(value.dwarves) &&
    value.dwarves.every(isDwarf) &&
    typeof value.starving === "boolean" &&
    (value.forgeTask === null || isForgeTask(value.forgeTask)) &&
    Array.isArray(value.expeditions) &&
    value.expeditions.every(isExpedition) &&
    (value.lastRaid === null || isRaidReport(value.lastRaid))
  );
}

// ---------------------------------------------------------------------------
// 2. Consistency: the right types alone are not enough. These are the same
// rules the game keeps while running (one activity per dwarf, D1/D3/D4).

function isConsistent(colony: ColonyState): boolean {
  const dwarfIds = colony.dwarves.map((dwarf) => dwarf.id);
  if (hasDuplicates(dwarfIds)) return false;

  // D6: Leon joins only once -> at most one lecturer in Stonehome.
  const lecturers = colony.dwarves.filter((dwarf) => dwarf.species === "lecturer");
  if (lecturers.length > 1) return false;

  // Expeditions: every dwarf with status "expedition" has exactly one entry
  // in the list, and every entry belongs to such a dwarf.
  const travellers = colony.dwarves
    .filter((dwarf) => dwarf.status === "expedition")
    .map((dwarf) => dwarf.id);
  const expeditionDwarves = colony.expeditions.map((item) => item.dwarfId);
  if (hasDuplicates(colony.expeditions.map((item) => item.id))) return false;
  if (hasDuplicates(expeditionDwarves)) return false;
  if (expeditionDwarves.length !== travellers.length) return false;
  if (!expeditionDwarves.every((id) => travellers.includes(id))) return false;

  // Forge: a "crafting" dwarf exists exactly when there is a forge order,
  // and it is the smith of that order.
  const smiths = colony.dwarves.filter((dwarf) => dwarf.status === "crafting");
  if (colony.forgeTask === null) return smiths.length === 0;
  return smiths.length === 1 && smiths[0].id === colony.forgeTask.dwarfId;
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

// ---------------------------------------------------------------------------
// 3. Team decision: what happens to work that a refresh interrupted?
// - Expeditions: the request to the server is gone after a refresh, its answer
//   can never arrive. Every traveller comes home WITHOUT loot (same rule as any
//   other failed expedition in D4). So refreshing can never earn extra rewards.
// - Forge orders: they depend on game days, not on a request -> nothing is
//   lost. The order simply continues and finishes on its day.

export interface ResumeResult {
  colony: ColonyState;
  returnedHome: string[]; // names of interrupted travellers, for the chronicle
}

export function resumeAfterRefresh(colony: ColonyState): ResumeResult {
  const returnedHome = colony.expeditions.map(
    (expedition) =>
      colony.dwarves.find((dwarf) => dwarf.id === expedition.dwarfId)?.name ??
      "A scout",
  );

  const resumed = colony.expeditions.reduce(
    (state, expedition) => failExpedition(state, expedition.id),
    colony,
  );

  return { colony: resumed, returnedHome };
}
