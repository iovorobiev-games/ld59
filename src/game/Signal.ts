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

// Legacy plain-text formatter (for any non-BBCode consumer / logs).
export function formatSignal(seq: readonly LightState[]): string {
  return seq.map((s) => (s === "on" ? "ON" : "OFF")).join(" ");
}

// Lit/unlit icons for rexBBCodeText. "[img=key][/img]" is the tag shape the
// plugin expects; renderers must be BBCodeText instances with the lit/unlit
// icons registered (see signalIconImages in ui/fonts.ts).
export const BB_ICON_LIT = "[img=lit][/img]";
export const BB_ICON_UNLIT = "[img=unlit][/img]";

export function signalIconFor(state: LightState): string {
  return state === "on" ? BB_ICON_LIT : BB_ICON_UNLIT;
}

export function formatSignalBBCode(seq: readonly LightState[]): string {
  return seq.map(signalIconFor).join(" ");
}

// A "blink" is a toggle + back; the starting state drives the icon order so
// the dialog pair matches the sequence the player will actually perform.
export function blinkIconsFor(startingLightOn: boolean): string {
  return startingLightOn
    ? `${BB_ICON_UNLIT}${BB_ICON_LIT}`
    : `${BB_ICON_LIT}${BB_ICON_UNLIT}`;
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
    description: "Strike the enemy for 2 damage.",
  },
  {
    id: "extend",
    name: "Extend",
    sequence: ["on", "off", "off"],
    description: "+1 card every turn this battle.",
  },
];
