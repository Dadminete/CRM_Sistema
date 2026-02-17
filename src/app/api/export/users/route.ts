import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { exportToExcel, formatDateTimeForExcel, formatBooleanForExcel, type ExportColumn } from "@/lib/export/excel";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // Fetch all users
      const allUsers = await db.select().from(usuarios);

      // Define columns for export
      const columns: ExportColumn[] = [
        { key: "username", header: "Usuario", width: 15 },
        { key: "nombre", header: "Nombre", width: 20 },
        { key: "apellido", header: "Apellido", width: 20 },
        { key: "email", header: "Email", width: 25 },
        { key: "telefono", header: "Teléfono", width: 15 },
        {
          key: "activo",
          header: "Activo",
          width: 10,
          format: formatBooleanForExcel,
        },
        {
          key: "createdAt",
          header: "Fecha Creación",
          width: 18,
          format: formatDateTimeForExcel,
        },
        {
          key: "ultimoAcceso",
          header: "Último Acceso",
          width: 18,
          format: formatDateTimeForExcel,
        },
      ];

      // Export to Excel
      const excelBuffer = exportToExcel(allUsers, columns, {
        filename: "usuarios.xlsx",
        sheetName: "Usuarios",
      });

      // Return file
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="usuarios_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } catch (error: any) {
      console.error("Error exporting users:", error);
      return NextResponse.json({ success: false, error: "Error al exportar usuarios" }, { status: 500 });
    }
  },
  { requiredPermission: "usuarios:leer" },
);
