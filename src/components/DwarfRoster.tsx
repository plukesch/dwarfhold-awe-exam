import {
  canChangeAssignment,
  getsToolBonus,
  isAtHome,
  isHaltedByHunger,
  isProducing,
  jobLabel,
  TOOL_BONUS,
} from "../simulation";
import type { Dwarf, JobType } from "../types";

const jobs: Exclude<JobType, null>[] = ["woodcutting", "mining", "farming"];

interface Props {
  dwarves: Dwarf[];
  starving: boolean;
  toolsInStore: number;
  onAssign: (id: string, job: JobType) => void;
  onEquipTool: (id: string) => void;
  onReturnTool: (id: string) => void;
}

export function DwarfRoster({
  dwarves,
  starving,
  toolsInStore,
  onAssign,
  onEquipTool,
  onReturnTool,
}: Props) {
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
                <h3>
                  {dwarf.name}
                  {dwarf.hasTool && (
                    <span className="tool-badge" title="Carries a tool">
                      ⚒️
                    </span>
                  )}
                </h3>
                <p>
                  {dwarf.title} · {specialty}
                </p>
                {dwarf.hasTool && (
                  <small
                    className={
                      getsToolBonus(dwarf) ? "tool-note" : "tool-note unused"
                    }
                  >
                    {getsToolBonus(dwarf)
                      ? `Tool: +${TOOL_BONUS} per day on this job`
                      : "Tool has no use on this job"}
                  </small>
                )}

                <select
                  value={dwarf.assignment ?? ""}
                  disabled={!canChangeAssignment(dwarf)}
                  title={
                    isAway
                      ? "Away – the job is paused and resumes on return"
                      : undefined
                  }
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
                {isAway && dwarf.assignment && (
                  <small className="job-paused">
                    Job paused while away – resumes on return
                  </small>
                )}

                {dwarf.hasTool ? (
                  <button
                    className="tool-button"
                    disabled={!isAtHome(dwarf)}
                    onClick={() => onReturnTool(dwarf.id)}
                  >
                    Return tool
                  </button>
                ) : (
                  <button
                    className="tool-button"
                    disabled={!isAtHome(dwarf) || toolsInStore === 0}
                    title={
                      toolsInStore === 0 ? "No tool in the store" : undefined
                    }
                    onClick={() => onEquipTool(dwarf.id)}
                  >
                    Equip tool
                  </button>
                )}
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
