import {
  FitProgressSchema,
  FitResultSchema,
} from "../schemas/results";
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
    throw new Error(
      body?.detail ?? `Request failed with status ${response.status}`,
    );
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
