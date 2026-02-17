/**
 * Centralized HTTP client for API calls
 * Provides consistent error handling, retry logic, and response formatting
 */

import { ApiSuccessResponse, ApiErrorResponse } from "./api-response";
import { logger } from "./logger";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 0;

  constructor(baseURL = "") {
    this.baseURL = baseURL;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestOptions = {},
  ): Promise<ApiSuccessResponse<T> | ApiErrorResponse> {
    const {
      retries = this.defaultRetries,
      retryDelay = 1000,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new ApiError(errorData.error || "Request failed", response.status, errorData.details);
      }

      return data as ApiSuccessResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timeout", 408);
      }

      // Handle network errors with retry
      if (retries > 0 && error instanceof Error && !error.message.includes("timeout")) {
        logger.warn(`Request failed, retrying... (${retries} retries left)`, { url, error: error.message });
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return this.makeRequest<T>(url, { ...options, retries: retries - 1 });
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ApiError(error instanceof Error ? error.message : "Unknown error", 500, error);
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.makeRequest<T>(url, {
      ...options,
      method: "GET",
    });

    if (!response.success) {
      throw new ApiError(response.error, 400, response.details);
    }

    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.makeRequest<T>(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.success) {
      throw new ApiError(response.error, 400, response.details);
    }

    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.makeRequest<T>(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.success) {
      throw new ApiError(response.error, 400, response.details);
    }

    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.makeRequest<T>(url, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.success) {
      throw new ApiError(response.error, 400, response.details);
    }

    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.makeRequest<T>(url, {
      ...options,
      method: "DELETE",
    });

    if (!response.success) {
      throw new ApiError(response.error, 400, response.details);
    }

    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export convenience functions
export const get = <T>(url: string, options?: RequestOptions) => apiClient.get<T>(url, options);
export const post = <T>(url: string, body?: unknown, options?: RequestOptions) => apiClient.post<T>(url, body, options);
export const put = <T>(url: string, body?: unknown, options?: RequestOptions) => apiClient.put<T>(url, body, options);
export const patch = <T>(url: string, body?: unknown, options?: RequestOptions) =>
  apiClient.patch<T>(url, body, options);
export const del = <T>(url: string, options?: RequestOptions) => apiClient.delete<T>(url, options);
