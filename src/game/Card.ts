export interface Card {
  id: number;
  seed: number;
}

export class CardSupplier {
  private nextId = 1;

  draw(): Card {
    const id = this.nextId++;
    return { id, seed: Math.floor(Math.random() * 0xffffff) };
  }
}
