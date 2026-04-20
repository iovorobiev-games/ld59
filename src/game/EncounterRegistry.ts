import {
  Encounter,
  EncounterId,
  FriendlyEncounter,
  StoryEncounter,
} from "./Encounter";
import { blinkIconsFor } from "./Signal";

export interface EncounterContext {
  lightOn: boolean;
  storyFlags?: Record<string, boolean>;
}

export type EncounterFactory = (ctx: EncounterContext) => Encounter | null;

function blinkFriendly(config: {
  greeting: string;
  successText: string;
  failureText: string;
  successReward: { fuel?: number; sanity?: number; hp?: number };
  failureReward?: { fuel?: number; sanity?: number; hp?: number };
  character: "wizard" | "wife";
  lightOn: boolean;
  successFlags?: Record<string, boolean>;
  failureFlags?: Record<string, boolean>;
  offProgress?: boolean;
}): FriendlyEncounter {
  return new FriendlyEncounter({
    sequence: config.lightOn ? ["left", "right"] : ["right", "left"],
    reward: config.successReward,
    failureReward: config.failureReward ?? {},
    successText: config.successText,
    failureText: config.failureText,
    character: config.character,
    greeting: config.greeting,
    labelsForLight: (lightOn) => {
      const pair = blinkIconsFor(lightOn);
      return lightOn
        ? { left: `Blink ${pair}`, right: "Stay bright" }
        : { left: "Stay dark", right: `Blink ${pair}` };
    },
    successFlags: config.successFlags,
    failureFlags: config.failureFlags,
    offProgress: config.offProgress ?? true,
  });
}

const FACTORIES: Record<EncounterId, EncounterFactory> = {
  bandits_shipwreck: () =>
    new FriendlyEncounter({
      sequence: ["left", "left", "left"],
      reward: { fuel: 3, hp: 2 },
      successText: "Here is your share:\n+3 Fuel  +2 HP",
      failureText: "Suit yourself.",
      character: "bandit",
      greeting:
        "There is a ship full of cargo\nsailing close by.\nDim the lights so it crashes.\nWe will bring you part of the spoils\n(3 Fuel, 2 HP)",
      progressTexts: ["More.", "More.", "Should be enough mate."],
      shakeOnFinalStep: true,
      nextOnSuccess: "ghost",
      nextOnFailure: "guardsman",
      leftLabel: "Dim",
      rightLabel: "Refuse",
    }),

  ghost: () =>
    new StoryEncounter({
      text: "It's because of you our ship crashed!\nI died because of you!",
      character: "ghost",
      consequence: { sanity: -2 },
      nextOnSuccess: "guardsman",
    }),

  guardsman: (ctx) => {
    const blink = blinkIconsFor(ctx.lightOn);
    return new FriendlyEncounter({
      sequence: ctx.lightOn ? ["left", "right"] : ["right", "left"],
      reward: { fuel: 2, sanity: 2 },
      successText:
        "Thank you. Here is some fuel\nfor your effort.\n+2 Fuel  +2 Sanity",
      failureText: "I guess I need to ask someone else...",
      character: "guard",
      greeting: `Couple of thugs looking to\nattack ships nearby.\nBlink ${blink} the light if you know anything.`,
      nextOnSuccess: "bandits_revenge",
      nextOnFailure: "bandits_shipwreck_again",
      labelsForLight: (lightOn) => {
        const pair = blinkIconsFor(lightOn);
        return lightOn
          ? { left: `Blink ${pair}`, right: "Stay bright" }
          : { left: "Stay dark", right: `Blink ${pair}` };
      },
    });
  },

  bandits_revenge: () =>
    new StoryEncounter({
      text: "We will burn you with your lighthouse, snitch!",
      character: "bandit",
      consequence: { hp: -2, sanity: -2 },
    }),

  bandits_shipwreck_again: () =>
    new FriendlyEncounter({
      sequence: ["left", "left", "left"],
      reward: { fuel: 3, hp: 2 },
      successText: "Here is your share:\n+3 Fuel  +2 HP",
      failureText: "Suit yourself.",
      character: "bandit",
      greeting:
        "Another ship full of cargo\nsailing close by.\nDim the lights so it crashes.\nSame share as before\n(3 Fuel, 2 HP).",
      progressTexts: ["More.", "More.", "Should be enough mate."],
      shakeOnFinalStep: true,
      leftLabel: "Dim",
      rightLabel: "Refuse",
    }),

  wizard_probation: () =>
    new FriendlyEncounter({
      sequence: ["right"],
      acceptAny: true,
      reward: { fuel: 1, sanity: 1 },
      successText: "Well then,\nuntil next night.",
      failureText: "",
      character: "wizard",
      greeting:
        "You seem to function fine.\nLet's make the first three nights\nyour... probation period.\nI'll check in periodically.",
      leftLabel: "Nod",
      rightLabel: "Nod",
      offProgress: true,
    }),

  wife_night2: (ctx) =>
    blinkFriendly({
      character: "wife",
      lightOn: ctx.lightOn,
      greeting: `Is it really you?\nAre you really there?\nCan you... blink ${blinkIconsFor(ctx.lightOn)}?`,
      successText: "*the woman cries and runs away*",
      failureText: "...",
      successReward: { sanity: 2 },
      failureReward: { sanity: -2 },
      successFlags: { wife_alive: true },
    }),

  wife_night3: (ctx) => {
    if (!ctx.storyFlags?.wife_alive) return null;
    return blinkFriendly({
      character: "wife",
      lightOn: ctx.lightOn,
      greeting: `I brought your favourite\nfishing rod...\nIt was your favourite anyway.\n*you feel a sudden urge to blink ${blinkIconsFor(ctx.lightOn)}*`,
      successText: "I still love you...",
      failureText: "Are you still there?\nI'll leave it here, anyway...",
      successReward: { sanity: 2 },
      failureReward: { sanity: -2, hp: 1 },
    });
  },

  wizard_final: (ctx) =>
    blinkFriendly({
      character: "wizard",
      lightOn: ctx.lightOn,
      greeting: `I wonder, lightkeeper...\nDo you feel alive?\nBlink ${blinkIconsFor(ctx.lightOn)} if you do.`,
      successText:
        "I see. I think my spell\nwas too powerful then.\nI will need to rework it.\nFor now... don't be afraid,\nthis is not your first time.",
      failureText: "Finally,\nI found a balanced spell...",
      successReward: {},
      failureReward: {},
    }),
};

export function createEncounterById(
  id: EncounterId,
  ctx: EncounterContext,
): Encounter | null {
  const factory = FACTORIES[id];
  if (!factory) return null;
  return factory(ctx);
}
