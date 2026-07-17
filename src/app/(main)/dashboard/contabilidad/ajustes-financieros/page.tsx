"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CirclePause, CirclePlay, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { notifyFinanzasDataChanged } from "@/lib/finanzas-sync";

type RulesResponse = {
  success: boolean;
  data?: {
    sourceDocument: string;
    version: string;
    goals: {
      targetSavingsRate: number;
      maxExpenseRatio: number;
      maxReceivablesOverdueRatio: number;
      maxDebtPressureRatio: number;
    };
  };
  error?: string;
};

type FixedExpense = {
  id: string;
  nombre: string;
  descripcion: string | null;
  monto: number;
  moneda: string;
  diaVencimiento: number;
  activo: boolean;
  observaciones: string | null;
  paidCurrentMonth: boolean;
  latestPayment: { fechaPago: string; montoPagado: number; metodoPago: string } | null;
  monthlyHistory: Array<{
    month: string;
    total: number;
    count: number;
    pagos: Array<{
      id: string;
      fechaPago: string;
      montoPagado: number;
      metodoPago: string;
      numeroReferencia?: string | null;
    }>;
  }>;
};

type FixedExpensesResponse = {
  success: boolean;
  data?: {
    fixedExpenses: FixedExpense[];
    monthlySummary: Array<{ month: string; totalProgramado: number; totalPagado: number; diferencia: number }>;
    recommendations: Array<{ title: string; detail: string; priority: "alta" | "media" | "baja" }>;
  };
  error?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 2 }).format(value);

