import { afterEach, describe, expect, it, vi } from "vitest";
import { beginExpedition, isExpeditionResult } from "./api";

// Replaces fetch for one test, so no server is needed.
const mockFetch = (implementation: () => Promise<Response>) =>
  vi.stubGlobal("fetch", vi.fn(implementation));

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const validResult = {
  expeditionId: "exp-17",
  status: "completed",
  rewards: { stone: 8, tools: 1 },
  message: "The scout found a crystal seam.",
};

afterEach(() => vi.unstubAllGlobals());

describe("expedition API (D4)", () => {
  it("returns the result of a successful expedition", async () => {
    mockFetch(() => json(validResult));
    await expect(beginExpedition("d1", "crystal-cave")).resolves.toEqual(validResult);
  });

  it("uses the server's error text for a failed expedition", async () => {
    mockFetch(() => json({ error: "Rockfall has sealed the route." }, 503));
    await expect(beginExpedition("d1", "blocked-pass")).rejects.toThrow("Rockfall");
  });

  it("still fails cleanly if the error page is not JSON (API not running)", async () => {
    mockFetch(() => Promise.resolve(new Response("<html>Bad Gateway</html>", { status: 502 })));
    await expect(beginExpedition("d1", "old-mine")).rejects.toThrow("(502)");
  });

  it("rejects an answer with the wrong shape", async () => {
    mockFetch(() => json({ hello: "world" }));
    await expect(beginExpedition("d1", "old-mine")).rejects.toThrow("could not be read");
  });

  it("turns a network error into a readable message", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(beginExpedition("d1", "old-mine")).rejects.toThrow("unreachable");
  });

  it("reports a timeout", async () => {
    mockFetch(() => Promise.reject(new DOMException("timed out", "TimeoutError")));
    await expect(beginExpedition("d1", "old-mine")).rejects.toThrow("too long");
  });
});

describe("isExpeditionResult", () => {
  it("accepts the documented shape", () => {
    expect(isExpeditionResult(validResult)).toBe(true);
  });

  it("rejects missing or wrong fields", () => {
    expect(isExpeditionResult(null)).toBe(false);
    expect(isExpeditionResult({ ...validResult, status: "failed" })).toBe(false);
    expect(isExpeditionResult({ ...validResult, rewards: null })).toBe(false);
    expect(isExpeditionResult({ ...validResult, rewards: [8] })).toBe(false);
    expect(isExpeditionResult({ ...validResult, message: 42 })).toBe(false);
  });
});
