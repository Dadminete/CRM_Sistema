import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import {
  exportToExcel,
  formatDateForExcel,
  formatCurrencyForExcel,
  formatBooleanForExcel,
  type ExportColumn,
} from "@/lib/export/excel";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // Fetch all clients
      const allClients = await db.select().from(clientes);

      // Define columns for export
      const columns: ExportColumn[] = [
        { key: "codigoCliente", header: "Código", width: 12 },
        { key: "tipoDocumento", header: "Tipo Doc", width: 12 },
        { key: "numeroDocumento", header: "Documento", width: 15 },
        { key: "nombre", header: "Nombre", width: 20 },
        { key: "apellidos", header: "Apellidos", width: 20 },
        { key: "email", header: "Email", width: 25 },
        { key: "telefono", header: "Teléfono", width: 15 },
        { key: "categoriaCliente", header: "Categoría", width: 12 },
        { key: "direccion", header: "Dirección", width: 30 },
        { key: "ciudad", header: "Ciudad", width: 15 },
        { key: "provincia", header: "Provincia", width: 15 },
        {
          key: "limiteCredito",
          header: "Límite Crédito",
          width: 15,
          format: formatCurrencyForExcel,
        },
        { key: "diasCredito", header: "Días Crédito", width: 12 },
        {
          key: "activo",
          header: "Activo",
          width: 10,
          format: formatBooleanForExcel,
        },
        {
          key: "createdAt",
          header: "Fecha Creación",
          width: 15,
          format: formatDateForExcel,
        },
      ];

      // Export to Excel
      const excelBuffer = exportToExcel(allClients, columns, {
        filename: "clientes.xlsx",
        sheetName: "Clientes",
      });

      // Return file
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="clientes_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } catch (error: any) {
      console.error("Error exporting clients:", error);
      return NextResponse.json({ success: false, error: "Error al exportar clientes" }, { status: 500 });
    }
  },
  { requiredPermission: "clientes:leer" },
);