export default function AjustesFinancierosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFixed, setSavingFixed] = useState(false);
  const [fixedData, setFixedData] = useState<FixedExpensesResponse["data"] | null>(null);
  const [selectedFixedId, setSelectedFixedId] = useState<string>("");
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    sourceDocument: "",
    version: "",
    targetSavingsRate: "20",
    maxExpenseRatio: "60",
    maxReceivablesOverdueRatio: "25",
    maxDebtPressureRatio: "120",
  });

  const [fixedForm, setFixedForm] = useState({
    nombre: "",
    monto: "",
    diaVencimiento: "",
    descripcion: "",
    observaciones: "",
  });

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/contabilidad/finanzas/reglas", { cache: "no-store" });
      const json: RulesResponse = await res.json();
      if (!json.success || !json.data) {
        toast.error(json.error ?? "No se pudieron cargar las reglas");
        return;
      }

      setForm({
        sourceDocument: json.data.sourceDocument,
        version: json.data.version,
        targetSavingsRate: String(json.data.goals.targetSavingsRate),
        maxExpenseRatio: String(json.data.goals.maxExpenseRatio),
        maxReceivablesOverdueRatio: String(json.data.goals.maxReceivablesOverdueRatio),
        maxDebtPressureRatio: String(json.data.goals.maxDebtPressureRatio),
      });
    } catch {
      toast.error("Error de conexion al cargar reglas");
    }
  }, []);

  const fetchFixedExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/contabilidad/gastos-fijos", { cache: "no-store" });
      const json: FixedExpensesResponse = await res.json();
      if (!json.success || !json.data) {
        toast.error(json.error ?? "No se pudieron cargar los gastos fijos");
        return;
      }
      setFixedData(json.data);
      if (!selectedFixedId && json.data.fixedExpenses.length > 0) {
        setSelectedFixedId(json.data.fixedExpenses[0].id);
      }
    } catch {
      toast.error("Error de conexion al cargar gastos fijos");
    }
  }, [selectedFixedId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRules(), fetchFixedExpenses()]);
      setLoading(false);
    };
    load();
  }, [fetchFixedExpenses, fetchRules]);

  const saveRules = async () => {
    setSaving(true);
    try {
      const payload = {
        sourceDocument: form.sourceDocument,
        version: form.version,
        goals: {
          targetSavingsRate: Number(form.targetSavingsRate),
          maxExpenseRatio: Number(form.maxExpenseRatio),
          maxReceivablesOverdueRatio: Number(form.maxReceivablesOverdueRatio),
          maxDebtPressureRatio: Number(form.maxDebtPressureRatio),
        },
      };

      const res = await fetch("/api/contabilidad/finanzas/reglas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: RulesResponse = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "No se pudieron guardar las reglas");
        return;
      }

      toast.success("Reglas financieras guardadas");
      notifyFinanzasDataChanged();
      fetchRules();
    } catch {
      toast.error("Error de conexion al guardar reglas");
    } finally {
      setSaving(false);
    }
  };

  const resetFixedForm = () => {
    setFixedForm({ nombre: "", monto: "", diaVencimiento: "", descripcion: "", observaciones: "" });
    setEditingFixedId(null);
  };

  const saveFixedExpense = async () => {
    if (!fixedForm.nombre || !fixedForm.monto || !fixedForm.diaVencimiento) {
      toast.error("Nombre, monto y dia de vencimiento son obligatorios");
      return;
    }

    setSavingFixed(true);
    try {
      const payload = {
        id: editingFixedId,
        nombre: fixedForm.nombre,
        monto: Number(fixedForm.monto),
        diaVencimiento: Number(fixedForm.diaVencimiento),
        descripcion: fixedForm.descripcion.trim() ? fixedForm.descripcion : null,
        observaciones: fixedForm.observaciones.trim() ? fixedForm.observaciones : null,
      };

      const res = await fetch("/api/contabilidad/gastos-fijos", {
        method: editingFixedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "No se pudo guardar el gasto fijo");
        return;
      }

      toast.success(editingFixedId ? "Gasto fijo actualizado" : "Gasto fijo creado");
      resetFixedForm();
      await fetchFixedExpenses();
      notifyFinanzasDataChanged();
    } catch {
      toast.error("Error de conexion al guardar gasto fijo");
    } finally {
      setSavingFixed(false);
    }
  };

  const deactivateFixedExpense = async (id: string) => {
    if (!confirm("¿Desactivar este gasto fijo?")) return;

    try {
      const res = await fetch(`/api/contabilidad/gastos-fijos?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "No se pudo desactivar");
        return;
      }
      toast.success("Gasto fijo desactivado");
      await fetchFixedExpenses();
      notifyFinanzasDataChanged();
    } catch {
      toast.error("Error de conexion al desactivar gasto fijo");
    }
  };

  const togglePauseFixedExpense = async (fixed: FixedExpense) => {
    const action = fixed.activo ? "pausar" : "reactivar";
    if (!confirm(`¿${action === "pausar" ? "Pausar" : "Reactivar"} este gasto fijo?`)) return;

    try {
      const res = await fetch(`/api/contabilidad/gastos-fijos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fixed.id,
          nombre: fixed.nombre,
          monto: fixed.monto,
          diaVencimiento: fixed.diaVencimiento,
          descripcion: fixed.descripcion,
          observaciones: fixed.observaciones,
          activo: !fixed.activo,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? `No se pudo ${action}`);
        return;
      }
      toast.success(action === "pausar" ? "Gasto fijo pausado" : "Gasto fijo reactivado");
      await fetchFixedExpenses();
      notifyFinanzasDataChanged();
    } catch {
      toast.error(`Error de conexion al ${action} gasto fijo`);
    }
  };

  const editFixedExpense = (fixed: FixedExpense) => {
    setEditingFixedId(fixed.id);
    setFixedForm({
      nombre: fixed.nombre,
      monto: String(fixed.monto),
      diaVencimiento: String(fixed.diaVencimiento),
      descripcion: fixed.descripcion ?? "",
      observaciones: fixed.observaciones ?? "",
    });
  };

  const trackedFixedExpenses = useMemo(() => {
    const matches = (fixedData?.fixedExpenses ?? []).filter((expense) => /claro|starlink/i.test(expense.nombre));
    return matches.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [fixedData]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes Financieros</h1>
        <p className="text-muted-foreground text-sm">
          Configura reglas, registra gastos fijos y lleva historial mensual de pagos conectado a Nuevo Gasto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documento base y metas</CardTitle>
          <CardDescription>Umbrales usados por el analisis de salud financiera.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre del documento</Label>
            <Input
              value={form.sourceDocument}
              onChange={(e) => setForm((prev) => ({ ...prev, sourceDocument: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Version</Label>
            <Input
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Ahorro objetivo (%)</Label>
            <Input
              inputMode="decimal"
              value={form.targetSavingsRate}
              onChange={(e) => setForm((prev) => ({ ...prev, targetSavingsRate: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Techo de gasto (%)</Label>
            <Input
              inputMode="decimal"
              value={form.maxExpenseRatio}
              onChange={(e) => setForm((prev) => ({ ...prev, maxExpenseRatio: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximo cartera vencida (%)</Label>
            <Input
              inputMode="decimal"
              value={form.maxReceivablesOverdueRatio}
              onChange={(e) => setForm((prev) => ({ ...prev, maxReceivablesOverdueRatio: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Maxima presion de deuda (%)</Label>
            <Input
              inputMode="decimal"
              value={form.maxDebtPressureRatio}
              onChange={(e) => setForm((prev) => ({ ...prev, maxDebtPressureRatio: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button onClick={saveRules} disabled={loading || saving}>
              <Save className="h-4 w-4" />
              Guardar reglas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingFixedId ? "Editar gasto fijo" : "Nuevo gasto fijo"}</CardTitle>
          <CardDescription>
            Estos gastos se pueden vincular directamente desde Ingresos y Gastos al registrar Nuevo Gasto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={fixedForm.nombre}
              onChange={(e) => setFixedForm((p) => ({ ...p, nombre: e.target.value }))}
              disabled={savingFixed}
            />
          </div>
          <div className="space-y-2">
            <Label>Monto mensual *</Label>
            <Input
              inputMode="decimal"
              value={fixedForm.monto}
              onChange={(e) => setFixedForm((p) => ({ ...p, monto: e.target.value }))}
              disabled={savingFixed}
            />
          </div>
          <div className="space-y-2">
            <Label>Dia de vencimiento *</Label>
            <Input
              inputMode="numeric"
              value={fixedForm.diaVencimiento}
              onChange={(e) => setFixedForm((p) => ({ ...p, diaVencimiento: e.target.value }))}
              disabled={savingFixed}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <Textarea
              rows={2}
              value={fixedForm.descripcion}
              onChange={(e) => setFixedForm((p) => ({ ...p, descripcion: e.target.value }))}
              disabled={savingFixed}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observaciones</Label>
            <Textarea
              rows={2}
              value={fixedForm.observaciones}
              onChange={(e) => setFixedForm((p) => ({ ...p, observaciones: e.target.value }))}
              disabled={savingFixed}
            />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            {editingFixedId ? (
              <Button variant="outline" onClick={resetFixedForm} disabled={savingFixed}>
                Cancelar Edicion
              </Button>
            ) : null}
            <Button onClick={saveFixedExpense} disabled={savingFixed}>
              <Plus className="h-4 w-4" />
              {editingFixedId ? "Guardar cambios" : "Agregar gasto fijo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Gastos fijos registrados</CardTitle>
            <CardDescription>Lista clara de los pagos recurrentes del mes y su estado actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto mensual</TableHead>
                    <TableHead className="text-right">Vence el día</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedData?.fixedExpenses && fixedData.fixedExpenses.length > 0 ? (
                    fixedData.fixedExpenses.map((fixed) => (
                      <TableRow key={fixed.id} className={fixed.id === selectedFixedId ? "bg-muted/40" : ""}>
                        <TableCell>
                          <button
                            className="text-left font-medium underline-offset-2 hover:underline"
                            onClick={() => setSelectedFixedId(fixed.id)}
                          >
                            {fixed.nombre}
                          </button>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {fixed.descripcion ?? "Sin descripción adicional"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(fixed.monto)}</TableCell>
                        <TableCell className="text-right">{fixed.diaVencimiento}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={fixed.paidCurrentMonth ? "secondary" : "destructive"}>
                            {fixed.paidCurrentMonth ? "Pagado este mes" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePauseFixedExpense(fixed)}
                              title={fixed.activo ? "Pausar gasto" : "Reactivar gasto"}
                            >
                              {fixed.activo ? <CirclePause className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => editFixedExpense(fixed)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deactivateFixedExpense(fixed.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center">
                        Aún no registras gastos fijos. Agrega uno para ver su seguimiento aquí.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qué mejorar</CardTitle>
            <CardDescription>
              Consejos claros para bajar costos o evitar atrasos en tus pagos recurrentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixedData?.recommendations && fixedData.recommendations.length > 0 ? (
              fixedData.recommendations.map((rec) => (
                <div key={`${rec.title}-${rec.priority}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{rec.title}</p>
                    <Badge
                      variant={
                        rec.priority === "alta" ? "destructive" : rec.priority === "media" ? "outline" : "secondary"
                      }
                    >
                      {rec.priority === "alta" ? "Alta prioridad" : rec.priority === "media" ? "Media" : "Baja"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{rec.detail}</p>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No hay recomendaciones por el momento. Cuando el sistema detecte tendencias, aparecerán aquí.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial mensual de pagos</CardTitle>
          <CardDescription>
            Lo que se ha pagado hasta ahora por las principales fuentes de ingreso: Claro Internet y Starlink Internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trackedFixedExpenses.length ? (
            <div className="space-y-4">
              <div className="bg-muted/20 rounded-lg border p-4">
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground text-xs">Fuentes principales</div>
                    <div className="text-lg font-semibold">{trackedFixedExpenses.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Pagos registrados</div>
                    <div className="text-lg font-semibold">
                      {trackedFixedExpenses.reduce(
                        (sum, fixed) => sum + fixed.monthlyHistory.reduce((inner, item) => inner + item.count, 0),
                        0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Total acumulado</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        trackedFixedExpenses.reduce(
                          (sum, fixed) => sum + fixed.monthlyHistory.reduce((inner, item) => inner + item.total, 0),
                          0,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Monto mensual</TableHead>
                      <TableHead className="text-right">Pagos</TableHead>
                      <TableHead className="text-right">Total pagado</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackedFixedExpenses.map((fixed) => {
                      const totalPayments = fixed.monthlyHistory.reduce((sum, item) => sum + item.count, 0);
                      const totalPaid = fixed.monthlyHistory.reduce((sum, item) => sum + item.total, 0);

                      return (
                        <TableRow key={fixed.id}>
                          <TableCell>
                            <div className="font-medium">{fixed.nombre}</div>
                            <div className="text-muted-foreground text-xs">
                              {fixed.descripcion ?? "Servicio recurrente"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(fixed.monto)}</TableCell>
                          <TableCell className="text-right">{totalPayments}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalPaid)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={fixed.activo ? "secondary" : "outline"}>
                              {fixed.activo ? "Activo" : "Pausado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-background overflow-hidden rounded-md border">
                <div className="bg-muted/40 border-b px-4 py-3 text-sm font-medium">Detalle mensual</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Claro Internet</TableHead>
                      <TableHead>Starlink Internet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const months = Array.from(
                        new Set(
                          trackedFixedExpenses.flatMap((fixed) => fixed.monthlyHistory.map((item) => item.month)),
                        ),
                      ).sort();

                      return months.map((month) => {
                        const claro = trackedFixedExpenses.find((fixed) =>
                          fixed.nombre.toLowerCase().includes("claro"),
                        );
                        const starlink = trackedFixedExpenses.find((fixed) =>
                          fixed.nombre.toLowerCase().includes("starlink"),
                        );
                        const claroMonth = claro?.monthlyHistory.find((item) => item.month === month);
                        const starlinkMonth = starlink?.monthlyHistory.find((item) => item.month === month);

                        return (
                          <TableRow key={month}>
                            <TableCell>{month}</TableCell>
                            <TableCell>
                              {claroMonth ? `${formatCurrency(claroMonth.total)} (${claroMonth.count})` : "—"}
                            </TableCell>
                            <TableCell>
                              {starlinkMonth ? `${formatCurrency(starlinkMonth.total)} (${starlinkMonth.count})` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              No hay información disponible para Claro Internet o Starlink Internet todavía.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
