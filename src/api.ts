import type { ExpeditionResult } from "./types";

// The server answers after at most 5 seconds (server/index.js). If nothing has
// arrived after 8 seconds, we stop waiting – the expedition counts as failed
// and the dwarf comes home (D4: never stuck "away").
export const EXPEDITION_TIMEOUT_MS = 8_000;

// Checks that the server's answer really has the shape we expect before the
// game uses it. The reward amounts themselves are checked again when they are
// booked (addRewards in game/expeditions.ts).
export function isExpeditionResult(body: unknown): body is ExpeditionResult {
  if (typeof body !== "object" || body === null) return false;
  const result = body as Record<string, unknown>;
  return (
    typeof result.expeditionId === "string" &&
    result.status === "completed" &&
    typeof result.message === "string" &&
    typeof result.rewards === "object" &&
    result.rewards !== null &&
    !Array.isArray(result.rewards)
  );
}

// Reads the body as JSON. A body that is not JSON (e.g. the HTML error page of
// the Vite proxy when the API is not running) gives null instead of a crash.
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Every way this can go wrong ends in an Error with a readable message:
// no connection, timeout, error status, or an answer we cannot use.
export async function beginExpedition(
  dwarfId: string,
  destination: string,
): Promise<ExpeditionResult> {
  let response: Response;
  try {
    response = await fetch("/api/expeditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dwarfId, destination }),
      signal: AbortSignal.timeout(EXPEDITION_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("No word from the scout – the journey took too long.");
    }
    throw new Error("The gate stayed shut – the expedition office is unreachable.");
  }

  const body = await readJson(response);

  if (!response.ok) {
    const serverError =
      typeof body === "object" && body !== null && "error" in body
        ? String(body.error)
        : null;
    throw new Error(serverError ?? `Expedition failed (${response.status}).`);
  }

  if (!isExpeditionResult(body)) {
    throw new Error("The scout's report could not be read.");
  }
  return body;
}
