/**
 * Higgsfield Image Generation Client
 *
 * TODO: Verify Higgsfield's public API documentation for exact endpoints and parameters.
 * The MCP tools show `generate_image` with model `gpt_image_2_5` as default.
 * This stub assumes a REST API pattern but actual implementation depends on
 * Higgsfield's documented public API which may differ.
 *
 * Current implementation is a clean stub that:
 * 1. Returns a placeholder when HIGGSFIELD_API_KEY is not set
 * 2. Shows clear TODO markers for actual API integration
 */

const HIGGSFIELD_API_KEY = process.env.HIGGSFIELD_API_KEY;
const HIGGSFIELD_IMAGE_MODEL = process.env.HIGGSFIELD_IMAGE_MODEL || "gpt_image_2_5";

export interface HiggsFieldImageResult {
  url: string;
  prompt: string;
  source: "higgsfield";
}

export interface HiggsFieldError {
  error: string;
  code: "no_key" | "api_error" | "timeout" | "rate_limit";
}

export function isHiggsFieldAvailable(): boolean {
  return !!HIGGSFIELD_API_KEY;
}

/**
 * Generate an image using Higgsfield API
 *
 * TODO: Replace with actual Higgsfield API call once documentation is verified.
 * Expected flow based on MCP tools:
 * 1. Submit generation request with prompt and model
 * 2. Get job_id back
 * 3. Poll for completion
 * 4. Return image URL
 */
export async function generateImage(
  prompt: string,
  _signal?: AbortSignal
): Promise<HiggsFieldImageResult | HiggsFieldError> {
  if (!HIGGSFIELD_API_KEY) {
    return {
      error: "Higgsfield API key not configured",
      code: "no_key",
    };
  }

  // TODO: Implement actual Higgsfield API call
  // Based on MCP schema, the API likely accepts:
  // - model: string (e.g., "gpt_image_2_5", "marketing_studio_image")
  // - prompt: string
  // - aspect_ratio: string (optional)
  // - count: number (1-4)
  //
  // And returns a job that needs polling for completion.
  //
  // Placeholder implementation for demo:

  console.log(`[Higgsfield] Would generate image with prompt: "${prompt}"`);
  console.log(`[Higgsfield] Using model: ${HIGGSFIELD_IMAGE_MODEL}`);
  console.log(`[Higgsfield] API Key present: ${!!HIGGSFIELD_API_KEY}`);

  // Return a placeholder image for testing the UI flow
  // In production, this would be replaced with actual API call
  return {
    error: "Higgsfield API integration pending - see TODO in src/lib/slides/higgsfield.ts",
    code: "api_error",
  };

  /*
   * Expected implementation pattern:
   *
   * const response = await fetch("https://api.higgsfield.com/v1/images/generate", {
   *   method: "POST",
   *   headers: {
   *     "Authorization": `Bearer ${HIGGSFIELD_API_KEY}`,
   *     "Content-Type": "application/json",
   *   },
   *   body: JSON.stringify({
   *     model: HIGGSFIELD_IMAGE_MODEL,
   *     prompt,
   *     aspect_ratio: "16:9",
   *   }),
   *   signal,
   * });
   *
   * if (!response.ok) {
   *   const err = await response.json();
   *   return { error: err.message, code: "api_error" };
   * }
   *
   * const job = await response.json();
   *
   * // Poll for completion
   * while (true) {
   *   const status = await fetch(`https://api.higgsfield.com/v1/jobs/${job.id}`, {
   *     headers: { "Authorization": `Bearer ${HIGGSFIELD_API_KEY}` },
   *     signal,
   *   });
   *   const data = await status.json();
   *   if (data.status === "completed") {
   *     return { url: data.output_url, prompt, source: "higgsfield" };
   *   }
   *   if (data.status === "failed") {
   *     return { error: data.error, code: "api_error" };
   *   }
   *   await new Promise(r => setTimeout(r, 1000));
   * }
   */
}

export function isHiggsFieldError(
  result: HiggsFieldImageResult | HiggsFieldError
): result is HiggsFieldError {
  return "error" in result;
}
