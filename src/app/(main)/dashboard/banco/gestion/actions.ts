"use server";

import { db } from "@/lib/db";
import { banks, cuentasBancarias, cuentasContables } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bankSchema, bankAccountSchema } from "./schema";
import { z } from "zod";

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
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const [bank] = await db
      .insert(banks)
      .values({
        nombre: validation.data.nombre,
        codigo: validation.data.codigo,
        activo: validation.data.activo,
      })
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: bank };
  } catch (error) {
    console.error("Error creating bank:", error);
    return { success: false, error: "Error al crear el banco" };
  }
}

export async function updateBank(id: string, data: z.infer<typeof bankSchema>) {
  const validation = bankSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const [bank] = await db
      .update(banks)
      .set({
        nombre: validation.data.nombre,
        codigo: validation.data.codigo,
        activo: validation.data.activo,
      })
      .where(eq(banks.id, id))
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: bank };
  } catch (error) {
    console.error("Error updating bank:", error);
    return { success: false, error: "Error al actualizar el banco" };
  }
}

export async function toggleBankStatus(id: string, currentStatus: boolean) {
  try {
    await db.update(banks).set({ activo: !currentStatus }).where(eq(banks.id, id));

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
    console.log(validation.error);
    return { success: false, error: "Datos inválidos" };
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
      })
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error creating bank account:", error);
    return { success: false, error: "Error al crear la cuenta bancaria" };
  }
}

export async function updateBankAccount(id: string, data: z.infer<typeof bankAccountSchema>) {
  const validation = bankAccountSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Datos inválidos" };
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
      })
      .where(eq(cuentasBancarias.id, id))
      .returning();

    revalidatePath("/dashboard/banco/gestion");
    revalidatePath("/dashboard/banco");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error updating bank account:", error);
    return { success: false, error: "Error al actualizar la cuenta bancaria" };
  }
}

export async function toggleBankAccountStatus(id: string, currentStatus: boolean) {
  try {
    await db.update(cuentasBancarias).set({ activo: !currentStatus }).where(eq(cuentasBancarias.id, id));

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
