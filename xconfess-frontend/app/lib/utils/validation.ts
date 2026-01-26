import { z } from "zod";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export const confessionFormSchema = z.object({
  title: z
    .string()
    .max(200, "Title cannot exceed 200 characters")
    .optional()
    .or(z.literal("")),
  body: z
    .string()
    .min(10, "Confession must be at least 10 characters")
    .max(5000, "Confession cannot exceed 5000 characters"),
  gender: z.nativeEnum(Gender).optional(),
  enableStellarAnchor: z.boolean().optional().default(false),
});

export type ConfessionFormData = z.infer<typeof confessionFormSchema>;

export interface ValidationErrors {
  title?: string;
  body?: string;
  gender?: string;
  enableStellarAnchor?: string;
}

export function validateConfessionForm(
  data: Partial<ConfessionFormData>
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Normalize data - ensure strings are strings, not undefined
  const normalizedData = {
    title: data.title ?? "",
    body: data.body ?? "",
    gender: data.gender,
    enableStellarAnchor: data.enableStellarAnchor ?? false,
  };

  // Use safeParse instead of parse to avoid try-catch
  const result = confessionFormSchema.safeParse(normalizedData);
  
  if (!result.success && result.error) {
    // ZodError uses 'issues' property, not 'errors'
    const zodError = result.error as z.ZodError;
    if (zodError.issues && Array.isArray(zodError.issues)) {
      zodError.issues.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        if (field) {
          errors[field] = err.message;
        }
      });
    }
  }

  return errors;
}

export function getCharacterCountWarning(
  current: number,
  max: number
): "none" | "warning" | "error" {
  const percentage = (current / max) * 100;
  if (percentage >= 100) return "error";
  if (percentage >= 90) return "warning";
  return "none";
}
