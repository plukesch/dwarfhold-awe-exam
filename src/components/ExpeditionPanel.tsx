import { useState } from "react";
import {
  canSendOnExpedition,
  destinations,
  expeditionProblem,
} from "../game/expeditions";
import { hasNewcomerJoined, newcomer, NEWCOMER_DESTINATION } from "../game/newcomer";
import {
  canDefend,
  RAID_DEFENSE_THRESHOLD,
  WEAPONS_LOST_ON_DEFENSE,
} from "../game/raid";
import type { ColonyState, DestinationId, Dwarf } from "../types";

interface Props {
  colony: ColonyState;
  onSend: (dwarfId: string, destination: DestinationId) => void;
}

// Why a dwarf is greyed out in the scout list.
function busyReason(dwarf: Dwarf): string {
  if (dwarf.status === "expedition") return "on the road";
  if (dwarf.status === "crafting") return "at the forge";
  return "busy";
}

export function ExpeditionPanel({ colony, onSend }: Props) {
  const [scoutId, setScoutId] = useState("dwarf-3");
  const [destination, setDestination] = useState<DestinationId>("crystal-cave");

  // Same rule as the provider uses -> the button is only enabled if the
  // expedition would really start.
  const problem = expeditionProblem(colony, scoutId, destination);
  const nameOf = (dwarfId: string) =>
    colony.dwarves.find((dwarf) => dwarf.id === dwarfId);

  return (
    <section className="panel expedition">
      <header>
        <div>
          <small>BEYOND THE GATE</small>
          <h2>Expedition</h2>
        </div>
        <b>🗺️</b>
      </header>

      <label>
        Scout
        <select value={scoutId} onChange={(event) => setScoutId(event.target.value)}>
          {colony.dwarves.map((dwarf) => {
            const available = canSendOnExpedition(dwarf);
            return (
              <option key={dwarf.id} value={dwarf.id} disabled={!available}>
                {dwarf.name}
                {available ? "" : ` (${busyReason(dwarf)})`}
              </option>
            );
          })}
        </select>
      </label>

      <label>
        Destination
        <select
          value={destination}
          onChange={(event) => setDestination(event.target.value as DestinationId)}
        >
          {Object.values(destinations).map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
            </option>
          ))}
        </select>
      </label>
      <p className="destination-note">{destinations[destination].description}</p>
      {destination === NEWCOMER_DESTINATION && (
        // D6: hint where the new resident can be found
        <p className="newcomer-hint">
          {hasNewcomerJoined(colony)
            ? `${newcomer.icon} ${newcomer.name} already lives in Stonehome.`
            : "👀 Someone seems to be hiding in the glittering tunnels…"}
        </p>
      )}
      {destinations[destination].hostile && (
        // D7: show the outcome before the player decides
        <p className={canDefend(colony.resources) ? "raid-forecast ready" : "raid-forecast"}>
          🗡️ {colony.resources.weapons} / {RAID_DEFENSE_THRESHOLD} weapons –{" "}
          {canDefend(colony.resources)
            ? "Stonehome would drive them off."
            : "Stonehome would be looted!"}
        </p>
      )}

      <button disabled={problem !== null} onClick={() => onSend(scoutId, destination)}>
        Send expedition
      </button>
      {problem && <p className="expedition-problem">{problem}</p>}

      <div className="on-the-road">
        <small>ON THE ROAD</small>
        {colony.expeditions.length === 0 ? (
          <p>Nobody is travelling.</p>
        ) : (
          <ul>
            {colony.expeditions.map((expedition) => {
              const dwarf = nameOf(expedition.dwarfId);
              return (
                <li key={expedition.id}>
                  <strong>
                    {dwarf?.icon} {dwarf?.name ?? "A scout"}
                    {dwarf?.hasTool && " ⚒️"}
                  </strong>
                  <span>
                    → {destinations[expedition.destination].name} · left on day{" "}
                    {expedition.departedOnDay}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="rule-note">
        Several dwarves may travel at once, but each only on one journey. While
        away, a dwarf does not work, forge or change jobs – but still eats a
        ration. An equipped tool travels along (no bonus on the road). A failed
        route sends the dwarf home empty-handed. Pausing the hold does not stop
        a journey. Refreshing the page breaks off every journey: the dwarves
        come home empty-handed. After a successful return from HCW the
        lecturers attack: with {RAID_DEFENSE_THRESHOLD} or more weapons in the
        store Stonehome defends itself and {WEAPONS_LOST_ON_DEFENSE} weapon
        breaks; otherwise they carry off half (rounded down) of the wood, stone
        and food. A failed journey never leads them home. The first successful
        return from the Crystal Cave brings a new resident home – only once,
        never after a failed journey.
      </p>
    </section>
  );
}
