/**
 * BMAD Orchestrator — Concurrency Primitives
 *
 * Counting semaphore + async mutex for coordinating parallel story execution.
 * Pure TypeScript, zero dependencies.
 */

export class Semaphore {
  private _running = 0;
  private _queue: Array<() => void> = [];

  constructor(private readonly max: number) {
    if (max < 1) throw new Error("Semaphore max must be >= 1");
  }

  get running(): number { return this._running; }
  get available(): number { return this.max - this._running; }
  get waiting(): number { return this._queue.length; }

  async acquire(): Promise<void> {
    if (this._running < this.max) {
      this._running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this._queue.push(() => {
        this._running++;
        resolve();
      });
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      next(); // transfers the slot to the next waiter
    } else {
      this._running = Math.max(0, this._running - 1);
    }
  }

  /** Acquire → run fn → release (guaranteed even on error) */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/** Mutex is a Semaphore(1) — for serializing critical sections */
export class Mutex extends Semaphore {
  constructor() { super(1); }
}
