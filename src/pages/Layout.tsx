import { NavLink, Outlet } from "react-router";
import { ResourceBar } from "../components/ResourceBar";
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

      <ResourceBar resources={colony.resources} starving={colony.starving} />

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

      <Outlet />

      <footer>
        <span>🔥 Forge: burning</span>
        <span>Next deep day in ~8 seconds</span>
        <span>{paused ? "The hold is resting" : "⚙ Simulation active"}</span>
      </footer>
    </main>
  );
}
