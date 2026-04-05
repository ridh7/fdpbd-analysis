/**
 * SSE (Server-Sent Events) streaming client for DE fitting — reads a
 * real-time event stream from the backend and yields typed events.
 *
 * ## Why SSE instead of WebSockets?
 * DE fitting is a long-running, server-push-only operation: the client
 * sends parameters once, then the server streams progress updates back.
 * SSE is simpler than WebSockets for this one-way pattern — it uses a
 * standard HTTP response, works through proxies, and auto-reconnects.
 * (We previously used WebSockets and migrated to SSE for simplicity.)
 *
 * ## Async generator pattern
 * `streamFit` is an async generator (async function*) that yields
 * FitSSEEvent objects as they arrive. The caller iterates with
 * `for await (const event of streamFit(...))`, which naturally handles
 * backpressure and cleanup. This is cleaner than callback-based EventSource.
 *
 * ## SSE parsing
 * The backend sends events in the standard SSE text format:
 *   event: progress\n
 *   data: {"generation": 1, ...}\n\n
 *
 * This function manually parses that format by:
 *   1. Reading chunks from the ReadableStream via reader.read()
 *   2. Accumulating text in a buffer
 *   3. Splitting on "\n\n" (SSE event delimiter)
 *   4. Extracting event type and data from "event: " / "data: " prefixes
 *   5. Validating each parsed object with the appropriate Zod schema
 *
 * Why not use the browser's EventSource API? Because EventSource only
 * supports GET requests — our endpoint requires POST with multipart data.
 *
 * ## Cancellation
 * Accepts an optional AbortSignal. When the signal fires, the fetch is
 * aborted, reader.read() throws, and the finally block releases the lock.
 * The caller (useFitting hook) manages the AbortController lifecycle.
 *
 * ## Event types (discriminated union)
 * - "progress": per-generation update (generation number, best cost, etc.)
 * - "result": final fitted values after convergence or max iterations
 * - "error": server-side error during fitting
 */
import { FitProgressSchema, FitResultSchema } from "../schemas/results";
import type { FitProgress, FitResultData } from "../schemas/results";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type FitSSEEvent =
  | { type: "progress"; data: FitProgress }
  | { type: "result"; data: FitResultData }
  | { type: "error"; detail: string };

/**
 * Start a DE fitting run via SSE, yielding events as they arrive.
 * Supports cancellation via AbortSignal.
 */
export async function* streamFit(
  endpoint: "/fdpbd/fit_anisotropy" | "/fdpbd/fit_transverse",
  params: Record<string, unknown>,
  file: File,
  signal?: AbortSignal,
): AsyncGenerator<FitSSEEvent> {
  const formData = new FormData();
  formData.append("params", JSON.stringify(params));
  formData.append("file", file);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        let eventType = "";
        let eventData = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6);
          }
        }

        if (!eventType || !eventData) continue;

        const parsed = JSON.parse(eventData);

        if (eventType === "progress") {
          yield { type: "progress", data: FitProgressSchema.parse(parsed) };
        } else if (eventType === "result") {
          yield { type: "result", data: FitResultSchema.parse(parsed) };
        } else if (eventType === "error") {
          yield { type: "error", detail: parsed.detail ?? "Unknown error" };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
