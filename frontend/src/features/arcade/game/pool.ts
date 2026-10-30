export interface Poolable {
  active: boolean;
}

export class Pool<T extends Poolable> {
  readonly items: readonly T[];
  private cursor = 0;

  constructor(size: number, create: () => T) {
    this.items = Array.from({ length: size }, create);
  }

  spawn(): T | null {
    const { items } = this;
    for (let i = 0; i < items.length; i++) {
      const index = (this.cursor + i) % items.length;
      const item = items[index]!;
      if (!item.active) {
        item.active = true;
        this.cursor = (index + 1) % items.length;
        return item;
      }
    }
    return null;
  }

  clear(): void {
    for (const item of this.items) {
      item.active = false;
    }
  }
}
