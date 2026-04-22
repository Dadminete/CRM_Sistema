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
import { toast } from "sonner";

import { CajaManagementModal } from "@/components/cajas/caja-management-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string>("");

  // Form state
  const [selectedFacturaId, setSelectedFacturaId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [monto, setMonto] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [bankId, setBankId] = useState("");
  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First fetch the profile to get the logged in user ID
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      const currentUserId = profileData?.data?.profile?.id || "";
      setUsuarioId(currentUserId);

      const [resPend, resLookup, resSession] = await Promise.all([
        fetch("/api/facturas/pendientes"),
        fetch("/api/contabilidad/lookup"),
        currentUserId
          ? fetch(`/api/cajas/sesiones?usuarioId=${currentUserId}`)
          : Promise.resolve({ json: () => ({ success: false }) } as unknown as Response),
      ]);

      const [dataPend, dataLookup, dataSession] = await Promise.all([
        resPend.json(),
        resLookup.json(),
        resSession.json(),
      ]);

      if (dataPend.success) setPendientes(dataPend.data);
      let initialCajaId = "";

      if (dataLookup.success) {
        setLookup(dataLookup.data);
        // Default to "Caja Principal" if it exists in the boxes list
        const principal = dataLookup.data.cajas.find((c: any) => c.nombre.toLowerCase().includes("principal"));
        if (principal) {
          initialCajaId = principal.id;
        }
      }

      if (dataSession.success) {
        setActiveSession(dataSession.activeSession);
        // Use active session cajaId if no principal was found
        if (dataSession.activeSession && !initialCajaId) {
          initialCajaId = dataSession.activeSession.cajaId;
        }
      }

      if (initialCajaId) {
        setCajaId(initialCajaId);
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
  const balancePendiente = Number(selectedFactura?.montoPendiente ?? 0);
  const totalFactura = Number(selectedFactura?.total ?? 0);
  const montoPagadoAdelantado = Math.max(0, totalFactura - balancePendiente);
  const esPagoAdelantado = selectedFactura?.estado === "adelantado";
  const montoNumerico = Number(monto || 0);
  const descuentoNumerico = Number(descuento || 0);
  const totalAplicado = montoNumerico + descuentoNumerico;

  useEffect(() => {
    if (selectedFactura) {
      // Always use montoPendiente for partial payments, not total
      const montoPendienteValue = String(selectedFactura.montoPendiente || 0);
      setMonto(montoPendienteValue);
      setDescuento("0");
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

    if (descuentoNumerico < 0) {
      toast.error("El descuento no puede ser negativo.");
      return;
    }

    if (totalAplicado > balancePendiente) {
      toast.error("El total aplicado (monto + descuento) no puede superar el balance pendiente.");
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
          descuento,
          metodoPago,
          numeroReferencia: referencia,
          cajaId: metodoPago === "efectivo" ? cajaId : null,
          cuentaBancariaId: metodoPago !== "efectivo" ? cuentaBancariaId : null,
          observaciones,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pago procesado correctamente");
        setSelectedFacturaId("");
        setMonto("");
        setDescuento("0");
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
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="gap-2 bg-emerald-600 font-bold tracking-wider text-white uppercase shadow-lg hover:bg-emerald-700"
            onClick={() => setIsCajaModalOpen(true)}
          >
            <Wallet className="h-5 w-5" />
            Abrir Caja Ahora
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground text-[10px] font-black tracking-widest uppercase"
            onClick={() => (window.location.href = "/dashboard/cajas-chicas/apertura-cierre")}
          >
            Ir a Gestión Avanzada
          </Button>
        </div>

        <CajaManagementModal
          isOpen={isCajaModalOpen}
          onOpenChange={setIsCajaModalOpen}
          usuarioId={usuarioId}
          onSuccess={fetchData}
        />
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
        <div
          onClick={() => setIsCajaModalOpen(true)}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 transition-colors hover:bg-emerald-100"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <div className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
            Sesión Activa: {activeSession.cajaNombre || "Caja Principal"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Invoice Selection & Search */}
        <div className="space-y-6 lg:col-span-8 lg:flex">
          <Card className="border shadow-sm lg:flex lg:h-full lg:w-full lg:flex-col">
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
            <CardContent className="p-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <div className="relative mb-6">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por cliente o nº factura..."
                  className="h-10 bg-slate-50/50 pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2 lg:max-h-none lg:min-h-0 lg:flex-1">
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
                      <div>
                        {f.estado === "pendiente" ? (
                          <Badge className="h-4 bg-green-600 px-2 py-0 text-[9px] font-black text-white uppercase">
                            {f.estado}
                          </Badge>
                        ) : f.estado === "adelantado" ? (
                          <Badge className="h-4 bg-blue-600 px-2 py-0 text-[9px] font-black text-white uppercase">
                            {f.estado}
                          </Badge>
                        ) : f.estado === "parcial" || f.estado === "pago parcial" ? (
                          <Badge className="h-4 bg-orange-500 px-2 py-0 text-[9px] font-black text-white uppercase">
                            {f.estado}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-4 border-slate-200 px-2 py-0 text-[9px] font-black uppercase"
                          >
                            {f.estado}
                          </Badge>
                        )}
                      </div>
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
        </div>

        {/* Right: Summary */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="overflow-hidden border shadow-md">
            <CardHeader className="bg-slate-900 px-5 py-4 text-white">
              <CardTitle className="flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                <Info className="h-3.5 w-3.5" /> Confirmación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 bg-slate-50 p-6">
              {selectedFactura ? (
                <>
                  <div className="flex flex-col items-center gap-4 border-b border-slate-200 pb-6">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-xl">
                      {selectedFactura.fotoUrl ? (
                        <img src={selectedFactura.fotoUrl} alt="Cliente" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100">
                          <User className="h-10 w-10 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg leading-tight font-black text-slate-900">
                        {selectedFactura.clienteNombre} {selectedFactura.clienteApellidos}
                      </h3>
                      <p className="text-primary mt-0.5 text-[10px] font-bold tracking-widest uppercase">
                        {selectedFactura.numeroFactura}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Total factura:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(selectedFactura.total)}</span>
                    </div>
                    {esPagoAdelantado && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Pagado por adelantado:</span>
                        <span className="font-bold text-blue-700">{formatCurrency(montoPagadoAdelantado)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Resta del total:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(selectedFactura.montoPendiente)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Descuento:</span>
                      <span className="font-bold text-emerald-700">-{formatCurrency(descuento || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Saldo luego del pago:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(Math.max(0, balancePendiente - totalAplicado))}
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
                </>
              ) : (
                <div className="space-y-3 py-10 text-center opacity-40">
                  <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="text-[10px] font-black text-slate-500 uppercase">Seleccione una Factura</p>
                </div>
              )}
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
                <div className="grid gap-6 md:grid-cols-1">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        Monto a Pagar
                      </Label>
                      <div className="relative">
                        <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-12 pl-8 text-xl font-bold"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                        Descuento al Cliente (RD$)
                      </Label>
                      <div className="relative">
                        <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-10 pl-8"
                          value={descuento}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDescuento(value);

                            // Always reference montoPendiente for discount calculations, never total
                            const descuentoValue = Number(value || 0);
                            const montoActual = Number(monto || 0);
                            const pendienteActual = Number(selectedFactura?.montoPendiente || 0);
                            const nuevoMontoSugerido = Math.max(0, pendienteActual - descuentoValue);

                            // Auto-adjust monto if it equals original pending amount or exceeds new suggested amount
                            if (montoActual > nuevoMontoSugerido || montoActual === pendienteActual) {
                              setMonto(String(nuevoMontoSugerido));
                            }
                          }}
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
                        <Select value={cajaId} onValueChange={setCajaId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Seleccionar caja..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lookup.cajas.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                <Button
                  onClick={handleProcessPayment}
                  disabled={isSubmitting || Number(monto || 0) <= 0}
                  className="h-11 w-full text-xs font-black tracking-wider uppercase shadow-md"
                >
                  {isSubmitting ? "Procesando..." : "Confirmar Recibo"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-amber-700 uppercase">
          <ShieldCheck className="h-3.5 w-3.5" /> Auditoría
        </div>
        <p className="text-[9px] leading-relaxed font-medium text-amber-700">
          Toda transacción es registrada con sello de tiempo y vinculada al usuario y sesión de caja activa.
        </p>
      </div>

      <CajaManagementModal
        isOpen={isCajaModalOpen}
        onOpenChange={setIsCajaModalOpen}
        usuarioId={usuarioId}
        onSuccess={fetchData}
      />
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
