import { Card, CardSupplier } from "./Card";

export type SwipeDirection = "left" | "right";

export interface GameStateSnapshot {
  sanity: number;
  fuel: number;
  lighthouseHealth: number;
  lighthouseHealthMax: number;
  lightOn: boolean;
  topCard: Card;
  isGameOver: boolean;
}

export const INITIAL_SANITY = 10;
export const INITIAL_FUEL = 10;
export const INITIAL_LIGHTHOUSE_HEALTH = 10;

export class GameState {
  private sanity = INITIAL_SANITY;
  private fuel = INITIAL_FUEL;
  private health = INITIAL_LIGHTHOUSE_HEALTH;
  private lightOn = true;
  private supplier = new CardSupplier();
  private current: Card;

  constructor() {
    this.current = this.supplier.draw();
  }

  snapshot(): GameStateSnapshot {
    return {
      sanity: this.sanity,
      fuel: this.fuel,
      lighthouseHealth: this.health,
      lighthouseHealthMax: INITIAL_LIGHTHOUSE_HEALTH,
      lightOn: this.lightOn,
      topCard: this.current,
      isGameOver: this.sanity <= 0,
    };
  }

  swipe(direction: SwipeDirection): GameStateSnapshot {
    if (this.snapshot().isGameOver) return this.snapshot();

    if (direction === "left") {
      this.sanity = Math.max(0, this.sanity - 1);
      this.lightOn = false;
    } else {
      this.fuel = Math.max(0, this.fuel - 1);
      this.lightOn = true;
    }

    this.current = this.supplier.draw();
    return this.snapshot();
  }
}
