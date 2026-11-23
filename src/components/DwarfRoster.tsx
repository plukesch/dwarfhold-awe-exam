import {
  canChangeAssignment,
  getsToolBonus,
  isAtHome,
  isHaltedByHunger,
  isProducing,
  isToolCompatible,
  jobLabel,
  TOOL_BONUS,
} from "../simulation";
import { speciesRules } from "../game/species";
import type { Dwarf, JobType } from "../types";

const resourceIcon = { wood: "🪵", stone: "🪨", food: "🍄", tools: "⚒️", weapons: "🗡️" };

// D6: "Deep Mining (+4 🪨)" – what THIS resident would produce on the job,
// so the player sees the difference between the species before assigning.
function jobOption(dwarf: Dwarf, job: Exclude<JobType, null>): string {
  const [resource, amount] = Object.entries(speciesRules[dwarf.species].production[job])[0];
  return `${jobLabel(job)} (+${amount} ${resourceIcon[resource as keyof typeof resourceIcon]})`;
}

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
          const rules = speciesRules[dwarf.species];
          const classes = ["dwarf", dwarf.species, isAway ? "away" : ""].join(" ").trim();

          return (
            <article className={classes} key={dwarf.id}>
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
                  {dwarf.species !== "dwarf" && (
                    <span className="species-badge">{rules.label}</span>
                  )}
                  {dwarf.title} · {specialty}
                </p>
                {rules.note && <small className="species-note">{rules.note}</small>}
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
                      {jobOption(dwarf, job)}
                    </option>
                  ))}
                </select>
                {isAway && dwarf.assignment && (
                  <small className="job-paused">
                    Job paused while away – resumes on return
                  </small>
                )}
                {dwarf.status === "crafting" && (
                  <small className="job-paused">
                    🔨 At the forge – job paused until the item is done
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
                    disabled={
                      !isAtHome(dwarf) ||
                      !isToolCompatible(dwarf.assignment) ||
                      toolsInStore === 0
                    }
                    title={
                      !isToolCompatible(dwarf.assignment)
                        ? "Tools only help woodcutters and miners"
                        : toolsInStore === 0
                          ? "No tool in the store"
                          : undefined
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
