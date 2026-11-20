import type { Resources } from "../types";

const details = {
  wood: ["🪵", "Timber"],
  stone: ["🪨", "Stone"],
  food: ["🍄", "Rations"],
  tools: ["⚒️", "Tools"],
} as const;

interface Props {
  resources: Resources;
  starving: boolean;
}

export function ResourceBar({ resources, starving }: Props) {
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
            </div>
          </article>
        );
      })}
    </section>
  );
}
