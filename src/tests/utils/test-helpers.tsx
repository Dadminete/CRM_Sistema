import { ReactElement } from "react";

import { render, RenderOptions } from "@testing-library/react";

// Custom render function that wraps providers if needed
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };

// Mock API response helpers
export function mockSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

export function mockErrorResponse(error: string, statusCode = 400) {
  return {
    success: false,
    error,
    statusCode,
  };
}

// Mock user for testing
export const mockUser = {
  id: "test-user-id",
  username: "testuser",
  nombre: "Test",
  apellido: "User",
  email: "test@example.com",
  sessionId: "test-session-id",
};

// Mock permission helper
export function mockWithPermissions(permissions: string[]) {
  return {
    ...mockUser,
    permissions,
  };
}
