import { z } from "zod";

export const incidentAnalysisSchema = z.object({
  summary: z.string().min(1),
  likelyRootCause: z.string().min(1),
  confidence: z.number().min(0).max(1),
  affectedFiles: z.array(z.string()).max(10),
  suggestedFix: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1).max(10),
});

export const generatedFixSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(4000),
  changes: z
    .array(z.object({ path: z.string().min(1), newContent: z.string().min(1).max(50_000) }))
    .min(1)
    .max(3),
});

export type IncidentAnalysis = z.infer<typeof incidentAnalysisSchema>;
export type GeneratedFix = z.infer<typeof generatedFixSchema>;

export const EDITABLE_FILE = /^apps\/demo-service\/src\/[A-Za-z0-9._/-]+\.ts$/;

export function validateGeneratedFix(value: unknown): GeneratedFix {
  const fix = generatedFixSchema.parse(value);
  for (const change of fix.changes) {
    if (!EDITABLE_FILE.test(change.path) || change.path.includes("..")) {
      throw new Error(`AI fix attempted to modify disallowed path: ${change.path}`);
    }
  }
  return fix;
}
