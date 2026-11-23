import { useEffect, useRef, useState, type ReactNode } from "react";
import { beginExpedition } from "../api";
import {
  completeExpedition,
  departExpedition,
  destinations,
  expeditionProblem,
  failExpedition,
} from "../game/expeditions";
import {
  forgeDays,
  forgeProblem,
  recipes,
  startForging,
  type RecipeId,
} from "../game/forge";
import { describeRaid } from "../game/raid";
import {
  parseSave,
  resumeAfterRefresh,
  SAVE_KEY,
  serializeSave,
} from "../game/persistence";
import {
  canEquipTool,
  canReturnTool,
  equipTool,
  returnTool,
} from "../game/tools";
import {
  advanceDay,
  assignJob,
  canChangeAssignment,
  isToolCompatible,
  jobLabel,
} from "../simulation";
import type { Activity, ColonyState, DestinationId, JobType } from "../types";
import { ColonyContext, type ColonyContextValue } from "./ColonyContext";

const initialState: ColonyState = {
  day: 12,
  resources: {
    wood: 14,
    stone: 9,
    food: 18,
    tools: 1,
    weapons: 0,
  },
  dwarves: [
    {
      id: "dwarf-1",
      name: "Bromli Copperkeg",
      title: "Hold Warden",
      icon: "🧔🏻",
      species: "dwarf",
      assignment: "mining",
      status: "working",
      specialty: "mining",
      hasTool: false,
    },
    {
      id: "dwarf-2",
      name: "Yrsa Flintbraid",
      title: "Trail Scout",
      icon: "🧔🏼‍♀️",
      species: "dwarf",
      assignment: "woodcutting",
      status: "working",
      specialty: "woodcutting",
      hasTool: false,
    },
    {
      id: "dwarf-3",
      name: "Dori Ashmantle",
      title: "Stone Singer",
      icon: "🧔🏽",
      species: "dwarf",
      assignment: null,
      status: "idle",
      hasTool: false,
    },
  ],
  starving: false,
  forgeTask: null,
  expeditions: [],
  lastRaid: null,
};

// D5: Browser storage can throw (blocked in some private modes, or full).
// Then the game simply runs without saving instead of crashing.
function readSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function writeSave(text: string) {
  try {
    localStorage.setItem(SAVE_KEY, text);
  } catch {
    // Not saved this time – the game keeps running.
  }
}

function entry(day: number, message: string, tone?: Activity["tone"]): Activity {
  return { id: crypto.randomUUID(), day, message, tone };
}

// D5: Start state of the game – runs once when the page loads.
// 1. nothing saved      -> new colony
// 2. save is unreadable -> new colony + a warning in the chronicle
// 3. valid save         -> continue it (refresh rule: see resumeAfterRefresh)
function loadGame(): { colony: ColonyState; activities: Activity[] } {
  const raw = readSave();
  const saved = parseSave(raw);

  if (saved === null) {
    const message =
      raw === null
        ? "The forge fires are lit. Stonehome wakes."
        : "The old records were unreadable – a new colony begins.";
    return {
      colony: initialState,
      activities: [entry(initialState.day, message, raw === null ? undefined : "warning")],
    };
  }

  const { colony, returnedHome } = resumeAfterRefresh(saved);
  return {
    colony,
    activities: [
      ...returnedHome.map((name) =>
        entry(
          colony.day,
          `${name} lost the trail while the hold slept and returns empty-handed.`,
          "warning",
        ),
      ),
      entry(colony.day, `Stonehome restored on day ${colony.day}.`, "good"),
    ],
  };
}

