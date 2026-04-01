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
