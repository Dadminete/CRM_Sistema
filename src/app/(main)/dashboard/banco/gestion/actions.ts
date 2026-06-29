"use server";

import { db } from "@/lib/db";
import { banks, cuentasBancarias, cuentasContables } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bankSchema, bankAccountSchema } from "./schema";
import { z } from "zod";

function getValidationErrorMessage(validationError: z.ZodError) {
  const firstIssue = validationError.issues[0]?.message;
  return firstIssue ? `Datos invalidos: ${firstIssue}` : "Datos invalidos";
}

function getBankingActionErrorMessage(error: unknown, fallback: string) {
  const err = error as {
    code?: string;
    detail?: string;
    message?: string;
    constraint?: string;
  };

  if (err?.code === "23505") {
    if (err.constraint === "cuentas_bancarias_numero_cuenta_key") {
      return "Ya existe una cuenta bancaria con ese numero de cuenta.";
    }
    if (err.constraint === "banks_codigo_key") {
      return "Ya existe un banco con ese codigo.";
    }
    return "Ya existe un registro con esos datos.";
  }

  if (err?.code === "23503") {
    if (err.constraint === "cuentas_bancarias_cuenta_contable_id_fkey") {
      return "La cuenta contable seleccionada no existe o no es valida.";
    }
    if (err.constraint === "cuentas_bancarias_bank_id_fkey") {
      return "El banco seleccionado no existe o no es valido.";
    }
    return "No se pudo relacionar el registro con los datos seleccionados.";
  }

  if (err?.code === "23502") {
    return "Falta un dato obligatorio para completar la operacion.";
  }

  if (typeof err?.detail === "string" && err.detail.trim()) {
    return err.detail.trim();
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}

// --- Bank Actions ---

export async function getBanks() {
  try {
    const banksData = await db.query.banks.findMany({
      with: {
        cuentasBancarias: true,
      },
      orderBy: [asc(banks.nombre)],
    });

    const formattedBanks = banksData.map((bank) => ({
      ...bank,
      _count: {
        cuentas: bank.cuentasBancarias.length,
      },
    }));

    return { success: true, data: formattedBanks };
  } catch (error) {
    console.error("Error fetching banks:", error);
    return { success: false, error: "Error al cargar los bancos" };
  }
}

export async function createBank(data: z.infer<typeof bankSchema>) {
  const validation = bankSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: getValidationErrorMessage(validation.error) };
  }

  try {
    const [bank] = await db
      .insert(banks)
      .values({
        nombre: validation.data.nombre,
        codigo: validation.data.codigo,
        activo: validation.data.activo,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: bank };
  } catch (error) {
    console.error("Error creating bank:", error);
    return { success: false, error: getBankingActionErrorMessage(error, "Error al crear el banco") };
  }
}

export async function updateBank(id: string, data: z.infer<typeof bankSchema>) {
  const validation = bankSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: getValidationErrorMessage(validation.error) };
  }

  try {
    const [bank] = await db
      .update(banks)
      .set({
        nombre: validation.data.nombre,
        codigo: validation.data.codigo,
        activo: validation.data.activo,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(banks.id, id))
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: bank };
  } catch (error) {
    console.error("Error updating bank:", error);
    return { success: false, error: getBankingActionErrorMessage(error, "Error al actualizar el banco") };
  }
}

export async function toggleBankStatus(id: string, currentStatus: boolean) {
  try {
    await db
      .update(banks)
      .set({
        activo: !currentStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(banks.id, id));

    revalidatePath("/dashboard/banco/gestion");
    return { success: true };
  } catch (error) {
    console.error("Error toggling bank status:", error);
    return { success: false, error: "Error al cambiar estado del banco" };
  }
}

// --- Bank Account Actions ---

export async function getBankAccounts(bankId: string) {
  try {
    const accounts = await db.query.cuentasBancarias.findMany({
      where: eq(cuentasBancarias.bankId, bankId),
      with: {
        cuentasContable: true,
      },
      orderBy: [asc(cuentasBancarias.numeroCuenta)],
    });
    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return { success: false, error: "Error al cargar las cuentas bancarias" };
  }
}

export async function createBankAccount(bankId: string, data: z.infer<typeof bankAccountSchema>) {
  const validation = bankAccountSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: getValidationErrorMessage(validation.error) };
  }

  if (!bankId) {
    return { success: false, error: "Banco invalido para crear la cuenta." };
  }

  try {
    const [account] = await db
      .insert(cuentasBancarias)
      .values({
        bankId: bankId,
        numeroCuenta: validation.data.numeroCuenta,
        tipoCuenta: validation.data.tipoCuenta,
        moneda: validation.data.moneda,
        nombreOficialCuenta: validation.data.nombreOficialCuenta,
        cuentaContableId: validation.data.cuentaContableId,
        activo: validation.data.activo,
        observaciones: validation.data.observaciones,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error creating bank account:", error);
    return { success: false, error: getBankingActionErrorMessage(error, "Error al crear la cuenta bancaria") };
  }
}

export async function updateBankAccount(id: string, data: z.infer<typeof bankAccountSchema>) {
  const validation = bankAccountSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: getValidationErrorMessage(validation.error) };
  }

  try {
    const [account] = await db
      .update(cuentasBancarias)
      .set({
        numeroCuenta: validation.data.numeroCuenta,
        tipoCuenta: validation.data.tipoCuenta,
        moneda: validation.data.moneda,
        nombreOficialCuenta: validation.data.nombreOficialCuenta,
        cuentaContableId: validation.data.cuentaContableId,
        activo: validation.data.activo,
        observaciones: validation.data.observaciones,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cuentasBancarias.id, id))
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    revalidatePath("/dashboard/banco");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error updating bank account:", error);
    return { success: false, error: getBankingActionErrorMessage(error, "Error al actualizar la cuenta bancaria") };
  }
}

export async function toggleBankAccountStatus(id: string, currentStatus: boolean) {
  try {
    await db
      .update(cuentasBancarias)
      .set({
        activo: !currentStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cuentasBancarias.id, id));

    revalidatePath("/dashboard/banco/gestion");
    return { success: true };
  } catch (error) {
    console.error("Error toggling bank account status:", error);
    return { success: false, error: "Error al cambiar estado de la cuenta" };
  }
}

export async function getAccountingAccounts() {
  try {
    const accounts = await db.query.cuentasContables.findMany({
      where: eq(cuentasContables.activa, true),
      columns: {
        id: true,
        nombre: true,
        codigo: true,
        moneda: true,
      },
      orderBy: (cuentasContables, { asc }) => [asc(cuentasContables.codigo)],
    });
    // Original ordered by codigo asc
    // return { success: true, data: accounts.sort((a,b) => a.codigo.localeCompare(b.codigo)) };
    // Using Drizzle orderBy is slightly different, it takes array of expressions.
    // Let's correct the orderBy to use asc()

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching accounting accounts:", error);
    return { success: false, error: "Error al cargar cuentas contables" };
  }
}
