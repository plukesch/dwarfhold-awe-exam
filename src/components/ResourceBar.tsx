import { RAID_DEFENSE_THRESHOLD } from "../game/raid";
import type { Resources } from "../types";

const details = {
  wood: ["🪵", "Timber"],
  stone: ["🪨", "Stone"],
  food: ["🍄", "Rations"],
  tools: ["⚒️", "Tools in store"],
  weapons: ["🗡️", "Weapons"],
} as const;

interface Props {
  resources: Resources;
  starving: boolean;
  equippedTools: number;
}

export function ResourceBar({ resources, starving, equippedTools }: Props) {
  return (
    <section className="resource-bar">
      {Object.entries(resources).map(([key, value]) => {
        const [icon, label] = details[key as keyof Resources];
        // Highlight the food tile while the colony is starving
        const alert = key === "food" && starving;

        return (
          <article key={key} className={alert ? "alert" : undefined}>
            <span>{icon}</span>
            <div>
              <small>{alert ? `${label} – starving!` : label}</small>
              <strong>{value}</strong>
              {key === "tools" && <em>+ {equippedTools} equipped</em>}
              {/* D7: how close the colony is to defending itself */}
              {key === "weapons" && (
                <em>
                  {value >= RAID_DEFENSE_THRESHOLD
                    ? "ready to defend"
                    : `${RAID_DEFENSE_THRESHOLD} needed to defend`}
                </em>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
