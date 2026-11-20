import { useState } from "react";
import { Chronicle } from "../components/Chronicle";
import { DwarfRoster } from "../components/DwarfRoster";
import {
  dailyMeals,
  dailyProduction,
  isHaltedByHunger,
  isProducing,
  jobLabel,
  production,
} from "../simulation";
import { useColony } from "../state/ColonyContext";

export function ColonyPage() {
  const { colony, activities, expeditionPending, assignDwarf, sendExpedition } =
    useColony();
  const [destination, setDestination] = useState("crystal-cave");
  const [expeditionDwarf, setExpeditionDwarf] = useState("dwarf-3");

  // Same calculation as the simulation uses -> ledger and reality always match.
  const produced = dailyProduction(colony.dwarves, colony.starving);
  const meals = dailyMeals(colony.dwarves);
  const netFood = produced.food - meals;

  return (
    <div className="dashboard">
      <DwarfRoster
        dwarves={colony.dwarves}
        starving={colony.starving}
        onAssign={assignDwarf}
      />

      <section className="center-stack">
        <section className="panel production">
          <header>
            <div>
              <small>SHIFT LEDGER</small>
              <h2>Daily Production</h2>
            </div>
            <span>updates each day</span>
          </header>

          <div className="job-grid">
            {(["woodcutting", "mining", "farming"] as const).map((job) => {
              const halted = isHaltedByHunger(job, colony.starving);
              return (
                <article key={job} className={halted ? "halted" : undefined}>
                  <b>
                    {job === "woodcutting"
                      ? "🌲"
                      : job === "mining"
                        ? "⛏️"
                        : "🍄"}
                  </b>
                  <h3>{jobLabel(job)}</h3>
                  <p>
                    {
                      colony.dwarves.filter(
                        (dwarf) =>
                          dwarf.assignment === job && isProducing(dwarf),
                      ).length
                    }{" "}
                    at work
                  </p>
                  {halted ? (
                    <strong className="loss">Halted – hunger</strong>
                  ) : (
                    <strong>+{Object.values(production[job])[0]} / day</strong>
                  )}
                </article>
              );
            })}
          </div>

          <div className="net-line">
            <span>NET FOOD AFTER MEALS</span>
            <strong className={netFood >= 0 ? "gain" : "loss"}>
              {netFood >= 0 ? "+" : ""}
              {netFood}
            </strong>
          </div>
          <p className="rule-note">
            Every dwarf eats 1 ration per day ({meals} total) – also dwarves on
            an expedition, because they pack their ration before leaving. If the
            food runs out, the hold starves: only the Mushroom Farm works until
            all meals can be served again.
          </p>
        </section>
      </section>

      <aside className="side-stack">
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
            <select
              value={expeditionDwarf}
              onChange={(event) => setExpeditionDwarf(event.target.value)}
            >
              {colony.dwarves.map((dwarf) => (
                <option key={dwarf.id} value={dwarf.id}>
                  {dwarf.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Destination
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              <option value="crystal-cave">Crystal Cave</option>
              <option value="old-mine">The Old Mine</option>
              <option value="blocked-pass">Blocked Pass</option>
            </select>
          </label>

          <button
            disabled={expeditionPending}
            onClick={() => sendExpedition(expeditionDwarf, destination)}
          >
            {expeditionPending ? "Beyond the gate…" : "Send expedition"}
          </button>
          <p>
            A result returns in one request. The selected dwarf is unavailable
            while travelling.
          </p>
        </section>

        <Chronicle activities={activities} />
      </aside>
    </div>
  );
}
