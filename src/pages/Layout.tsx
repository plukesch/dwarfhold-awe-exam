import { NavLink, Outlet } from "react-router";
import { RaidBanner } from "../components/RaidBanner";
import { ResourceBar } from "../components/ResourceBar";
import { equippedToolCount } from "../game/tools";
import { useColony } from "../state/ColonyContext";

export function Layout() {
  const { colony, paused, togglePaused } = useColony();

  return (
    <main>
      <header className="masthead">
        <div className="brand">
          <b>⛏</b>
          <div>
            <small>THE DEEP REALMS OF</small>
            <h1>
              Dwarf<span>hold</span>
            </h1>
          </div>
        </div>

        <div className="hold-title">
          <small>COLONY</small>
          <strong>STONEHOME</strong>
          <span>Founded beneath Emberpeak</span>
        </div>

        <div className="day">
          <small>DEEP DAY</small>
          <strong>{colony.day}</strong>
          <button onClick={togglePaused}>
            {paused ? "Wake the hold" : "Pause"}
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label="Colony navigation">
        <NavLink to="/" end>
          Colony
        </NavLink>
        <NavLink to="/forge">Forge</NavLink>
      </nav>

      <ResourceBar
        resources={colony.resources}
        starving={colony.starving}
        equippedTools={equippedToolCount(colony.dwarves)}
      />

      {colony.starving && (
        <section className="hunger-banner" role="alert">
          <b>🍽️</b>
          <div>
            <strong>Stonehome is starving</strong>
            <p>
              Yesterday's meals could not be served. Until there is enough food
              for everyone, only dwarves on the <em>Mushroom Farm</em> work –
              woodcutting and mining are halted. Assign more farmers to recover.
            </p>
          </div>
        </section>
      )}

      <RaidBanner raid={colony.lastRaid} today={colony.day} />

      <Outlet />

      <footer>
        <span>
          {colony.forgeTask ? "🔥 Forge: in use" : "🔥 Forge: free"}
        </span>
        <span>Next deep day in ~8 seconds</span>
        <span title="Saved in this browser after every change. An unreadable save starts a new colony.">
          💾 Saved automatically
        </span>
        <span>{paused ? "The hold is resting" : "⚙ Simulation active"}</span>
      </footer>
    </main>
  );
}
