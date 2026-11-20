export type ResourceKey = "wood" | "stone" | "food" | "tools" | "weapons";
export type JobType = "woodcutting" | "mining" | "farming" | null;
export type DwarfStatus = "idle" | "working" | "expedition";

// tools   = tools lying in the store (NOT equipped). Equipped tools are counted
//           via Dwarf.hasTool -> total tools = resources.tools + equipped dwarves.
// weapons = colony weapon stock, not assigned to anyone (D2, used in D7).
export interface Resources { wood: number; stone: number; food: number; tools: number; weapons: number }

export interface Dwarf { 
    id: string;
     name: string; 
     title: string; 
     icon: string; 
     assignment: JobType; 
     status: DwarfStatus;
     specialty?: Exclude<JobType, null>;
     // true if this dwarf carries a tool from the store (max. one per dwarf)
     hasTool: boolean;
}

export interface ColonyState {
    day: number;
    resources: Resources;
    dwarves: Dwarf[];
    // true if the last day's meals could not be served completely (D1 hunger rule)
    starving: boolean;
}

export interface ExpeditionResult { 
    expeditionId: string; 
    status: "completed"; 
    rewards: Partial<Resources>; 
    message: string 
}

export interface Activity { 
    id: string; 
    day: number; 
    message: string; 
    tone?: "good" | "warning" 
}
