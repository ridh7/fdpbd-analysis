/**
 * Analysis API functions — typed wrappers around postMultipart for each
 * of the three analysis modes (isotropic, anisotropic, transverse).
 *
 * ## Zod validation at the boundary
 * Each function calls postMultipart<unknown> (intentionally untyped) and
 * then validates the response with the corresponding Zod schema. This
 * is the "trust boundary" pattern: we don't trust the server response
 * to match our TypeScript types, so we validate at runtime.
 *
 * If the server returns unexpected data (missing field, wrong type,
 * extra fields), Zod throws a ZodError with details about what didn't
 * match. This catches backend/frontend schema drift early rather than
 * causing subtle bugs downstream.
 *
 * ## Why three separate functions instead of one?
 * Each mode hits a different endpoint and returns a different response
 * shape. Keeping them separate makes the types precise — the caller
 * knows exactly which result type they'll get based on which function
 * they call, with no runtime discrimination needed.
 */
import {
  IsotropicResultSchema,
  AnisotropicResultSchema,
  TransverseResultSchema,
} from "../schemas/results";
import type {
  IsotropicResult,
  AnisotropicResult,
  TransverseResult,
} from "../schemas/results";
import { postMultipart } from "./client";

/**
 * Run isotropic FD-PBD analysis.
 * Validates the response against the Zod schema at runtime.
 */
export async function analyzeIsotropic(
  params: Record<string, unknown>,
  file: File,
): Promise<IsotropicResult> {
  const raw = await postMultipart<unknown>("/fdpbd/analyze", params, file);
  return IsotropicResultSchema.parse(raw);
}

/**
 * Run anisotropic FD-PBD analysis.
 */
export async function analyzeAnisotropic(
  params: Record<string, unknown>,
  file: File,
): Promise<AnisotropicResult> {
  const raw = await postMultipart<unknown>(
    "/fdpbd/analyze_anisotropy",
    params,
    file,
  );
  return AnisotropicResultSchema.parse(raw);
}

/**
 * Run transverse isotropic FD-PBD analysis.
 */
export async function analyzeTransverse(
  params: Record<string, unknown>,
  file: File,
): Promise<TransverseResult> {
  const raw = await postMultipart<unknown>(
    "/fdpbd/analyze_transverse",
    params,
    file,
  );
  return TransverseResultSchema.parse(raw);
}
