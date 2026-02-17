import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validate request body against a Zod schema
 * Returns the validated data or null if validation fails
 */
export async function validateRequest<T extends z.ZodType>(
  body: unknown,
  schema: T,
): Promise<{ data: z.infer<T> | null; error: Response | null }> {
  try {
    const validatedData = schema.parse(body);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Datos de entrada inválidos",
            details: formattedErrors,
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Error al validar los datos",
        },
        { status: 400 },
      ),
    };
  }
}

/**
 * Parse and validate query parameters against a Zod schema
 */
export function validateQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T,
): { data: z.infer<T> | null; error: Response | null } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validatedData = schema.parse(params);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Parámetros de consulta inválidos",
            details: formattedErrors,
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Error al validar los parámetros",
        },
        { status: 400 },
      ),
    };
  }
}
