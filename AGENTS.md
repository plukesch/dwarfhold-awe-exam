# AGENTS.md – Dwarfhold (AWE Practical Exam, Group A)

Context for AI coding agents (Claude Code, Copilot, Cursor, …) and for us humans
switching machines. Read this first, then `REQUIREMENTS.md` and `docs/DEVLOG.md`.

## Team & ownership

Team: **Patrick** and **Omar**. Exam: 25.11.2026. Both must be able to explain
every line they own – so keep code simple and readable.

| Area | Owner | Requirements | Main files |
|---|---|---|---|
| Colony work, tools, forge | Patrick | D1, D2, D3 | `src/simulation.ts`, `src/game/forge.ts`, `src/game/tools.ts`, `src/pages/ForgePage.tsx`, `src/components/DwarfRoster.tsx`, Shift Ledger in `ColonyPage.tsx` |
| Expeditions, persistence, raids | Omar | D4, D5, D7 | `src/game/expeditions.ts`, `src/game/persistence.ts`, `src/game/raid.ts`, `server/index.js`, `src/api.ts`, expedition panel |
| New species | both | D6 | Omar: joining via expedition + save; Patrick: production/crafting rules + UI |
| Quality goals, diary | both | – | `docs/QUALITY.md`, `docs/DEVLOG.md` |

If you need to change a file owned by the other person, keep the change minimal
and mention it in the PR.

## Git workflow (important)

- `main` is the integration branch. **Never commit directly to `main`.**
- One branch per requirement, named exactly like the requirement: `D1`, `D2`,
  `D3`, `D4`, `D5`, `D6`, `D7`. Setup/docs: `chore/...`, fixes: `fix/...`.
- Inside a branch: one commit per sub-problem (e.g. D1 has several steps).
- Small, meaningful commits, messages in **German** (e.g. `Hunger-Konsequenz bei Essensmangel hinzugefügt`).
- Merge into `main` via Pull Request on GitHub; the other person skims/approves.
- Before starting work: `git checkout main`, `git pull`, then `git checkout -b D<n>`.
- **Agents do not commit or push.** The humans commit and push themselves.

## Tech stack

- React 19 + TypeScript + Vite (frontend, port 5174), React Router 7
- Express 5 mock API (`server/index.js`, port 4200), proxied under `/api`
- Vitest for tests

Commands: `npm install`, `npm run dev` (web + api), `npm test`, `npm run build`
(type-check + build). Run `npm test` and `npm run build` before every PR.

## Architecture rules

- **Game rules live in pure functions** (`src/simulation.ts`, `src/game/*.ts`):
  `(state, input) => newState`, no React, no `Date.now()`/randomness → deterministic
  and unit-testable with Vitest.
- `src/state/ColonyProvider.tsx` only wires state, timers, API calls and the
  chronicle. Always use the functional form `setColony(current => …)` – never
  compute new state from the `colony` variable of the render closure (stale state).
- An invalid action must return the **unchanged** state (no partial updates).
- One character = at most one activity (`status`: idle / working / crafting / expedition).
- Resources must never become negative.
- Every new rule visible to the player gets a short explanation in the UI.
- Keep it simple: the lecturers explicitly value understandable code over complexity.

## Game rules already implemented

- D1: only dwarves with a job AND status `working` produce (`isProducing`).
  Everyone eats 1 ration/day, also on expeditions (`dailyMeals`).
  `ColonyState.starving`: if meals can't be served, food = 0 and next day only
  farmers produce (`isHaltedByHunger`). `starving` must be persisted (D5).
  Job changes only via `assignJob` – blocked unless status is idle/working
  (`canChangeAssignment`). New busy statuses (crafting, …) are blocked automatically.
- D2: `resources.tools` = tools in the store only; `dwarf.hasTool` = carries one.
  Total tools = store + dwarves with `hasTool`. `resources.weapons` = colony stock
  (used by D7). Tool bonus only for woodcutting/mining. Weapon = 2 wood + 4 stone.
  `hasTool` and `weapons` must be persisted (D5).
  Tool logic: `src/game/tools.ts` (`equipTool`, `returnTool`). Tool bonus:
  `getsToolBonus` in `simulation.ts`. Forge: `src/game/forge.ts` (`recipes`,
  `craft`), provider action `forge(recipeId)` (replaces old `craftTool`).
- D3: status `crafting`; `ColonyState.forgeTask` (`{ recipeId, dwarfId,
  completesOnDay }` or `null`) – only ONE order at a time. Tool 2 days, weapon
  3 days (`recipes[..].days`). Materials are paid at the start. `forgeTask` must
  be persisted (D5). Start an order with `startForging` (`game/forge.ts`), the
  old instant `craft` is gone. `isAtHome` lives in `game/dwarves.ts`.
- **For D4 (Omar):** only dwarves with `isAtHome(dwarf)` may be sent on an
  expedition – a `crafting` dwarf must not leave (currently not checked in
  `sendExpedition`).
- Provider helper `log(message, tone)` adds a chronicle entry – use it instead of
  writing `setActivities(...)` by hand.

## Starter bugs we found (baseline)

- `advanceDay` lets dwarves on expedition keep producing; food silently clamps to 0.
- `craftTool` only checks wood → stone can go negative; uses stale `colony`.
- A failed expedition never resets the dwarf status (dwarf stuck "expedition").
- The same dwarf can be sent twice; expedition state is a single global boolean.

## Documentation

- `docs/DEVLOG.md` – short running log (what, why, who, commit refs). Update it
  with every finished step. It is the basis for the exam diary.
- Decisions that are "up to the team" in `REQUIREMENTS.md` must be written down
  in `docs/DEVLOG.md` **and** shown in the UI.
