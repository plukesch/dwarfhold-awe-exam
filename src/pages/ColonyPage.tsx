import { Chronicle } from "../components/Chronicle";
import { DwarfRoster } from "../components/DwarfRoster";
import { ExpeditionPanel } from "../components/ExpeditionPanel";
import {
  dailyMeals,
  dailyProduction,
  getsToolBonus,
  isHaltedByHunger,
  isProducing,
  isToolCompatible,
  jobLabel,
  production,
  TOOL_BONUS,
} from "../simulation";
import { useColony } from "../state/ColonyContext";
import type { ResourceKey } from "../types";

export function ColonyPage() {
  const {
    colony,
    activities,
    assignDwarf,
    equipToolTo,
    returnToolFrom,
    sendExpedition,
  } = useColony();

  // Same calculation as the simulation uses -> ledger and reality always match.
  const produced = dailyProduction(colony.dwarves, colony.starving);
  const meals = dailyMeals(colony.dwarves);
  const netFood = produced.food - meals;

  return (
    <div className="dashboard">
      <DwarfRoster
        dwarves={colony.dwarves}
        starving={colony.starving}
        toolsInStore={colony.resources.tools}
        onAssign={assignDwarf}
        onEquipTool={equipToolTo}
        onReturnTool={returnToolFrom}
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
              const [resource, base] = Object.entries(production[job])[0];
              // Real total of this job today (incl. tool bonus) – same function
              // as the simulation, only for the dwarves on this job.
              const jobTotal = dailyProduction(
                colony.dwarves.filter((dwarf) => dwarf.assignment === job),
                colony.starving,
              )[resource as ResourceKey];
              const withTool = colony.dwarves.filter(
                (dwarf) =>
                  dwarf.assignment === job &&
                  isProducing(dwarf) &&
                  getsToolBonus(dwarf),
              ).length;
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
                    at work{withTool > 0 && ` · ${withTool} with tool`}
                  </p>
                  {halted ? (
                    <strong className="loss">Halted – hunger</strong>
                  ) : (
                    <strong>+{jobTotal} / day</strong>
                  )}
                  <small className="job-rate">
                    {base} per dwarf
                    {isToolCompatible(job)
                      ? `, +${TOOL_BONUS} with tool`
                      : ", tools don't help"}
                  </small>
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
        <ExpeditionPanel colony={colony} onSend={sendExpedition} />

        <Chronicle activities={activities} />
      </aside>
    </div>
  );
}
