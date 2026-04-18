export type LightState = "on" | "off";

export type SpellId =
  | "confusion"
  | "ignite"
  | "shroud"
  | "calm"
  | "burn"
  | "extend";

export interface Spell {
  readonly id: SpellId;
  readonly name: string;
  readonly sequence: readonly [LightState, LightState, LightState];
  readonly description: string;
}

export const SPELL_SEQUENCE_LENGTH = 3;

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

export function signalFuelCost(spell: Spell): number {
  return spell.sequence.filter((s) => s === "on").length;
}

export function getSpell(id: SpellId): Spell {
  const found = ALL_SPELLS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spell id: ${id}`);
  return found;
}

export const ALL_SPELLS: readonly Spell[] = [
  {
    id: "confusion",
    name: "Confusion",
    sequence: ["off", "off", "off"],
    description: "Stun enemy (skip next attack)",
  },
  {
    id: "ignite",
    name: "Ignite",
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
    id: "burn",
    name: "Burn",
    sequence: ["on", "on", "on"],
    description: "1 damage / turn this encounter",
  },
  {
    id: "extend",
    name: "Extend",
    sequence: ["on", "off", "off"],
    description: "+1 action this turn",
  },
];
