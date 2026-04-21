import { act, renderHook } from "@testing-library/react";

// Mocks MUST come before the import so ts-jest hoists them correctly.
const mockUnlink = jest.fn<Promise<void>, [string]>();
jest.mock("@/lib/supabase/entity-links", () => ({
  unlinkEntities: (...args: [string]) => mockUnlink(...args),
}));

const mockToast = jest.fn() as jest.Mock & {
  dismiss: jest.Mock;
  error: jest.Mock;
};
mockToast.dismiss = jest.fn();
mockToast.error = jest.fn();
jest.mock("sonner", () => ({
  toast: mockToast,
}));

import { useEntityUnlinkUndo } from "./use-entity-unlink-undo";

const strings = {
  single: "Link removed. Undo",
  batch: (count: number) => `${count} links removed`,
  actionSingle: "Undo",
  actionBatch: "Undo all",
  errorSingle: "Failed to remove link on server",
  errorBatch: (count: number) => `Failed to remove ${count} links on server`,
};

/**
 * Drain the module-scoped `pending` Map between tests by running the TTL
 * timer out. Without this, a schedule in test N would still be queued when
 * test N+1 mounts. Also resets the commit mocks.
 */
async function drainPending() {
  mockUnlink.mockResolvedValue(undefined);
  await act(async () => {
    jest.advanceTimersByTime(6_000);
  });
  // One more microtask flush for the allSettled resolution.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockUnlink.mockReset();
  mockToast.mockReset();
  mockToast.dismiss.mockReset();
  mockToast.error.mockReset();
});

afterEach(async () => {
  await drainPending();
  jest.useRealTimers();
});

describe("useEntityUnlinkUndo", () => {
  it("schedule renders toast and does NOT call unlinkEntities before TTL", () => {
    mockUnlink.mockResolvedValue(undefined);
    const onUndo = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({ edgeId: "edge-1", onUndo });
    });

    expect(mockToast).toHaveBeenCalledWith(
      "Link removed. Undo",
      expect.objectContaining({
        id: "entity-unlink-batch",
        action: expect.objectContaining({ label: "Undo" }),
      }),
    );
    expect(mockUnlink).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it("commits unlinkEntities at TTL", async () => {
    mockUnlink.mockResolvedValue(undefined);
    const onUndo = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({ edgeId: "edge-ttl", onUndo });
    });

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUnlink).toHaveBeenCalledTimes(1);
    expect(mockUnlink).toHaveBeenCalledWith("edge-ttl");
    expect(onUndo).not.toHaveBeenCalled();
  });

  it("undo click restores via onUndo and skips unlinkEntities", () => {
    mockUnlink.mockResolvedValue(undefined);
    const onUndo = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({ edgeId: "edge-undo", onUndo });
    });

    // Grab the action callback that the hook passed to sonner.
    const toastCall = mockToast.mock.calls[0];
    expect(toastCall).toBeDefined();
    const onClick = toastCall![1].action.onClick as () => void;

    act(() => {
      onClick();
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
    // Advance past TTL: no server call should happen.
    act(() => {
      jest.advanceTimersByTime(6_000);
    });
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("consolidates multiple schedules into a single batch toast", async () => {
    mockUnlink.mockResolvedValue(undefined);
    const onUndoA = jest.fn();
    const onUndoB = jest.fn();
    const onUndoC = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({ edgeId: "edge-A", onUndo: onUndoA });
      result.current.schedule({ edgeId: "edge-B", onUndo: onUndoB });
      result.current.schedule({ edgeId: "edge-C", onUndo: onUndoC });
    });

    // Last toast call should show batch message for 3.
    const lastCall = mockToast.mock.calls[mockToast.mock.calls.length - 1]!;
    expect(lastCall[0]).toBe("3 links removed");
    expect(lastCall[1].action.label).toBe("Undo all");

    // Undo all restores all three. undoAll awaits each onUndo, so the
    // microtasks need to drain before we assert (fake timers don't auto-
    // drain async continuations).
    const onClick = lastCall[1].action.onClick as () => void;
    await act(async () => {
      onClick();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUndoA).toHaveBeenCalledTimes(1);
    expect(onUndoB).toHaveBeenCalledTimes(1);
    expect(onUndoC).toHaveBeenCalledTimes(1);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("re-scheduling the same edgeId is idempotent (last onUndo wins)", () => {
    mockUnlink.mockResolvedValue(undefined);
    const firstUndo = jest.fn();
    const secondUndo = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({ edgeId: "edge-dup", onUndo: firstUndo });
      result.current.schedule({ edgeId: "edge-dup", onUndo: secondUndo });
    });

    // Batch size should still be 1.
    const lastCall = mockToast.mock.calls[mockToast.mock.calls.length - 1]!;
    expect(lastCall[0]).toBe("Link removed. Undo");

    const onClick = lastCall[1].action.onClick as () => void;
    act(() => {
      onClick();
    });

    expect(firstUndo).not.toHaveBeenCalled();
    expect(secondUndo).toHaveBeenCalledTimes(1);
  });

  it("calls onCommit AFTER unlinkEntities succeeds", async () => {
    mockUnlink.mockResolvedValue(undefined);
    const order: string[] = [];
    mockUnlink.mockImplementation(async () => {
      order.push("unlink");
    });
    const onCommit = jest.fn(async () => {
      order.push("commit");
    });
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({
        edgeId: "edge-commit",
        onUndo: jest.fn(),
        onCommit,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUnlink).toHaveBeenCalledWith("edge-commit");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["unlink", "commit"]);
  });

  it("skips onCommit and fires error toast when unlinkEntities rejects", async () => {
    mockUnlink.mockRejectedValue(new Error("net down"));
    const onUndo = jest.fn();
    const onCommit = jest.fn();
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({
        edgeId: "edge-fail",
        onUndo,
        onCommit,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Self-healing: onUndo ran so chip returns.
    expect(onUndo).toHaveBeenCalledTimes(1);
    // onCommit must NOT run — edge wasn't deleted.
    expect(onCommit).not.toHaveBeenCalled();
    // Error toast surfaced.
    expect(mockToast.error).toHaveBeenCalledWith(
      "Failed to remove link on server",
    );
  });

  it("fires error toast when onCommit throws but edge delete succeeded", async () => {
    mockUnlink.mockResolvedValue(undefined);
    const onUndo = jest.fn();
    const onCommit = jest.fn().mockRejectedValue(new Error("legacy delete failed"));
    const { result } = renderHook(() => useEntityUnlinkUndo(strings));

    act(() => {
      result.current.schedule({
        edgeId: "edge-commit-fail",
        onUndo,
        onCommit,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // No rollback: edge is gone, so onUndo is NOT called by the hook.
    expect(onUndo).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      "Failed to remove link on server",
    );
  });
});
