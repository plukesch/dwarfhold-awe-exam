import { isHaltedByHunger, isProducing, jobLabel } from "../simulation";
import type { Dwarf, JobType } from "../types";

const jobs: Exclude<JobType, null>[] = ["woodcutting", "mining", "farming"];

interface Props {
  dwarves: Dwarf[];
  starving: boolean;
  onAssign: (id: string, job: JobType) => void;
}

export function DwarfRoster({ dwarves, starving, onAssign }: Props) {
  const presentDwarves = dwarves.filter(
    (dwarf) => dwarf.status !== "expedition",
  ).length;

  return (
    <section className="panel roster">
      <header>
        <div>
          <small>THE COMPANY</small>
          <h2>Holdfolk</h2>
        </div>
        <span>
          {presentDwarves} / {dwarves.length} present
        </span>
      </header>

      <div className="dwarf-list">
        {dwarves.map((dwarf) => {
          const isAway = dwarf.status === "expedition";
          // At work, but their job is halted because the colony is starving
          const isHungry =
            isProducing(dwarf) && isHaltedByHunger(dwarf.assignment, starving);
          const specialty = dwarf.specialty
            ? `Skilled in ${jobLabel(dwarf.specialty)}`
            : "Generalist";

          return (
            <article className={isAway ? "dwarf away" : "dwarf"} key={dwarf.id}>
              <div className="portrait">
                {dwarf.icon}
                <i className={dwarf.status} />
              </div>

              <div className="dwarf-details">
                <h3>{dwarf.name}</h3>
                <p>
                  {dwarf.title} · {specialty}
                </p>

                <select
                  value={dwarf.assignment ?? ""}
                  disabled={isAway}
                  onChange={(event) =>
                    onAssign(dwarf.id, (event.target.value || null) as JobType)
                  }
                >
                  <option value="">Unassigned</option>
                  {jobs.map((job) => (
                    <option value={job} key={job}>
                      {jobLabel(job)}
                    </option>
                  ))}
                </select>
              </div>

              {isHungry ? (
                <span
                  className="status hungry"
                  title="Halted – the colony is starving"
                >
                  hungry
                </span>
              ) : (
                <span className="status">{dwarf.status}</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
