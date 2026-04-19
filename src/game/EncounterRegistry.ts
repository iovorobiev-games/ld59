import {
  Encounter,
  EncounterId,
  FriendlyEncounter,
  StoryEncounter,
} from "./Encounter";
import { blinkIconsFor } from "./Signal";

export interface EncounterContext {
  lightOn: boolean;
}

export type EncounterFactory = (ctx: EncounterContext) => Encounter;

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
};

export function createEncounterById(
  id: EncounterId,
  ctx: EncounterContext,
): Encounter | null {
  const factory = FACTORIES[id];
  return factory ? factory(ctx) : null;
}
