"use client";

import { useState, useEffect, useCallback } from "react";

import {
  FileText,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Filter,
  Plus,
  Info,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formatCurrency = (v: string | number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(v));

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function CrearFacturasPage() {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  const mesSiguienteInicial = mesActual === 12 ? 1 : mesActual + 1;
  const anioSiguienteInicial = mesActual === 12 ? anioActual + 1 : anioActual;

  const [suscripciones, setSuscripciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diasDisponibles, setDiasDisponibles] = useState<number[]>([]);
  const [loadingDias, setLoadingDias] = useState(true);
  const [usuarioId, setUsuarioId] = useState<string>("");

  // Filtros
  const [diaFacturacion, setDiaFacturacion] = useState<string>("");
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itbisManual, setItbisManual] = useState<number>(0);
  const [descuentoManualMonto, setDescuentoManualMonto] = useState<number>(0);
  const [pagoAdelantadoUnMes, setPagoAdelantadoUnMes] = useState<boolean>(false);
  const [mesAdelantado, setMesAdelantado] = useState<number>(mesSiguienteInicial);
  const [anioAdelantado, setAnioAdelantado] = useState<number>(anioSiguienteInicial);

  // Selección
  const [suscripcionesSeleccionadas, setSuscripcionesSeleccionadas] = useState<Set<string>>(new Set());

  // Loading billing days on mount
  useEffect(() => {
    fetch("/api/facturas/dias-facturacion")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDiasDisponibles(res.data);
          if (res.data.length > 0) {
            setDiaFacturacion(String(res.data[0]));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDias(false));

    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.profile?.id) {
          setUsuarioId(res.data.profile.id);
        }
      })
      .catch(console.error);
  }, []);

  const cargarSuscripciones = useCallback(
    async (search = "") => {
      // Si no hay día ni búsqueda, no hacemos nada
      if (!diaFacturacion && !search) return;

      setIsLoading(true);
      try {
        const url = `/api/suscripciones/por-dia-facturacion?${diaFacturacion ? `diaFacturacion=${diaFacturacion}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
        const res = await fetch(url.replace("?&", "?"));
        const data = await res.json();

        if (data.success) {
          setSuscripciones(data.data.suscripciones);
          setSuscripcionesSeleccionadas(new Set());
        } else {
          toast.error(data.error || "Error al cargar suscripciones");
        }
      } catch (error) {
        toast.error("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    },
    [diaFacturacion],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarSuscripciones(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, diaFacturacion, cargarSuscripciones]);

  const toggleSuscripcion = (id: string) => {
    const nuevas = new Set(suscripcionesSeleccionadas);
    if (nuevas.has(id)) {
      nuevas.delete(id);
    } else {
      nuevas.add(id);
    }
    setSuscripcionesSeleccionadas(nuevas);
  };

  const toggleTodas = () => {
    if (suscripcionesSeleccionadas.size === suscripciones.length) {
      setSuscripcionesSeleccionadas(new Set());
    } else {
      setSuscripcionesSeleccionadas(new Set(suscripciones.map((s) => s.id)));
    }
  };

  const calcularTotalSeleccionado = () => {
    return suscripciones
      .filter((s) => suscripcionesSeleccionadas.has(s.id))
      .reduce((acc, s) => {
        const precio = Number(s.precio_mensual || 0);
        const descuento = (precio * Number(s.descuento_aplicado || 0)) / 100;
        const subtotal = precio - descuento;
        const itbis = subtotal * (itbisManual / 100);
        return acc + subtotal + itbis;
      }, 0);
  };

  const calcularDetallesSeleccion = () => {
    const seleccionadas = suscripciones.filter((s) => suscripcionesSeleccionadas.has(s.id));

    const subtotalTotal = seleccionadas.reduce((acc, s) => {
      const precio = Number(s.precio_mensual || 0);
      const descuento = (precio * Number(s.descuento_aplicado || 0)) / 100;
      return acc + (precio - descuento);
    }, 0);

    const descuentoAplicable = seleccionadas.length > 0 ? descuentoManualMonto : 0;
    const subtotalTrasDescuentoManual = Math.max(0, subtotalTotal - descuentoAplicable);
    const itbisTotal = subtotalTrasDescuentoManual * (itbisManual / 100);
    const totalFinal = subtotalTrasDescuentoManual + itbisTotal;

    return {
      subtotalTotal,
      descuentoManualAplicado: Math.min(descuentoAplicable, subtotalTotal),
      subtotalTrasDescuentoManual,
      itbisTotal,
      totalFinal,
      count: seleccionadas.length,
    };
  };

  const crearFacturas = async () => {
    if (suscripcionesSeleccionadas.size === 0) {
      toast.error("Debe seleccionar al menos una suscripción");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/facturas/crear-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suscripcionIds: Array.from(suscripcionesSeleccionadas),
          mesPeriodo: mesSeleccionado,
          anioPeriodo: anioSeleccionado,
          usuarioId: usuarioId || undefined,
          itbisPorcentaje: itbisManual,
          descuentoManualMonto: puedeAplicarDescuentoManual && descuentoManualMonto >= 1 ? descuentoManualMonto : 0,
          pagoAdelantadoUnMes,
          mesAdelantado: pagoAdelantadoUnMes ? mesAdelantado : undefined,
          anioAdelantado: pagoAdelantadoUnMes ? anioAdelantado : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${data.data.totalCreadas} facturas creadas exitosamente`);
        if (data.data.totalErrores > 0) {
          toast.warning(`${data.data.totalErrores} facturas con errores`);
          // Mostrar detalles de los errores
          if (data.data.errores && data.data.errores.length > 0) {
            data.data.errores.forEach((err: any) => {
              toast.error(`${err.numeroContrato || "Sin contrato"}: ${err.error}`);
            });
          }
        }
        setSuscripcionesSeleccionadas(new Set());
        cargarSuscripciones();
      } else {
        toast.error(data.error || "Error al crear facturas");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generarOpcionesMes = () => {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    const opciones = [];

    // Mes anterior
    const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
    const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
    opciones.push({
      label: `${MESES[mesAnterior - 1].label} ${anioAnterior} (Anterior)`,
      mes: mesAnterior,
      anio: anioAnterior,
    });

    // Mes actual
    opciones.push({
      label: `${MESES[mesActual - 1].label} ${anioActual} (Actual)`,
      mes: mesActual,
      anio: anioActual,
    });

    // Mes siguiente
    const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;
    const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual;
    opciones.push({
      label: `${MESES[mesSiguiente - 1].label} ${anioSiguiente} (Siguiente)`,
      mes: mesSiguiente,
      anio: anioSiguiente,
    });

    return opciones;
  };

  // La búsqueda ahora es en el servidor, así que filteredSuscripciones es básicamente suscripciones
  const filteredSuscripciones = suscripciones;

  const clientesSeleccionados = new Set(
    suscripciones.filter((s) => suscripcionesSeleccionadas.has(s.id)).map((s) => s.cliente_id),
  );
  const puedeAplicarDescuentoManual = clientesSeleccionados.size === 1;

  const detallesSeleccion = calcularDetallesSeleccion();
  const opcionesMes = generarOpcionesMes();

  const setPeriodoMesSiguiente = () => {
    setMesAdelantado(mesSiguienteInicial);
    setAnioAdelantado(anioSiguienteInicial);
    setMesSeleccionado(mesSiguienteInicial);
    setAnioSeleccionado(anioSiguienteInicial);
  };

  useEffect(() => {
    if (pagoAdelantadoUnMes) {
      setMesSeleccionado(mesAdelantado);
      setAnioSeleccionado(anioAdelantado);
    }
  }, [pagoAdelantadoUnMes, mesAdelantado, anioAdelantado]);

  const aniosAdelantado = Array.from({ length: 4 }, (_, i) => anioActual + i);

  useEffect(() => {
    if (!puedeAplicarDescuentoManual && descuentoManualMonto !== 0) {
      setDescuentoManualMonto(0);
    }
  }, [puedeAplicarDescuentoManual, descuentoManualMonto]);

  return (
    <div className="animate-in fade-in bg-background mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6 duration-500">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileText className="text-primary h-8 w-8" />
              Crear Facturas Masivas
            </h1>
            <p className="text-muted-foreground mt-1">Genera facturas por día de facturación y periodo seleccionado.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Filtros y Suscripciones */}
        <div className="space-y-6 lg:col-span-8">
          {/* Filtros */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-slate-50/30 p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Filter className="text-primary h-4 w-4" /> Filtros de Búsqueda
              </CardTitle>
              <CardDescription>Selecciona el día de facturación y el periodo a facturar</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                    Día de Facturación
                  </Label>
                  <Select value={diaFacturacion} onValueChange={setDiaFacturacion} disabled={loadingDias}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={loadingDias ? "Cargando días..." : "Seleccionar día..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {diasDisponibles.map((dia) => (
                        <SelectItem key={dia} value={String(dia)}>
                          Día {dia} de cada mes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                    Periodo a Facturar
                  </Label>
                  <Select
                    value={`${mesSeleccionado}-${anioSeleccionado}`}
                    onValueChange={(val) => {
                      const [mes, anio] = val.split("-").map(Number);
                      setMesSeleccionado(mes);
                      setAnioSeleccionado(anio);
                    }}
                  >
                    <SelectTrigger className="h-10" disabled={pagoAdelantadoUnMes}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcionesMes.map((op) => (
                        <SelectItem key={`${op.mes}-${op.anio}`} value={`${op.mes}-${op.anio}`}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                    ITBIS (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Ej: 18"
                    className="h-10"
                    value={itbisManual || ""}
                    onChange={(e) => setItbisManual(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Suscripciones */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Users className="text-primary h-4 w-4" /> Suscripciones Activas
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {filteredSuscripciones.length} DE {suscripciones.length}
                  </Badge>
                  {suscripciones.length > 0 && (
                    <Button variant="outline" size="sm" onClick={toggleTodas} className="h-7 text-xs">
                      {suscripcionesSeleccionadas.size === suscripciones.length
                        ? "Deseleccionar Todas"
                        : "Seleccionar Todas"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-4">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre o monto..."
                  className="h-10 bg-slate-50 pl-9 dark:bg-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="text-muted-foreground animate-pulse py-12 text-center">Cargando suscripciones...</div>
              ) : filteredSuscripciones.length === 0 ? (
                <div className="space-y-3 py-12 text-center opacity-40">
                  <Users className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="text-muted-foreground text-sm font-medium">
                    {searchQuery
                      ? "No se encontraron resultados"
                      : `No hay suscripciones activas para el día ${diaFacturacion}`}
                  </p>
                </div>
              ) : (
                <div className="custom-scrollbar max-h-[500px] space-y-3 overflow-y-auto pr-2">
                  {filteredSuscripciones.map((sus) => {
                    const isSelected = suscripcionesSeleccionadas.has(sus.id);
                    const precio = Number(sus.precio_mensual || 0);
                    const descuento = (precio * Number(sus.descuento_aplicado || 0)) / 100;
                    const subtotal = precio - descuento;
                    const itbis = subtotal * (itbisManual / 100);
                    const total = subtotal + itbis;

                    return (
                      <div
                        key={sus.id}
                        onClick={() => toggleSuscripcion(sus.id)}
                        className={cn(
                          "group flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-primary ring-1"
                            : "border-slate-100 bg-white hover:border-slate-300",
                        )}
                      >
                        <Checkbox checked={isSelected} className="mt-1" />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="text-sm leading-tight font-bold text-slate-800">
                                {sus.cliente_nombre} {sus.cliente_apellidos}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {sus.servicio_nombre || "Servicio"}
                                {sus.plan_nombre && ` - Plan ${sus.plan_nombre}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-black text-slate-900">{formatCurrency(total)}</div>
                              {descuento > 0 && (
                                <div className="text-muted-foreground text-[9px]">Desc. {sus.descuento_aplicado}%</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[9px]">
                            <Badge variant="outline" className="h-4 px-2 py-0 text-[9px] font-black">
                              {sus.numero_contrato}
                            </Badge>
                            <span className="text-muted-foreground">
                              Día {sus.dia_facturacion} | {formatCurrency(precio)}/mes
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Resumen y Confirmación */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="overflow-hidden border shadow-md">
            <CardHeader className="bg-slate-900 px-5 py-4 text-white dark:bg-slate-800">
              <CardTitle className="flex items-center gap-2 text-xs font-black tracking-widest text-white uppercase">
                <DollarSign className="h-3.5 w-3.5" /> Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Periodo:</span>
                  <span className="font-bold text-slate-700 dark:text-white">
                    {MESES[mesSeleccionado - 1]?.label} {anioSeleccionado}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Día de Cobro:</span>
                  <span className="font-bold text-slate-700 dark:text-white">Día {diaFacturacion}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground dark:text-slate-400">Suscripciones:</span>
                  <span className="font-bold text-slate-700 dark:text-white">
                    {suscripcionesSeleccionadas.size} de {suscripciones.length}
                  </span>
                </div>

                {detallesSeleccion.count > 0 && (
                  <>
                    <hr className="border-slate-100 dark:border-slate-700" />
                    <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                      <div className="text-[10px] font-black tracking-wider text-slate-600 uppercase dark:text-slate-400">
                        Desglose de Facturación
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground dark:text-slate-400">Subtotal:</span>
                        <span className="font-semibold text-slate-700 dark:text-white">
                          {formatCurrency(detallesSeleccion.subtotalTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground dark:text-slate-400">Desc. Manual:</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          -{formatCurrency(detallesSeleccion.descuentoManualAplicado)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground dark:text-slate-400">ITBIS ({itbisManual}%):</span>
                        <span className="font-semibold text-slate-700 dark:text-white">
                          {formatCurrency(detallesSeleccion.itbisTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                      <div className="text-[10px] font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                        Descuento Manual del Cliente
                      </div>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        disabled={!puedeAplicarDescuentoManual || detallesSeleccion.count === 0}
                        placeholder={
                          puedeAplicarDescuentoManual
                            ? "Ingrese descuento desde RD$1"
                            : "Seleccione suscripciones de un solo cliente"
                        }
                        className="h-10 bg-white dark:bg-slate-900"
                        value={descuentoManualMonto || ""}
                        onChange={(e) => {
                          const valor = Number(e.target.value);
                          if (!e.target.value) {
                            setDescuentoManualMonto(0);
                            return;
                          }

                          if (valor < 1) {
                            setDescuentoManualMonto(0);
                            return;
                          }

                          setDescuentoManualMonto(valor);
                        }}
                      />
                      {!puedeAplicarDescuentoManual && detallesSeleccion.count > 0 && (
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          El descuento manual solo se habilita cuando las suscripciones seleccionadas pertenecen a un
                          solo cliente.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                      <div className="text-[10px] font-black tracking-wider text-blue-700 uppercase dark:text-blue-300">
                        Conceptos a Facturar
                      </div>
                      <div className="space-y-1">
                        {suscripciones
                          .filter((s) => suscripcionesSeleccionadas.has(s.id))
                          .map((s) => (
                            <div key={s.id} className="flex items-center justify-between text-[10px]">
                              <span className="text-blue-700 dark:text-blue-300">
                                {s.cliente_nombre} {s.cliente_apellidos}
                              </span>
                              <span className="font-bold text-blue-800 dark:text-blue-200">
                                {s.servicio_nombre || "Servicio"}
                                {s.plan_nombre && ` - ${s.plan_nombre}`}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50 p-3 dark:border-sky-900 dark:bg-sky-950">
                      <div className="text-[10px] font-black tracking-wider text-sky-700 uppercase dark:text-sky-300">
                        Pago Adelantado
                      </div>
                      <label className="flex cursor-pointer items-start gap-2 text-xs text-sky-800 dark:text-sky-200">
                        <Checkbox
                          checked={pagoAdelantadoUnMes}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true;
                            setPagoAdelantadoUnMes(enabled);
                            if (enabled) {
                              setPeriodoMesSiguiente();
                            }
                          }}
                          className="mt-0.5"
                        />
                        <span>
                          Marcar facturas como <strong>PAGO ADELANTADO (1 MES)</strong> y seleccionar el mes específico
                          que el cliente está pagando.
                        </span>
                      </label>

                      {pagoAdelantadoUnMes && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black tracking-wider text-sky-700 uppercase dark:text-sky-300">
                              Mes Adelantado
                            </Label>
                            <Select value={String(mesAdelantado)} onValueChange={(v) => setMesAdelantado(Number(v))}>
                              <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MESES.map((mes) => (
                                  <SelectItem key={mes.value} value={String(mes.value)}>
                                    {mes.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black tracking-wider text-sky-700 uppercase dark:text-sky-300">
                              Año Adelantado
                            </Label>
                            <Select value={String(anioAdelantado)} onValueChange={(v) => setAnioAdelantado(Number(v))}>
                              <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {aniosAdelantado.map((anio) => (
                                  <SelectItem key={anio} value={String(anio)}>
                                    {anio}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <hr className="border-slate-100 dark:border-slate-700" />
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-black tracking-tighter text-slate-800 uppercase dark:text-white">
                    Total a Facturar:
                  </span>
                  <span className="text-primary dark:text-primary text-xl font-black">
                    {formatCurrency(detallesSeleccion.totalFinal)}
                  </span>
                </div>
              </div>

              <Button
                onClick={crearFacturas}
                disabled={isSubmitting || suscripcionesSeleccionadas.size === 0}
                className="h-11 w-full text-xs font-black tracking-wider uppercase shadow-md"
              >
                {isSubmitting ? (
                  "Procesando..."
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear {suscripcionesSeleccionadas.size} Factura(s)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-wider text-blue-700 uppercase">
              <Info className="h-3.5 w-3.5" /> Información
            </div>
            <ul className="space-y-1 text-[9px] leading-relaxed font-medium text-blue-700">
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Las facturas se generan con estado "pendiente"
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Se aplica ITBIS según el porcentaje configurado
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Los descuentos se aplican antes de impuestos
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Se crea automáticamente la cuenta por cobrar
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                Puede marcar la factura como pago adelantado de 1 mes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
