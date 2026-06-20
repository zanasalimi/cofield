/**
 * Relay read-only guard. A viewer's connection must never apply a write to the
 * shared room doc. These exercise the y-protocol frame classification and the
 * connection wrapper that drops viewer writes.
 */
import { describe, it, expect } from "vitest";
import { isDocWrite, asReadOnly } from "../../server/readonly";

// y-protocol framing: [messageType, syncSubtype, ...]. sync=0; step1=0, step2=1,
// update=2. awareness=1.
const syncStep1 = new Uint8Array([0, 0]);
const syncStep2 = new Uint8Array([0, 1, 5, 0]);
const syncUpdate = new Uint8Array([0, 2, 7, 0]);
const awareness = new Uint8Array([1, 3, 9]);

describe("isDocWrite", () => {
  it("flags the frames that mutate the doc (sync step-2 and update)", () => {
    expect(isDocWrite(syncStep2)).toBe(true);
    expect(isDocWrite(syncUpdate)).toBe(true);
  });

  it("lets reads (sync step-1) and presence (awareness) through", () => {
    expect(isDocWrite(syncStep1)).toBe(false);
    expect(isDocWrite(awareness)).toBe(false);
  });

  it("treats an empty / malformed frame as a non-write", () => {
    expect(isDocWrite(new Uint8Array([]))).toBe(false);
  });
});

describe("asReadOnly", () => {
  it("drops doc-write frames but forwards reads and presence to the real listener", () => {
    const received: number[][] = [];
    const listeners: Record<string, ((...a: unknown[]) => void)[]> = {};
    const conn = {
      on(event: string, listener: (...a: unknown[]) => void) {
        (listeners[event] ??= []).push(listener);
      },
    };

    asReadOnly(conn);
    conn.on("message", (d) => received.push([...(d as Uint8Array)]));
    const emit = (frame: Uint8Array) => listeners["message"]!.forEach((l) => l(frame));

    emit(syncStep2); // write — dropped
    emit(syncUpdate); // write — dropped
    emit(syncStep1); // read — forwarded
    emit(awareness); // presence — forwarded

    expect(received).toEqual([[0, 0], [1, 3, 9]]);
  });

  it("leaves non-message events untouched", () => {
    let closedCalled = false;
    const conn = {
      on(event: string, listener: (...a: unknown[]) => void) {
        if (event === "close") listener();
      },
    };
    asReadOnly(conn).on("close", () => {
      closedCalled = true;
    });
    expect(closedCalled).toBe(true);
  });
});
