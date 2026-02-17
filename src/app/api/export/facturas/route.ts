import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { facturasClientes, clientes } from "@/lib/db/schema";
import { exportToExcel, formatDateForExcel, formatCurrencyForExcel, type ExportColumn } from "@/lib/export/excel";

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      // Fetch all invoices with client information
      const allInvoices = await db
        .select({
          numeroFactura: facturasClientes.numeroFactura,
          fechaFactura: facturasClientes.fechaFactura,
          fechaVencimiento: facturasClientes.fechaVencimiento,
          clienteNombre: clientes.nombre,
          clienteApellidos: clientes.apellidos,
          subtotal: facturasClientes.subtotal,
          itbis: facturasClientes.itbis,
          total: facturasClientes.total,
          estado: facturasClientes.estado,
          tipoPago: facturasClientes.tipoPago,
          notas: facturasClientes.notas,
        })
        .from(facturasClientes)
        .leftJoin(clientes, eq(facturasClientes.clienteId, clientes.id));

      // Define columns for export
      const columns: ExportColumn[] = [
        { key: "numeroFactura", header: "No. Factura", width: 15 },
        {
          key: "fechaFactura",
          header: "Fecha",
          width: 12,
          format: formatDateForExcel,
        },
        {
          key: "fechaVencimiento",
          header: "Vencimiento",
          width: 12,
          format: formatDateForExcel,
        },
        { key: "clienteNombre", header: "Cliente Nombre", width: 20 },
        { key: "clienteApellidos", header: "Cliente Apellidos", width: 20 },
        {
          key: "subtotal",
          header: "Subtotal",
          width: 12,
          format: formatCurrencyForExcel,
        },
        {
          key: "itbis",
          header: "ITBIS",
          width: 12,
          format: formatCurrencyForExcel,
        },
        {
          key: "total",
          header: "Total",
          width: 12,
          format: formatCurrencyForExcel,
        },
        { key: "estado", header: "Estado", width: 12 },
        { key: "tipoPago", header: "Tipo Pago", width: 12 },
        { key: "notas", header: "Notas", width: 30 },
      ];

      // Export to Excel
      const excelBuffer = exportToExcel(allInvoices, columns, {
        filename: "facturas.xlsx",
        sheetName: "Facturas",
      });

      // Return file
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="facturas_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } catch (error: any) {
      console.error("Error exporting invoices:", error);
      return NextResponse.json({ success: false, error: "Error al exportar facturas" }, { status: 500 });
    }
  },
  { requiredPermission: "facturas:leer" },
);
