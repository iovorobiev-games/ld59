export type LightState = "on" | "off";

export type SignalId =
  | "confusion"
  | "fuelUp"
  | "shroud"
  | "calm"
  | "lightning"
  | "extend";

export interface Signal {
  readonly id: SignalId;
  readonly name: string;
  readonly sequence: readonly [LightState, LightState, LightState];
  readonly description: string;
}

export const SIGNAL_SEQUENCE_LENGTH = 3;

export function sequencesMatch(
  a: readonly LightState[],
  b: readonly LightState[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function formatSignal(seq: readonly LightState[]): string {
  return seq.map((s) => (s === "on" ? "ON" : "OFF")).join(" ");
}

export function signalFuelCost(signal: Signal): number {
  return signal.sequence.filter((s) => s === "on").length;
}

export function getSignal(id: SignalId): Signal {
  const found = ALL_SIGNALS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown signal id: ${id}`);
  return found;
}

export const ALL_SIGNALS: readonly Signal[] = [
  {
    id: "confusion",
    name: "Confusion",
    sequence: ["off", "off", "off"],
    description: "Stun enemy (skip next attack)",
  },
  {
    id: "fuelUp",
    name: "Fuel Up",
    sequence: ["off", "on", "on"],
    description: "Restore 3 Fuel",
  },
  {
    id: "shroud",
    name: "Shroud",
    sequence: ["off", "off", "on"],
    description: "+1 Defence next attack",
  },
  {
    id: "calm",
    name: "Calm",
    sequence: ["on", "off", "on"],
    description: "Restore 2 Sanity",
  },
  {
    id: "lightning",
    name: "Lightning",
    sequence: ["on", "on", "on"],
    description: "1 damage / turn this encounter",
  },
  {
    id: "extend",
    name: "Extend",
    sequence: ["on", "off", "off"],
    description: "Add 1 extra card to your deck this turn.",
  },
];
