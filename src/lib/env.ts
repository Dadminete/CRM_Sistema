/**
 * Environment variables validation using Zod
 * Ensures all required environment variables are set and valid
 */

import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional(),

  // Backup (optional)
  BACKUP_PATH: z.string().optional(),
  BACKUP_DATABASE_URL: z.string().url().optional(),

  // Email Configuration (optional but all required if one is set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Redis (optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Validate email config: if any SMTP field is set, all must be set
const validateEmailConfig = (data: z.infer<typeof envSchema>) => {
  const smtpFields = [data.SMTP_HOST, data.SMTP_PORT, data.SMTP_USER, data.SMTP_PASSWORD, data.SMTP_FROM];
  const definedFields = smtpFields.filter((field) => field !== undefined);

  if (definedFields.length > 0 && definedFields.length < smtpFields.length) {
    throw new Error(
      "If any SMTP configuration is provided, all SMTP fields must be set: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM",
    );
  }

  return data;
};

// Parse and validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return validateEmailConfig(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");

      console.error("❌ Environment validation failed:");
      console.error(errorMessage);

      throw new Error(`Environment validation failed:\n${errorMessage}`);
    }

    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;
