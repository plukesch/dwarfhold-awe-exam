import type { ColonyState, ResourceKey, Resources } from "../types";

// D7: After a successful return from a hostile destination (HCW), the
// lecturers follow the traveller home and attack Stonehome.
// Only pure functions here – the same colony always gives the same result.

// Team decision: from this many weapons in the store, Stonehome defends itself.
export const RAID_DEFENSE_THRESHOLD = 3;

// Team decision: a successful defense costs weapons – one breaks.
export const WEAPONS_LOST_ON_DEFENSE = 1;

// Team decision: without a defense, the attackers take half (rounded down)
// of these resources. Tools and weapons are not taken.
export const LOOTED_RESOURCES: ResourceKey[] = ["wood", "stone", "food"];

export function canDefend(resources: Resources): boolean {
  return resources.weapons >= RAID_DEFENSE_THRESHOLD;
}

// What the attackers carry off. Rounded down, so the amount taken is never
// more than what is stored -> resources can never become negative.
export function raidLoot(resources: Resources): Partial<Resources> {
  const loot: Partial<Resources> = {};
  for (const key of LOOTED_RESOURCES) {
    loot[key] = Math.floor(resources[key] / 2);
  }
  return loot;
}

// The attack itself: either a defense (one weapon breaks, nothing is lost)
// or a raid (the loot is removed from the store). The report is stored in
// `lastRaid`, so the game can show what happened.
export function resolveRaid(state: ColonyState): ColonyState {
  if (canDefend(state.resources)) {
    return {
      ...state,
      resources: {
        ...state.resources,
        weapons: state.resources.weapons - WEAPONS_LOST_ON_DEFENSE,
      },
      lastRaid: {
        day: state.day,
        defended: true,
        weaponsLost: WEAPONS_LOST_ON_DEFENSE,
        loot: {},
      },
    };
  }

  const loot = raidLoot(state.resources);
  const resources = { ...state.resources };
  for (const key of LOOTED_RESOURCES) {
    resources[key] -= loot[key] ?? 0;
  }

  return {
    ...state,
    resources,
    lastRaid: { day: state.day, defended: false, weaponsLost: 0, loot },
  };
}