export function ColonyProvider({ children }: { children: ReactNode }) {
  // useState(loadGame) – the function itself, not loadGame(): React calls it
  // only on the first render, so the save is read and checked once.
  const [startup] = useState(loadGame);
  const [colony, setColony] = useState(startup.colony);
  const [paused, setPaused] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(startup.activities);

  // D5: Save after every change (each day and each action). One place for
  // everything, so a new action can never forget to save.
  useEffect(() => {
    writeSave(serializeSave(colony));
  }, [colony]);

  // The current day for chronicle entries, also for code that runs later
  // (e.g. after an expedition request): `colony.day` from the render that
  // started the request would be out of date by then. This effect stays
  // first, so the other effects below already log with the new day.
  const today = useRef(colony.day);
  useEffect(() => {
    today.current = colony.day;
  }, [colony.day]);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(
      () => setColony((current) => advanceDay(current)),
      8_000,
    );

    return () => window.clearInterval(timer);
  }, [paused]);

  // Write a chronicle entry when hunger starts or ends. This is done here
  // (and not inside advanceDay) because advanceDay must stay a pure function.
  const wasStarving = useRef(colony.starving);
  useEffect(() => {
    if (colony.starving === wasStarving.current) return;
    wasStarving.current = colony.starving;

    setActivities((current) =>
      [
        {
          id: crypto.randomUUID(),
          day: colony.day,
          message: colony.starving
            ? "The stores are empty! Hungry dwarves only tend the Mushroom Farm."
            : "Full bowls again. Stonehome is back to work.",
          tone: colony.starving ? ("warning" as const) : ("good" as const),
        },
        ...current,
      ].slice(0, 6),
    );
  }, [colony.starving, colony.day]);

  // Chronicle entry when a forge order is finished (same idea as for hunger:
  // advanceDay finishes the order, the effect only reports it).
  const previousTask = useRef(colony.forgeTask);
  useEffect(() => {
    const finished = previousTask.current;
    previousTask.current = colony.forgeTask;
    if (!finished || colony.forgeTask !== null) return;

    const recipe = recipes[finished.recipeId];
    const smith = colony.dwarves.find((dwarf) => dwarf.id === finished.dwarfId);
    log(
      `${smith?.name ?? "The smith"} finished a ${recipe.name.toLowerCase()} ${recipe.icon} – it is now in the store.`,
      "good",
    );
  }, [colony.forgeTask]);

  // D7: Chronicle entry when the lecturers attacked (same idea as the forge:
  // completeExpedition decides, the effect only reports it). Starts with the
  // loaded value, so a raid from before a refresh is not reported again.
  const previousRaid = useRef(colony.lastRaid);
  useEffect(() => {
    if (colony.lastRaid === previousRaid.current) return;
    previousRaid.current = colony.lastRaid;
    if (!colony.lastRaid) return;

    log(
      `⚔️ The lecturers followed the scout home from HCW! ${describeRaid(colony.lastRaid)}`,
      colony.lastRaid.defended ? "good" : "warning",
    );
  }, [colony.lastRaid]);

  // Adds one entry to the Hold Chronicle (newest first, max. 6 entries).
  function log(message: string, tone?: Activity["tone"]) {
    setActivities((current) =>
      [
        { id: crypto.randomUUID(), day: today.current, message, tone },
        ...current,
      ].slice(0, 6),
    );
  }

  function assignDwarf(id: string, assignment: JobType) {
    const dwarf = colony.dwarves.find((item) => item.id === id);
    if (!dwarf) return;

    if (!canChangeAssignment(dwarf)) {
      log(
        `${dwarf.name} is away and cannot take a new job right now.`,
        "warning",
      );
      return;
    }

    // assignJob checks again on the *current* state, so even a click that
    // races with an expedition departure cannot create a dwarf in two places.
    setColony((current) => assignJob(current, id, assignment));
    log(`${dwarf.name} assigned to ${jobLabel(assignment)}.`);
    if (dwarf.hasTool && !isToolCompatible(assignment)) {
      log(
        `${dwarf.name} has no use for the tool there and returns it to the store.`,
      );
    }
  }

  function equipToolTo(id: string) {
    const dwarf = colony.dwarves.find((item) => item.id === id);
    if (!dwarf) return;

    if (!canEquipTool(colony, dwarf)) {
      log(
        colony.resources.tools === 0
          ? "No tool left in the store."
          : `${dwarf.name} cannot take a tool right now.`,
        "warning",
      );
      return;
    }

    // equipTool checks again on the current state -> store can never go below 0
    setColony((current) => equipTool(current, id));
    log(`${dwarf.name} takes a tool from the store.`);
  }

  function returnToolFrom(id: string) {
    const dwarf = colony.dwarves.find((item) => item.id === id);
    if (!dwarf || !canReturnTool(dwarf)) return;

    setColony((current) => returnTool(current, id));
    log(`${dwarf.name} returns the tool to the store.`);
  }

  function forge(recipeId: RecipeId, dwarfId: string) {
    const problem = forgeProblem(colony, recipeId, dwarfId);
    if (problem) {
      log(problem, "warning");
      return;
    }

    const recipe = recipes[recipeId];
    const dwarf = colony.dwarves.find((item) => item.id === dwarfId);

    // startForging checks again on the current state -> a double click cannot
    // start two orders or pay the materials twice.
    setColony((current) => startForging(current, recipeId, dwarfId));
    log(
      `${dwarf?.name} starts forging a ${recipe.name.toLowerCase()} ${recipe.icon} – ready on day ${colony.day + (dwarf ? forgeDays(recipe, dwarf) : recipe.days)}.`,
    );
  }

  // D4: Dwarves whose request is on its way right now. A ref (not state),
  // because it changes immediately: even two clicks before React re-renders
  // cannot send the same dwarf twice or write "departed" twice.
  const departing = useRef(new Set<string>());

  async function sendExpedition(dwarfId: string, destination: DestinationId) {
    const problem = expeditionProblem(colony, dwarfId, destination);
    if (problem) {
      log(problem, "warning");
      return;
    }
    if (departing.current.has(dwarfId)) return;

    const dwarf = colony.dwarves.find((item) => item.id === dwarfId);
    const name = dwarf?.name ?? "The scout";
    const place = destinations[destination].name;

    // Our own id for this journey. The result is only booked while this id
    // is still in colony.expeditions -> rewards exactly once.
    const expeditionId = crypto.randomUUID();

    departing.current.add(dwarfId);
    setColony((current) =>
      departExpedition(current, expeditionId, dwarfId, destination),
    );
    log(`${name} departed for ${place}.`);

    try {
      const result = await beginExpedition(dwarfId, destination);
      setColony((current) =>
        completeExpedition(current, expeditionId, result.rewards),
      );
      log(`${name} is back from ${place}: ${result.message}`, "good");
    } catch (error) {
      // Failure: no loot, but the dwarf always comes home (never stuck "away").
      setColony((current) => failExpedition(current, expeditionId));
      const reason =
        error instanceof Error ? error.message : "The route was lost from view.";
      log(`${name} returns empty-handed from ${place}. ${reason}`, "warning");
    } finally {
      departing.current.delete(dwarfId);
    }
  }

  const value: ColonyContextValue = {
    colony,
    paused,
    activities,
    togglePaused: () => setPaused((value) => !value),
    assignDwarf,
    equipToolTo,
    returnToolFrom,
    forge,
    sendExpedition,
  };

  return <ColonyContext value={value}>{children}</ColonyContext>;
}
