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
