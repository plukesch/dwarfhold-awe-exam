import type { ColonyState, DestinationId, Dwarf } from "../types";

// D6: Leon Freudenthaler, a lecturer who escaped from HCW and hides in the
// Crystal Cave. Team decisions:
// - he joins after the FIRST successful expedition to the Crystal Cave
//   (a failed journey never finds him)
// - he joins only once: if he already lives in Stonehome, nothing happens
// - he arrives without a job and without a tool; from then on all colony
//   rules apply to him like to everyone else (food, status, tools, saving)

export const NEWCOMER_DESTINATION: DestinationId = "crystal-cave";

// Fixed id (no randomness) -> deterministic and easy to test.
export const newcomer: Dwarf = {
  id: "lecturer-1",
  name: "Leon Freudenthaler",
  title: "Runaway Lecturer",
  icon: "👨‍🏫",
  species: "lecturer",
  assignment: null,
  status: "idle",
  hasTool: false,
};

// "Only once" is derived from the residents instead of a separate flag,
// so the two can never contradict each other (also after loading a save).
export function hasNewcomerJoined(state: ColonyState): boolean {
  return state.dwarves.some((dwarf) => dwarf.species === "lecturer");
}

// Leon moves into Stonehome. Already there -> unchanged state.
export function welcomeNewcomer(state: ColonyState): ColonyState {
  if (hasNewcomerJoined(state)) return state;
  return { ...state, dwarves: [...state.dwarves, newcomer] };
}
