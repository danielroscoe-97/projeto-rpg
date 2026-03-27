/**
 * BMAD Orchestrator — Concurrency Primitives
 *
 * Counting semaphore + async mutex for coordinating parallel story execution.
 * Pure TypeScript, zero dependencies.
 */

/** Default timeout: 90 minutes (matches story dependency polling timeout) */
const DEFAULT_TIMEOUT_MS = 90 * 60 * 1000;

export class Semaphore {
  private _running = 0;
  private _queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

  constructor(private readonly max: number) {
    if (max < 1) throw new Error("Semaphore max must be >= 1");
  }

  get running(): number { return this._running; }
  get available(): number { return this.max - this._running; }
  get waiting(): number { return this._queue.length; }

  /**
   * Acquire a semaphore slot.
   * @param timeoutMs — Max time to wait for a slot. Throws on timeout. 0 = no timeout.
   */
  async acquire(timeoutMs: number = 0): Promise<void> {
    if (this._running < this.max) {
      this._running++;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const entry = {
        resolve: () => { this._running++; resolve(); },
        reject,
      };
      this._queue.push(entry);

      if (timeoutMs > 0) {
        setTimeout(() => {
          const idx = this._queue.indexOf(entry);
          if (idx >= 0) {
            this._queue.splice(idx, 1);
            reject(new Error(`Semaphore acquire timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      }
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      next.resolve(); // transfers the slot to the next waiter
    } else {
      this._running = Math.max(0, this._running - 1);
    }
  }

  /**
   * Acquire → run fn → release (guaranteed even on error).
   * @param timeoutMs — Max time to wait for a slot (default: 90min).
   */
  async run<T>(fn: () => Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    await this.acquire(timeoutMs);
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
