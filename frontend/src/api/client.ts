/**
 * Low-level HTTP client — provides the transport layer for all API calls.
 *
 * ## Base URL resolution
 * Reads VITE_API_BASE_URL from the .env file (injected at build time by
 * Vite's import.meta.env). Falls back to localhost:8000 for local dev.
 * In production, this would point to the deployed FastAPI server.
 *
 * ## postMultipart
 * The only export — sends a multipart/form-data POST with two parts:
 *   1. "params" — the analysis parameters as a JSON string
 *   2. "file"   — the uploaded .txt data file as a binary blob
 *
 * This matches the FastAPI endpoint signature which expects:
 *   params: str = Form(...)   — JSON string parsed server-side
 *   file: UploadFile          — the data file
 *
 * Why multipart instead of JSON body? Because we need to send a binary
 * file alongside structured params. Multipart is the standard way to do
 * this — JSON alone can't carry file content without base64 encoding.
 *
 * ## Error handling
 * On non-2xx responses, attempts to parse the JSON body for a `detail`
 * field (FastAPI's standard error format). Falls back to the HTTP status
 * code if the body isn't JSON. The thrown Error propagates up to the
 * hook layer (useAnalysis/useFitting) which dispatches it to state.
 *
 * ## Type safety
 * Returns Promise<T> but doesn't validate the response shape — that's
 * the caller's job. analysis.ts calls postMultipart<unknown> and then
 * validates with Zod, so the generic param is just for convenience.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * POST multipart/form-data with JSON params string + file.
 */
export async function postMultipart<T>(
  endpoint: string,
  params: Record<string, unknown>,
  file: File,
): Promise<T> {
  const formData = new FormData();
  formData.append("params", JSON.stringify(params));
  formData.append("file", file);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
