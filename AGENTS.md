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
| New species | Omar (planned as shared, done alone) | D6 | `src/game/newcomer.ts`, `src/game/species.ts`, small changes in Patrick's `simulation.ts`, `forge.ts`, `DwarfRoster.tsx`, `ForgePage.tsx`, `ColonyPage.tsx` |
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
  (used by D7). Tool bonus only for woodcutting/mining; only woodcutters/miners can
  equip one, and `assignJob` auto-returns the tool when switching to farming/none.
  Weapon = 2 wood + 4 stone.
  `hasTool` and `weapons` must be persisted (D5).
  Tool logic: `src/game/tools.ts` (`equipTool`, `returnTool`). Tool bonus:
  `getsToolBonus` in `simulation.ts`. Forge: `src/game/forge.ts` (`recipes`,
  `craft`), provider action `forge(recipeId)` (replaces old `craftTool`).
- D3: status `crafting`; `ColonyState.forgeTask` (`{ recipeId, dwarfId,
  completesOnDay }` or `null`) – only ONE order at a time. Tool 2 days, weapon
  3 days (`recipes[..].days`). Materials are paid at the start. `forgeTask` must
  be persisted (D5). Start an order with `startForging` (`game/forge.ts`), the
  old instant `craft` is gone. `isAtHome` lives in `game/dwarves.ts`.
  `advanceDay` calls `finishForging` for the new day (item into store, smith back
  to job, `forgeTask = null`). Chronicle entry comes from a `useEffect` in the
  provider. **For D5 (Omar):** decide what happens to a restored `forgeTask`.
- D4 (done, branch `D4`): `ColonyState.expeditions: ActiveExpedition[]` (`{ id,
  dwarfId, destination, departedOnDay }`) – several dwarves may travel at once.
  The id is created client-side on departure; a result is applied only while its
  id is still in the list, then removed (rewards exactly once). Team decisions:
  the tool stays with the travelling dwarf (`hasTool` unchanged); pause does not
  stop an expedition (real-time request). `expeditions` must be persisted (D5).
  Logic in `src/game/expeditions.ts`: `destinations`, `canSendOnExpedition`,
  `expeditionProblem`, `departExpedition`, `completeExpedition`,
  `failExpedition`. Provider `sendExpedition(dwarfId, destination)` uses them
  (`expeditionPending` is gone; "busy" = `expeditionProblem(...) !== null`).
  A `departing` ref blocks a second click before React re-renders.
  `src/api.ts`: `beginExpedition` always throws a readable `Error` (no connection,
  timeout after `EXPEDITION_TIMEOUT_MS` = 8 s, error status, non-JSON body, wrong
  shape via `isExpeditionResult`) -> the provider calls `failExpedition`.
  UI: `src/components/ExpeditionPanel.tsx` (own file, so it does not collide with
  Patrick's Shift Ledger in `ColonyPage.tsx`) – busy dwarves greyed out with a
  reason, button disabled via `expeditionProblem`, "On the road" list, rule text.
- D5 (done, branch `D5`): pure logic in `src/game/persistence.ts`:
  `SAVE_KEY`, `SAVE_VERSION` (= 3 since D6, raise it whenever `ColonyState` changes), `serializeSave`, `parseSave(raw)` -> `ColonyState | null` (null for every
  problem: not JSON, other version, wrong/missing fields, negative or broken
  numbers, contradicting data). `resumeAfterRefresh(colony)` applies the refresh
  policy: interrupted expeditions -> `failExpedition` (home without loot),
  `forgeTask` is kept and continues. Wired into the provider (step 4):
  `loadGame()` runs once via `useState(loadGame)` (nothing saved -> new colony,
  unreadable -> new colony + warning, valid -> `resumeAfterRefresh` + chronicle
  entries); a `useEffect` on `colony` saves after every change. `readSave` /
  `writeSave` wrap `localStorage` in try/catch. UI: refresh rule in the
  expedition panel, forge note on `ForgePage` (Patrick's file), footer
  "💾 Saved automatically" in `Layout.tsx`.
  Team decisions: chronicle and pause are not saved; no "New game" button.
- D7 (done, branch `D7`): new destination `hcw` ("HCW", rewards 6 wood
  + 4 food from the server) with `hostile: true` in `destinations`. After a
  SUCCESSFUL return the lecturers follow and attack. Rules in
  `src/game/raid.ts`: `canDefend`, `raidLoot`, `resolveRaid(state)` -> colony
  with `lastRaid: RaidReport` set. `completeExpedition` calls it after booking
  the loot if `destinations[..].hostile` (failExpedition never does).
  `ColonyState.lastRaid: RaidReport | null` – add `lastRaid: null` to new test
  fixtures. Persisted (`SAVE_VERSION` 2 at the time), checked by `isRaidReport`.
  UI: `components/RaidBanner.tsx` (3 days after a raid, in `Layout.tsx`),
  chronicle effect on `lastRaid` in the provider, forecast + rule text in the
  expedition panel, "3 needed to defend" on the weapons tile (`ResourceBar`).
  Texts use `describeRaid` and the constants from `raid.ts`. Team decisions: attack right on return, never after
  a failure/refresh, also while paused; defense from 3 weapons, 1 weapon breaks
  per defended raid; otherwise half (rounded down) of wood, stone, food is looted.
- D6 (done, branch `D6`): new species `lecturer` – Leon Freudenthaler, escaped
  from HCW, hiding in the Crystal Cave. `Dwarf.species: Species` is required
  (`"dwarf" | "lecturer"`; add `species: "dwarf"` to new test fixtures). He
  lives in the same `dwarves` array, so every existing rule (food, status,
  tools, expeditions, saving) applies to him. `src/game/newcomer.ts`:
  `NEWCOMER_DESTINATION` (= crystal-cave), `newcomer` (fixed id `lecturer-1`),
  `hasNewcomerJoined` (derived, no flag), `welcomeNewcomer`;
  `completeExpedition` calls it on success only. `src/game/species.ts`:
  `speciesRules` = only the differences (`label`, `note`, `production`,
  `cannotForge`, `forgeDays`). Lecturer: wood 1 / stone 4 / food 2, cannot forge
  tools, weapon in 2 days. Used by `productionOf` (`simulation.ts`),
  `canForgeRecipe` / `forgeDays` (`forge.ts`). Persisted: `SAVE_VERSION` = 3,
  `isDwarf` checks `species`, `isConsistent` allows at most one lecturer.
  UI: job options show per-resident output, species badge/note in the roster,
  per-smith days/limits on `ForgePage`, hint at the Crystal Cave in the
  expedition panel, chronicle effect `newcomerHere` in the provider.
- Provider helper `log(message, tone)` adds a chronicle entry – use it instead of
  writing `setActivities(...)` by hand. It takes the day from the `today` ref
  (always the current day, also after an `await`).

## Starter bugs we found (baseline)

- `advanceDay` lets dwarves on expedition keep producing; food silently clamps to 0.
- `craftTool` only checks wood → stone can go negative; uses stale `colony`.
- A failed expedition never resets the dwarf status (dwarf stuck "expedition").
- The same dwarf can be sent twice; expedition state is a single global boolean.
  (All four fixed: D1 / D2 / D4.)

## Documentation

- `docs/DEVLOG.md` – short running log (what, why, who, commit refs). Update it
  with every finished step. It is the basis for the exam diary.
- Decisions that are "up to the team" in `REQUIREMENTS.md` must be written down
  in `docs/DEVLOG.md` **and** shown in the UI.
