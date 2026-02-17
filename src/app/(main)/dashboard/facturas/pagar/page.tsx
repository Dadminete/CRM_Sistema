"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Receipt,
  User,
  DollarSign,
  CreditCard,
  Landmark,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const USUARIO_ID = "df4b1335-5ff6-4703-8dcd-3e2f74fb0822"; // Valid user ID from DB

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" });

export default function PagarFacturaPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [lookup, setLookup] = useState<any>({ bancos: [], cuentasBancarias: [], cajas: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Form state
  const [selectedFacturaId, setSelectedFacturaId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [bankId, setBankId] = useState("");
  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resPend, resLookup, resSession] = await Promise.all([
        fetch("/api/facturas/pendientes"),
        fetch("/api/contabilidad/lookup"),
        fetch(`/api/cajas/sesiones?usuarioId=${USUARIO_ID}`),
      ]);

      const [dataPend, dataLookup, dataSession] = await Promise.all([
        resPend.json(),
        resLookup.json(),
        resSession.json(),
      ]);

      if (dataPend.success) setPendientes(dataPend.data);
      if (dataLookup.success) setLookup(dataLookup.data);
      if (dataSession.success) {
        setActiveSession(dataSession.activeSession);
        if (dataSession.activeSession) {
          setCajaId(dataSession.activeSession.cajaId);
        }
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedFactura = pendientes.find((f) => f.id === selectedFacturaId);

  useEffect(() => {
    if (selectedFactura) {
      setMonto(selectedFactura.montoPendiente);
    }
  }, [selectedFactura]);

  const filteredFacturas = pendientes.filter(
    (f) =>
      f.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clienteApellidos.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleProcessPayment = async () => {
    if (!selectedFacturaId || !monto || !metodoPago) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    if (metodoPago === "efectivo" && !activeSession) {
      toast.error("Debe abrir una caja antes de procesar pagos en efectivo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/facturas/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaId: selectedFacturaId,
          clienteId: selectedFactura.clienteId,
          monto,
          metodoPago,
          numeroReferencia: referencia,
          cajaId: metodoPago === "efectivo" ? cajaId : null,
          cuentaBancariaId: metodoPago !== "efectivo" ? cuentaBancariaId : null,
          observaciones,
          usuarioId: USUARIO_ID,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pago procesado correctamente");
        setSelectedFacturaId("");
        setMonto("");
        setReferencia("");
        setObservaciones("");
        fetchData();
      } else {
        toast.error(data.error || "Error al procesar pago");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground animate-pulse p-12 text-center">Cargando módulo de cobros...</div>;
  }

  if (!activeSession) {
    return (
      <div className="animate-in fade-in flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center duration-500">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
          <Landmark className="h-12 w-12 text-amber-600" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Caja Principal Cerrada</h1>
          <p className="leading-relaxed font-medium text-slate-500">
            Para procesar cobros y pagos, es necesario realizar primero la apertura de caja. Todos los movimientos deben
            quedar registrados en una sesión activa.
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 bg-emerald-600 font-bold tracking-wider text-white uppercase shadow-lg hover:bg-emerald-700"
          onClick={() => (window.location.href = "/dashboard/cajas-chicas/apertura-cierre")}
        >
          <Wallet className="h-5 w-5" />
          Ir a Apertura de Caja
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in bg-background mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6 duration-500">
      {/* Header: Consistent with App Style */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Receipt className="text-primary h-8 w-8" />
              Registro de Pago
            </h1>
            <p className="text-muted-foreground mt-1">Cobro de facturas y abonos a cuentas por cobrar.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <div className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
            Sesión Activa: {activeSession.cajaNombre || "Caja Principal"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Invoice Selection & Search */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border shadow-sm">
            <CardHeader className="border-b p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Search className="text-primary h-4 w-4" /> Facturas Pendientes
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {pendientes.length} FACTURAS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-6">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por cliente o nº factura..."
                  className="h-10 bg-slate-50/50 pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2">
                {filteredFacturas.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFacturaId(f.id)}
                    className={cn(
                      "group flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all",
                      selectedFacturaId === f.id
                        ? "border-primary bg-primary/5 ring-primary ring-1"
                        : "border-slate-100 bg-white hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="text-primary text-[10px] font-black tracking-tighter uppercase">
                          {f.numeroFactura}
                        </div>
                        <div className="text-sm leading-tight font-bold text-slate-800">
                          {f.clienteNombre} {f.clienteApellidos}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="h-4 border-slate-200 px-2 py-0 text-[9px] font-black uppercase"
                      >
                        {f.estado}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-end justify-between">
                      <div className="text-muted-foreground flex items-center gap-1 text-[9px] font-medium uppercase">
                        <FileText className="h-3 w-3" /> {formatDate(f.fechaFactura)}
                      </div>
                      <div className="text-base font-black text-slate-900">{formatCurrency(f.montoPendiente)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedFactura && (
            <Card className="animate-in slide-in-from-bottom-2 border border-slate-200 shadow-sm duration-300">
              <CardHeader className="border-b bg-slate-50/30 px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <DollarSign className="text-primary h-4 w-4" /> Detalles del Cobro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        Monto a Pagar
                      </Label>
                      <div className="relative">
                        <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="number"
                          className="h-12 pl-8 text-xl font-bold"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        Método
                      </Label>
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        {metodoPago === "efectivo" ? "Caja Responsable" : "Cuenta de Depósito"}
                      </Label>
                      {metodoPago === "efectivo" ? (
                        <Input
                          disabled
                          value={activeSession?.cajaNombre || "Caja Principal"}
                          className="h-10 bg-slate-50 text-xs font-bold"
                        />
                      ) : (
                        <Select value={cuentaBancariaId} onValueChange={setCuentaBancariaId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Seleccionar cuenta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lookup.cuentasBancarias.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.numeroCuenta} - {c.bankNombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        Referencia
                      </Label>
                      <Input
                        placeholder="Nº de comprobante o depósito"
                        className="h-10"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                    Observaciones
                  </Label>
                  <Textarea
                    placeholder="Comentario adicional..."
                    className="min-h-[80px] bg-slate-50/20"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="overflow-hidden border shadow-md">
            <CardHeader className="bg-slate-900 px-5 py-4 text-white">
              <CardTitle className="flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                <Info className="h-3.5 w-3.5" /> Confirmación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {selectedFactura ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="ml-2 max-w-[150px] truncate font-bold text-slate-700">
                        {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(selectedFactura.montoPendiente)}
                      </span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs font-black tracking-tighter text-slate-800 uppercase">
                        Total a Recibir:
                      </span>
                      <span className="text-primary text-xl font-black">{formatCurrency(monto || 0)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleProcessPayment}
                    disabled={isSubmitting || Number(monto || 0) <= 0}
                    className="h-11 w-full text-xs font-black tracking-wider uppercase shadow-md"
                  >
                    {isSubmitting ? "Procesando..." : "Confirmar Recibo"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3 py-10 text-center opacity-40">
                  <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="text-[10px] font-black text-slate-500 uppercase">Seleccione una Factura</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-amber-700 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" /> Auditoría
            </div>
            <p className="text-[9px] leading-relaxed font-medium text-amber-700">
              Toda transacción es registrada con sello de tiempo y vinculada al usuario y sesión de caja activa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon for the bottom card
function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
