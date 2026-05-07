"use client";

import { useEffect, useMemo, useState } from "react";

import { Pencil, Plus, Save, Trash2 } from "lucide-react";
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

  const fetchRules = async () => {
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
  };

  const fetchFixedExpenses = async () => {
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
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRules(), fetchFixedExpenses()]);
      setLoading(false);
    };
    load();
  }, []);

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
        descripcion: fixedForm.descripcion || null,
        observaciones: fixedForm.observaciones || null,
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
    if (!confirm("\u00BFDesactivar este gasto fijo?")) return;

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

  const selectedFixed = useMemo(
    () => fixedData?.fixedExpenses.find((f) => f.id === selectedFixedId) ?? null,
    [fixedData, selectedFixedId],
  );

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
            <Input value={form.version} onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))} disabled={loading || saving} />
          </div>
          <div className="space-y-2">
            <Label>Ahorro objetivo (%)</Label>
            <Input inputMode="decimal" value={form.targetSavingsRate} onChange={(e) => setForm((prev) => ({ ...prev, targetSavingsRate: e.target.value }))} disabled={loading || saving} />
          </div>
          <div className="space-y-2">
            <Label>Techo de gasto (%)</Label>
            <Input inputMode="decimal" value={form.maxExpenseRatio} onChange={(e) => setForm((prev) => ({ ...prev, maxExpenseRatio: e.target.value }))} disabled={loading || saving} />
          </div>
          <div className="space-y-2">
            <Label>Maximo cartera vencida (%)</Label>
            <Input inputMode="decimal" value={form.maxReceivablesOverdueRatio} onChange={(e) => setForm((prev) => ({ ...prev, maxReceivablesOverdueRatio: e.target.value }))} disabled={loading || saving} />
          </div>
          <div className="space-y-2">
            <Label>Maxima presion de deuda (%)</Label>
            <Input inputMode="decimal" value={form.maxDebtPressureRatio} onChange={(e) => setForm((prev) => ({ ...prev, maxDebtPressureRatio: e.target.value }))} disabled={loading || saving} />
          </div>
          <div className="md:col-span-2 flex justify-end">
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
            <Input value={fixedForm.nombre} onChange={(e) => setFixedForm((p) => ({ ...p, nombre: e.target.value }))} disabled={savingFixed} />
          </div>
          <div className="space-y-2">
            <Label>Monto mensual *</Label>
            <Input inputMode="decimal" value={fixedForm.monto} onChange={(e) => setFixedForm((p) => ({ ...p, monto: e.target.value }))} disabled={savingFixed} />
          </div>
          <div className="space-y-2">
            <Label>Dia de vencimiento *</Label>
            <Input inputMode="numeric" value={fixedForm.diaVencimiento} onChange={(e) => setFixedForm((p) => ({ ...p, diaVencimiento: e.target.value }))} disabled={savingFixed} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <Textarea rows={2} value={fixedForm.descripcion} onChange={(e) => setFixedForm((p) => ({ ...p, descripcion: e.target.value }))} disabled={savingFixed} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observaciones</Label>
            <Textarea rows={2} value={fixedForm.observaciones} onChange={(e) => setFixedForm((p) => ({ ...p, observaciones: e.target.value }))} disabled={savingFixed} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingFixedId ? (
              <Button variant="outline" onClick={resetFixedForm} disabled={savingFixed}>Cancelar Edicion</Button>
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
            <CardDescription>Gestiona y analiza su cumplimiento mensual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Vence</TableHead>
                    <TableHead className="text-right">Estado Mes</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedData?.fixedExpenses?.length ? (
                    fixedData.fixedExpenses.map((fixed) => (
                      <TableRow key={fixed.id} className={fixed.id === selectedFixedId ? "bg-muted/40" : ""}>
                        <TableCell>
                          <button className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setSelectedFixedId(fixed.id)}>
                            {fixed.nombre}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(fixed.monto)}</TableCell>
                        <TableCell className="text-right">Dia {fixed.diaVencimiento}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={fixed.paidCurrentMonth ? "secondary" : "destructive"}>
                            {fixed.paidCurrentMonth ? "Pagado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                      <TableCell colSpan={5} className="text-muted-foreground text-center">No hay gastos fijos registrados.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Que mejorar</CardTitle>
            <CardDescription>Recomendaciones autom\u00e1ticas por tus gastos fijos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixedData?.recommendations?.map((rec, idx) => (
              <div key={`${rec.title}-${idx}`} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{rec.title}</p>
                  <Badge variant={rec.priority === "alta" ? "destructive" : rec.priority === "media" ? "outline" : "secondary"}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{rec.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial mensual de pagos</CardTitle>
          <CardDescription>
            {selectedFixed ? `Detalle de ${selectedFixed.nombre}` : "Selecciona un gasto fijo para ver historial"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedFixed ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Pagos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFixed.monthlyHistory.map((h) => (
                      <TableRow key={h.month}>
                        <TableCell>{h.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(h.total)}</TableCell>
                        <TableCell className="text-right">{h.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Metodo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFixed.monthlyHistory.flatMap((h) => h.pagos).length ? (
                      selectedFixed.monthlyHistory
                        .flatMap((h) => h.pagos)
                        .slice(0, 20)
                        .map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.fechaPago}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.montoPagado)}</TableCell>
                            <TableCell className="text-right capitalize">{p.metodoPago}</TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground text-center">Sin pagos registrados en el periodo.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay gasto fijo seleccionado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
