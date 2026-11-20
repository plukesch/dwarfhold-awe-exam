import { useEffect, useRef, useState, type ReactNode } from "react";
import { beginExpedition } from "../api";
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
  jobLabel,
} from "../simulation";
import type { Activity, ColonyState, JobType, ResourceKey } from "../types";
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
      assignment: null,
      status: "idle",
      hasTool: false,
    },
  ],
  starving: false,
};

export function ColonyProvider({ children }: { children: ReactNode }) {
  const [colony, setColony] = useState(initialState);
  const [paused, setPaused] = useState(false);
  const [expeditionPending, setExpeditionPending] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "welcome",
      day: 12,
      message: "The forge fires are lit. Stonehome wakes.",
    },
  ]);

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

  // Adds one entry to the Hold Chronicle (newest first, max. 6 entries).
  function log(message: string, tone?: Activity["tone"]) {
    setActivities((current) =>
      [
        { id: crypto.randomUUID(), day: colony.day, message, tone },
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

  function craftTool() {
    if (colony.resources.wood < 3) {
      setActivities((current) => [
        {
          id: crypto.randomUUID(),
          day: colony.day,
          message: "The forge needs more timber.",
          tone: "warning" as const,
        },
        ...current,
      ]);
      return;
    }

    setColony((current) => ({
      ...current,
      resources: {
        ...current.resources,
        wood: current.resources.wood - 3,
        stone: current.resources.stone - 2,
        tools: current.resources.tools + 1,
      },
    }));
    setActivities((current) =>
      [
        {
          id: crypto.randomUUID(),
          day: colony.day,
          message: "A sturdy iron tool joins the stores.",
          tone: "good" as const,
        },
        ...current,
      ].slice(0, 6),
    );
  }

  async function sendExpedition(dwarfId: string, destination: string) {
    const dwarf = colony.dwarves.find((item) => item.id === dwarfId);
    if (!dwarf) return;

    setExpeditionPending(true);
    setColony((current) => ({
      ...current,
      dwarves: current.dwarves.map((item) =>
        item.id === dwarf.id ? { ...item, status: "expedition" } : item,
      ),
    }));
    setActivities((current) => [
      {
        id: crypto.randomUUID(),
        day: colony.day,
        message: `${dwarf.name} departed for ${destination.replace("-", " ")}.`,
      },
      ...current,
    ]);

    try {
      const result = await beginExpedition(dwarf.id, destination);

      setColony((current) => ({
        ...current,
        resources: Object.entries(result.rewards).reduce(
          (all, [key, amount]) => ({
            ...all,
            [key]: all[key as ResourceKey] + (amount ?? 0),
          }),
          current.resources,
        ),
        dwarves: current.dwarves.map((item) =>
          item.id === dwarf.id
            ? {
                ...item,
                status: item.assignment ? "working" : "idle",
              }
            : item,
        ),
      }));
      setActivities((current) =>
        [
          {
            id: result.expeditionId,
            day: colony.day,
            message: result.message,
            tone: "good" as const,
          },
          ...current,
        ].slice(0, 6),
      );
    } catch (error) {
      setActivities((current) =>
        [
          {
            id: crypto.randomUUID(),
            day: colony.day,
            message:
              error instanceof Error
                ? error.message
                : "The expedition was lost from view.",
            tone: "warning" as const,
          },
          ...current,
        ].slice(0, 6),
      );
    }

    setExpeditionPending(false);
  }

  const value: ColonyContextValue = {
    colony,
    paused,
    activities,
    expeditionPending,
    togglePaused: () => setPaused((value) => !value),
    assignDwarf,
    equipToolTo,
    returnToolFrom,
    craftTool,
    sendExpedition,
  };

  return <ColonyContext value={value}>{children}</ColonyContext>;
}
