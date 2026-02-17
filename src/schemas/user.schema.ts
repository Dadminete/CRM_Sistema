import { z } from "zod";

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos"),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres"),
  apellido: z.string().min(1, "El apellido es requerido").max(100, "El apellido no puede exceder 100 caracteres"),
  email: z.string().email("Email inválido").max(100, "El email no puede exceder 100 caracteres").optional().nullable(),
  telefono: z
    .string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .regex(/^[0-9\-\+\(\)\s]*$/, "Formato de teléfono inválido")
    .optional()
    .nullable(),
  cedula: z.string().max(20, "La cédula no puede exceder 20 caracteres").optional().nullable(),
  direccion: z.string().optional().nullable(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  sexo: z.enum(["M", "F", "O"]).optional().nullable(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres"),
  activo: z.boolean().default(true).optional(),
  esEmpleado: z.boolean().default(false).optional(),
  esCliente: z.boolean().default(false).optional(),
  notas: z.string().optional().nullable(),
});

/**
 * Schema for updating a user
 */
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(50, "El nombre de usuario no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos")
    .optional(),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres").optional(),
  apellido: z
    .string()
    .min(1, "El apellido es requerido")
    .max(100, "El apellido no puede exceder 100 caracteres")
    .optional(),
  email: z.string().email("Email inválido").max(100, "El email no puede exceder 100 caracteres").optional().nullable(),
  telefono: z
    .string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .regex(/^[0-9\-\+\(\)\s]*$/, "Formato de teléfono inválido")
    .optional()
    .nullable(),
  cedula: z.string().max(20, "La cédula no puede exceder 20 caracteres").optional().nullable(),
  direccion: z.string().optional().nullable(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  sexo: z.enum(["M", "F", "O"]).optional().nullable(),
  activo: z.boolean().optional(),
  esEmpleado: z.boolean().optional(),
  esCliente: z.boolean().optional(),
  notas: z.string().optional().nullable(),
});

/**
 * Schema for login
 */
export const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Schema for changing password
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(100, "La contraseña no puede exceder 100 caracteres"),
    confirmPassword: z.string().min(1, "Debes confirmar la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
