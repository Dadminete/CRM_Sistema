import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { productosPapeleria } from "@/lib/db/schema";
import { exportToExcel, formatCurrencyForExcel, formatBooleanForExcel, type ExportColumn } from "@/lib/export/excel";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // Fetch all products
      const allProducts = await db.select().from(productosPapeleria);

      // Define columns for export
      const columns: ExportColumn[] = [
        { key: "codigo", header: "Código", width: 12 },
        { key: "nombre", header: "Nombre", width: 25 },
        { key: "descripcion", header: "Descripción", width: 35 },
        { key: "categoria", header: "Categoría", width: 15 },
        { key: "marca", header: "Marca", width: 15 },
        { key: "unidadMedida", header: "Unidad", width: 10 },
        {
          key: "precioCompra",
          header: "Precio Compra",
          width: 13,
          format: formatCurrencyForExcel,
        },
        {
          key: "precioVenta",
          header: "Precio Venta",
          width: 13,
          format: formatCurrencyForExcel,
        },
        { key: "stockActual", header: "Stock Actual", width: 12 },
        { key: "stockMinimo", header: "Stock Mínimo", width: 12 },
        { key: "stockMaximo", header: "Stock Máximo", width: 12 },
        {
          key: "activo",
          header: "Activo",
          width: 10,
          format: formatBooleanForExcel,
        },
        { key: "ubicacion", header: "Ubicación", width: 15 },
      ];

      // Export to Excel
      const excelBuffer = exportToExcel(allProducts, columns, {
        filename: "productos.xlsx",
        sheetName: "Productos",
      });

      // Return file
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="productos_papeleria_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } catch (error: any) {
      console.error("Error exporting products:", error);
      return NextResponse.json({ success: false, error: "Error al exportar productos" }, { status: 500 });
    }
  },
  { requiredPermission: "productos:leer" },
);
