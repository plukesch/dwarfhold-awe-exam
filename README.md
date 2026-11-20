# Dwarfhold

Dwarfhold is a small browser-based colony and resource-management game. You are the warden of **Stonehome**, a new settlement beneath Emberpeak. Your three dwarves gather supplies, eat from the shared food stores, forge equipment, and explore locations beyond the hold.

This is a partially completed starter for the Advanced Web Development practical exam. It is already playable, but it is not yet a finished game. Investigate its existing behavior and extend it according to the [Requirements](REQUIREMENTS.md).

## How the game works

The colony advances in **days**. One day passes every eight seconds while the simulation is active. The Pause button stops this clock.

Each dwarf can have one of these local assignments:

| Assignment | Production per day |
|---|---:|
| Woodcutting | 3 wood |
| Deep Mining | 2 stone |
| Mushroom Farm | 4 food |
| Unassigned | No production |

At the end of each day, the colony consumes one food for every dwarf. With the initial company of three dwarves, daily meals therefore consume three food. The Shift Ledger shows current assignments and expected production.

Use the assignment dropdown beside a dwarf to change their work. A changed assignment affects subsequent simulation days.

### Resources

The shared inventory contains:

- **Wood**, gathered by woodcutters.
- **Stone**, gathered by miners.
- **Food**, gathered by farmers and consumed by the company.
- **Tools**, produced at the forge or discovered on expeditions.

The starter does not yet give stored tools an additional production bonus or durability rule. They provide a small production-chain foundation that may be expanded by later requirements.

### Ember Forge

The forge performs an immediate crafting action:

```text
3 wood + 2 stone -> 1 tool
```

Open the **Forge** page and press **Forge tool** to attempt the recipe. A successful craft removes the materials, adds a tool to the shared inventory, and records the result in the Hold Chronicle. Forging is separate from the automatic eight-second job production.

### Expeditions

The expedition panel lets you select a dwarf and one destination. Sending an expedition starts an asynchronous request to the local API. The selected dwarf is shown as away while the request is in progress. A successful result returns the dwarf and adds the destination's rewards to the inventory and an unsuccessful result is reported in the chronicle.

The starter destinations:

| Destination | Current outcome |
|---|---|
| Crystal Cave | 8 stone and 1 tool |
| The Old Mine | 12 stone and 2 wood |
| Blocked Pass | A predictable failed expedition |

The short delay is deliberate, so that expedition behavior provides a realistic place to reason about promises, loading state, failures, and consistency between worker and resource state.

## Current starter features

- Three named dwarves with assignments, status, and optional specialization.
- Woodcutting, mining, and farming jobs.
- An automatic eight-second simulation tick with pause/resume.
- Shared wood, stone, food, and tool inventories.
- Daily food consumption.
- One interactive forge recipe.
- Separate colony and forge routes sharing the same running simulation.
- A delayed local expedition API with success and failure outcomes.
- A recent-activity chronicle.
- Responsive fantasy-themed React interface.
- A small Vitest suite for pure simulation behavior.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5174`; its API runs at `http://localhost:4200`. Available scripts are `dev`, `server`, `build`, `test`, and `preview`.

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite frontend and Express API together |
| `npm run server` | Start only the API on port 4200 |
| `npm run build` | Type-check and create a production frontend build |
| `npm run test` | Run the existing Vitest tests once |
| `npm run preview` | Preview a previously created production build |

## API

- `GET /api/health`
- `POST /api/expeditions` with `{ "dwarfId": "dwarf-2", "destination": "crystal-cave" }`

Destinations `crystal-cave` and `old-mine` have rewards. `blocked-pass` is the predictable failure case. Add `?fail=true` to force failure or `?latency=2500` to control delay. The delay is default to two seconds.

## Project orientation

- `src/App.tsx` defines the colony and forge routes.
- `src/state/ColonyProvider.tsx` owns shared colony state, the simulation timer, and game actions.
- `src/state/ColonyContext.ts` exposes the shared state through `useColony`.
- `src/pages/` contains the shared layout, colony page, and forge page.
- `src/simulation.ts` contains the production table and daily simulation transition.
- `src/types.ts` defines workers, jobs, statuses, resources, and activity records.
- `src/api.ts` contains the expedition HTTP request.
- `src/components/` contains the roster, resource display, and shared chronicle.
- `server/index.js` implements the local expedition service.


See [docs/API.md](docs/API.md) for contract details.
