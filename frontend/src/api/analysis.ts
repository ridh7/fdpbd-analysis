import { FDPBDResultSchema } from "../schemas/results";
import type { FDPBDResult } from "../schemas/results";
import { postMultipart } from "./client";

/**
 * Run isotropic FD-PBD analysis.
 * Validates the response against the Zod schema at runtime.
 */
export async function analyzeIsotropic(
  params: Record<string, unknown>,
  file: File,
): Promise<FDPBDResult> {
  const raw = await postMultipart<unknown>("/fdpbd/analyze", params, file);
  return FDPBDResultSchema.parse(raw);
}
