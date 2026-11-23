import { useState } from "react";
import { Chronicle } from "../components/Chronicle";
import {
  canAfford,
  canForge,
  canForgeRecipe,
  daysLeft,
  forgeDays,
  isForgeFree,
  recipes,
  type Recipe,
} from "../game/forge";
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

  // Only dwarves who are at home can work the forge
  const eligible = colony.dwarves.filter(canForge);
  const [chosenSmith, setChosenSmith] = useState("");
  // Fall back to the first eligible dwarf if the chosen one is not available
  const smithId = eligible.some((dwarf) => dwarf.id === chosenSmith)
    ? chosenSmith
    : (eligible[0]?.id ?? "");

  const smith = eligible.find((dwarf) => dwarf.id === smithId);

  const task = colony.forgeTask;
  const taskSmith = colony.dwarves.find((dwarf) => dwarf.id === task?.dwarfId);
  const forgeFree = isForgeFree(colony);

  return (
    <div className="forge-layout">
      <div className="forge-recipes">
        <section className="panel forge-status">
          <small>THE ANVIL</small>
          {task && taskSmith ? (
            <p className="busy">
              ⏳ <b>{taskSmith.name}</b> is forging a{" "}
              {recipes[task.recipeId].name.toLowerCase()}{" "}
              {recipes[task.recipeId].icon} – ready on{" "}
              <b>day {task.completesOnDay}</b> ({daysLeft(colony)}{" "}
              {daysLeft(colony) === 1 ? "day" : "days"} left).
              <progress
                max={forgeDays(recipes[task.recipeId], taskSmith)}
                value={forgeDays(recipes[task.recipeId], taskSmith) - daysLeft(colony)}
              />
            </p>
          ) : (
            <>
              <p>
                🔥 The forge is free. Stonehome has one forge, so only one order
                can run at a time. Materials are taken when the work starts; the
                smith stops their normal job until it is done.
              </p>
              <label className="smith-select">
                Smith
                <select
                  value={smithId}
                  disabled={eligible.length === 0}
                  onChange={(event) => setChosenSmith(event.target.value)}
                >
                  {eligible.length === 0 && (
                    <option value="">No dwarf at home</option>
                  )}
                  {eligible.map((dwarf) => (
                    <option key={dwarf.id} value={dwarf.id}>
                      {dwarf.name}
                      {dwarf.species === "lecturer" && " (lecturer)"}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <p className="rule-note">
            The hold keeps its records: a running order survives a page refresh
            and is finished on its day. Leon, the lecturer, cannot forge tools,
            but forges a weapon in 2 instead of 3 days.
          </p>
        </section>

        {Object.values(recipes).map((recipe) => {
          const affordable = canAfford(colony.resources, recipe);
          // D6: does the chosen smith know this recipe, and how fast are they?
          const allowed = !smith || canForgeRecipe(smith, recipe.id);
          const days = smith ? forgeDays(recipe, smith) : recipe.days;
          const canStart = forgeFree && affordable && smithId !== "" && allowed;
          const reason = !forgeFree
            ? "The forge is in use"
            : !allowed
              ? `${smith?.name} cannot forge a ${recipe.name.toLowerCase()}`
              : !affordable
                ? "Not enough materials"
                : smithId === ""
                  ? "No smith available"
                  : undefined;

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
                <span className={days < recipe.days ? "recipe-days faster" : "recipe-days"}>
                  ⏱ {days} {days === 1 ? "day" : "days"}
                </span>
                <button
                  disabled={!canStart}
                  title={reason}
                  onClick={() => forge(recipe.id, smithId)}
                >
                  Forge {recipe.name.toLowerCase()}
                </button>
                {!allowed && forgeFree && (
                  <small className="forge-blocked">{reason}</small>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Chronicle activities={activities} />
    </div>
  );
}
