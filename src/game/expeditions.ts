import { isAtHome } from "./dwarves";
import { NEWCOMER_DESTINATION, welcomeNewcomer } from "./newcomer";
import { resolveRaid } from "./raid";
import type {
  ColonyState,
  DestinationId,
  Dwarf,
  ResourceKey,
  Resources,
} from "../types";

export type { DestinationId };

export interface Destination {
  id: DestinationId;
  name: string;
  description: string;
  // D7: true = after a successful return, enemies follow the traveller home
  // and attack Stonehome. A failed journey never leads them here.
  hostile?: boolean;
}

// All places beyond the gate. The rewards are decided by the server
// (server/index.js); here we only keep what the player needs to choose.
export const destinations: Record<DestinationId, Destination> = {
  "crystal-cave": {
    id: "crystal-cave",
    name: "Crystal Cave",
    description: "Crystal seams and stone – sometimes a lost tool.",
  },
  "old-mine": {
    id: "old-mine",
    name: "The Old Mine",
    description: "Plenty of good stone and some usable timber.",
  },
  "blocked-pass": {
    id: "blocked-pass",
    name: "Blocked Pass",
    description: "Rumoured to be sealed by rockfall.",
  },
  hcw: {
    id: "hcw",
    name: "HCW",
    description:
      "Well-stocked halls of learning – but the lecturers will follow you home and attack.",
    hostile: true,
  },
};

export function isDestination(id: string): id is DestinationId {
  return id in destinations;
}

// Who may leave? Any dwarf who is at home (idle or working).
// A dwarf at the forge or already travelling stays where they are.
export function canSendOnExpedition(dwarf: Dwarf): boolean {
  return isAtHome(dwarf);
}

// Why can't this expedition start? null = everything is fine.
export function expeditionProblem(
  state: ColonyState,
  dwarfId: string,
  destination: string,
): string | null {
  const dwarf = state.dwarves.find((item) => item.id === dwarfId);

  if (!dwarf) return "Choose a scout first.";
  if (!canSendOnExpedition(dwarf))
    return `${dwarf.name} is busy and cannot leave the hold.`;
  if (!isDestination(destination))
    return "That destination is not on the hold map.";
  return null;
}

// The dwarf leaves (D4). Everything happens at once or not at all:
// - status "expedition" -> no production, no job change, no forge
// - the job is kept, so the dwarf simply resumes it after returning
// - the tool stays with the dwarf (team decision), hasTool is not touched
// - the expedition is remembered under `expeditionId`
// Invalid request -> unchanged state.
export function departExpedition(
  state: ColonyState,
  expeditionId: string,
  dwarfId: string,
  destination: string,
): ColonyState {
  if (expeditionProblem(state, dwarfId, destination) !== null) return state;
  if (!isDestination(destination)) return state; // (already checked, narrows the type)

  return {
    ...state,
    dwarves: state.dwarves.map((item) =>
      item.id === dwarfId ? { ...item, status: "expedition" } : item,
    ),
    expeditions: [
      ...state.expeditions,
      { id: expeditionId, dwarfId, destination, departedOnDay: state.day },
    ],
  };
}

// Only real, positive resource amounts are booked – an unknown key or a
// negative number from the server can never break the store.
function addRewards(resources: Resources, rewards: Partial<Resources>): Resources {
  const result = { ...resources };
  for (const [key, amount] of Object.entries(rewards)) {
    if (!(key in result)) continue;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
      continue;
    result[key as ResourceKey] += amount;
  }
  return result;
}

// Ends a running expedition: the dwarf goes back to their job (or idle) and the
// expedition is removed from the list. Unknown id (already finished, or never
// really started) -> unchanged state. This is what makes "exactly once" work.
function endExpedition(
  state: ColonyState,
  expeditionId: string,
  rewards: Partial<Resources>,
): ColonyState {
  const expedition = state.expeditions.find((item) => item.id === expeditionId);
  if (!expedition) return state;

  return {
    ...state,
    resources: addRewards(state.resources, rewards),
    dwarves: state.dwarves.map((dwarf) =>
      dwarf.id === expedition.dwarfId
        ? { ...dwarf, status: dwarf.assignment ? "working" : "idle" }
        : dwarf,
    ),
    expeditions: state.expeditions.filter((item) => item.id !== expeditionId),
  };
}

// Success: the rewards are booked and the dwarf is back.
// D7: from a hostile destination (HCW) the lecturers follow the dwarf home and
// attack right after the loot is stored. Only here – failExpedition never
// leads to an attack. An unknown id (result arrived twice) changes nothing,
// so there is also never a second attack.
// D6: from the Crystal Cave the scout brings Leon along (only the first time,
// see welcomeNewcomer). Also only on success, never in failExpedition.
export function completeExpedition(
  state: ColonyState,
  expeditionId: string,
  rewards: Partial<Resources>,
): ColonyState {
  const expedition = state.expeditions.find((item) => item.id === expeditionId);
  if (!expedition) return state;

  let home = endExpedition(state, expeditionId, rewards);
  if (expedition.destination === NEWCOMER_DESTINATION) home = welcomeNewcomer(home);
  if (!destinations[expedition.destination].hostile) return home;
  return resolveRaid(home);
}

// Failure: the dwarf comes back without loot – never stuck "away".
export function failExpedition(
  state: ColonyState,
  expeditionId: string,
): ColonyState {
  return endExpedition(state, expeditionId, {});
}
