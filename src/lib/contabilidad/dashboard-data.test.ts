import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  categoriasCuentas: { id: "categoria-id", codigo: "codigo" },
}));

import { GET } from "../../app/api/contabilidad/dashboard/route";

import * as dashboardDataModule from "./dashboard-data";
import { buildAccountingDashboardMetrics, getAccountingDashboardData } from "./dashboard-data";

describe("buildAccountingDashboardMetrics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "category-1" }],
        }),
      }),
    }));
    mockDb.execute.mockResolvedValue({ rows: [] });
  });

  it("calculates totals and balances from cajas, banks and movements", () => {
    const data = buildAccountingDashboardMetrics({
      periodLabel: "Mes actual",
      movements: [
        {
          id: "1",
          tipo: "ingreso",
          monto: 1000,
          descripcion: "Venta",
          fecha: "2026-07-01T00:00:00.000Z",
          origen: "Caja Principal",
          origenTipo: "caja",
          categoria: "Ventas",
          metodo: "efectivo",
        },
        {
          id: "2",
          tipo: "gasto",
          monto: 250,
          descripcion: "Servicio",
          fecha: "2026-07-02T00:00:00.000Z",
          origen: "Banco",
          origenTipo: "banco",
          categoria: "Servicios",
          metodo: "transferencia",
        },
      ],
      cajas: [
        {
          id: "c1",
          nombre: "Caja Principal",
          tipo: "efectivo",
          saldoActual: 1500,
          ingresosMes: 1000,
          gastosMes: 250,
          movimientos: 2,
        },
      ],
      cuentasBancarias: [
        {
          id: "b1",
          nombre: "Cuenta corriente",
          banco: "Banco Popular",
          numeroCuenta: "123",
          saldoActual: 5000,
          ingresosMes: 1000,
          gastosMes: 250,
          movimientos: 2,
        },
      ],
    });

    expect(data.periodSummary.ingresos).toBe(1000);
    expect(data.periodSummary.gastos).toBe(250);
    expect(data.periodSummary.balance).toBe(750);
    expect(data.periodSummary.cajasSaldo).toBe(1500);
    expect(data.periodSummary.bancosSaldo).toBe(5000);
    expect(data.recentMovements).toHaveLength(2);
  });

  it("returns a safe empty dashboard when the database throws", async () => {
    mockDb.select.mockRejectedValue(new Error("database down"));

    const data = await getAccountingDashboardData();

    expect(data.periodSummary.movimientos).toBe(0);
    expect(data.periodSummary.cajasSaldo).toBe(0);
    expect(data.periodSummary.bancosSaldo).toBe(0);
    expect(data.cajas).toEqual([]);
    expect(data.cuentasBancarias).toEqual([]);
  });

  it("uses historical movement totals for bank balances, matching the CRM overview", async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "category-1" }],
        }),
      }),
    }));
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: "c1",
            nombre: "Caja Principal",
            tipo: "efectivo",
            saldo_inicial: "100",
            saldo_actual: "1400",
            ingresos_mes: "50",
            gastos_mes: "10",
            movimientos: "2",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "b1",
            numero_cuenta: "123",
            banco: "Banco Popular",
            tipo_cuenta: "corriente",
            saldo_inicial: "200",
            saldo_actual: "999",
            ingresos_total: "500",
            gastos_total: "100",
            ingresos_mes: "75",
            gastos_mes: "25",
            movimientos: "3",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const data = await getAccountingDashboardData();

    expect(data.cajas[0].saldoActual).toBe(1400);
    expect(data.cuentasBancarias[0].saldoActual).toBe(600);
    expect(data.periodSummary.cajasSaldo).toBe(1400);
    expect(data.periodSummary.bancosSaldo).toBe(600);
  });

  it("returns a fallback payload with diagnostics when the dashboard data layer fails", async () => {
    vi.spyOn(dashboardDataModule, "getAccountingDashboardData").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED"),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.recentMovements).toEqual([]);
    expect(body.diagnostics?.kind).toBe("connection");
    expect(body.diagnostics?.message).toContain("Sin datos disponibles");
  });
});
