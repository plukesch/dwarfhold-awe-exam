import { Chronicle } from "../components/Chronicle";
import { canAfford, recipes, type Recipe } from "../game/forge";
import { useColony } from "../state/ColonyContext";

const materialIcon = {
  wood: "🪵",
  stone: "🪨",
  food: "🍄",
  tools: "⚒️",
  weapons: "🗡️",
} as const;

const descriptions: Record<Recipe["id"], string> = {
  tool: "Equip a woodcutter or miner: +1 wood or stone per day.",
  weapon: "Stored in the armory to defend Stonehome against hostile raids.",
};

export function ForgePage() {
  const { colony, activities, forge } = useColony();

  return (
    <div className="forge-layout">
      <div className="forge-recipes">
        {Object.values(recipes).map((recipe) => {
          const affordable = canAfford(colony.resources, recipe);

          return (
            <section className="panel forge" key={recipe.id}>
              <div>
                <small>EMBER FORGE</small>
                <h2>Craft a {recipe.name.toLowerCase()}</h2>
                <p>{descriptions[recipe.id]}</p>
              </div>
              <div className="recipe">
                {Object.entries(recipe.cost).map(
                  ([material, amount], index) => (
                    <span key={material}>
                      {index > 0 && <i>+ </i>}
                      {amount}{" "}
                      {materialIcon[material as keyof typeof materialIcon]}
                    </span>
                  ),
                )}
                <i>→</i>
                <span>1 {recipe.icon}</span>
                <button
                  disabled={!affordable}
                  title={affordable ? undefined : "Not enough materials"}
                  onClick={() => forge(recipe.id)}
                >
                  Forge {recipe.name.toLowerCase()}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <Chronicle activities={activities} />
    </div>
  );
}
