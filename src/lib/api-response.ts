import { NextResponse } from "next/server";
import { serializeBigInt } from "./serializers";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  requiredPermission?: string;
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>["meta"],
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data: serializeBigInt(data),
  };

  if (meta) {
    response.meta = serializeBigInt(meta);
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = serializeBigInt(details);
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): NextResponse<ApiSuccessResponse<T[]>> {
  const totalPages = Math.ceil(total / limit);

  return successResponse(data, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

/**
 * Common error responses
 */
export const CommonErrors = {
  unauthorized: () => errorResponse("No autenticado. Por favor, inicia sesión.", 401),

  forbidden: (requiredPermission?: string) => {
    const response = errorResponse("No tienes permisos para realizar esta acción.", 403);
    if (requiredPermission) {
      response.headers.set("X-Required-Permission", requiredPermission);
    }
    return response;
  },

  notFound: (resource: string = "Recurso") => errorResponse(`${resource} no encontrado.`, 404),

  badRequest: (message: string = "Solicitud inválida") => errorResponse(message, 400),

  conflict: (message: string = "El recurso ya existe") => errorResponse(message, 409),

  internalError: (message: string = "Error interno del servidor") => errorResponse(message, 500),

  validationError: (details: unknown) => errorResponse("Datos de entrada inválidos", 400, details),
};
