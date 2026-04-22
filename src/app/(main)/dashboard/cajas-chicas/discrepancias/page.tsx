"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  Search,
  ExternalLink,
  Calculator,
  Save,
  X,
  History as HistoryIcon,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";

export default function DiscrepanciasPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarioId, setUsuarioId] = useState<string>("");

  // Modal states
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  // Movements state for detail
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);

  // Resolution form state
  const [categories, setCategories] = useState<any[]>([]);
  const [resolutionForm, setResolutionForm] = useState({
    monto: "",
    tipo: "",
    categoriaId: "",
    metodo: "efectivo",
    descripcion: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchCategories();

    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.profile?.id) {
          setUsuarioId(res.data.profile.id);
        }
      })
      .catch(console.error);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cajas/sesiones/history");
      const data = await res.json();
      if (data.success) {
        // Filter sessions with discrepancies (closed and with difference)
        // Also show ones that were marked as resolved in observations but still have diff
        const discrepant = data.data.filter((s: any) => {
          if (s.estado !== "cerrada" || !s.montoCierre) return false;
          const expected = parseFloat(s.montoApertura) + parseFloat(s.totalIngresos) - parseFloat(s.totalGastos);
          const actual = parseFloat(s.montoCierre);
          const hasDiff = Math.abs(expected - actual) > 0.01;
          const alreadyResolved = s.observaciones?.includes("[RESOLUCIÓN:");
          return hasDiff && !alreadyResolved;
        });
        setSessions(discrepant);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Error al cargar las sesiones");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/contabilidad/lookup");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categorias);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const viewDetail = async (session: any) => {
    setSelectedSession(session);
    setIsDetailOpen(true);
    setLoadingMoves(true);
    try {
      const res = await fetch(
        `/api/cajas/sesiones/movements?cajaId=${session.cajaId}&from=${encodeURIComponent(session.fechaApertura)}${session.fechaCierre ? `&to=${encodeURIComponent(session.fechaCierre)}` : ""}`,
      );
      const data = await res.json();
      if (data.success) {
        setMovements(data.data);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast.error("Error al cargar movimientos");
    } finally {
      setLoadingMoves(false);
    }
  };

  const openResolve = (session: any) => {
    const expected =
      parseFloat(session.montoApertura) + parseFloat(session.totalIngresos) - parseFloat(session.totalGastos);
    const actual = parseFloat(session.montoCierre);
    const diff = actual - expected;
    const isShortage = diff < 0;

    setSelectedSession(session);
    setResolutionForm({
      monto: Math.abs(diff).toString(),
      tipo: isShortage ? "gasto" : "ingreso", // If shortage, record a gasto to balance or vice versa?
      // Actually, if we have a shortage, we need to record a 'gasto' to account for missing money
      // if we have a surplus, we record an 'ingreso' to account for extra money.
      categoriaId: "",
      metodo: "efectivo",
      descripcion: `Ajuste por ${isShortage ? "faltante" : "sobrante"} en cierre de sesión ${session.id.substring(0, 8)}`,
    });
    setIsResolveOpen(true);
  };

  const handleResolve = async () => {
    if (!resolutionForm.categoriaId) {
      toast.error("Seleccione una categoría para el ajuste");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cajas/sesiones/discrepancias/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          ...resolutionForm,
          usuarioId: usuarioId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Discrepancia resuelta exitosamente");
        setIsResolveOpen(false);
        fetchSessions();
      } else {
        toast.error(data.error || "Error al resolver");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.cajaNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usuarioNombre?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ... (imports remain the same as previous)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-500 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Resolución de Discrepancias</h1>
        <p className="text-muted-foreground">Auditoría y resolución de descuadres financieros en cierres de caja.</p>
      </div>

      <div className="bg-card flex items-center gap-4 rounded-xl border p-4 shadow-sm">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
          <Input
            placeholder="Buscar por caja o usuario..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="h-9 px-4 font-medium tracking-wider uppercase">
            {filteredSessions.length} Pendientes
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCcw className={cn("text-primary mr-2 h-4 w-4", loading && "animate-spin")} />
            Sincronizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-32 animate-pulse border-slate-100 bg-slate-50/50" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200 bg-slate-50/30">
            <CardContent className="flex flex-col items-center gap-3 py-24 text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-800">¡Todo en Orden!</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed font-medium text-slate-500">
                No hay discrepancias críticas pendientes de resolución. El sistema está cuadrado perfectamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => {
            const expected =
              parseFloat(session.montoApertura) + parseFloat(session.totalIngresos) - parseFloat(session.totalGastos);
            const actual = parseFloat(session.montoCierre);
            const diff = actual - expected;
            const isShortage = diff < 0;

            return (
              <Card key={session.id} className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
                <div className={cn("h-1 w-full", isShortage ? "bg-destructive/80" : "bg-emerald-500/80")} />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("rounded-lg p-2", isShortage ? "bg-rose-100/50" : "bg-amber-100/50")}>
                        <Wallet className={cn("h-5 w-5", isShortage ? "text-rose-600" : "text-amber-600")} />
                      </div>
                      <CardTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        {session.cajaNombre}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2 font-bold text-slate-400">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase">
                        {session.usuarioNombre}
                      </span>
                      <span>•</span>
                      <span className="text-[11px]">
                        {format(new Date(session.fechaApertura), "PPP p", { locale: es })}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={isShortage ? "destructive" : "default"} className="font-bold tracking-tight">
                      {isShortage ? "FALTANTE CRÍTICO" : "SOBRANTE DETECTADO"}
                    </Badge>
                    <span className="text-muted-foreground font-mono text-xs">ID: {session.id.substring(0, 8)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 border-t py-4 md:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm font-medium">Esperado en Sistema</p>
                      <p className="text-foreground text-2xl font-bold tabular-nums">{formatCurrency(expected)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm font-medium">Declarado en Cierre</p>
                      <p className="text-foreground text-2xl font-bold tabular-nums">{formatCurrency(actual)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm font-medium">Diferencia Total</p>
                      <p
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          isShortage ? "text-destructive" : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(diff)}
                      </p>
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-medium"
                        onClick={() => viewDetail(session)}
                      >
                        <Info className="text-muted-foreground mr-2 h-4 w-4" />
                        Auditar Detalles
                      </Button>
                      <Button size="sm" className="w-full font-medium" onClick={() => openResolve(session)}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Resolver Ahora
                      </Button>
                    </div>
                  </div>
                  {session.observaciones && (
                    <div className="bg-muted/30 text-muted-foreground mt-4 flex items-start gap-3 rounded-lg p-3 text-sm">
                      <AlertCircle className="text-muted-foreground/50 mt-0.5 h-5 w-5 shrink-0" />
                      <span>{session.observaciones}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col p-0">
          <DialogHeader className="shrink-0 border-b p-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Auditoría Interna</Badge>
                <span className="text-muted-foreground ml-auto text-sm">
                  Sesión #{selectedSession?.id.substring(0, 8)}
                </span>
              </div>
              <DialogTitle className="text-xl">{selectedSession?.cajaNombre}</DialogTitle>
              <DialogDescription>
                {selectedSession && format(new Date(selectedSession.fechaApertura), "PPP", { locale: es })}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 shrink-0 overflow-auto p-6">
            {loadingMoves ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                <RefreshCcw className="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
                <p>Cargando libro diario...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <X className="h-5 w-5 opacity-50" />
                </div>
                <p>No se encontraron movimientos registrados</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Hora</TableHead>
                      <TableHead>Flujo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((move) => (
                      <TableRow key={move.id}>
                        <TableCell className="font-mono text-xs">{format(new Date(move.fecha), "HH:mm:ss")}</TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-medium",
                              move.tipo === "ingreso" ? "text-emerald-600" : "text-destructive",
                            )}
                          >
                            {move.tipo === "ingreso" ? (
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                            )}
                            <span className="capitalize">{move.tipo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{move.categoriaNombre}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate text-xs">
                          {move.descripcion}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-muted-foreground text-[10px] font-normal uppercase">
                            {move.metodo}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-sm font-medium tabular-nums",
                            move.tipo === "ingreso" ? "text-emerald-600" : "text-destructive",
                          )}
                        >
                          {move.tipo === "ingreso" ? "+" : "-"}
                          {formatCurrency(move.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t p-6">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolution Modal */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b p-6">
            <div className="space-y-1">
              <Badge variant="outline" className="w-fit">
                Corrección Contable
              </Badge>
              <DialogTitle>Ajuste de Balance</DialogTitle>
              <DialogDescription>Registrar ingreso o gasto compensatorio</DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <Label className="text-muted-foreground mb-2 block text-xs tracking-wider uppercase">
                  Monto Ajuste
                </Label>
                <div className="text-2xl font-bold tabular-nums">{formatCurrency(Number(resolutionForm.monto))}</div>
              </div>
              <div className="flex flex-col justify-center rounded-lg border bg-slate-50 p-4">
                <Label className="text-muted-foreground mb-2 block text-xs tracking-wider uppercase">Tipo Mov.</Label>
                <Badge
                  variant={resolutionForm.tipo === "ingreso" ? "default" : "destructive"}
                  className="w-fit capitalize"
                >
                  {resolutionForm.tipo}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoría del Ajuste</Label>
                <Select
                  value={resolutionForm.categoriaId}
                  onValueChange={(val) => setResolutionForm((prev) => ({ ...prev, categoriaId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione concepto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.tipo.toLowerCase() === resolutionForm.tipo.toLowerCase())
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} <span className="text-muted-foreground ml-2 text-xs">({c.codigo})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Justificación de Auditoría</Label>
                <Textarea
                  rows={3}
                  placeholder="Describa el origen de la discrepancia..."
                  value={resolutionForm.descripcion}
                  onChange={(e) => setResolutionForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t p-6">
            <Button variant="outline" onClick={() => setIsResolveOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={resolutionForm.tipo === "ingreso" ? "default" : "destructive"}
              onClick={handleResolve}
              disabled={isSubmitting}
            >
              {isSubmitting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Guardando..." : "Registrar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
